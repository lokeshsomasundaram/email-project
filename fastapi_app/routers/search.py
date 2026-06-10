from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from django.db.models import Q
from asgiref.sync import sync_to_async
from fastapi_app.routers.auth import get_current_user
from django_backend.models import User, EmailState, ChatMessage, DriveFile, Event, Meeting
from fastapi_app.schemas.search_schemas import GlobalSearchResponse

router = APIRouter()

@router.get("/", response_model=GlobalSearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, description="The search query text"),
    module: Optional[str] = Query("all", description="Module to search: 'mail', 'drive', 'chats', etc."),
    current_user: User = Depends(get_current_user)
):
    module_query = (module or "all").lower()
    
    @sync_to_async
    def perform_search():
        results = {
            "query": q,
            "module": module_query,
            "data": {}
        }
        
        if module_query in ["mail", "all"]:
            mail_qs = EmailState.objects.select_related('email', 'email__sender').filter(
                user=current_user,
                is_deleted=False
            ).filter(
                Q(email__subject__icontains=q) | 
                Q(email__body__icontains=q) | 
                Q(email__sender__email__icontains=q)
            ).order_by("-email__created_at")[:10]
            
            results["data"]["mail"] = [
                {
                    "id": state.email.id,
                    "type": "mail",
                    "subject": state.email.subject,
                    "snippet": state.email.body[:50] + "..." if len(state.email.body) > 50 else state.email.body,
                    "sender": state.email.sender.email,
                    "date": state.email.created_at,
                    "is_read": state.is_read
                } for state in mail_qs
            ]
            
        if module_query in ["drive", "all"]:
            drive_qs = DriveFile.objects.select_related('owner').filter(
                Q(owner=current_user) | Q(shared_with=current_user),
                is_trashed=False
            ).filter(
                Q(original_name__icontains=q) | 
                Q(content_type__icontains=q)  
            ).distinct().order_by("-uploaded_at")[:10]
            
            results["data"]["drive"] = [
                {
                    "id": f.id,
                    "type": "drive",
                    "filename": f.original_name,
                    "snippet": f"Type: {f.content_type.split('/')[-1].upper()} • Size: {round(f.size / 1024, 1)} KB",
                    "owner": f.owner.email,
                    "date": f.uploaded_at,
                } for f in drive_qs
            ]
            
        if module_query in ["chats", "all"]:
            chat_qs = ChatMessage.objects.select_related('room', 'sender').filter(
                room__participants=current_user,
                is_deleted=False,
                message_type='TEXT' 
            ).filter(
                Q(content__icontains=q) | 
                Q(room__name__icontains=q) | 
                Q(sender__email__icontains=q)
            ).distinct().order_by("-timestamp")[:10]
            
            results["data"]["chats"] = [
                {
                    "id": msg.id,
                    "type": "chat",
                    "room_name": msg.room.name if msg.room.name else "Direct Message",
                    "snippet": msg.content[:50] + "..." if msg.content and len(msg.content) > 50 else msg.content,
                    "sender": msg.sender.email,
                    "date": msg.timestamp,
                } for msg in chat_qs
            ]
            
        if module_query in ["calendar", "all"]:
            calendar_qs = Event.objects.select_related('created_by').filter(
                Q(created_by=current_user) | 
                Q(participants=current_user) | 
                Q(attendees__user=current_user)
            ).filter(
                Q(title__icontains=q) | 
                Q(description__icontains=q) | 
                Q(location__icontains=q)
            ).distinct().order_by("-start_datetime")[:10]
            
            results["data"]["calendar"] = [
                {
                    "id": event.id,
                    "type": "calendar",
                    "title": event.title,
                    "snippet": f"Starts: {event.start_datetime.strftime('%b %d, %Y %H:%M')} • Loc: {event.location or 'TBD'}",
                    "owner": event.created_by.email,
                    "date": event.start_datetime,
                } for event in calendar_qs
            ]
            
        if module_query in ["meetings", "all"]:
            meeting_qs = Meeting.objects.select_related('host').filter(
                Q(host=current_user) | 
                Q(chat_room__participants=current_user)
            ).filter(
                Q(title__icontains=q) | 
                Q(meeting_code__icontains=q)
            ).distinct().order_by("-created_at")[:10]
            
            results["data"]["meetings"] = [
                {
                    "id": m.id,
                    "type": "meeting",
                    "title": m.title,
                    "snippet": f"Code: {m.meeting_code} • Type: {m.call_type.title() if hasattr(m, 'call_type') and m.call_type else 'General'} Call",
                    "owner": m.host.email,
                    "date": m.created_at,
                } for m in meeting_qs
            ]

        return results

    final_results = await perform_search()
    return final_results