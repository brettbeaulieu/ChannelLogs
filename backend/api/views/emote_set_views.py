'''
Module for the EmoteSetViewSet class / EmoteSet views
'''

import requests
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import EmoteSet, Task
from ..serializers import EmoteSetSerializer
from ..tasks import build_emote_set_task


class EmoteSetViewSet(viewsets.ModelViewSet):
    '''
    A view set for EmoteSet objects, with some
    custom actions to obtain and delete all instances,
    as well as to create a new emote set from a 7TV ID
    '''
    queryset = EmoteSet.objects.all()
    serializer_class = EmoteSetSerializer

    def create(self, request, *args, **kwargs):
        new_id = request.data.get("id", "")

        # Perform basic validation
        data = get_url_metadata(new_id)

        if not data:
            return Response(
                {"error": "ID validation failed"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Create a new task
        task = Task.objects.create(status="PENDING")

        build_emote_set_task.delay(new_id, task.ticket)

        return Response(
            {
                "message": "Successfully enqueued emote set creation",
                "ticket": str(task.ticket),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["delete"])
    def delete_all(self, request, *args, **kwargs):
        """
        Custom action to delete all instances of EmoteSet.
        """
        count, _ = EmoteSet.objects.all().delete()
        return Response(
            {"message": f"{count} instances deleted"}, status=status.HTTP_204_NO_CONTENT
        )


def get_url_metadata(set_id):
    """
    Get the data from the API endpoint.
    """
    response = requests.get(f"http://7tv.io/v3/emote-sets/{set_id}", timeout=3)
    if response.status_code != 200:
        return {}
    return response.json()
