import json

import requests
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import HttpRequest
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime

from ..models import Channel, Task
from ..serializers import ChannelSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
