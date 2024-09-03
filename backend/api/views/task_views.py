'''
Module for Task views.
'''

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from ..models import Task


class TaskStatusView(APIView):
    """
    A view for retrieving the status and result of a background task.

    Attributes:
        None

    Methods:
        get(request, *args, **kwargs): Retrieve the status and result of a task.
    """
    def get(self, request, *args, **kwargs):
        """
        Retrieve the status and result of a background task.

        Args:
            request (Request): The incoming HTTP request.

        Returns:
            Response: A Django REST Framework Response object containing 
            the task status and result, or an error message if the 
            ticket is invalid or not provided.

        The function expects the following query parameter in the request:
            - ticket (str): The ticket associated with the background task.

        If the ticket is not provided, a 400 Bad Request response is returned.
        If the ticket is invalid, a 404 Not Found response is returned.
        Otherwise, a 200 OK response is returned with the task status and result.
        """
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
