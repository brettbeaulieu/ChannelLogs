from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatFileViewSet, MessageViewSet, UserViewSet, MessageAggregationViewSet

router = DefaultRouter()
router.register(r'chat/files', ChatFileViewSet)
router.register(r'chat/messages', MessageViewSet)
router.register(r'chat/users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('chat/message-aggregate/', MessageAggregationViewSet.as_view({'get': 'aggregate_by_date_range'}), name='message-aggregate'),
]
