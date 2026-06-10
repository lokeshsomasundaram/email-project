from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django_backend.models import Recipient
import logging
import mimetypes

logger = logging.getLogger(__name__)


def smtp_send(email_obj):
    try:
        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
            raise ImproperlyConfigured(
                "SMTP is not configured. Set EMAIL_HOST_USER and "
                "EMAIL_HOST_PASSWORD in the .env file."
            )

        recipients = Recipient.objects.filter(email=email_obj).select_related("user")

        to_list = set()
        cc_list = set()
        bcc_list = set()

        # Build TO, CC, BCC lists
        for r in recipients:
            if not r.user or not r.user.email:
                continue

            email_addr = r.user.email.strip()

            if r.recipient_type == "TO":
                to_list.add(email_addr)
            elif r.recipient_type == "CC":
                cc_list.add(email_addr)
            elif r.recipient_type == "BCC":
                bcc_list.add(email_addr)

        # Must have at least one TO
        if not to_list:
            logger.error(f"No TO recipients for Email ID={email_obj.id}")
            return {"status": "failed", "message": "At least one TO recipient required"}

        # Create email (IMPORTANT FIX)
        email = EmailMultiAlternatives(
            subject=email_obj.subject,
            body=email_obj.body,
            from_email=settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER,
            to=to_list,
            cc=cc_list,
            bcc=bcc_list
        )

        # Attach HTML content (this fixes font/color issue)
        email.attach_alternative(email_obj.body, "text/html")

        # Attach files
        attachments = getattr(email_obj, "attachments", None)
        if attachments:
            for attachment in attachments.all():
                try:
                    if attachment.file and attachment.file.path:
                        filename = (
                            attachment.original_filename
                            or attachment.file.name.rsplit("/", 1)[-1]
                        )
                        content_type = (
                            mimetypes.guess_type(filename)[0]
                            or "application/octet-stream"
                        )
                        with attachment.file.open("rb") as file_handle:
                            email.attach(
                                filename,
                                file_handle.read(),
                                content_type,
                            )
                except Exception as attach_error:
                    logger.warning(
                        f"Attachment error Email {email_obj.id}: {attach_error}"
                    )

        # Send email
        email.send(fail_silently=False)

        logger.info(
            f"Email sent successfully | ID={email_obj.id} | TO={list(to_list)}"
        )

        return {"status": "success", "message": "Email sent successfully"}

    except Exception as e:
        logger.error(f"Failed to send email ID={email_obj.id}: {str(e)}")

        return {"status": "error", "message": str(e)}
