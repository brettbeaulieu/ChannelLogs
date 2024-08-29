from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from ..models import Task


class TaskStatusView(APIView):
    def get(self, request, *args, **kwargs):
        ticket = request.query_params.get("ticket", None)
        if not ticket:
            return Response(
                {"error": "Ticket parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            task = Task.objects.get(ticket=ticket)
        except Task.DoesNotExist:
            return Response(
                {"error": "Invalid ticket"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {"status": task.status, "result": task.result},
            status=status.HTTP_200_OK,
        )
