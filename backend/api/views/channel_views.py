'''
Module for Channel-related views.
'''

from rest_framework import viewsets
from ..models import Channel
from ..serializers import ChannelSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    '''
    Standard viewset for Channel objects.
    No custom actions are defined
    '''
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
