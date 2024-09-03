from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ChatFileViewSet,
    MessageViewSet,
    EmoteSetViewSet,
    EmoteViewSet,
    TaskStatusView,
    ChannelViewSet
)

router = DefaultRouter()
router.register(r"chat/files", ChatFileViewSet)
router.register(r"chat/messages", MessageViewSet)
router.register(r"chat/emotesets", EmoteSetViewSet)
router.register(r"chat/emotes", EmoteViewSet)
router.register(r"channels", ChannelViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("task_status/", TaskStatusView.as_view(), name="task_status"),
]
