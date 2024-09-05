"""
Module for all ChatFile views
"""

import json

import requests
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import HttpRequest
from rest_framework.response import Response

from ..common import parse_dates


from ..models import Channel, ChatFile, Task
from ..serializers import ChatFileSerializer
from ..tasks import get_rustlog_task, preprocess_task


class ChatFileViewSet(viewsets.ModelViewSet):
    """
    View set for ChatFiles, with custom views for tasks such as preprocessing
    ChatFiles, and retrieving data from a Rustlog API endpoint.
    """

    queryset = ChatFile.objects.all()
    serializer_class = ChatFileSerializer

    def create(self, request: HttpRequest, *args, **kwargs):
        files = request.FILES.getlist("files")
        if not files:
            return Response(
                {"error": "No file(s) uploaded"}, status=status.HTTP_400_BAD_REQUEST
            )

        file_objs = []

        for file in files:
            # Prepare the data for each file
            chat_log_data = {
                "file": file,
                "filename": request.data.get("filename", file.name.split("/")[-1]),
                "is_preprocessed": request.data.get("is_preprocessed", False),
                "metadata": request.data.get("metadata", None),
            }

            # Create a ChatLog instance
            serializer = self.get_serializer(data=chat_log_data)
            serializer.is_valid(raise_exception=True)

            self.perform_create(serializer)
            file_objs.append(serializer.data)

        headers = self.get_success_headers(file_objs[0]) if file_objs else {}
        return Response(
            {"files": file_objs}, status=status.HTTP_201_CREATED, headers=headers
        )

    def partial_update(self, request, *args, **kwargs):
        ref_instance = self.get_object()

        channel = dict(request.POST)
        formatted = {"channel": json.loads(channel["channel"][0])}

        ref_instance.channel = Channel.objects.get(id=formatted["channel"]["id"])
        ref_instance.save()

        ref_serializer = self.get_serializer()

        headers = self.get_success_headers(ref_serializer.data)
        return Response(ref_serializer.data, status=status.HTTP_200_OK, headers=headers)

    @action(detail=False, methods=["delete"])
    def delete_all(self, request: HttpRequest):
        """
        Deletes all rows from the ChatFile table.

        Arguments:
            request -- HttpRequest object
        Returns:
            Response object with status code 200 OK
        """
        ChatFile.objects.all().delete()
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def preprocess(self, request: HttpRequest, *args, **kwargs):
        """
        Create a preprocessing task for the given file, and return
        the associated ticket number.

        Arguments:
            request -- HttpRequest object containing the following fields:
                - parentIds: list[str]
                - format: str
                - useSentiment: bool
                - useEmotes: bool
                - emoteSet: str
                - filterEmotes: bool
                - minWords: int

        Returns:
            Response object with status code 200 OK, containing 'message' and
            'ticket' fields
        """

        row_ids: list[str] = json.loads(request.POST.get("parentIds"))
        format_str = request.POST.get("format")
        use_sentiment = json.loads(request.POST.get("useSentiment").lower())
        use_emotes = json.loads(request.POST.get("useEmotes").lower())
        emote_set = request.POST.get("emoteSet")
        filter_emotes = json.loads(request.POST.get("filterEmotes").lower())
        min_words = int(request.POST.get("minWords"))

        if not row_ids:
            return Response(
                {"error": "No id(s) provided to preprocess"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for row in row_ids:
            # Check if id exists in the table
            try:
                obj = ChatFile.objects.get(id=row)
            except ChatFile.DoesNotExist:
                return Response(
                    {"error": "One or more files could not be found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create task object
            task = Task.objects.create(status="PENDING")

            # Dispatch preprocessing task to Celery
            preprocess_task.delay(
                task.ticket,
                row,
                obj.file.path,
                format_str,
                use_sentiment,
                use_emotes,
                emote_set,
                filter_emotes,
                min_words,
            )

            return Response(
                {
                    "message": "Successfully enqueued file for preprocessing",
                    "ticket": str(task.ticket),
                },
                status=status.HTTP_200_OK,
            )

    @action(detail=False, methods=["post"])
    def grab_logs_rustlog(self, request: HttpRequest, *args, **kwargs):
        """
        Create a task to retrieve logs from a Rustlog repository, and return
        the associated ticket number.

        Arguments:
            request -- HttpRequest object containing the following fields:
                - repo_name: str
                - channel_name: str
                - start_date: str
                - end_date: str

        Returns:
            Response object with status code 200 OK, containing 'message' and
            'ticket' fields
        """
        repo_name = request.POST.get("repo_name")
        channel_name = request.POST.get("channel_name")
        start_date_str = request.POST.get("start_date")
        end_date_str = request.POST.get("end_date")

        start_date, end_date = parse_dates(start_date_str, end_date_str)

        # Create task object
        task = Task.objects.create(status="PENDING")

        # Dispatch task to Celery
        get_rustlog_task.delay(
            task.ticket, repo_name, channel_name, start_date, end_date
        )
        return Response(
            {
                "message": "Successfully enqueued file for preprocessing",
                "ticket": str(task.ticket),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def get_channels_rustlog(self, request):
        """
        Return all channels found in a Rustlog repository.

        Arguments:
            request -- HttpRequest object containing the following fields:
                - repo_url: str

        Returns:
            Response object with status code 200 OK, containing 'data' field
        """
        # Retrieve the repository URL from query parameters
        repo_url = request.query_params.get("repo_url")

        # Check if repo_url is provided
        if not repo_url:
            return Response(
                {"error": "repo_url parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Perform the GET request to the channels endpoint
        try:
            response = requests.get(f"{repo_url}/channels", timeout=3)
        except requests.RequestException:
            # Handle exceptions from the requests library (e.g., connection errors)
            return Response(
                {"error": "could not connect to repo_url"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Parse the JSON response
        try:
            data = response.json()
        except ValueError:
            return Response(
                {"error": "Invalid JSON response"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Return the JSON data or an empty dictionary if no data
        return Response({"data": data})
