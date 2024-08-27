from rest_framework import viewsets
from ..models import Emote
from ..serializers import EmoteSerializer


class EmoteViewSet(viewsets.ModelViewSet):
    queryset = Emote.objects.all()
    serializer_class = EmoteSerializer
