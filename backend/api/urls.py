from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatFileViewSet, MessageViewSet, UserViewSet

router = DefaultRouter()
router.register(r'chat/files', ChatFileViewSet)
router.register(r'chat/messages', MessageViewSet)
router.register(r'chat/users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
