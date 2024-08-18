from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatFileViewSet, MessageViewSet, UserViewSet, EmoteSetViewSet

router = DefaultRouter()
router.register(r'chat/files', ChatFileViewSet)
router.register(r'chat/messages', MessageViewSet)
router.register(r'chat/users', UserViewSet)
router.register(r'chat/emote-sets', EmoteSetViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
