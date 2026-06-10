import json
import asyncio
from typing import List, Dict, Tuple
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
import redis.asyncio as redis
from django.db import transaction
from django.utils import timezone
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django_backend.models import UserProfile, UserChatSettings, ChatRoomParticipant

User = get_user_model()
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[tuple[int, WebSocket]]] = {}
        self.user_connection_counts: Dict[int, int] = {} 
        self.user_sockets: Dict[int, List[WebSocket]] = {} 
        self.active_room_users: Dict[int, set] = {}


    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        if websocket.client_state.value == 0:  
            await websocket.accept()
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append((user_id, websocket))

        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = []
        self.user_sockets[user_id].append(websocket)
        
        if room_id not in self.active_room_users:
            self.active_room_users[room_id] = set()
        self.active_room_users[room_id].add(user_id)

        current_count = self.user_connection_counts.get(user_id, 0)
        self.user_connection_counts[user_id] = current_count + 1
        
        if current_count == 0:
            await self.update_user_presence(user_id, True)
    
            show_last_seen = await self._get_user_visibility(user_id)
            if show_last_seen:
                await self.broadcast_user_status_to_my_rooms(user_id, "online", None)
                                    
    async def disconnect(self, websocket: WebSocket, room_id: int, user_id: int):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                conn for conn in list(self.active_connections[room_id]) if conn[1] != websocket
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

        if user_id in self.user_sockets:
            if websocket in self.user_sockets[user_id]:
                self.user_sockets[user_id].remove(websocket)
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]

        is_still_in_room = any(conn[0] == user_id for conn in self.active_connections.get(room_id, []))
        if not is_still_in_room and room_id in self.active_room_users:
            self.active_room_users[room_id].discard(user_id)
            if not self.active_room_users[room_id]:
                del self.active_room_users[room_id]

        if user_id in self.user_connection_counts:
            self.user_connection_counts[user_id] -= 1
            if self.user_connection_counts[user_id] <= 0:
                del self.user_connection_counts[user_id]
                await self.update_user_presence(user_id, False)
                
                show_last_seen = await self._get_user_visibility(user_id)
                if show_last_seen:
                    await self.broadcast_user_status_to_my_rooms(user_id, "offline", timezone.now().isoformat()) 
                                       
    @sync_to_async
    def update_user_presence(self, user_id: int, is_online: bool):
        try:
            with transaction.atomic():
                profile_obj = UserProfile.objects.filter(user_id=user_id).first()
                if profile_obj:
                    profile_obj.is_online = is_online
                    profile_obj.last_seen = timezone.now()
                    profile_obj.save(update_fields=['is_online', 'last_seen'])
                elif is_online:
                    UserProfile.objects.get_or_create(user_id=user_id, defaults={'is_online': True})
        except Exception:
            pass
        
    @sync_to_async
    def _get_user_visibility(self, user_id: int) -> bool:
        try:
            val = UserChatSettings.objects.filter(user_id=user_id).values_list('show_last_seen', flat=True).first()
            return val if val is not None else True
        except Exception:
            return True    
        
    async def broadcast(self, message: dict, room_id: int):
        if room_id not in self.active_connections:
            return

        sender_id = None
        if "sender_id" in message:
            sender_id = message["sender_id"]
        elif "sender" in message and isinstance(message["sender"], dict):
            sender_id = message["sender"].get("id")
        elif "user_id" in message:
            sender_id = message["user_id"]    
            
        @sync_to_async
        def get_broadcast_context(r_id, recipient_ids: list):
            active_ids = set(
                ChatRoomParticipant.objects.filter(
                    room_id=r_id, 
                    left_at__isnull=True
                ).values_list('user_id', flat=True)
            )
            settings_map = {
                s.user_id: s for s in UserChatSettings.objects.filter(user_id__in=recipient_ids)
            }
            return active_ids, settings_map

        connection_recipient_ids = [conn[0] for conn in list(self.active_connections[room_id])]
        active_member_ids, settings_cache = await get_broadcast_context(room_id, connection_recipient_ids)

        safe_message = jsonable_encoder(message)
        msg_type = str(message.get("type", "")).lower()

        for recipient_user_id, connection in list(self.active_connections[room_id]):
            recipient_id = int(recipient_user_id)
        
            if sender_id and recipient_id == int(sender_id):
                continue

            if recipient_id not in active_member_ids:
                continue

            recipient_settings = settings_cache.get(recipient_id)
            typing_indicators = recipient_settings.typing_indicators if recipient_settings else True
            auto_download = recipient_settings.auto_download_media if recipient_settings else True
            sounds_enabled = recipient_settings.chat_sounds_enabled if recipient_settings else True

            if msg_type == "typing_status" and not typing_indicators:
                continue

            personalized_message = safe_message.copy()
            
            if msg_type in ["new_message", "message_create"]:
                has_attachments = "attachments" in personalized_message and bool(personalized_message["attachments"])
                has_attachment_url = "attachment_url" in personalized_message and bool(personalized_message["attachment_url"])
                
                if has_attachments or has_attachment_url:
                    personalized_message["should_auto_download"] = auto_download

            if msg_type in ["new_message", "message_create", "system_alert", "message_edit"]:
                personalized_message["play_sound"] = sounds_enabled
        
            try:
                asyncio.create_task(connection.send_json(personalized_message))
            except Exception:
                pass
                    
    async def broadcast_to_user(self, user_id: int, message: dict):
        if user_id in self.user_sockets:
            safe_message = jsonable_encoder(message)
            for connection in list(self.user_sockets[user_id]):
                try:
                    asyncio.create_task(connection.send_json(safe_message))
                except Exception:
                    pass
                
    async def broadcast_user_status_to_my_rooms(self, user_id: int, status: str, last_seen: str = None):
        @sync_to_async
        def get_my_active_room_ids():
            return list(ChatRoomParticipant.objects.filter(user_id=user_id, left_at__isnull=True).values_list('room_id', flat=True))
        
        my_room_ids = await get_my_active_room_ids()
        payload = {
            "type": "USER_STATUS",
            "user_id": user_id,
            "status": status,
            "timestamp": timezone.now().isoformat() if not last_seen else last_seen
        }
        
        for r_id in my_room_ids:
            if r_id in self.active_connections:
                await self.broadcast(payload, r_id)            
    
    async def broadcast_to_all(self, message: dict):
        safe_message = jsonable_encoder(message)
        for room_id, connections in list(self.active_connections.items()):
            for _, connection in connections:  
                try:
                    asyncio.create_task(connection.send_json(safe_message))
                except Exception:
                    pass

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.user_sockets:
            safe_message = jsonable_encoder(message)
            for connection in list(self.user_sockets[user_id]):
                try:
                    asyncio.create_task(connection.send_json(safe_message))
                except Exception:
                    pass
                
    def get_online_users(self) -> List[int]: 
        return list(self.user_connection_counts.keys())
    
    async def start_redis_listener(self):
        r = redis.from_url("redis://localhost:6379/0", decode_responses=True)
        pubsub = r.pubsub()
        
        try:
            await pubsub.subscribe("status_updates")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        t_room = data.get("room_id")
                        if t_room:
                            await self.broadcast(data, int(t_room))
                        else:
                            await self.broadcast_to_all(data)
                    except Exception:
                        pass
        finally:
            await pubsub.unsubscribe("status_updates")
            await r.close()

manager = ConnectionManager()
    