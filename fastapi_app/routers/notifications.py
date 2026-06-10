from fastapi import APIRouter, Depends, HTTPException, Query
from django.contrib.auth import get_user_model
from django_backend.models import Notification

from fastapi_app.schemas.notification_schemas import (
    NotificationRead,
    NotificationUpdate
)

from fastapi_app.dependencies.permissions import get_current_user
from asgiref.sync import sync_to_async
from typing import List

from channels.layers import get_channel_layer
from fastapi_app.services.notifications import create_notification

router = APIRouter()
User = get_user_model()


# =========================
# GET NOTIFICATIONS
# =========================
@router.get("/", response_model=List[NotificationRead])
async def get_my_notifications(
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user)
):

    notifications = await sync_to_async(list)(
        Notification.objects.filter(
            recipient_id=current_user.id
        ).order_by("-created_at")[offset:offset + limit]
    )

    return notifications


# =========================
# UNREAD COUNT
# =========================
@router.get("/unread-count")
async def get_unread_count_api(
    current_user: User = Depends(get_current_user)
):

    @sync_to_async
    def get_count():
        return Notification.objects.filter(
            recipient_id=current_user.id,
            is_read=False
        ).count()

    count = await get_count()

    return {"count": count}


# =========================
# MARK AS READ
# =========================
@router.patch("/{notification_id}", response_model=NotificationRead)
async def mark_as_read(
    notification_id: int,
    data: NotificationUpdate,
    current_user: User = Depends(get_current_user)
):

    @sync_to_async
    def update_notification():
        try:
            notif = Notification.objects.get(
                id=notification_id,
                recipient_id=current_user.id
            )
            notif.is_read = data.is_read
            notif.save(update_fields=["is_read"])
            return notif
        except Notification.DoesNotExist:
            return None

    notif = await update_notification()

    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

@sync_to_async
def get_unread_count(user_id):
    return Notification.objects.filter(
        recipient_id=user_id,
        is_read=False
    ).count()
async def update_notification_ui(user_id):

    unread_count = await get_unread_count(user_id)

    channel_layer = get_channel_layer()

    await channel_layer.group_send(
        f"user_{user_id}",
        {
            "type": "send_notification",
            "notification": {
                "unread_count": unread_count
            }
        }
    )

    def create_notification(recipient, title, message, type_choice="system", related_id=None):
        return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=type_choice,
        related_id=related_id
    )