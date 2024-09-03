'''
Module for Emote views.
'''
from rest_framework import viewsets
from ..models import Emote
from ..serializers import EmoteSerializer


class EmoteViewSet(viewsets.ModelViewSet):
    ''' 
    A standard viewset for Emote objects.
    '''
    queryset = Emote.objects.all()
    serializer_class = EmoteSerializer
