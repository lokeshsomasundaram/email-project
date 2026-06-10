from django_backend.models import Notification

def create_notification(recipient, title, message, type_choice="system", related_id=None):
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=type_choice,
        related_id=related_id
    )