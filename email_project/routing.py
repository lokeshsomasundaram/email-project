from django.urls import re_path
from django_backend import consumers

websocket_urlpatterns = [

    re_path(
        r'chat/(?P<room_id>\d+)/$',
        consumers.ChatConsumer.as_asgi()
    ),

    re_path(
        r'notifications/$',
        consumers.NotificationConsumer.as_asgi()
    ),
]