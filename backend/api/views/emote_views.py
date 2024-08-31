from rest_framework import viewsets
from django_filters import rest_framework as filters
from ..models import Emote
from ..serializers import EmoteSerializer


class EmoteFilter(filters.FilterSet):
    parent_set = filters.NumberFilter(field_name='parent_set', lookup_expr='exact')
    parent_set__setID = filters.NumberFilter(field_name='parent_set__set_id', lookup_expr='exact')

    class Meta:
        model = Emote
        fields = ['parent_set', 'parent_set__set_id']

class EmoteViewSet(viewsets.ModelViewSet):
    queryset = Emote.objects.all()
    serializer_class = EmoteSerializer
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = EmoteFilter