import re
import bleach
from bleach.sanitizer import Cleaner
from django.contrib.auth import get_user_model
from typing import Optional

User = get_user_model()

ALLOWED_TAGS = [
    'b', 'i', 'u', 'p', 'br',
    'ul', 'ol', 'li',
    'strong', 'em'
]


def sanitize_rich_text(html_content: Optional[str]) -> Optional[str]:
    if html_content is None:
        return None

    html_content = re.sub(
        r"<(script|style).*?>.*?</\1>",
        "",
        html_content,
        flags=re.IGNORECASE | re.DOTALL
    )

    cleaner = Cleaner(
        tags=ALLOWED_TAGS,
        attributes={},
        strip=True
    )

    return cleaner.clean(html_content)

def process_mentions(message_obj, content, sender):
    if not content:
        return

    potential_emails = re.findall(r'@([\w\.-]+@[\w\.-]+)', content)

    if not potential_emails:
        return

    users_to_mention = User.objects.filter(
        email__in=potential_emails,
        chat_rooms=message_obj.room
    ).distinct()

    if users_to_mention.exists():
        message_obj.mentions.set(users_to_mention)