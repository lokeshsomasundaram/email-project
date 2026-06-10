from django.db import connections
from pathlib import Path
import uuid
import asyncio
from django.db.models import Prefetch, Count,F, Q, Exists, OuterRef, Max, Value, BooleanField, Subquery, IntegerField
from django.db.models.functions import Coalesce
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, File, UploadFile, Query, status,WebSocketException, Form
from jose import JWTError, jwt
from sqlparse import engine
from fastapi_app.core.config import settings
from pydantic import BaseModel
import json
from fastapi import Request
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import re
from uuid import uuid4
import logging
from django.db import transaction
import secrets
import mimetypes
from django.core.files.base import ContentFile
from django.utils import timezone
from django.shortcuts import get_object_or_404
from typing import List, Optional
from datetime import datetime, timezone as dt_timezone
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from django_backend.models import ChatRoom, ChatMessage, Email, MessageReaction, Notification, Call, UserChatSettings,ChatMute, User, Meeting, UserProfile, ChatRoomParticipant, ChatMessageAttachment
from django.core.exceptions import ObjectDoesNotExist
from fastapi_app.schemas.chat_schemas import (ChatRoomCreate,ChatRoomRead, MessageRead, ChatMemberUpdate,
    MessageUpdate, ForwardRequest, TextMessageCreate, UserActivityRead, UserStatusResponse, ChatRoomDetailsResponse, ChatSettingsUpdate,
    OfflineUser, ChatMessageResponse,ChatRoomUpdateRequest, RenameGroupRequest, RenameGroupResponse, MeetingCreate, MuteChatResponse,
    UnmuteChatResponse)

from fastapi_app.utils.sanitizer import process_mentions
from fastapi_app.core.socket_manager import manager
from fastapi_app.dependencies.permissions import get_current_user
from fastapi_app.utils.link_utils import extract_link, fetch_link_preview
from fastapi_app.utils.sanitizer import sanitize_rich_text
from fastapi_app.utils.notifications import handle_message_notifications
from fastapi_app.schemas.notification_schemas import MuteChatRequest

from fastapi_app.routers.notifications import create_notification
from django.db import DatabaseError

logger = logging.getLogger(__name__)
router = APIRouter()

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

User = get_user_model()

def build_chat_attachments(message):
    attachments = []
    related_attachments = getattr(message, "_prefetched_objects_cache", {}).get("file_attachments")
    if related_attachments is None:
        related_attachments = message.file_attachments.all()

    for attachment in related_attachments:
        try:
            url = attachment.file.url
        except (ValueError, AttributeError):
            url = None
        if url:
            attachments.append({
                "id": attachment.id,
                "url": url,
                "filename": attachment.filename,
                "file_type": getattr(attachment, 'file_type', 'FILE')
            })

    if not attachments and getattr(message, 'attachment', None):
        try:
            url = message.attachment.url
        except (ValueError, AttributeError):
            url = None
        filename = getattr(message, 'attachment_name', None) or os.path.basename(message.attachment.name)
        if url and filename:
            mime_type, _ = mimetypes.guess_type(filename)
            is_image = mime_type and mime_type.startswith('image/')
            attachments.append({
                "id": 0,  
                "url": url,
                "filename": filename,
                "file_type": 'IMAGE' if is_image else 'FILE'
            })

    return attachments

def clone_chat_message_attachments(original_message, new_message):
    related_attachments = list(original_message.file_attachments.all())

    if related_attachments:
        ChatMessageAttachment.objects.bulk_create([
            ChatMessageAttachment(
                message=new_message,
                file=attachment.file,
                filename=attachment.filename,
                file_type=getattr(attachment, 'file_type', 'FILE')
            )
            for attachment in related_attachments
        ])
    elif getattr(original_message, 'attachment', None):
        filename = (
            getattr(original_message, 'attachment_name', None)
            or os.path.basename(original_message.attachment.name)
        )
        mime_type, _ = mimetypes.guess_type(filename)
        is_image = mime_type and mime_type.startswith('image/')
        
        ChatMessageAttachment.objects.create(
            message=new_message,
            file=original_message.attachment,
            filename=filename,
            file_type='IMAGE' if is_image else 'FILE'
        )

    return build_chat_attachments(new_message)

def get_user_display(user):
    profile = getattr(user, "profile", None)
    avatar = getattr(profile, "avatar", None)

    profile_image = None
    if avatar:
        try:
            profile_image = avatar.url
        except Exception:
            pass

    initials = (
        (user.first_name[:1] if user.first_name else '') +
        (user.last_name[:1] if user.last_name else '')
    ).upper()

    return {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_image": profile_image,
        "initials": initials
    }

async def get_current_user_ws(token: str = Query(...)):
    
    auth_error = status.WS_1008_POLICY_VIOLATION
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise WebSocketException(code=auth_error, reason="Invalid token payload")
    except JWTError:
        raise WebSocketException(code=auth_error, reason="Token expired or invalid")
    
    try:
        user = await sync_to_async(User.objects.get)(email=email)
        
        if not user.is_active:
            raise WebSocketException(code=auth_error, reason="User account is disabled")
        
        return user
    except User.DoesNotExist:
        raise WebSocketException(code=auth_error, reason="User not found")

User = get_user_model()
            
def format_room_response(room, current_user=None):
    user_left_at = getattr(room, 'user_left_at', None)
    if user_left_at is None and current_user:
        if hasattr(room, 'prefetched_memberships'):
            m_obj = next((m for m in room.prefetched_memberships if m.user_id == current_user.id), None)
            user_left_at = m_obj.left_at if m_obj else None
        else:
            user_left_at = ChatRoomParticipant.objects.filter(
                room=room, user=current_user
            ).values_list('left_at', flat=True).first()

    unread_count = getattr(room, 'annotated_unread_count', None)
    if user_left_at is not None:
        unread_count = 0
    elif unread_count is None:
        if current_user:
            marker = ChatRoomParticipant.objects.filter(room=room, user=current_user).values('last_read_message_id')[:1]
            unread_count = ChatMessage.objects.filter(
                room=room,
                is_deleted=False,
                id__gt=Coalesce(Subquery(marker), 0)
            ).exclude(sender=current_user).count()
        else:
            unread_count = 0
    
    last_msg_obj = room.last_message
    last_msg = None
    
    if last_msg_obj and not last_msg_obj.is_deleted:
        if not user_left_at or last_msg_obj.timestamp <= user_left_at:
            
            if hasattr(room, 'prefetched_last_msg_attachments'):
                attachments_source = room.prefetched_last_msg_attachments
            elif hasattr(last_msg_obj, 'file_attachments'):
                attachments_source = last_msg_obj.file_attachments.all()
            else:
                attachments_source = []

            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": getattr(att, 'file_type', 'FILE')
                } for att in attachments_source
            ]
            
            reaction_map = {}
            if hasattr(last_msg_obj, 'reactions'):
                for r in last_msg_obj.reactions.all():
                    if r.emoji not in reaction_map:
                        reaction_map[r.emoji] = {"count": 0, "emails": []}
                    reaction_map[r.emoji]["count"] += 1
                    reaction_map[r.emoji]["emails"].append(r.user.email)

            read_count = ChatRoomParticipant.objects.filter(
                room=room,
                last_read_message_id__gte=last_msg_obj.id
            ).exclude(user=last_msg_obj.sender_id).count()

            f_init = last_msg_obj.sender.first_name[:1] if last_msg_obj.sender.first_name else ''
            last_init = last_msg_obj.sender.last_name[:1] if last_msg_obj.sender.last_name else ''
            msg_sender_initials = (f_init + last_init).upper() or last_msg_obj.sender.email[:2].upper()

            msg_sender_avatar = None
            if hasattr(last_msg_obj.sender, 'profile') and last_msg_obj.sender.profile and last_msg_obj.sender.profile.avatar:
                try:
                    msg_sender_avatar = last_msg_obj.sender.profile.avatar.url
                except Exception:
                    msg_sender_avatar = None

            p_id = None
            p_content = None
            p_sender = None
            
            if last_msg_obj.parent_id:
                p_id = last_msg_obj.parent_id
                if hasattr(last_msg_obj, 'parent') and last_msg_obj.parent:
                    p_content = last_msg_obj.parent.content
                    if hasattr(last_msg_obj.parent, 'sender') and last_msg_obj.parent.sender:
                        p_sender = last_msg_obj.parent.sender.email

            last_msg = {
                "id": last_msg_obj.id,
                "room_id": room.id,
                "room_name": room.name or "Group Chat",
                "sender_id": last_msg_obj.sender.id,
                "sender_email": last_msg_obj.sender.email,
                "sender": {
                    "id": last_msg_obj.sender.id,
                    "email": last_msg_obj.sender.email,
                    "first_name": last_msg_obj.sender.first_name or "",
                    "last_name": last_msg_obj.sender.last_name or "",
                    "profile_image": msg_sender_avatar,
                    "initials": msg_sender_initials
                },
                "content": last_msg_obj.content,
                "attachments": formatted_attachments,  
                "timestamp": last_msg_obj.timestamp.isoformat() if hasattr(last_msg_obj.timestamp, 'isoformat') else str(last_msg_obj.timestamp),
                "read_count": read_count,
                "is_starred": getattr(last_msg_obj, 'user_starred', False),
                "is_saved": getattr(last_msg_obj, 'user_saved', False),
                "is_pinned": getattr(last_msg_obj, 'is_pinned', False),
                "message_link": f"/chat/rooms/{room.id}?message_id={last_msg_obj.id}",
                "parent_id": p_id,
                "parent_content": p_content,
                "parent_sender": p_sender,
                "reactions": [
                    {"emoji": k, "count": v["count"], "user_emails": v["emails"]}
                    for k, v in reaction_map.items()
                ],
                "is_forwarded": getattr(last_msg_obj, 'is_forwarded', False),
                "is_deleted": last_msg_obj.is_deleted,
                "link_url": getattr(last_msg_obj, 'link_url', None),
                "link_title": getattr(last_msg_obj, 'link_title', None),
                "link_description": getattr(last_msg_obj, 'link_description', None),
                "link_image": getattr(last_msg_obj, 'link_image', None)
            }
        
    active_participants_qs = room.participants.filter(
        user_memberships__room=room,
        user_memberships__left_at__isnull=True
    ).select_related("profile", "chat_settings")

    all_participants = list(active_participants_qs)

    if current_user and not room.is_group:
        all_participants = [user for user in all_participants if user.id != current_user.id]

    formatted_participants = []
    for u in all_participants:
        show_last_seen = True
        if hasattr(u, "chat_settings") and u.chat_settings:
            show_last_seen = u.chat_settings.show_last_seen

        has_profile = hasattr(u, 'profile') and u.profile is not None
        
        profile_image = u.profile.avatar.url if has_profile and u.profile.avatar else None
        is_online = u.profile.is_online if has_profile else False
        last_seen = u.profile.last_seen.isoformat() if has_profile and u.profile.last_seen and show_last_seen else None

        formatted_participants.append({
            "id": u.id,
            "name": f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email.split('@')[0],
            "first_name": u.first_name or "",
            "last_name": u.last_name or "",
            "email": u.email,
            "profile_image": profile_image,
            "is_online": is_online,
            "last_seen": last_seen,
        })    

    return {
        "id": room.id,
        "name": room.name or (formatted_participants[0]["name"] if formatted_participants else "Private Chat"),
        "is_group": room.is_group,
        "unread_count": unread_count,
        "is_read_only": (user_left_at is not None),  
        "participants": formatted_participants,
        "last_message": last_msg
    }
            
@router.get("/rooms", response_model=List[ChatRoomRead])
async def list_rooms(current_user: User = Depends(get_current_user)):
    @sync_to_async
    def get_formatted_rooms():
        for conn in connections.all():
            conn.close_if_unusable_or_obsolete()
            
        try:
            user_memberships = ChatRoomParticipant.objects.filter(user=current_user)
            membership_map = {m.room_id: m for m in user_memberships}
            all_room_ids = list(membership_map.keys())

            if not all_room_ids:
                return []
            
            current_user_marker = ChatRoomParticipant.objects.filter(
                room_id=OuterRef('room_id'),
                user=current_user
            ).values('last_read_message_id')[:1]

            unread_subquery = ChatMessage.objects.filter(
                room_id=OuterRef('pk'),  
                is_deleted=False
            ).exclude(
                sender=current_user
            ).filter(
                id__gt=Coalesce(Subquery(current_user_marker), 0)
            ).values('room_id').annotate(cnt=Count('id')).values('cnt')

            rooms = ChatRoom.objects.filter(
                id__in=all_room_ids
            ).annotate(
                sort_date=Coalesce(
                    Max('messages__timestamp', filter=Q(messages__is_deleted=False)), 
                    'created_at'
                ),
                annotated_unread_count=Coalesce(
                    Subquery(unread_subquery, output_field=IntegerField()), 
                    0
                )
            ).select_related(
                'last_message', 
                'last_message__sender',
                'last_message__sender__profile'
            ).prefetch_related(
                Prefetch(
                    "participants", 
                    queryset=User.objects.select_related("profile", "chat_settings").prefetch_related("user_memberships")
                ),
                Prefetch(
                    "last_message__file_attachments",
                    queryset=ChatMessageAttachment.objects.all(),
                    to_attr="prefetched_last_msg_attachments"
                )
            ).order_by('-sort_date')

            left_room_ids = [r_id for r_id, m in membership_map.items() if m.left_at is not None]
            historical_msg_map = {}
            if left_room_ids:
                for r_id in left_room_ids:
                    m_left_at = membership_map[r_id].left_at
                    h_msg = ChatMessage.objects.filter(
                        room_id=r_id,
                        is_deleted=False,
                        timestamp__lte=m_left_at
                    ).select_related('sender', 'sender__profile').order_by('-id').first()
                    if h_msg:
                        historical_msg_map[r_id] = h_msg

            formatted_rooms = []
            for room in rooms:
                user_membership = membership_map.get(room.id)
                has_left = user_membership.left_at is not None if user_membership else False

                room.user_left_at = user_membership.left_at if user_membership else None
                room.annotated_unread_count = 0 if has_left else room.annotated_unread_count
                
                if has_left:
                    historical_last_message = historical_msg_map.get(room.id)
                    if historical_last_message:
                        room.last_message = historical_last_message
                        setattr(room.last_message, 'prefetched_last_msg_attachments', list(historical_last_message.file_attachments.all()))

                filtered_participants = []
                for participant in room.participants.all():
                    p_membership = next((m for m in participant.user_memberships.all() if m.room_id == room.id), None)
                    if not p_membership:
                        continue

                    p_joined = p_membership.joined_at if timezone.is_aware(p_membership.joined_at) else timezone.make_aware(p_membership.joined_at)
                    p_left = p_membership.left_at if p_membership.left_at and timezone.is_aware(p_membership.left_at) else timezone.make_aware(p_membership.left_at) if p_membership.left_at else None
                    u_left = user_membership.left_at if user_membership and user_membership.left_at and timezone.is_aware(user_membership.left_at) else timezone.make_aware(user_membership.left_at) if user_membership and user_membership.left_at else None
                    
                    if has_left:
                        if u_left and p_joined <= u_left:
                            if p_left is None or p_left > u_left:
                                filtered_participants.append(participant)
                    else:
                        if p_left is None:
                            filtered_participants.append(participant)

                formatted_participants = []
                for p in filtered_participants:
                    has_profile = hasattr(p, 'profile') and p.profile is not None
                    formatted_participants.append({
                        "id": p.id,
                        "name": f"{p.first_name or ''} {p.last_name or ''}".strip() or p.email.split('@')[0],
                        "email": p.email,
                        "profile_image": p.profile.avatar.url if has_profile and p.profile.avatar else None,
                        "last_seen": p.profile.last_seen.isoformat() if has_profile and p.profile.last_seen else None
                    })

                last_msg_payload = None
                if room.last_message and not room.last_message.is_deleted:
                    sender_obj = room.last_message.sender
                    profile_obj = getattr(sender_obj, 'profile', None)
                    
                    avatar_img = None
                    if profile_obj and profile_obj.avatar:
                        try:
                            avatar_img = profile_obj.avatar.url
                        except Exception:
                            avatar_img = None

                    first_name_val = getattr(sender_obj, 'first_name', '') or ''
                    last_name_val = getattr(sender_obj, 'last_name', '') or ''
                    initials = ((first_name_val[:1] if first_name_val else '') + (last_name_val[:1] if last_name_val else '')).upper() or sender_obj.email[:2].upper()

                    attachments_list = []
                    if hasattr(room.last_message, 'prefetched_last_msg_attachments'):
                        attachments_list = room.last_message.prefetched_last_msg_attachments
                    elif hasattr(room.last_message, 'file_attachments'):
                        attachments_list = room.last_message.file_attachments.all()

                    formatted_attachments = [
                        {
                            "id": att.id,
                            "url": att.file.url,
                            "filename": att.filename,
                            "file_type": getattr(att, 'file_type', 'FILE')
                        } for att in attachments_list
                    ]

                    last_msg_payload = {
                        "id": room.last_message.id,
                        "room_id": room.id,
                        "room_name": room.name or "Group Chat",
                        "sender_id": sender_obj.id,
                        "sender_email": sender_obj.email,
                        "sender_first_name": first_name_val or None,
                        "sender_last_name": last_name_val or None,
                        "content": room.last_message.content,
                        "attachments": formatted_attachments,
                        "timestamp": room.last_message.timestamp.isoformat() if hasattr(room.last_message.timestamp, 'isoformat') else str(room.last_message.timestamp),  
                        "read_count": 0,
                        "is_starred": False,
                        "is_own_message": (sender_obj.id == current_user.id),
                        "is_saved": False,
                        "is_pinned": False,
                        "is_forwarded": getattr(room.last_message, 'is_forwarded', False),
                        "is_deleted": False,
                        "message_link": f"/chat/rooms/{room.id}?message_id={room.last_message.id}",
                        "reactions": [],
                        "parent_id": None,
                        "parent_content": None,
                        "parent_sender": None,
                        "link_url": getattr(room.last_message, 'link_url', None),
                        "link_title": getattr(room.last_message, 'link_title', None),
                        "link_description": getattr(room.last_message, 'link_description', None),
                        "link_image": getattr(room.last_message, 'link_image', None)
                    }

                room_name = room.name or (formatted_participants[0]["name"] if formatted_participants else "Private Chat")
                
                formatted_rooms.append({
                    "id": room.id,
                    "name": room_name,
                    "is_group": room.is_group,
                    "unread_count": room.annotated_unread_count,
                    "is_read_only": has_left,
                    "participants": formatted_participants,
                    "last_message": last_msg_payload
                })
                
            return formatted_rooms    
        except Exception as e:
            raise Exception(f"Internal query compiling exception: {str(e)}")

    return await get_formatted_rooms()
    
@router.post("/rooms", response_model=ChatRoomRead)
async def create_room(data: ChatRoomCreate, current_user: User = Depends(get_current_user)):
    
    @sync_to_async
    def process_room_creation():
        try:
            with transaction.atomic():
                if data.email_id:
                    existing_email_room = ChatRoom.objects.filter(
                        related_email_id=data.email_id
                    ).first()

                    if existing_email_room:
                        return format_room_response(existing_email_room, current_user), None

                participant_emails = set(data.participant_emails or [])
                related_email_obj = None

                if data.email_id:
                    try:
                        related_email_obj = Email.objects.select_related('sender').get(id=data.email_id)
                        if related_email_obj.sender:
                            participant_emails.add(related_email_obj.sender.email)
                    except NameError:
                        return None, "Email subsystem model configuration missing"
                    except Exception:
                        return None, "Linked email not found"

                participant_emails.add(current_user.email)
                users_to_add = list(User.objects.filter(email__in=participant_emails, is_active=True))
                
                if len(users_to_add) < 2 and not data.is_group:
                    return None, "At least one other valid participant is required for a 1-on-1 chat"

                if not data.is_group:
                    existing_rooms = ChatRoom.objects.filter(is_group=False).annotate(
                        num_participants=Count('room_memberships')
                    ).filter(num_participants=len(users_to_add))

                    for u in users_to_add:
                        existing_rooms = existing_rooms.filter(room_memberships__user=u)

                    existing_room = existing_rooms.first()
                    if existing_room:
                        ChatRoomParticipant.objects.filter(
                            room=existing_room, 
                            user__in=users_to_add
                        ).update(left_at=None, joined_at=timezone.now())
                        
                        return format_room_response(existing_room, current_user), None

                room_name = data.name or (f"Group Chat ({len(users_to_add)})" if data.is_group else "")
                room = ChatRoom.objects.create(
                    name=room_name,
                    is_group=data.is_group,
                    related_email=related_email_obj
                )
                
                participants_pool = [
                    ChatRoomParticipant(
                        room=room,
                        user=u,
                        joined_at=timezone.now(),
                        left_at=None
                    ) for u in users_to_add
                ]
                ChatRoomParticipant.objects.bulk_create(participants_pool)

                if data.is_group:
                    ChatMessage.objects.create(
                        room=room,
                        sender=current_user,
                        content=f"{current_user.first_name or current_user.email} created the group '{room_name}'",
                        message_type='SYSTEM'
                    )

                return format_room_response(room, current_user), None

        except Exception as e:
            return None, str(e)

    response_data, error_message = await process_room_creation()

    if error_message:
        status_code = 404 if "not found" in error_message or "Email" in error_message else 400
        raise HTTPException(status_code=status_code, detail=error_message)

    for participant in response_data.get('participants', []):
        if participant['id'] == current_user.id:
            continue

        try:
            await manager.broadcast_to_user(participant['id'], {
                "type": "ROOM_CREATED",
                "room": response_data
            })
        except Exception:
            pass

    return response_data

@router.get("/search", response_model=List[MessageRead])
async def search_messages(
    q: str = Query(..., min_length=1, description="Search term"),
    msg_type: Optional[str] = Query(None, description="Filter by message type"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_search():
        try:
            room_filters = Q(room__room_memberships__user=current_user) & (
                Q(room__room_memberships__left_at__isnull=True) | 
                Q(timestamp__lte=F('room__room_memberships__left_at'))
            )

            base_filters = Q(is_deleted=False) & room_filters
            search_filters = Q(content__icontains=q) | Q(file_attachments__filename__icontains=q)
            
            msgs = ChatMessage.objects.filter(base_filters).filter(search_filters)
            
            if msg_type:
                msgs = msgs.filter(message_type=msg_type.upper())

            read_count_subquery = ChatRoomParticipant.objects.filter(
                room_id=OuterRef('room_id'),
                last_read_message_id__gte=OuterRef('pk')
            ).exclude(
                user=OuterRef('sender_id')  
            ).values('room_id').annotate(cnt=Count('id')).values('cnt')

            msgs = msgs.select_related(
                'sender', 'sender__profile', 'parent', 'parent__sender', 'room'
            ).prefetch_related(
                'reactions', 'reactions__user', 'starred_by', 'file_attachments'
            ).annotate(
                annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
                user_starred=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), starred_by=current_user)),
                user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
            ).distinct().order_by("-timestamp") 
            
            paginated_msgs = list(msgs[offset : offset + limit])
            
            results = []
            for m in paginated_msgs:
                formatted_attachments = [
                    {
                        "id": att.id,
                        "url": att.file.url,
                        "filename": att.filename,
                        "file_type": getattr(att, 'file_type', 'FILE')
                    } for att in m.file_attachments.all()
                ]
                    
                reaction_map = {}
                for r in m.reactions.all():
                    if r.emoji not in reaction_map:
                        reaction_map[r.emoji] = {"count": 0, "emails": []}
                    reaction_map[r.emoji]["count"] += 1
                    reaction_map[r.emoji]["emails"].append(r.user.email)

                avatar_img = None
                if hasattr(m.sender, 'profile') and m.sender.profile and m.sender.profile.avatar:
                    try:
                        avatar_img = m.sender.profile.avatar.url
                    except Exception:
                        avatar_img = None

                first_initial = m.sender.first_name[:1] if m.sender.first_name else ''
                last_initial = m.sender.last_name[:1] if m.sender.last_name else ''
                initials = (first_initial + last_initial).upper() or m.sender.email[:2].upper()

                results.append({
                    "type": "MESSAGE",
                    "id": m.id,
                    "room_id": m.room_id,
                    "room_name": m.room.name or "Group Chat",
                    "sender_id": m.sender.id,
                    "sender_email": m.sender.email,
                    "sender": {
                        "id": m.sender.id,
                        "email": m.sender.email,
                        "first_name": m.sender.first_name or "",
                        "last_name": m.sender.last_name or "",
                        "profile_image": avatar_img,
                        "initials": initials
                    },
                    "content": m.content,
                    "attachments": formatted_attachments, 
                    "timestamp": m.timestamp,  
                    "is_own_message": (m.sender_id == current_user.id),
                    "read_count": m.annotated_read_count, 
                    "is_starred": getattr(m, 'user_starred', False),
                    "is_saved": getattr(m, 'user_saved', False),
                    "is_pinned": getattr(m, 'is_pinned', False),
                    "message_link": f"/chat/rooms/{m.room_id}?message_id={m.id}",
                    "parent_id": m.parent.id if m.parent else None,
                    "parent_content": m.parent.content if m.parent else None,
                    "parent_sender": m.parent.sender.email if m.parent else None,
                    "reactions": [
                        {"emoji": k, "count": v["count"], "user_emails": v["emails"]}
                        for k, v in reaction_map.items()
                    ],
                    "is_forwarded": getattr(m, 'is_forwarded', False),
                    "is_deleted": getattr(m, 'is_deleted', False),
                    "link_url": getattr(m, 'link_url', None),
                    "link_title": getattr(m, 'link_title', None),
                    "link_description": getattr(m, 'link_description', None),
                    "link_image": getattr(m, 'link_image', None)
                })

            return results, None

        except Exception as e:
            return None, str(e)
    
    data, error_msg = await process_search()

    if error_msg:
        raise HTTPException(status_code=500, detail=f"Search generation fault: {error_msg}")

    return data

@router.get("/online", response_model=List[UserActivityRead]) 
async def get_online_users(
    limit: int = Query(20, description="Max number of online users", le=100),
    current_user: User = Depends(get_current_user)
):
    active_user_ids = list(manager.user_connection_counts.keys())
    
    if not active_user_ids or (len(active_user_ids) == 1 and current_user.id in active_user_ids):
        return []
    
    @sync_to_async
    def fetch_active_profiles_from_db():
        users = User.objects.select_related('profile', 'chat_settings').filter(
            id__in=active_user_ids,
            is_active=True 
        ).exclude(id=current_user.id)[:limit]
    
        result = []
        for u in users:
            show_presence = True
            if hasattr(u, 'chat_settings') and u.chat_settings:
                show_presence = u.chat_settings.show_last_seen
 
            full_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email.split('@')[0]
                
            profile_img = None
            last_seen_val = None

            if hasattr(u, 'profile') and u.profile:
                if u.profile.last_seen:
                    last_seen_val = u.profile.last_seen.isoformat()
                
                if u.profile.avatar:
                    try:
                        profile_img = u.profile.avatar.url
                    except (ValueError, AttributeError):
                        profile_img = None

            is_currently_online = (u.id in active_user_ids) if show_presence else False
            computed_status = "online" if is_currently_online else "offline"
            final_last_seen = last_seen_val if show_presence else None

            result.append({
                "id": u.id,
                "name": full_name,
                "email": u.email,
                "profile_image": profile_img,
                "last_seen": final_last_seen,
                "is_online": is_currently_online,
                "status": computed_status 
            })

        return result
    
    return await fetch_active_profiles_from_db()

@router.post("/messages/{message_id}/share-link")
async def generate_share_link(message_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def create_token():
        try:
            base_msg = ChatMessage.objects.only('id', 'room_id', 'timestamp', 'share_token', 'is_deleted').get(
                id=message_id, 
                is_deleted=False
            )
            
            try:
                membership = ChatRoomParticipant.objects.get(room_id=base_msg.room_id, user=current_user)
            except ChatRoomParticipant.DoesNotExist:
                return None, "Not authorized to share this message"

            if membership.left_at is not None and base_msg.timestamp > membership.left_at:
                return None, "Not authorized to share this message"

            if not base_msg.share_token:
                with transaction.atomic():
                    base_msg = ChatMessage.objects.select_for_update().only('id', 'share_token').get(id=message_id)
                    if not base_msg.share_token:
                        base_msg.share_token = secrets.token_urlsafe(16)
                        base_msg.save(update_fields=['share_token'])
            
            return {
                "share_token": base_msg.share_token,
                "share_path": f"/share/{base_msg.share_token}" 
            }, None
            
        except ChatMessage.DoesNotExist:
            return None, "Message not found"
        except Exception as e:
            return None, str(e)

    result, error = await create_token() 
    
    if error:
        status_code = 403 if "authorized" in error else 404
        raise HTTPException(status_code=status_code, detail=error)
        
    return result

@router.get("/public/share/{token}")
async def view_shared_message(token: str):
    
    @sync_to_async
    def fetch_and_format_public_payload():
        msg = ChatMessage.objects.select_related('sender').prefetch_related(
            'file_attachments'
        ).filter(
            share_token=token, 
            is_deleted=False
        ).first()

        if not msg:
            return None

        formatted_attachments = [
            {
                "id": att.id,
                "url": att.file.url,
                "filename": att.filename,
                "file_type": getattr(att, 'file_type', 'FILE')
            } for att in msg.file_attachments.all()
        ]

        return {
            "id": msg.id,
            "sender": f"{msg.sender.first_name or ''} {msg.sender.last_name or ''}".strip() or msg.sender.email.split('@')[0],
            "content": msg.content,
            "timestamp": msg.timestamp,  
            "attachments": formatted_attachments,  
            "is_public": True
        }

    public_payload = await fetch_and_format_public_payload()
    
    if not public_payload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Shared link is invalid or has expired."
        )

    return public_payload
    
@router.get("/rooms/{room_id}/messages")
async def get_messages(
    room_id: int,
    q: Optional[str] = Query(None, description="Search within this room"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def fetch_and_format():
        try:
            try:
                membership = ChatRoomParticipant.objects.get(room_id=room_id, user=current_user)
            except ChatRoomParticipant.DoesNotExist:
                if not ChatRoom.objects.filter(id=room_id).exists():
                    return None, "NOT_FOUND"
                return None, "FORBIDDEN"
            
            base_filters = Q(room_id=room_id, is_deleted=False)
            
            if membership.left_at is not None:
                base_filters &= Q(timestamp__lte=membership.left_at)

            read_count_subquery = ChatRoomParticipant.objects.filter(
                room_id=OuterRef('room_id'),
                last_read_message_id__gte=OuterRef('pk')
            ).exclude(
                user=OuterRef('sender_id')  
            ).values('room_id').annotate(cnt=Count('id')).values('cnt')

            msgs_queryset = ChatMessage.objects.filter(base_filters).select_related(
                'sender', 'sender__profile', 'parent', 'parent__sender', 'parent__sender__profile', 'room'
            ).prefetch_related(
                'reactions', 'reactions__user', 'starred_by', 'file_attachments' 
            ).annotate(
                annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
                user_starred=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), starred_by=current_user)),
                user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
            ).order_by("-timestamp")

            if q:
                msgs_queryset = msgs_queryset.filter(content__icontains=q)

            paginated_msgs = list(msgs_queryset[offset: offset + limit])
            results = []

            for msg_obj in paginated_msgs:
                formatted_attachments = [
                    {
                        "id": att.id,
                        "url": att.file.url,
                        "filename": att.filename,
                        "file_type": getattr(att, 'file_type', 'FILE')
                    } for att in msg_obj.file_attachments.all()
                ]
                
                reaction_map = {}
                for r in msg_obj.reactions.all():
                    if r.emoji not in reaction_map:
                        reaction_map[r.emoji] = {"count": 0, "emails": []}
                    reaction_map[r.emoji]["count"] += 1
                    reaction_map[r.emoji]["emails"].append(r.user.email)

                profile_image = None
                if hasattr(msg_obj.sender, 'profile') and msg_obj.sender.profile and msg_obj.sender.profile.avatar:
                    try:
                        profile_image = msg_obj.sender.profile.avatar.url
                    except Exception:
                        profile_image = None

                first_initial = msg_obj.sender.first_name[:1] if msg_obj.sender.first_name else ''
                last_initial = msg_obj.sender.last_name[:1] if msg_obj.sender.last_name else ''
                initials = (first_initial + last_initial).upper() or msg_obj.sender.email[:2].upper()

                results.append({
                    "type": "MESSAGE",
                    "id": msg_obj.id,
                    "room_id": room_id,
                    "room_name": msg_obj.room.name or "Group Chat",
                    "sender_id": msg_obj.sender.id,
                    "sender": {
                        "id": msg_obj.sender.id,
                        "email": msg_obj.sender.email,
                        "first_name": msg_obj.sender.first_name or "",
                        "last_name": msg_obj.sender.last_name or "",
                        "profile_image": profile_image,
                        "initials": initials
                    },
                    "content": msg_obj.content,
                    "attachments": formatted_attachments,  
                    "timestamp": msg_obj.timestamp,  
                    "is_own_message": (msg_obj.sender_id == current_user.id),
                    "read_count": msg_obj.annotated_read_count, 
                    "is_starred": getattr(msg_obj, 'user_starred', False),
                    "is_saved": getattr(msg_obj, 'user_saved', False),     
                    "is_pinned": getattr(msg_obj, 'is_pinned', False),
                    "message_link": f"/chat/rooms/{room_id}?message_id={msg_obj.id}",
                    "parent_id": msg_obj.parent.id if msg_obj.parent else None,
                    "parent_content": msg_obj.parent.content if msg_obj.parent else None,
                    "parent_sender": msg_obj.parent.sender.email if msg_obj.parent else None,
                    "reactions": [
                        {
                            "emoji": k,
                            "count": v["count"],
                            "user_emails": v["emails"]
                        } for k, v in reaction_map.items()
                    ],
                    "is_forwarded": getattr(msg_obj, 'is_forwarded', False),
                    "is_deleted": getattr(msg_obj, 'is_deleted', False),
                    "link_url": getattr(msg_obj, 'link_url', None),
                    "link_title": getattr(msg_obj, 'link_title', None),
                    "link_description": getattr(msg_obj, 'link_description', None),
                    "link_image": getattr(msg_obj, 'link_image', None)
                })

            results.reverse() 
            return results, None

        except Exception as e:
            return None, str(e)
            
    data, error_msg = await fetch_and_format()

    if error_msg:
        if error_msg == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="You are not a participant of this room")
        if error_msg == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Room not found")
        raise HTTPException(status_code=400, detail=error_msg)

    return data

@router.patch("/messages/{message_id}", response_model=MessageRead)
async def edit_message(message_id: int, data: MessageUpdate, current_user: User = Depends(get_current_user)
):
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
 
    @sync_to_async
    def process_edit():
        try:
            try:
                msg_info = ChatMessage.objects.filter(id=message_id).values('sender_id', 'room_id', 'is_deleted').get()
            except ChatMessage.DoesNotExist:
                return None, "Message not found"

            membership = ChatRoomParticipant.objects.filter(
                room_id=msg_info['room_id'], user=current_user
            ).first()
            
            if not membership or membership.left_at is not None:
                return None, "ARCHIVED"
 
            if msg_info['sender_id'] != current_user.id:
                return None, "You can only edit your own messages"

            if msg_info['is_deleted']:
                return None, "Cannot edit a deleted message"

            with transaction.atomic():
                ChatMessage.objects.filter(id=message_id).update(content=sanitize_rich_text(data.content))

                read_count_subquery = ChatRoomParticipant.objects.filter(
                    room_id=OuterRef('room_id'),
                    last_read_message_id__gte=OuterRef('pk')
                ).exclude(
                    user=OuterRef('sender_id') 
                ).values('room_id').annotate(cnt=Count('id')).values('cnt')

                msg = ChatMessage.objects.select_related(
                    'sender', 'sender__profile', 'parent', 'parent__sender', 'room'
                ).prefetch_related(
                    'reactions', 'reactions__user', 'starred_by', 'file_attachments'  
                ).annotate(
                    annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
                    user_starred=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), starred_by=current_user)),
                    user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
                ).get(id=message_id)

            reaction_map = {}
            for r in msg.reactions.all():
                if r.emoji not in reaction_map:
                    reaction_map[r.emoji] = {"count": 0, "emails": []}
                reaction_map[r.emoji]["count"] += 1
                reaction_map[r.emoji]["emails"].append(r.user.email)
 
            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": getattr(att, 'file_type', 'FILE')
                } for att in msg.file_attachments.all()
            ]

            avatar_img = None
            if hasattr(msg.sender, 'profile') and msg.sender.profile and msg.sender.profile.avatar:
                try:
                    avatar_img = msg.sender.profile.avatar.url
                except Exception:
                    avatar_img = None

            first_initial = msg.sender.first_name[:1] if msg.sender.first_name else ''
            last_initial = msg.sender.last_name[:1] if msg.sender.last_name else ''
            initials = (first_initial + last_initial).upper() or msg.sender.email[:2].upper()
 
            response_payload = {
                "type": "MESSAGE",
                "id": msg.id,
                "room_id": msg.room_id,
                "room_name": msg.room.name or "Group Chat",
                "sender_id": msg.sender.id,
                "sender_email": msg.sender.email,
                "sender": {
                    "id": msg.sender.id,
                    "email": msg.sender.email,
                    "first_name": msg.sender.first_name or "",
                    "last_name": msg.sender.last_name or "",
                    "profile_image": avatar_img,
                    "initials": initials
                },
                "content": msg.content,
                "attachments": formatted_attachments,  
                "timestamp": msg.timestamp,  
                "read_count": msg.annotated_read_count, 
                "is_starred": getattr(msg, 'user_starred', False),
                "is_own_message": True,
                "is_saved": getattr(msg, 'user_saved', False),
                "is_pinned": getattr(msg, 'is_pinned', False),
                "is_deleted": getattr(msg, 'is_deleted', False),
                "message_link": f"/chat/rooms/{msg.room_id}?message_id={msg.id}",
                "parent_id": msg.parent.id if msg.parent else None,
                "parent_content": msg.parent.content if msg.parent else None,
                "parent_sender": msg.parent.sender.email if msg.parent else None,
                "reactions": [
                    {"emoji": k, "count": v["count"], "user_emails": v["emails"]}
                    for k, v in reaction_map.items()
                ],
                "is_forwarded": getattr(msg, 'is_forwarded', False),
                "link_url": getattr(msg, 'link_url', None),
                "link_title": getattr(msg, 'link_title', None),
                "link_description": getattr(msg, 'link_description', None),
                "link_image": getattr(msg, 'link_image', None)
            }
 
            return response_payload, None

        except Exception as e:
            return None, str(e)

    response_data, error_msg = await process_edit()
    
    if error_msg:
        if error_msg == "Message not found":
            raise HTTPException(status_code=404, detail=error_msg)
        elif error_msg == "ARCHIVED":
            raise HTTPException(status_code=403, detail="Cannot edit messages in an archived room")
        else:
            raise HTTPException(status_code=400, detail=error_msg)
            
    return response_data

@router.post("/rooms/{room_id}/read")
async def mark_room_as_read(room_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_read_receipts():
        try:
            with transaction.atomic():
                membership = ChatRoomParticipant.objects.select_related('user__chat_settings').get(
                    room_id=room_id, 
                    user=current_user
                )
                
                user_settings = getattr(membership.user, 'chat_settings', None)
                if user_settings and not user_settings.read_receipts:
                    return "RECEIPTS_DISABLED", None

                if membership.left_at is not None:
                    return "ARCHIVED", []
                
                latest_msg = ChatMessage.objects.filter(
                    room_id=room_id,
                    is_deleted=False
                ).order_by('-id').first()
                
                if not latest_msg:
                    return 0, []

                old_last_read_id = membership.last_read_message_id or 0

                if old_last_read_id >= latest_msg.id:
                    return 0, []

                unread_qs = ChatMessage.objects.filter(
                    room_id=room_id,
                    is_deleted=False,
                    id__gt=old_last_read_id,
                    id__lte=latest_msg.id
                ).exclude(
                    sender=current_user
                )
                
                unread_msg_ids = list(unread_qs.values_list('id', flat=True))
                count = len(unread_msg_ids)

                membership.last_read_message_id = latest_msg.id
                membership.save(update_fields=['last_read_message_id'])
                    
                return count, unread_msg_ids

        except ChatRoomParticipant.DoesNotExist:
            if not ChatRoom.objects.filter(id=room_id).exists():
                return "NOT_FOUND", None
            return "FORBIDDEN", None
            
        except Exception as e:
            print("READ RECEIPT ERROR:", str(e))
            return 0, []
        
    result, msg_ids = await process_read_receipts()

    if result == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Room not found")
    if result == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="You are not a participant of this room")
    
    if result == "RECEIPTS_DISABLED":
        return {
            "status": False,
            "message": "Read receipts are disabled in your settings. Unread count was not updated.",
            "updated_count": 0,
            "room_id": room_id
        }
    if result == "ARCHIVED":
        return {
            "status": False,
            "message": "Room is archived. Unread tracking is suspended.", 
            "updated_count": 0,
            "room_id": room_id
        }
    
    if isinstance(result, int) and result > 0:
        await manager.broadcast({
            "type": "MESSAGES_READ",
            "room_id": room_id,
            "reader_id": current_user.id,
            "reader_email": current_user.email,
            "message_ids": msg_ids,
            "count": result,
            "timestamp": timezone.now().replace(microsecond=0).isoformat() 
        }, room_id)

    return {
        "status": True,
        "message": "Messages marked as read successfully",
        "updated_count": result if isinstance(result, int) else 0,
        "room_id": room_id
    }
    
@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int, 
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_soft_delete():
        try:
            msg = ChatMessage.objects.select_related('room').get(id=message_id)
        except ChatMessage.DoesNotExist:
            return None, "NOT_FOUND"

        if msg.sender_id != current_user.id:
            return None, "FORBIDDEN"

        if msg.is_deleted:
            return None, "ALREADY_DELETED"

        with transaction.atomic():
            msg.is_deleted = True
            msg.save(update_fields=['is_deleted'])
                
            room = msg.room
            if room.last_message_id == msg.id:
                previous_msg = ChatMessage.objects.filter(
                    room_id=room.id, 
                    is_deleted=False
                ).order_by('-id').first() 
                
                room.last_message = previous_msg
                room.save(update_fields=['last_message'])

        return room.id, None

    room_id, error_type = await process_soft_delete()
    
    if error_type:
        if error_type == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Message not found")
        if error_type == "ALREADY_DELETED":
            raise HTTPException(status_code=400, detail="Message has already been deleted")
        if error_type == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="You can only delete your own messages")
        raise HTTPException(status_code=400, detail=error_type)

    try:
        await manager.broadcast({
            "type": "MESSAGE_DELETE",
            "message_id": message_id,
            "room_id": room_id,
            "mode": "soft", 
            "sender_id": current_user.id
        }, room_id)
    except Exception:
        pass

    return {"status": "success", "message": "Message deleted successfully", "id": message_id}

@router.post("/messages/{message_id}/restore")
async def restore_message(
    message_id: int, 
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_restore():
        try:
            try:
                msg = ChatMessage.objects.select_related(
                    'room', 'sender', 'sender__profile', 'parent', 'parent__sender'
                ).prefetch_related(
                    'reactions', 'reactions__user', 'starred_by', 'file_attachments'  
                ).get(id=message_id)
            except ChatMessage.DoesNotExist:
                return None, "NOT_FOUND"

            if msg.sender_id != current_user.id:
                return None, "FORBIDDEN"

            if not msg.is_deleted:
                return None, "ALREADY_ACTIVE"

            with transaction.atomic():
                msg.is_deleted = False
                msg.save(update_fields=['is_deleted'])
                
                room = msg.room
                current_last_msg = room.last_message

                if not current_last_msg or msg.timestamp > current_last_msg.timestamp:
                    room.last_message = msg
                    room.save(update_fields=['last_message'])
            
            read_count_subquery = ChatRoomParticipant.objects.filter(
                room_id=OuterRef('room_id'),
                last_read_message_id__gte=OuterRef('pk')
            ).exclude(
                user=OuterRef('sender_id')  
            ).values('room_id').annotate(cnt=Count('id')).values('cnt')

            annotated_msg = ChatMessage.objects.annotate(
                annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
                user_starred=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), starred_by=current_user)),
                user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
            ).get(id=message_id)

            reaction_map = {}
            for r in msg.reactions.all():
                if r.emoji not in reaction_map:
                    reaction_map[r.emoji] = {"count": 0, "emails": []}
                reaction_map[r.emoji]["count"] += 1
                reaction_map[r.emoji]["emails"].append(r.user.email)

            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": getattr(att, 'file_type', 'FILE')
                } for att in msg.file_attachments.all()
            ]

            avatar_img = None
            if hasattr(msg.sender, 'profile') and msg.sender.profile and msg.sender.profile.avatar:
                try:
                    avatar_img = msg.sender.profile.avatar.url
                except Exception:
                    avatar_img = None

            first_initial = msg.sender.first_name[:1] if msg.sender.first_name else ''
            last_initial = msg.sender.last_name[:1] if msg.sender.last_name else ''
            initials = (first_initial + last_initial).upper() or msg.sender.email[:2].upper()

            response_payload = {
                "id": msg.id,
                "room_id": msg.room_id,
                "room_name": msg.room.name or "Group Chat",
                "sender_id": msg.sender.id,
                "sender_email": msg.sender.email,
                "sender": {
                    "id": msg.sender.id,
                    "email": msg.sender.email,
                    "first_name": msg.sender.first_name or "",
                    "last_name": msg.sender.last_name or "",
                    "profile_image": avatar_img,
                    "initials": initials
                },
                "content": msg.content,
                "attachments": formatted_attachments,  
                "timestamp": msg.timestamp.isoformat() if hasattr(msg.timestamp, 'isofomat') else str(msg.timestamp), 
                "read_count": annotated_msg.annotated_read_count,
                "is_starred": getattr(annotated_msg, 'user_starred', False),
                "is_own_message": True,
                "is_saved": getattr(annotated_msg, 'user_saved', False),
                "is_pinned": getattr(msg, 'is_pinned', False),
                "message_link": f"/chat/rooms/{msg.room_id}?message_id={msg.id}",
                "parent_id": msg.parent.id if msg.parent else None,
                "parent_content": msg.parent.content if msg.parent else None,
                "parent_sender": msg.parent.sender.email if msg.parent else None,
                "reactions": [
                    {"emoji": k, "count": v["count"], "user_emails": v["emails"]}
                    for k, v in reaction_map.items()
                ],
                "is_forwarded": getattr(msg, 'is_forwarded', False),
                "is_deleted": False,
                "link_url": getattr(msg, 'link_url', None),
                "link_title": getattr(msg, 'link_title', None),
                "link_description": getattr(msg, 'link_description', None),
                "link_image": getattr(msg, 'link_image', None)
            }
            
            return response_payload, None

        except Exception as e:
            return None, str(e)

    response_data, error_type = await process_restore()

    if error_type:
        if error_type == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Message not found")
        if error_type == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Permission denied")
        if error_type == "ALREADY_ACTIVE":
            return {"status": "info", "message": "Message is already active"}
        raise HTTPException(status_code=400, detail=error_type)

    try:
        await manager.broadcast({
            "type": "MESSAGE_RESTORE",
            **response_data
        }, response_data["room_id"])
    except Exception:
        pass

    return {"status": "success", "message": "Message restored successfully", "id": response_data["id"]}

@router.post("/messages/{message_id}/star")
async def star_message(message_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_star_message():
        try:
            msg = ChatMessage.objects.prefetch_related('starred_by').get(
                id=message_id, 
                is_deleted=False
            )
            
            try:
                membership = ChatRoomParticipant.objects.get(room_id=msg.room_id, user=current_user)
            except ChatRoomParticipant.DoesNotExist:
                return None, "Access denied"

            if membership.left_at is not None and msg.timestamp > membership.left_at:
                return None, "Access denied"

            with transaction.atomic():
                if current_user in msg.starred_by.all():
                    msg.starred_by.remove(current_user)
                    is_starred = False
                else:
                    msg.starred_by.add(current_user)
                    is_starred = True
                
            return is_starred, None
                
        except ChatMessage.DoesNotExist:
            return None, "Message not found"
        except DatabaseError as db_error:
            return None, f"Database error: {str(db_error)}"
        except Exception as e:
            return None, str(e)

    is_starred, error = await process_star_message()

    if error:
        status_code = 404 if "not found" in error else 403 if "denied" in error else 500
        raise HTTPException(status_code=status_code, detail=error)
 
    return {
        "status": "success",
        "message": "Message starred successfully" if is_starred else "Message unstarred successfully",
        "data": {
            "message_id": message_id,
            "is_starred": is_starred
        }
    }
       
@router.post("/messages/{message_id}/unread")
async def mark_as_unread(message_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_unread():
        try:
            msg = ChatMessage.objects.get(id=message_id, is_deleted=False)
            
            try:
                membership = ChatRoomParticipant.objects.get(room_id=msg.room_id, user=current_user)
                
                if membership.left_at is not None and msg.timestamp > membership.left_at:
                    return "ARCHIVED", None
            except ChatRoomParticipant.DoesNotExist:
                return "FORBIDDEN", None

            with transaction.atomic():
                previous_msg_filter = ChatMessage.objects.filter(
                    room_id=msg.room_id,
                    is_deleted=False,
                    id__lt=msg.id
                )
                
                if membership.left_at is not None:
                    previous_msg_filter = previous_msg_filter.filter(timestamp__lte=membership.left_at)
                    
                previous_msg = previous_msg_filter.order_by('-id').first()

                if previous_msg:
                    membership.last_read_message_id = previous_msg.id
                else:
                    membership.last_read_message_id = None
                    
                membership.save(update_fields=['last_read_message_id'])
            
            return "SUCCESS", msg.room_id
            
        except ChatMessage.DoesNotExist:
            return "NOT_FOUND", None
        except Exception as e:
            return "ERROR", str(e)
        
    result, room_id = await process_unread()

    if result != "SUCCESS":
        if result == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Message not found")
        if result == "ARCHIVED":
            raise HTTPException(status_code=403, detail="You cannot mark messages sent after your departure timeline window as unread.")
        if result == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="You are not an active participant in this chat")
        raise HTTPException(status_code=500, detail=f"Internal server error: {room_id}")
    
    await manager.broadcast({
        "type": "ROOM_UNREAD_UPDATE",
        "message_id": message_id,
        "room_id": room_id,
        "user_id": current_user.id,
        "action": "marked_unread"
    }, room_id)
    
    return {
        "status": "success", 
        "message": "Message marked as unread successfully"
    }

@router.patch("/messages/{message_id}/pin", response_model=MessageRead)
async def pin_message(message_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_pin():
        try:
            try:
                msg_meta = ChatMessage.objects.filter(id=message_id, is_deleted=False).values('id', 'room_id', 'is_pinned', 'timestamp').get()
            except ChatMessage.DoesNotExist:
                return None, "Message not found"

            try:
                membership = ChatRoomParticipant.objects.get(room_id=msg_meta['room_id'], user=current_user)
                
                if membership.left_at is not None:
                    if msg_meta['timestamp'] > membership.left_at:
                        return None, "Not authorized to modify messages outside your timeline window"
                    return None, "ARCHIVED"
                    
            except ChatRoomParticipant.DoesNotExist:
                return None, "Not authorized"

            with transaction.atomic():
                new_pin_state = not msg_meta['is_pinned']
                ChatMessage.objects.filter(id=message_id).update(is_pinned=new_pin_state)

                read_count_subquery = ChatRoomParticipant.objects.filter(
                    room_id=OuterRef('room_id'),
                    last_read_message_id__gte=OuterRef('pk')
                ).exclude(
                    user=OuterRef('sender_id')
                ).values('room_id').annotate(cnt=Count('id')).values('cnt')

                msg = ChatMessage.objects.select_related(
                    "sender", "sender__profile", "parent", "parent__sender", "room"
                ).prefetch_related(
                    "reactions", "reactions__user", "starred_by", "file_attachments"  
                ).annotate(
                    annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
                    user_starred=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), starred_by=current_user)),
                    user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
                ).get(id=message_id)

            reaction_map = {}
            for r in msg.reactions.all():
                if r.emoji not in reaction_map:
                    reaction_map[r.emoji] = {"count": 0, "emails": []}
                reaction_map[r.emoji]["count"] += 1
                reaction_map[r.emoji]["emails"].append(r.user.email)
     
            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": getattr(att, 'file_type', 'FILE')
                } for att in msg.file_attachments.all()
            ]

            avatar_img = None
            if hasattr(msg.sender, 'profile') and msg.sender.profile and msg.sender.profile.avatar:
                try:
                    avatar_img = msg.sender.profile.avatar.url
                except Exception:
                    avatar_img = None

            first_initial = msg.sender.first_name[:1] if msg.sender.first_name else ''
            last_initial = msg.sender.last_name[:1] if msg.sender.last_name else ''
            initials = (first_initial + last_initial).upper() or msg.sender.email[:2].upper()

            response_payload = {
                "type": "MESSAGE",
                "id": msg.id,
                "room_id": msg.room_id,
                "room_name": msg.room.name or "Group Chat",
                "sender_id": msg.sender.id,
                "sender_email": msg.sender.email,
                "sender": {
                    "id": msg.sender.id,
                    "email": msg.sender.email,
                    "first_name": msg.sender.first_name or "",
                    "last_name": msg.sender.last_name or "",
                    "profile_image": avatar_img,
                    "initials": initials
                },
                "content": msg.content,
                "attachments": formatted_attachments,   
                "timestamp": msg.timestamp.isoformat() if hasattr(msg.timestamp, 'isoformat') else str(msg.timestamp),  
                "read_count": msg.annotated_read_count,
                "is_starred": getattr(msg, 'user_starred', False),
                "is_saved": getattr(msg, 'user_saved', False),
                "is_pinned": msg.is_pinned,
                "is_own_message": (msg.sender_id == current_user.id),
                "message_link": f"/chat/rooms/{msg.room_id}?message_id={msg.id}",
                "parent_id": msg.parent.id if msg.parent else None,
                "parent_content": msg.parent.content if msg.parent else None,
                "parent_sender": msg.parent.sender.email if msg.parent else None,
                "reactions": [
                    {"emoji": k, "count": v["count"], "user_emails": v["emails"]}
                    for k, v in reaction_map.items()
                ],
                "is_forwarded": getattr(msg, 'is_forwarded', False),
                "is_deleted": msg.is_deleted,
                "event_type": "MESSAGE_PINNED" if msg.is_pinned else "MESSAGE_UNPINNED",
                "link_url": getattr(msg, 'link_url', None),
                "link_title": getattr(msg, 'link_title', None),
                "link_description": getattr(msg, 'link_description', None),
                "link_image": getattr(msg, 'link_image', None)
            }

            return response_payload, None

        except Exception as e:
            return None, str(e)

    response_data, error_msg = await process_pin()

    if error_msg:
        if error_msg == "ARCHIVED":
            raise HTTPException(status_code=403, detail="You have left this room and cannot pin or unpin messages.")
        status_code = 403 if "authorized" in error_msg or "timeline" in error_msg else 404
        raise HTTPException(status_code=status_code, detail=error_msg)

    try:
        await manager.broadcast({
            "type": response_data["event_type"],
            "message_id": response_data["id"],
            "room_id": response_data["room_id"],
            "is_pinned": response_data["is_pinned"],
            "message_data": response_data
        }, response_data["room_id"])
    except Exception:
        pass

    return response_data

@router.get("/rooms/{room_id}/pinned", response_model=List[MessageRead])
async def get_pinned_messages(room_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def fetch_and_format_pinned():
        if not ChatRoom.objects.filter(id=room_id).exists():
            return "NOT_FOUND", None
        
        try:
            membership = ChatRoomParticipant.objects.get(room_id=room_id, user=current_user)
        except ChatRoomParticipant.DoesNotExist:
            return "FORBIDDEN", None

        filters = Q(room_id=room_id, is_deleted=False, is_pinned=True)

        if membership.left_at is not None:
            filters &= Q(timestamp__lte=membership.left_at)

        read_count_subquery = ChatRoomParticipant.objects.filter(
            room_id=OuterRef('room_id'),
            last_read_message_id__gte=OuterRef('pk')
        ).exclude(
            user=OuterRef('sender_id')
        ).values('room_id').annotate(cnt=Count('id')).values('cnt')

        msgs = ChatMessage.objects.filter(filters).select_related(
            "sender", "sender__profile", "parent", "parent__sender", "room"
        ).prefetch_related(
            "reactions", "reactions__user", "starred_by", "file_attachments"  
        ).annotate(
            annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
            user_starred=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), starred_by=current_user)),
            user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
        ).order_by("-timestamp")
 
        results = []
        for m in msgs:
            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": getattr(att, 'file_type', 'FILE')
                } for att in m.file_attachments.all()
            ]

            reaction_map = {}
            for r in m.reactions.all():
                if r.emoji not in reaction_map:
                    reaction_map[r.emoji] = {"count": 0, "emails": []}
                reaction_map[r.emoji]["count"] += 1
                reaction_map[r.emoji]["emails"].append(r.user.email)
 
            profile_image = None
            if hasattr(m.sender, 'profile') and m.sender.profile and m.sender.profile.avatar:
                try:
                    profile_image = m.sender.profile.avatar.url
                except Exception:
                    profile_image = None

            first_initial = m.sender.first_name[:1] if m.sender.first_name else ''
            last_initial = m.sender.last_name[:1] if m.sender.last_name else ''
            initials = (first_initial + last_initial).upper() or m.sender.email[:2].upper()

            results.append({
                "type": "MESSAGE",
                "id": m.id,
                "room_id": room_id,
                "room_name": m.room.name or "Group Chat",
                "sender_id": m.sender.id,
                "sender_email": m.sender.email,
                "sender": {
                    "id": m.sender.id,
                    "email": m.sender.email,
                    "first_name": m.sender.first_name or "",
                    "last_name": m.sender.last_name or "",
                    "profile_image": profile_image,
                    "initials": initials
                },
                "content": m.content,
                "attachments": formatted_attachments,  
                "timestamp": m.timestamp.isoformat() if hasattr(m.timestamp, 'isoformat') else str(m.timestamp),  
                "is_own_message": (m.sender.id == current_user.id),
                "read_count": m.annotated_read_count,
                "is_starred": getattr(m, 'user_starred', False),
                "is_saved": getattr(m, 'user_saved', False),
                "is_pinned": True,
                "is_deleted": getattr(m, 'is_deleted', False),
                "is_forwarded": getattr(m, 'is_forwarded', False),
                "message_link": f"/chat/rooms/{room_id}?message_id={m.id}",
                "parent_id": m.parent.id if m.parent else None,
                "parent_content": m.parent.content if m.parent else None,
                "parent_sender": m.parent.sender.email if m.parent else None,
                "reactions": [
                    {"emoji": k, "count": v["count"], "user_emails": v["emails"]}
                    for k, v in reaction_map.items()
                ],
                "link_url": getattr(m, 'link_url', None),
                "link_title": getattr(m, 'link_title', None),
                "link_description": getattr(m, 'link_description', None),
                "link_image": getattr(m, 'link_image', None)
            })
 
        return "SUCCESS", results
 
    status_code_flag, data = await fetch_and_format_pinned()
 
    if status_code_flag == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Room not found")
    if status_code_flag == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="Not authorized to view this room")
 
    return data
 
@router.post("/messages/{message_id}/share", response_model=MessageRead)
async def share_message(message_id: int, payload: ForwardRequest, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_share():
        try:
            try:
                original_msg = ChatMessage.objects.prefetch_related(
                    "file_attachments"
                ).select_related("room").get(id=message_id, is_deleted=False)
            except ChatMessage.DoesNotExist:
                return None, "Original message not found"

            src_membership = ChatRoomParticipant.objects.filter(
                room_id=original_msg.room_id, user=current_user
            ).first()
            if not src_membership:
                return None, "Not authorized to share this message"
            
            if src_membership.left_at is not None and original_msg.timestamp > src_membership.left_at:
                return None, "Not authorized to share this message (Timeline Violation)"

            target_room = ChatRoom.objects.filter(id=payload.target_room_id).first()

            if not target_room:
                try:
                    target_user = User.objects.get(id=payload.target_room_id)
                except User.DoesNotExist:
                    return None, "Target room or user not found"

                if target_user.id == current_user.id:
                    return None, "You cannot forward a message to yourself"

                target_room = ChatRoom.objects.filter(
                    is_group=False,
                    room_memberships__user=current_user
                ).filter(
                    room_memberships__user=target_user
                ).distinct().first()

                if not target_room:
                    with transaction.atomic():
                        target_room = ChatRoom.objects.create(is_group=False)
                        ChatRoomParticipant.objects.create(room=target_room, user=current_user)
                        ChatRoomParticipant.objects.create(room=target_room, user=target_user)

            target_membership = ChatRoomParticipant.objects.filter(
                room=target_room, user=current_user
            ).first()
            if not target_membership or target_membership.left_at is not None:
                return None, "You are not an active member of the target room"

            with transaction.atomic():
                new_msg = ChatMessage.objects.create(
                    room=target_room,
                    sender=current_user,
                    content=original_msg.content,
                    is_forwarded=True,
                    message_type=original_msg.message_type,
                    link_url=getattr(original_msg, 'link_url', None),
                    link_title=getattr(original_msg, 'link_title', None),
                    link_description=getattr(original_msg, 'link_description', None),
                    link_image=getattr(original_msg, 'link_image', None)
                )

                old_attachments = original_msg.file_attachments.all()
                new_attachments_pool = [
                    ChatMessageAttachment(
                        message=new_msg,
                        file=att.file,
                        filename=att.filename,
                        file_type=att.file_type
                    ) for att in old_attachments
                ]
                
                if new_attachments_pool:
                    ChatMessageAttachment.objects.bulk_create(new_attachments_pool)
                    attachments_to_serialize = new_msg.file_attachments.all()
                else:
                    attachments_to_serialize = []

                target_room.last_message = new_msg
                target_room.save(update_fields=['last_message'])

                target_membership.last_read_message_id = new_msg.id
                target_membership.save(update_fields=['last_read_message_id'])

            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": att.file_type
                } for att in attachments_to_serialize
            ]

            avatar_img = None
            if hasattr(current_user, 'profile') and current_user.profile and current_user.profile.avatar:
                try:
                    avatar_img = current_user.profile.avatar.url
                except Exception:
                    avatar_img = None

            first_initial = current_user.first_name[:1] if current_user.first_name else ''
            last_initial = current_user.last_name[:1] if current_user.last_name else ''
            initials = (first_initial + last_initial).upper() or current_user.email[:2].upper()

            socket_payload = {
                "type": "MESSAGE",
                "id": new_msg.id,
                "room_id": target_room.id,
                "room_name": target_room.name or "Group Chat",
                "sender_id": current_user.id,
                "sender_email": current_user.email,
                "sender": {
                    "id": current_user.id,
                    "email": current_user.email,
                    "first_name": current_user.first_name or "",
                    "last_name": current_user.last_name or "",
                    "profile_image": avatar_img,
                    "initials": initials
                },
                "content": new_msg.content,
                "attachments": formatted_attachments,  
                "timestamp": new_msg.timestamp.isoformat() if hasattr(new_msg.timestamp, 'isoformat') else str(new_msg.timestamp),  
                "read_count": 0,
                "is_own_message": True,
                "is_starred": False,
                "is_saved": False,
                "is_pinned": False,
                "is_deleted": False,
                "is_forwarded": True,
                "message_link": f"/chat/rooms/{target_room.id}?message_id={new_msg.id}",
                "reactions": [],
                "parent_id": None,
                "parent_content": None,
                "parent_sender": None,
                "link_url": new_msg.link_url,
                "link_title": new_msg.link_title,
                "link_description": new_msg.link_description,
                "link_image": new_msg.link_image
            }

            return socket_payload, None

        except Exception as e:
            return None, str(e)

    socket_message, error_msg = await process_share()

    if error_msg:
        status_code = 403 if "authorized" in error_msg or "member" in error_msg else 404 if "not found" in error_msg else 400
        raise HTTPException(status_code=status_code, detail=error_msg)
        
    try:
        await manager.broadcast(socket_message, socket_message["room_id"])
    except Exception:
        pass
        
    return socket_message
        
@router.get("/starred", response_model=List[MessageRead], status_code=status.HTTP_200_OK)
async def get_my_starred_messages(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def fetch_starred_messages():
        try:
            read_count_subquery = ChatRoomParticipant.objects.filter(
                room_id=OuterRef('room_id'),
                last_read_message_id__gte=OuterRef('pk')
            ).exclude(
                user=OuterRef('sender_id') 
            ).values('room_id').annotate(cnt=Count('id')).values('cnt')

            room_visibility_filter = Q(room__room_memberships__user=current_user) & (
                Q(room__room_memberships__left_at__isnull=True) |
                Q(timestamp__lte=F('room__room_memberships__left_at'))
            )

            base_queryset = ChatMessage.objects.filter(
                room_visibility_filter,
                starred_by=current_user,
                is_deleted=False
            ).select_related(
                "sender", "sender__profile", "parent", "parent__sender", "room"
            ).prefetch_related(
                "reactions", "reactions__user", "file_attachments"
            ).annotate(
                annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
                user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
            ).order_by("-timestamp")

            paginated_messages = list(base_queryset[offset: offset + limit])
            response_data = []

            for message in paginated_messages:
                formatted_attachments = [
                    {
                        "id": att.id,
                        "url": att.file.url,
                        "filename": att.filename,
                        "file_type": att.file_type
                    } for att in message.file_attachments.all()
                ]

                reaction_map = {}
                for reaction in message.reactions.all():
                    if reaction.emoji not in reaction_map:
                        reaction_map[reaction.emoji] = {
                            "count": 0,
                            "emails": []
                        }
                    reaction_map[reaction.emoji]["count"] += 1
                    reaction_map[reaction.emoji]["emails"].append(reaction.user.email)

                profile_image = None
                if hasattr(message.sender, 'profile') and message.sender.profile and message.sender.profile.avatar:
                    try:
                        profile_image = message.sender.profile.avatar.url
                    except Exception:
                        profile_image = None

                first_initial = message.sender.first_name[:1] if message.sender.first_name else ''
                last_initial = message.sender.last_name[:1] if message.sender.last_name else ''
                initials = (first_initial + last_initial).upper() or message.sender.email[:2].upper()

                response_data.append({
                    "type": "MESSAGE",
                    "id": message.id,
                    "room_id": message.room_id,
                    "room_name": message.room.name or "Group Chat",
                    "sender_id": message.sender.id,
                    "sender_email": message.sender.email,
                    "sender": {
                        "id": message.sender.id,
                        "email": message.sender.email,
                        "first_name": message.sender.first_name or "",
                        "last_name": message.sender.last_name or "",
                        "profile_image": profile_image,
                        "initials": initials
                    },
                    "content": message.content,
                    "attachments": formatted_attachments,  
                    "timestamp": message.timestamp,  
                    "read_count": message.annotated_read_count,
                    "is_starred": True,
                    "is_own_message": (message.sender_id == current_user.id),
                    "is_pinned": getattr(message, 'is_pinned', False),
                    "is_saved": getattr(message, 'user_saved', False),
                    "message_link": f"/chat/rooms/{message.room_id}?message_id={message.id}",
                    "parent_id": message.parent.id if message.parent else None,
                    "parent_content": message.parent.content if message.parent else None,
                    "parent_sender": message.parent.sender.email if message.parent else None,
                    "reactions": [
                        {
                            "emoji": k,
                            "count": v["count"],
                            "user_emails": v["emails"]
                        } for k, v in reaction_map.items()
                    ],
                    "is_forwarded": getattr(message, 'is_forwarded', False),
                    "is_deleted": getattr(message, 'is_deleted', False),
                    "link_url": getattr(message, 'link_url', None),
                    "link_title": getattr(message, 'link_title', None),
                    "link_description": getattr(message, 'link_description', None),
                    "link_image": getattr(message, 'link_image', None)
                })
            return response_data

        except DatabaseError as db_error:
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(db_error)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

    return await fetch_starred_messages()
 
@router.post("/rooms/{room_id}/upload", response_model=MessageRead)
async def upload_chat_attachments(room_id: int,files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided for upload.")
        
    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="One or more uploaded files are missing filenames.")

    @sync_to_async
    def verify_upload_authorization():
        try:
            room = ChatRoom.objects.get(id=room_id)
            try:
                membership = ChatRoomParticipant.objects.get(room=room, user=current_user)
                if membership.left_at is not None:
                    return "ARCHIVED", None
                return "ALLOWED", room
            except ChatRoomParticipant.DoesNotExist:
                return "FORBIDDEN", None
        except ChatRoom.DoesNotExist:
            return "NOT_FOUND", None

    auth_status, room_obj = await verify_upload_authorization()
    
    if auth_status == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Room not found")
    if auth_status == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="Not a participant of this room")
    if auth_status == "ARCHIVED":
        raise HTTPException(status_code=403, detail="You have left this room and cannot upload files.")

    prepared_files = []
    for file in files:
        content = await file.read()
        prepared_files.append({
            "filename": file.filename,
            "content": content
        })

    @sync_to_async
    def process_multiple_uploads_in_db(room, file_payloads):
        try:
            with transaction.atomic():
                count = len(file_payloads)
                content_text = f"Sent {count} attachments" if count > 1 else f"Sent an attachment: {file_payloads[0]['filename']}"
                
                msg = ChatMessage.objects.create(
                    room=room,
                    sender=current_user,
                    content=content_text,
                    message_type='MEDIA'  
                )

                formatted_attachments = []

                for payload in file_payloads:
                    filename = payload["filename"]
                    mime_type, _ = mimetypes.guess_type(filename)
                    is_image = mime_type and mime_type.startswith('image/')
                    f_type = 'IMAGE' if is_image else 'FILE'

                    attachment_obj = ChatMessageAttachment(
                        message=msg,
                        filename=filename,  
                        file_type=f_type
                    )
    
                    attachment_obj.file.save(filename, ContentFile(payload["content"]), save=True)
                    
                    formatted_attachments.append({
                        "id": attachment_obj.id,
                        "url": attachment_obj.file.url,
                        "filename": attachment_obj.filename,  
                        "file_type": attachment_obj.file_type
                    })

                room.last_message = msg
                room.save(update_fields=['last_message'])
                
                ChatRoomParticipant.objects.filter(room=room, user=current_user).update(
                    last_read_message_id=msg.id
                )
                
                active_recipients = User.objects.filter(
                    user_memberships__room=room,
                    user_memberships__left_at__isnull=True
                ).exclude(id=current_user.id).select_related('chat_settings')
                
                recipient_ids = [p.id for p in active_recipients]
                settings_map = {
                    s.user_id: s for s in UserChatSettings.objects.filter(user_id__in=recipient_ids)
                }

                notifications = []
                for p in active_recipients:
                    p_settings = settings_map.get(p.id)
                    if getattr(p_settings, 'chat_push_enabled', True):
                        notifications.append(
                            Notification(
                                recipient=p,
                                message=f"New attachments from {current_user.first_name or current_user.email}",
                                notification_type="chat"
                            )
                        )
                if notifications:
                    Notification.objects.bulk_create(notifications)

                profile_image = None
                if hasattr(current_user, 'profile') and current_user.profile and current_user.profile.avatar:
                    try:
                        profile_image = current_user.profile.avatar.url
                    except Exception:
                        profile_image = None

                first_initial = current_user.first_name[:1] if current_user.first_name else ''
                last_initial = current_user.last_name[:1] if current_user.last_name else ''
                initials = (first_initial + last_initial).upper() or current_user.email[:2].upper()

                response_payload = {
                    "type": "MESSAGE",
                    "id": msg.id,
                    "room_id": room.id,
                    "room_name": room.name or "Group Chat",
                    "sender_id": current_user.id,
                    "sender_email": msg.sender.email,
                    "sender": {
                        "id": current_user.id,
                        "email": current_user.email,
                        "first_name": current_user.first_name or "",
                        "last_name": current_user.last_name or "",
                        "profile_image": profile_image,
                        "initials": initials
                    },
                    "content": msg.content,
                    "attachments": formatted_attachments,  
                    "timestamp": msg.timestamp,  
                    "is_own_message": True,
                    "read_count": 0,
                    "is_starred": False,
                    "is_saved": False,
                    "is_pinned": False,
                    "is_deleted": False,
                    "is_forwarded": False,
                    "message_link": f"/chat/rooms/{room.id}?message_id={msg.id}",
                    "reactions": [],
                    "parent_id": None,
                    "parent_content": None,
                    "parent_sender": None,
                    "link_url": None,
                    "link_title": None,
                    "link_description": None,
                    "link_image": None
                }
                
                return response_payload, None

        except Exception as e:
            return None, str(e)

    response_data, db_error = await process_multiple_uploads_in_db(room_obj, prepared_files)

    if db_error:
        raise HTTPException(status_code=500, detail=db_error)
 
    await manager.broadcast({
        "type": "message_create",
        **response_data,
        "timestamp": response_data["timestamp"].isoformat() if hasattr(response_data["timestamp"], 'isoformat') else str(response_data["timestamp"])
    }, room_id)

    return response_data


@router.get("/rooms/{room_id}/media")
async def get_room_media(
    room_id: int, 
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def fetch_media():
        if not ChatRoom.objects.filter(id=room_id).exists():
            return "NOT_FOUND", None

        try:
            membership = ChatRoomParticipant.objects.get(room_id=room_id, user=current_user)
        except ChatRoomParticipant.DoesNotExist:
            return "FORBIDDEN", None

        base_filters = Q(message__room_id=room_id, message__is_deleted=False)

        if membership.left_at is not None:
            base_filters &= Q(message__timestamp__lte=membership.left_at)

        files_qs = ChatMessageAttachment.objects.filter(
            base_filters,
            file_type='FILE'
        ).select_related('message').order_by('-message__id')[:10]  
 
        photos_qs = ChatMessageAttachment.objects.filter(
            base_filters,
            file_type='IMAGE'
        ).select_related('message').order_by('-message__id')[:12]

        return "SUCCESS", {
            "recent_files": [
                {
                    "id": att.id,
                    "message_id": att.message_id, 
                    "name": att.filename,  
                    "url": att.file.url,
                    "file_type": att.file_type,
                    "timestamp": att.message.timestamp  
                } for att in files_qs
            ],
            "photos": [
                {
                    "id": att.id,
                    "message_id": att.message_id,
                    "name": att.filename,  
                    "url": att.file.url,
                    "file_type": att.file_type,
                    "timestamp": att.message.timestamp  
                } for att in photos_qs
            ]
        }

    status_code_flag, data = await fetch_media()
    
    if status_code_flag == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Room not found")
    if status_code_flag == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="Access denied")
        
    return data
  
@router.post("/messages/{message_id}/react")
async def toggle_reaction(
    message_id: int,
    emoji: str,
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def toggle_db_reaction():
        try:
            msg = ChatMessage.objects.select_related('room').get(id=message_id)
            
            try:
                membership = ChatRoomParticipant.objects.get(room=msg.room, user=current_user)
                
                if membership.left_at is not None and msg.timestamp > membership.left_at:
                    return None, "ARCHIVED"
            except ChatRoomParticipant.DoesNotExist:
                return None, "FORBIDDEN"
        except ChatMessage.DoesNotExist:
            return None, "NOT_FOUND"
        
        try:
            with transaction.atomic():
                existing = MessageReaction.objects.filter(
                    message=msg,
                    user=current_user,
                    emoji=emoji
                ).first()

                if existing:
                    existing.delete()
                    action = "removed"
                else:
                    MessageReaction.objects.create(
                        message=msg,
                        user=current_user,
                        emoji=emoji
                    )
                    action = "added"
                
                new_count = MessageReaction.objects.filter(
                    message=msg, 
                    emoji=emoji
                ).count()

            return {
                "message_id": msg.id,
                "room_id": msg.room_id,
                "action": action,
                "emoji": emoji,
                "count": new_count,
                "user_email": current_user.email
            }, "SUCCESS"
            
        except Exception as transaction_err:
            return None, str(transaction_err)

    result, error_flag = await toggle_db_reaction()

    if error_flag != "SUCCESS":
        if error_flag == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Message not found")
        if error_flag == "ARCHIVED":
            raise HTTPException(status_code=403, detail="You cannot react to messages sent after you left this room.")
        if error_flag == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="Not authorized to react in this room")
        raise HTTPException(status_code=400, detail=error_flag)

    await manager.broadcast({
        "type": "MESSAGE_REACTION",
        **result
    }, result["room_id"])

    return result

@router.post("/messages/{message_id}/forward", response_model=MessageRead)
async def forward_message(message_id: int, request: ForwardRequest, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def process_forward():
        try:
            try:
                original_msg = ChatMessage.objects.prefetch_related(
                    "file_attachments"
                ).get(id=message_id, is_deleted=False)
            except ChatMessage.DoesNotExist:
                return None, "Original message not found"
            
            try: 
                src_membership = ChatRoomParticipant.objects.get(room_id=original_msg.room_id, user=current_user)
                if src_membership.left_at is not None and original_msg.timestamp > src_membership.left_at:
                    return None, "You no longer have access to the original message"
            except ChatRoomParticipant.DoesNotExist:
                return None, "You no longer have access to the original message"
            
            try:
                target_room = ChatRoom.objects.get(id=request.target_room_id)
                target_membership = ChatRoomParticipant.objects.get(room=target_room, user=current_user)
                if target_membership.left_at is not None:
                    return None, "ARCHIVED_TARGET"
            except ChatRoom.DoesNotExist:
                return None, "Target room not found"
            except ChatRoomParticipant.DoesNotExist:
                return None, "You are not a member of the target room"

            with transaction.atomic():
                new_msg = ChatMessage.objects.create(
                    room=target_room,
                    sender=current_user,
                    content=original_msg.content, 
                    is_forwarded=True,
                    message_type=original_msg.message_type,
                    link_url=original_msg.link_url,
                    link_title=original_msg.link_title,
                    link_description=original_msg.link_description,
                    link_image=original_msg.link_image
                )

                old_attachments = original_msg.file_attachments.all()
                new_attachments_pool = [
                    ChatMessageAttachment(
                        message=new_msg,
                        file=att.file,          
                        filename=att.filename,  
                        file_type=att.file_type
                    ) for att in old_attachments
                ]
                
                if new_attachments_pool:
                    ChatMessageAttachment.objects.bulk_create(new_attachments_pool)
                    attachments_to_serialize = new_msg.file_attachments.all()
                else:
                    attachments_to_serialize = []

                target_room.last_message = new_msg
                target_room.save(update_fields=['last_message']) 

                target_membership.last_read_message_id = new_msg.id
                target_membership.save(update_fields=['last_read_message_id'])

            active_participants = User.objects.filter(
                user_memberships__room=target_room,
                user_memberships__left_at__isnull=True
            ).exclude(id=current_user.id).select_related('chat_settings')
            
            notifications = []
            for p in active_participants:
                has_settings = hasattr(p, 'chat_settings') and p.chat_settings is not None
                is_push_enabled = p.chat_settings.chat_push_enabled if has_settings else True
                
                if is_push_enabled:
                    notifications.append(
                        Notification(
                            recipient=p,
                            message=f"Forwarded message from {current_user.first_name or current_user.email}",
                            notification_type="chat"
                        )
                    )
            if notifications:
                Notification.objects.bulk_create(notifications)

            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": att.file_type
                } for att in attachments_to_serialize
            ]

            avatar_img = None
            if hasattr(current_user, 'profile') and current_user.profile and current_user.profile.avatar:
                try:
                    avatar_img = current_user.profile.avatar.url
                except Exception:
                    avatar_img = None

            first_initial = current_user.first_name[:1] if current_user.first_name else ''
            last_initial = current_user.last_name[:1] if current_user.last_name else ''
            initials = (first_initial + last_initial).upper() or current_user.email[:2].upper()

            response_payload = {
                "type": "MESSAGE",
                "id": new_msg.id,
                "room_id": target_room.id,
                "room_name": target_room.name or "Group Chat",
                "sender_id": current_user.id,
                "sender_email": current_user.email,
                "sender": {
                    "id": current_user.id,
                    "email": current_user.email,
                    "first_name": current_user.first_name or "",
                    "last_name": current_user.last_name or "",
                    "profile_image": avatar_img,
                    "initials": initials
                },
                "content": new_msg.content,
                "attachments": formatted_attachments, 
                "timestamp": new_msg.timestamp.isoformat() if hasattr(new_msg.timestamp, 'isoformat') else str(new_msg.timestamp), 
                "is_own_message": True,
                "read_count": 0,
                "is_starred": False,
                "is_saved": False,
                "is_pinned": False,
                "is_deleted": False,
                "is_forwarded": True,
                "message_link": f"/chat/rooms/{target_room.id}?message_id={new_msg.id}",
                "reactions": [],
                "parent_id": None, 
                "parent_content": None,
                "parent_sender": None,
                "link_url": original_msg.link_url,
                "link_title": original_msg.link_title,
                "link_description": original_msg.link_description,
                "link_image": original_msg.link_image
            }

            return response_payload, None

        except Exception as e:
            return None, str(e)

    socket_message, error_msg = await process_forward()

    if error_msg:
        if error_msg == "ARCHIVED_TARGET":
            raise HTTPException(status_code=403, detail="Target room is archived for you.")
        status_code = 404 if "not found" in error_msg else 403
        raise HTTPException(status_code=status_code, detail=error_msg)

    try:
        await manager.broadcast(socket_message, socket_message["room_id"])
    except Exception:
        pass

    return socket_message

@router.delete("/rooms/{room_id}/members/{user_id}")
async def remove_member(room_id: int, user_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def perform_remove():
        try:
            with transaction.atomic():
                try:
                    room = ChatRoom.objects.get(id=room_id)
                except ChatRoom.DoesNotExist:
                    return None, "NOT_FOUND"

                if not room.is_group:
                    return None, "Cannot remove members from a private chat"

                if not ChatRoomParticipant.objects.filter(room=room, user=current_user, left_at__isnull=True).exists():
                    return None, "FORBIDDEN"

                if user_id == current_user.id:
                    return None, "Use leave group instead"

                try:
                    user_to_remove = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    return None, "USER_NOT_FOUND"

                membership = ChatRoomParticipant.objects.filter(
                    room=room, 
                    user=user_to_remove, 
                    left_at__isnull=True
                ).first()

                if not membership:
                    return None, "User is not an active participant"

                membership.left_at = timezone.now()
                membership.save(update_fields=['left_at'])

                system_message = ChatMessage.objects.create(
                    room=room,
                    sender=current_user,
                    content=f"{current_user.first_name or current_user.email} removed {user_to_remove.first_name or user_to_remove.email} from the group",
                    message_type="SYSTEM"
                )

                room.last_message = system_message
                room.save(update_fields=["last_message"])

                removed_user_data = {
                    "id": user_to_remove.id,
                    "email": user_to_remove.email,
                    "first_name": user_to_remove.first_name or "",
                    "last_name": user_to_remove.last_name or "",
                }

                return removed_user_data, None

        except Exception as e:
            return None, str(e)

    removed_user, error = await perform_remove()

    if error:
        status_code = (
            404 if error in ["NOT_FOUND", "USER_NOT_FOUND"]
            else 403 if error == "FORBIDDEN"
            else 400
        )
        raise HTTPException(status_code=status_code, detail=error)

    await manager.broadcast({
        "type": "MEMBER_REMOVED",
        "room_id": room_id,
        "removed_member": removed_user,
    }, room_id)

    await manager.broadcast_to_user(
        removed_user["id"],
        {
            "type": "REMOVED_FROM_ROOM",
            "room_id": room_id,
        }
    )

    if room_id in manager.active_connections:
        for u_id, ws_session in list(manager.active_connections[room_id]):
            if u_id == removed_user["id"]:
                try:
                    await ws_session.close(code=1008)
                    await manager.disconnect(ws_session, room_id, u_id)
                except Exception:
                    pass

    return {
        "message": "Member removed successfully",
        "removed": removed_user,
    }

@router.post("/rooms/{room_id}/message", response_model=ChatMessageResponse)
async def send_text_message(room_id: int, data: TextMessageCreate, current_user: User = Depends(get_current_user)
):
    content = data.content.strip() if data.content else ""
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    link = extract_link(content)
    title = description = image = ""

    if link and link.startswith(("http://", "https://")):
        try:
            title, description, image = await sync_to_async(fetch_link_preview)(link)
        except Exception:
            title, description, image = "", "", ""

    @sync_to_async
    def save_text_message(scraped_title, scraped_desc, scraped_img):
        try:
            with transaction.atomic():
                try:
                    room = ChatRoom.objects.get(id=room_id)
                except ChatRoom.DoesNotExist:
                    return None, "Room not found"

                try:
                    membership = ChatRoomParticipant.objects.get(room=room, user=current_user)
                    if membership.left_at is not None:
                        return None, "Archived participant"
                except ChatRoomParticipant.DoesNotExist:
                    return None, "Not a participant"

                parent_msg = None
                if data.parent_id:
                    try:
                        parent_msg = ChatMessage.objects.select_related('sender').get(
                            id=data.parent_id, room=room
                        )
                        if parent_msg.is_deleted:
                            return None, "Cannot reply to a deleted message"
                    except ChatMessage.DoesNotExist:
                        return None, "Parent message not found"

                msg = ChatMessage.objects.create(
                    room=room,
                    sender=current_user,
                    content=content,  
                    parent=parent_msg,
                    link_url=link,
                    link_title=scraped_title,
                    link_description=scraped_desc,
                    link_image=scraped_img,
                    is_forwarded=getattr(data, 'is_forwarded', False),
                    message_type='TEXT'
                )

                if getattr(data, 'mention_ids', None):
                    msg.mentions.set(data.mention_ids)
                else:
                    if 'process_mentions' in globals() or 'process_mentions' in locals():
                        process_mentions(msg)

                room.last_message = msg
                room.save(update_fields=['last_message']) 

                membership.last_read_message_id = msg.id
                membership.save(update_fields=['last_read_message_id'])

                active_recipients = list(User.objects.filter(
                    user_memberships__room=room,
                    user_memberships__left_at__isnull=True
                ).exclude(id=current_user.id))

                recipient_ids = [p.id for p in active_recipients]
                settings_map = {
                    s.user_id: s for s in UserChatSettings.objects.filter(user_id__in=recipient_ids)
                }

                notifications_to_create = []
                for p in active_recipients:
                    p_settings = settings_map.get(p.id)
                    push_enabled = p_settings.chat_push_enabled if p_settings else True
                    
                    if push_enabled:
                        notifications_to_create.append(
                            Notification(
                                recipient=p,
                                message=f"New message from {current_user.first_name or current_user.email}",
                                notification_type="chat"
                            )
                        )
                
                if notifications_to_create:
                    Notification.objects.bulk_create(notifications_to_create)

                profile_image = None
                if hasattr(current_user, 'profile') and current_user.profile and current_user.profile.avatar:
                    try:
                        profile_image = current_user.profile.avatar.url
                    except Exception:
                        profile_image = None

                first_initial = current_user.first_name[:1] if current_user.first_name else ''
                last_initial = current_user.last_name[:1] if current_user.last_name else ''
                initials = (first_initial + last_initial).upper() or current_user.email[:2].upper()

                payload = {
                    "type": "new_message",
                    "id": msg.id,
                    "room_id": room.id,
                    "sender_id": current_user.id,
                    "sender_email": current_user.email,
                    "sender": {
                        "id": current_user.id,
                        "email": current_user.email,
                        "first_name": current_user.first_name or "",
                        "last_name": current_user.last_name or "",
                        "profile_image": profile_image,
                        "initials": initials
                    },
                    "content": msg.content,
                    "attachments": [],
                    "timestamp": msg.timestamp.isoformat() if hasattr(msg.timestamp, 'isoformat') else str(msg.timestamp),  
                    "is_own_message": True,
                    "parent_id": parent_msg.id if parent_msg else None,
                    "parent_content": parent_msg.content if parent_msg else None,
                    "parent_sender": parent_msg.sender.email if parent_msg else None,
                    "read_count": 0,
                    "is_starred": False,
                    "is_saved": False,
                    "is_pinned": False,
                    "is_deleted": False,
                    "message_link": f"/chat/rooms/{room_id}?message_id={msg.id}",
                    "reactions": [],
                    "is_forwarded": msg.is_forwarded,
                    "link_url": msg.link_url,
                    "link_title": msg.link_title,
                    "link_description": msg.link_description,
                    "link_image": msg.link_image
                }
                return payload, None

        except Exception as e:
            return None, str(e)
     
    socket_message, error = await save_text_message(title, description, image)
     
    if error:
        if error == "Archived participant":
            raise HTTPException(status_code=403, detail="You have left this room and cannot send messages.")
        status_code = 404 if "not found" in error or "Room" in error else 403
        raise HTTPException(status_code=status_code, detail=error)
 
    try:
        await manager.broadcast(socket_message, room_id)
    except Exception:
        pass

    return socket_message

@router.post("/messages/{message_id}/save")
async def toggle_save_message(
    message_id: int, 
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def handle_save():
        try:
            msg = ChatMessage.objects.prefetch_related('saved_by').get(id=message_id)
            
            try:
                membership = ChatRoomParticipant.objects.get(room_id=msg.room_id, user=current_user)
            except ChatRoomParticipant.DoesNotExist:
                return "FORBIDDEN"

            if membership.left_at is not None and msg.timestamp > membership.left_at:
                return "FORBIDDEN"
            
            if current_user in msg.saved_by.all():
                msg.saved_by.remove(current_user)
                return False  
            else:
                msg.saved_by.add(current_user)
                return True
                
        except ChatMessage.DoesNotExist:
            return None
        
    result = await handle_save()
    
    if result is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if result == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="You do not have permission to view or save this message")    

    return {
        "status": "success", 
        "is_saved": result 
    }
    
@router.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int):
    @sync_to_async
    def check_membership_status(u_id, r_id):
        try:
            membership = ChatRoomParticipant.objects.get(room_id=r_id, user_id=u_id)
            if membership.left_at is not None:
                return "LEFT", None
            return "ACTIVE", membership
        except ChatRoomParticipant.DoesNotExist:
            return "NO_MEMBER", None

    status_flag, initial_membership = await check_membership_status(user_id, room_id)
    if status_flag != "ACTIVE":
        await websocket.close(code=1008)
        return
    
    @sync_to_async
    def get_user_with_context(u_id):
        try:
            return User.objects.select_related('profile', 'chat_settings').get(id=u_id)
        except User.DoesNotExist:
            return None
    
    current_user = await get_user_with_context(user_id)
    if not current_user:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, room_id, user_id)

    @sync_to_async
    def save_ws_message(content, parent_id=None, msg_type='TEXT'):
        try:
            with transaction.atomic():
                room = ChatRoom.objects.select_related('last_message').get(id=room_id)
                
                parent_msg = None
                if parent_id:
                    parent_msg = ChatMessage.objects.select_related('sender').filter(id=parent_id, room=room).first()
 
                msg = ChatMessage.objects.create(
                    room=room, 
                    sender=current_user, 
                    content=content,
                    parent=parent_msg,
                    message_type=msg_type
                )
 
                if msg_type == 'TEXT': 
                    process_mentions(msg)
 
                room.last_message = msg
                room.save(update_fields=['last_message'])

                if msg_type == 'TEXT':
                    recipients = list(room.participants.exclude(id=current_user.id))
                    notifications = []
                    for p in recipients:
                        p_settings, _ = UserChatSettings.objects.get_or_create(user=p)
                        if p_settings.chat_push_enabled:
                            notifications.append(
                                Notification(
                                    recipient=p,
                                    message=f"New message from {current_user.first_name or current_user.email}",
                                    notification_type="chat"
                                )
                            )
                    if notifications:
                        Notification.objects.bulk_create(notifications)

                p_info = None
                if parent_msg:
                    p_info = {
                        "id": parent_msg.id,
                        "content": parent_msg.content,
                        "sender": parent_msg.sender.email
                    }

                return msg, p_info
        except Exception as e:
            print(f"WS Save Error: {e}")
            return None, None
 
    @sync_to_async
    def advance_user_read_receipt_pointer(msg_id):
        ChatRoomParticipant.objects.filter(
            room_id=room_id, 
            user_id=user_id
        ).update(last_read_message_id=msg_id)

    @sync_to_async
    def update_call_status(c_id, m_type):
        try:
            call_qs = Call.objects.filter(id=c_id)
            if m_type == "CALL_ACCEPTED":
                call_qs.update(status="ONGOING")
                return "CALL_STARTED", "Call connected."
            elif m_type == "CALL_REJECTED":
                call_qs.update(status="MISSED", ended_at=timezone.now())
                return "CALL_DECLINED", None
            else: 
                call_qs.update(status="ENDED", ended_at=timezone.now())
                return "CALL_FINISHED", None
        except Exception:
            return "CALL_ERROR", None
 
    try:
        latest_historical_msg = await sync_to_async(
            lambda: ChatMessage.objects.filter(room_id=room_id, is_deleted=False).order_by('-id').first()
        )()
        if latest_historical_msg:
            await advance_user_read_receipt_pointer(latest_historical_msg.id)

        while True:
            data = await websocket.receive_text()
            
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                continue 

            msg_type = payload.get("type")

            if msg_type in ["typing", "TYPING_STATUS"]:
                user_settings = getattr(current_user, 'chat_settings', None)
                typing_enabled = user_settings.typing_indicators if user_settings else True
                
                if typing_enabled:
                    await manager.broadcast({
                        "type": "TYPING_STATUS",
                        "user_id": user_id,
                        "room_id": room_id,
                        "is_typing": payload.get("is_typing", True)
                    }, room_id)
                continue 
 
            if msg_type == "SCREEN_SHARE_STATUS":
                is_sharing = payload.get("is_sharing")
                status_text = "started sharing screen" if is_sharing else "stopped sharing screen"
                content = f"{current_user.first_name or current_user.email} {status_text}"
 
                msg_obj, _ = await save_ws_message(content, msg_type='SYSTEM')
                if msg_obj:
                    await manager.broadcast({
                        "type": "system_alert",
                        "content": content,
                        "is_sharing": is_sharing,
                        "sharer_id": user_id,
                        "timestamp": msg_obj.timestamp.isoformat() if hasattr(msg_obj.timestamp, 'isoformat') else str(msg_obj.timestamp)
                    }, room_id)
                continue
 
            if msg_type in ["CALL_ACCEPTED", "CALL_REJECTED", "CALL_ENDED"]:
                call_id = payload.get("call_id")
                event_name, alert_msg = await update_call_status(call_id, msg_type)
                
                await manager.broadcast({
                    "type": event_name,
                    "call_id": call_id,
                    "message": alert_msg
                }, room_id)
                continue
 
            content = payload.get("content")
            if content:
                parent_id = payload.get("parent_id")
                msg_obj, p_info = await save_ws_message(content, parent_id)
                
                if msg_obj:
                    await manager.broadcast({
                        "type": "new_message", 
                        "id": msg_obj.id,
                        "room_id": room_id,
                        "sender_id": current_user.id,
                        "sender_email": current_user.email,
                        "sender_first_name": current_user.first_name or "",
                        "sender_last_name": current_user.last_name or "",
                        "content": content,
                        "attachments": [],
                        "timestamp": msg_obj.timestamp.isoformat() if hasattr(msg_obj.timestamp, 'isoformat') else str(msg_obj.timestamp),
                        "parent_id": p_info["id"] if p_info else None,
                        "parent_content": p_info["content"] if p_info else None,
                        "parent_sender": p_info["sender"] if p_info else None,
                        "read_count": 0,
                        "is_starred": False,
                        "is_saved": False,
                        "is_pinned": False,
                        "is_deleted": False,
                        "is_forwarded": False,
                        "reactions": [],
                        "link_url": getattr(msg_obj, 'link_url', None),
                        "link_title": getattr(msg_obj, 'link_title', None),
                        "link_description": getattr(msg_obj, 'link_description', None),
                        "link_image": getattr(msg_obj, 'link_image', None)
                    }, room_id)
                    
                    await advance_user_read_receipt_pointer(msg_obj.id)
            
    except WebSocketDisconnect:
        await manager.disconnect(websocket, room_id, user_id)
        
@router.post("/rooms/{room_id}/members")
async def add_members(
    room_id: int,
    data: ChatMemberUpdate,
    current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def perform_add():
        try:
            with transaction.atomic():
                try:
                    room = ChatRoom.objects.get(id=room_id)
                except ChatRoom.DoesNotExist:
                    return None, "NOT_FOUND"
                
                if not room.is_group:
                    return None, "Cannot add members to a private 1-on-1 chat"

                try:
                    requestor_membership = ChatRoomParticipant.objects.get(room_id=room_id, user=current_user)
                    if requestor_membership.left_at is not None:
                        return None, "ARCHIVED"
                except ChatRoomParticipant.DoesNotExist:
                    return None, "FORBIDDEN"

                users_to_add = list(User.objects.filter(email__in=data.user_emails))
                if not users_to_add:
                    return [], None

                user_ids = [u.id for u in users_to_add]
                existing_memberships = {
                    m.user_id: m for m in ChatRoomParticipant.objects.filter(room_id=room_id, user_id__in=user_ids)
                }

                new_users = []
                formatted_users = []
                now = timezone.now()

                for u in users_to_add:
                    m_obj = existing_memberships.get(u.id)
                    
                    if m_obj:
                        if m_obj.left_at is None:
                            continue

                        m_obj.left_at = None
                        m_obj.joined_at = now
                        m_obj.save(update_fields=['left_at', 'joined_at'])
                    else:
                        new_users.append(
                            ChatRoomParticipant(room_id=room_id, user_id=u.id, joined_at=now)
                        )

                    formatted_users.append({
                        "id": u.id,
                        "email": u.email,
                        "first_name": u.first_name or "",
                        "last_name": u.last_name or ""
                    })

                if not formatted_users:
                    return [], None

                if new_users:
                    ChatRoomParticipant.objects.bulk_create(new_users)

                target_names = ", ".join([u.first_name or u.email for u in users_to_add if u.email in [f["email"] for f in formatted_users]])
                sys_msg = ChatMessage.objects.create(
                    room=room,
                    sender=current_user,
                    content=f"{current_user.first_name or current_user.email} added {target_names} to the group",
                    message_type='SYSTEM'
                )

                room.last_message = sys_msg
                room.save(update_fields=['last_message'])

                return formatted_users, None

        except Exception as e:
            return None, str(e)

    added_users, error = await perform_add()
    
    if error:
        if error == "ARCHIVED":
            raise HTTPException(status_code=403, detail="You have left this room and cannot add members.")
        status_code = 404 if error == "NOT_FOUND" else 403 if error == "FORBIDDEN" else 400
        raise HTTPException(status_code=status_code, detail=error)

    if added_users:
        await manager.broadcast({
            "type": "MEMBER_ADDED",
            "room_id": room_id,
            "new_members": added_users
        }, room_id)

        for user in added_users:
            asyncio.create_task(manager.broadcast_to_user(user['id'], {
                "type": "ROOM_ADDED",
                "room_id": room_id
            }))
    
    return {"message": "Members added successfully", "added": [u['email'] for u in added_users]}

@router.patch("/rooms/{room_id}", response_model=ChatRoomDetailsResponse)
async def update_chat_room(room_id: int, payload: ChatRoomUpdateRequest, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def perform_update():
        try:
            with transaction.atomic():
                has_access = ChatRoomParticipant.objects.filter(
                    room_id=room_id, 
                    user=current_user, 
                    left_at__isnull=True
                ).exists()
                
                if not has_access:
                    return None, "NOT_FOUND"

                try:
                    room = ChatRoom.objects.get(id=room_id, is_group=True)
                except ChatRoom.DoesNotExist:
                    return None, "NOT_FOUND"

                new_name = (payload.name or "").strip()
                if not new_name:
                    return None, "EMPTY_NAME"

                old_name = room.name or ""
                if old_name == new_name:
                    return {
                        "room_id": room.id,
                        "room_name": room.name,
                        "is_group": room.is_group,
                    }, None

                room.name = new_name

                system_message = ChatMessage.objects.create(
                    room=room,
                    sender=current_user,
                    content=f"{current_user.first_name or current_user.email} changed the group name to '{new_name}'",
                    message_type="SYSTEM"
                )

                room.last_message = system_message
                room.save(update_fields=["name", "last_message"])

                return {
                    "room_id": room.id,
                    "room_name": room.name,
                    "is_group": room.is_group,
                }, None

        except Exception as e:
            return None, str(e)

    updated_room, error = await perform_update()

    if error:
        status_code = (
            404 if error == "NOT_FOUND"
            else 400 if error == "EMPTY_NAME"
            else 500
        )

        detail = (
            "Group chat not found or access denied"
            if error == "NOT_FOUND"
            else "Group name cannot be empty"
            if error == "EMPTY_NAME"
            else error
        )
        raise HTTPException(status_code=status_code, detail=detail)
 
    await manager.broadcast(
        {
            "type": "ROOM_UPDATED",
            "room_id": room_id,
            "name": updated_room["room_name"],
        },
        room_id
    )

    return updated_room

@router.post("/rooms/{room_id}/leave")
async def leave_room(room_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def perform_leave():
        try:
            with transaction.atomic():
                try:
                    room = ChatRoom.objects.get(id=room_id)
                except ChatRoom.DoesNotExist:
                    return False, "Room not found", None
                
                try:
                    membership = ChatRoomParticipant.objects.get(room_id=room_id, user=current_user)
                    if membership.left_at is not None or not membership.is_active:
                        return False, "You have already left this room", None
                except ChatRoomParticipant.DoesNotExist:
                    return False, "You are not a member of this room", None

                latest_msg = ChatMessage.objects.filter(room_id=room_id, is_deleted=False).order_by('-id').first()
                if latest_msg:
                    membership.last_read_message = latest_msg

                membership.is_active = False
                membership.left_at = timezone.now()
                membership.save(update_fields=['is_active', 'left_at', 'last_read_message_id'])

                remaining_count = ChatRoomParticipant.objects.filter(room_id=room_id, is_active=True).count()
                
                leave_msg_data = None
                if remaining_count > 0:
                    leave_msg = ChatMessage.objects.create(
                        room=room,
                        sender=current_user,
                        content=f"{current_user.first_name or current_user.email} left the group",
                        message_type='SYSTEM'
                    )
            
                    room.last_message = leave_msg
                    room.save(update_fields=['last_message'])
                    
                    leave_msg_data = {
                        "id": leave_msg.id,
                        "content": leave_msg.content,
                        "timestamp": leave_msg.timestamp.isoformat() if hasattr(leave_msg.timestamp, 'isoformat') else str(leave_msg.timestamp),
                        "message_type": leave_msg.message_type
                    }
            
                return True, None, leave_msg_data

        except Exception as e:
            return False, str(e), None

    success, error, system_msg = await perform_leave()
    
    if not success:
        status_code = 404 if "not found" in error else 400
        raise HTTPException(status_code=status_code, detail=error)

    await manager.broadcast({
        "type": "member_left",
        "room_id": room_id,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.first_name or current_user.email.split('@')[0]
        },
        "system_message": system_msg,  
        "timestamp": system_msg["timestamp"] if system_msg else timezone.now().replace(microsecond=0).isoformat()
    }, room_id)
    
    return {"message": "You have left the room successfully"}
 
@router.patch("/rooms/{room_id}/rename", response_model=RenameGroupResponse)
async def rename_group(room_id: int, data: RenameGroupRequest, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def perform_rename():
        try:
            with transaction.atomic():
                has_access = ChatRoomParticipant.objects.filter(
                    room_id=room_id,
                    user=current_user,
                    left_at__isnull=True
                ).exists()

                if not has_access:
                    return None, "Not authorized"

                try:
                    room = ChatRoom.objects.get(id=room_id, is_group=True)
                except ChatRoom.DoesNotExist:
                    return None, "Group not found"

                cleaned_name = data.new_name.strip()
                if not cleaned_name:
                    return None, "EMPTY_NAME"

                if room.name == cleaned_name:
                    return {
                        "status": "success",
                        "message": "Group name is already up to date",
                        "id": room.id,
                        "group_id": room.id,
                        "new_name": room.name,
                        "name": room.name
                    }, None

                room.name = cleaned_name

                system_message = ChatMessage.objects.create(
                    room=room,
                    sender=current_user,
                    content=f"{current_user.first_name or current_user.email} changed the group name to '{cleaned_name}'",
                    message_type="SYSTEM"
                )

                room.last_message = system_message
                room.save(update_fields=["name", "last_message"])

                return {
                    "status": "success",
                    "message": "Group renamed successfully",
                    "id": room.id,
                    "group_id": room.id,
                    "new_name": room.name,
                    "name": room.name
                }, None

        except Exception as e:
            return None, str(e)

    response_data, error = await perform_rename()

    if error:
        status_code = 404 if error == "Group not found" else 400 if error == "EMPTY_NAME" else 403
        raise HTTPException(status_code=status_code, detail=error)

    try:
        await manager.broadcast({
            "type": "ROOM_UPDATED",
            "room_id": room_id,
            "name": response_data["new_name"]
        }, room_id)
    except Exception:
        pass

    return response_data

def process_mentions(message_obj):
    if not message_obj.content:
        return

    potential_emails = re.findall(r'@([\w\.-]+@[\w\.-]+\.\w+)', message_obj.content)

    if not potential_emails:
        return

    users_to_mention = list(User.objects.filter(email__in=potential_emails))

    if users_to_mention:
        message_obj.mentions.add(*users_to_mention)
                
@router.get("/mentions", response_model=List[MessageRead])
async def get_my_mentions(current_user: User = Depends(get_current_user)):

    @sync_to_async
    def fetch_optimized_mentions():
        room_filters = Q(room__room_memberships__user=current_user) & (
            Q(room__room_memberships__left_at__isnull=True) | 
            Q(timestamp__lte=F('room__room_memberships__left_at'))
        )

        base_filters = Q(mentions=current_user, is_deleted=False) & room_filters

        read_count_subquery = ChatRoomParticipant.objects.filter(
            room_id=OuterRef('room_id'),
            last_read_message_id__gte=OuterRef('pk')
        ).exclude(
            user=OuterRef('sender_id')  
        ).values('room_id').annotate(cnt=Count('id')).values('cnt')

        msgs = ChatMessage.objects.filter(base_filters).select_related(
            "sender", "sender__profile", "room", "parent", "parent__sender"  
        ).prefetch_related(
            "file_attachments", "reactions", "reactions__user", "starred_by"
        ).annotate(
            annotated_read_count=Coalesce(Subquery(read_count_subquery, output_field=IntegerField()), 0),
            user_starred=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), starred_by=current_user)),
            user_saved=Exists(ChatMessage.objects.filter(id=OuterRef('pk'), saved_by=current_user))
        ).distinct().order_by("-timestamp")
        
        results = []
        for m in msgs:
            formatted_attachments = [
                {
                    "id": att.id,
                    "url": att.file.url,
                    "filename": att.filename,
                    "file_type": getattr(att, 'file_type', 'FILE')
                } for att in m.file_attachments.all()
            ]

            reaction_map = {}
            for r in m.reactions.all():
                if r.emoji not in reaction_map:
                    reaction_map[r.emoji] = {"count": 0, "emails": []}
                reaction_map[r.emoji]["count"] += 1
                reaction_map[r.emoji]["emails"].append(r.user.email)

            avatar_img = None
            if hasattr(m.sender, 'profile') and m.sender.profile and m.sender.profile.avatar:
                try:
                    avatar_img = m.sender.profile.avatar.url
                except Exception:
                    avatar_img = None

            first_initial = m.sender.first_name[:1] if m.sender.first_name else ''
            last_initial = m.sender.last_name[:1] if m.sender.last_name else ''
            initials = (first_initial + last_initial).upper() or m.sender.email[:2].upper()

            results.append({
                "type": "MESSAGE",
                "id": m.id,
                "room_id": m.room.id,
                "room_name": m.room.name or "Group Chat",
                "sender_id": m.sender.id,
                "sender_email": m.sender.email,
                "sender": {
                    "id": m.sender.id,
                    "email": m.sender.email,
                    "first_name": m.sender.first_name or "",
                    "last_name": m.sender.last_name or "",
                    "profile_image": avatar_img,
                    "initials": initials
                },
                "content": m.content,
                "attachments": formatted_attachments,  
                "timestamp": m.timestamp,  
                "is_own_message": (m.sender.id == current_user.id),
                "read_count": m.annotated_read_count, 
                "is_starred": getattr(m, 'user_starred', False), 
                "is_saved": getattr(m, 'user_saved', False),
                "is_pinned": getattr(m, 'is_pinned', False),
                "message_link": f"/chat/rooms/{m.room.id}?message_id={m.id}",
                "parent_id": m.parent.id if m.parent else None,
                "parent_content": m.parent.content if m.parent else None,
                "parent_sender": m.parent.sender.email if m.parent else None,
                "reactions": [
                    {"emoji": k, "count": v["count"], "user_emails": v["emails"]}
                    for k, v in reaction_map.items()
                ],
                "is_forwarded": getattr(m, 'is_forwarded', False),
                "is_deleted": getattr(m, 'is_deleted', False),
                "link_url": getattr(m, 'link_url', None),
                "link_title": getattr(m, 'link_title', None),
                "link_description": getattr(m, 'link_description', None),
                "link_image": getattr(m, 'link_image', None)
            })
            
        return results

    return await fetch_optimized_mentions()

@router.websocket("/ws/status/{user_id}")
async def status_websocket(websocket: WebSocket, user_id: int):
    
    try:
        token = websocket.query_params.get("token")
        if not token:
            raise ValueError("Token missing")
            
        @sync_to_async
        def authenticate_socket_user():
            return User.objects.select_related('chat_settings').filter(id=user_id, is_active=True).first()
            
        current_user = await authenticate_socket_user()
        if not current_user or current_user.id != user_id:
            raise ValueError("Spoofing detected or invalid credentials")
            
    except Exception as auth_err:
        logger.warning(f"SECURITY ALERT: Unauthorized status socket attempt for ID {user_id}: {str(auth_err)}")
        if websocket.client_state.value == 0:
            await websocket.accept()
        await websocket.close(code=1008)  
        return

    await manager.connect(websocket, room_id=0, user_id=user_id)

    show_presence = True
    if hasattr(current_user, 'chat_settings') and current_user.chat_settings:
        show_presence = current_user.chat_settings.show_last_seen

    if show_presence:
        logger.info(f"PRESENCE: {current_user.email} is now online and VISIBLE.")
    else:
        logger.info(f"PRESENCE: {current_user.email} is online but HIDDEN (Ghost Mode).")

    try: 
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        logger.info(f"PRESENCE: {current_user.email} has disconnected cleanly via WebSocketDisconnect.")
    except Exception as e:
        logger.error(f"WS GLOBAL RUNTIME ERROR for user {current_user.email}: {str(e)}")
    finally:
        await manager.disconnect(websocket, room_id=0, user_id=user_id)
        logger.info(f"PRESENCE STATE PURGED: Connection structures cleared for user {current_user.email}.")
                
@router.get("/users/{target_id}/status", response_model=UserStatusResponse)
async def get_user_status(
    target_id: int,
    current_user: User = Depends(get_current_user)
):
    try:
        @sync_to_async
        def fetch_user_context():
            return User.objects.select_related('profile', 'chat_settings').get(id=target_id)
            
        user = await fetch_user_context()
        
        show_presence = True
        if hasattr(user, 'chat_settings') and user.chat_settings:
            show_presence = user.chat_settings.show_last_seen

        if not show_presence:
            return {
                "user_id": user.id,
                "is_online": False,       
                "last_seen": None         
            }

        is_online_live = target_id in manager.user_connection_counts
        last_seen_time = None
 
        if hasattr(user, 'profile') and user.profile is not None:
            last_seen_time = user.profile.last_seen
 
        return {
            "user_id": user.id,
            "is_online": is_online_live,
            "last_seen": last_seen_time  
        }
 
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")        
             
@router.get("/offline", response_model=List[UserActivityRead])
async def get_offline_users(
    limit: int = Query(20, description="Max number of offline users to return", le=100),
    current_user: User = Depends(get_current_user)
):
    active_user_ids = list(manager.user_connection_counts.keys())
    
    @sync_to_async
    def fetch_offline_users_from_db():
        users = User.objects.select_related('profile', 'chat_settings').exclude(
            id=current_user.id
        ).exclude(
            id__in=active_user_ids 
        ).order_by('-profile__last_seen')[:limit]
        
        result = []
        for u in users:
            show_presence = True
            if hasattr(u, 'chat_settings') and u.chat_settings:
                show_presence = u.chat_settings.show_last_seen

            full_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email.split('@')[0]    
            profile_img = None
            last_seen_time = None
            has_profile = hasattr(u, 'profile') and u.profile is not None
            
            if show_presence and has_profile:
                last_seen_time = u.profile.last_seen
            
            if has_profile:
                try:
                    if u.profile.avatar: 
                        profile_img = u.profile.avatar.url
                except (ObjectDoesNotExist, ValueError):
                    pass
                    
            result.append({
                "id": u.id,
                "name": full_name,
                "email": u.email,
                "profile_image": profile_img,
                "last_seen": last_seen_time,
                "is_online": False,
                "status": "offline"
            })
            
        return result

    return await fetch_offline_users_from_db()

@router.get("/rooms/{room_id}/details")
async def get_room_details(room_id: int, current_user: User = Depends(get_current_user)
):
    @sync_to_async
    def fetch_room():
        try:
            membership = ChatRoomParticipant.objects.get(room_id=room_id, user=current_user)
        except ChatRoomParticipant.DoesNotExist:
            return None

        participant_queryset = User.objects.select_related("profile", "chat_settings").prefetch_related("user_memberships")
        
        if membership.left_at is not None:
            participant_queryset = participant_queryset.filter(
                user_memberships__room_id=room_id,
                user_memberships__joined_at__lte=membership.left_at
            ).distinct()

        room = (
            ChatRoom.objects.select_related(
                'last_message', 
                'last_message__sender', 
                'last_message__sender__profile'
            ).prefetch_related(
                Prefetch(
                    "participants",
                    queryset=participant_queryset
                ),
                Prefetch(
                    "last_message__file_attachments",
                    queryset=ChatMessageAttachment.objects.all(),
                    to_attr="prefetched_last_msg_attachments"
                )
            )
            .filter(id=room_id, room_memberships__user=current_user)
            .first()
        )

        if not room:
            return None

        if membership.left_at is not None:
            historical_last_msg = ChatMessage.objects.filter(
                room_id=room_id,
                is_deleted=False,
                timestamp__lte=membership.left_at
            ).select_related(
                'sender', 'sender__profile', 'parent', 'parent__sender', 'room'
            ).prefetch_related(
                'file_attachments', 'reactions', 'reactions__user', 'starred_by'
            ).order_by('-id').first()

            room.last_message = historical_last_msg

        return format_room_response(room, current_user)

    result = await fetch_room()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Room not found or you are not an authorized participant."
        )

    return result

@router.get("/settings", response_model=ChatSettingsUpdate)  
async def get_chat_settings(current_user: User = Depends(get_current_user)
): 
    @sync_to_async
    def process_get_or_create_settings():
        try:
            with transaction.atomic():
                settings, created = UserChatSettings.objects.get_or_create(
                    user=current_user
                )
                
                valid_fields = {f.name for f in UserChatSettings._meta.get_fields() if not f.is_relation}
                 
                payload = {field: getattr(settings, field) for field in valid_fields}
                return payload, None
                
        except Exception as e:
            return None, str(e)

    settings_payload, error_msg = await process_get_or_create_settings()

    if error_msg:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chat settings: {error_msg}"
        )

    return settings_payload

@router.patch("/settings")
async def update_chat_settings(payload: ChatSettingsUpdate, current_user: User = Depends(get_current_user)):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return {"message": "No fields provided for update", "status": "info"}

    @sync_to_async
    def process_atomic_settings_update(data_payload):
        try:
            with transaction.atomic():
                settings = UserChatSettings.objects.select_for_update().filter(user=current_user).first()
                if not settings:
                    return "NOT_FOUND", None

                valid_fields = {f.name for f in UserChatSettings._meta.get_fields()}
                updated_fields = []

                for field, value in data_payload.items():
                    if field in valid_fields:
                        setattr(settings, field, value)
                        updated_fields.append(field)
                
                if updated_fields:
                    settings.save(update_fields=updated_fields)
                    
            return "SUCCESS", None
        except Exception as e:
            return "ERROR", str(e)

    result_status, error_msg = await process_atomic_settings_update(update_data)

    if result_status != "SUCCESS":
        if result_status == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Settings profile not found."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"An internal error occurred saving settings: {error_msg}"
        )

    return {"message": "Chat settings updated successfully", "status": "success"}

@router.post("/rooms/{room_id}/mute", response_model=MuteChatResponse)
async def mute_chat_room(room_id: int, current_user: User = Depends(get_current_user)):
    @sync_to_async
    def mute():
        try:
            room = ChatRoom.objects.get(id=room_id)
            membership = ChatRoomParticipant.objects.filter(room=room, user=current_user).first()
            if not membership or membership.left_at is not None:
                return None, "FORBIDDEN"

            settings, _ = UserChatSettings.objects.get_or_create(user=current_user)
            if settings.muted_rooms.filter(id=room_id).exists():
                return True, None

            settings.muted_rooms.add(room)
            return True, None
        except ChatRoom.DoesNotExist:
            return None, "NOT_FOUND"

    result, error = await mute()
    if error == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Room not found")
    if error == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="Not an active participant of this room")

    return {
        "success": True,
        "message": "Chat muted successfully",
        "room_id": room_id,
        "is_muted": True
    }

@router.post("/rooms/{room_id}/unmute", response_model=UnmuteChatResponse)
async def unmute_chat_room(room_id: int, current_user: User = Depends(get_current_user)):
    @sync_to_async
    def perform_unmute():
        try:
            room = ChatRoom.objects.get(id=room_id)
            membership = ChatRoomParticipant.objects.filter(room=room, user=current_user).first()
            if not membership or membership.left_at is not None:
                return None, "FORBIDDEN"

            settings = UserChatSettings.objects.filter(user=current_user).first()
            if not settings:
                return None, "SETTINGS_NOT_FOUND"

            if settings.muted_rooms.filter(id=room_id).exists():
                settings.muted_rooms.remove(room)
            return True, None
        except ChatRoom.DoesNotExist:
            return None, "NOT_FOUND"

    result, error = await perform_unmute()
    if error == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Room not found")
    if error == "FORBIDDEN":
        raise HTTPException(status_code=403, detail="Not an active participant of this room")
    if error == "SETTINGS_NOT_FOUND":
        raise HTTPException(status_code=404, detail="Settings profile not found.")

    return {
        "success": True,
        "message": "Chat unmuted successfully",
        "room_id": room_id,
        "is_muted": False
    }