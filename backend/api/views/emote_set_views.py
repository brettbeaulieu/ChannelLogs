from rest_framework import status, viewsets
import requests
from ..models import EmoteSet, Task
from ..serializers import EmoteSetSerializer
from rest_framework.response import Response
from rest_framework.decorators import action
from ..tasks import build_emote_set_task


class EmoteSetViewSet(viewsets.ModelViewSet):
    queryset = EmoteSet.objects.all()
    serializer_class = EmoteSetSerializer

    def create(self, request, *args, **kwargs):
        id = request.data.get("id", "")

        # Perform basic validation
        data = get_url_metadata(id)

        if not data:
            return Response(
                {"error": "ID validation failed"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Create a new task
        task = Task.objects.create(status="PENDING")

        build_emote_set_task.delay(id, task.ticket)

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


def get_url_metadata(id):
    """
    Get the data from the API endpoint.
    """
    response = requests.get(f"http://7tv.io/v3/emote-sets/{id}")
    if response.status_code != 200:
        return {}
    return response.json()
