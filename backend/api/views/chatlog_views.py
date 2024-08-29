import json

import requests
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import HttpRequest
from rest_framework.response import Response
from django.utils.dateparse import parse_datetime

from ..models import ChatFile, Task
from ..serializers import ChatFileSerializer
from ..tasks import get_rustlog_task, preprocess_task


class ChatFileViewSet(viewsets.ModelViewSet):
    queryset = ChatFile.objects.all()
    serializer_class = ChatFileSerializer

    def create(self, request: HttpRequest, *args, **kwargs):
        # File size validation
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

    def update(self, request: HttpRequest, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        # Ensure the update method correctly handles file and filename updates
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()

    def list(self, request: HttpRequest, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(
            queryset, many=True, context={"request": request}
        )
        return Response({"files": serializer.data})

    @action(detail=False, methods=["delete"])
    def delete_all(self, request: HttpRequest, *args, **kwargs):
        ChatFile.objects.all().delete()
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def preprocess(self, request: HttpRequest, *args, **kwargs):
        #  Request: <QueryDict: {'parentIds', 'format', 'useEmotes', 'emoteSet', 'filterEmotes', 'minWords'}>
        # Obtain id for the row to preprocess

        ROW_IDS: list[str] = json.loads(request.POST.get("parentIds"))
        FORMAT: str = request.POST.get("format")
        USE_SENTIMENT = json.loads(request.POST.get("useSentiment").lower())
        USE_EMOTES = json.loads(request.POST.get("useEmotes").lower())
        EMOTE_SET = request.POST.get("emoteSet")
        FILTER_EMOTES = json.loads(request.POST.get("filterEmotes").lower())
        MIN_WORDS = int(request.POST.get("minWords"))

        if not ROW_IDS:
            return Response(
                {"error": "No id(s) provided to preprocess"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for row in ROW_IDS:
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
                FORMAT,
                USE_SENTIMENT,
                USE_EMOTES,
                EMOTE_SET,
                FILTER_EMOTES,
                MIN_WORDS,
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
        repo_name = request.POST.get("repo_name")
        channel_name = request.POST.get("channel_name")
        start_date_str = request.POST.get("start_date")
        end_date_str = request.POST.get("end_date")

        # Handle default date values
        if not start_date_str:
            start_date_str = "0001-01-01T00:00:00"
        if not end_date_str:
            end_date_str = "3001-01-01T00:00:00"

        try:
            start_date = parse_datetime(start_date_str)
            end_date = parse_datetime(end_date_str)
            if not start_date or not end_date:
                raise ValueError("Invalid date format")
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create task object
        task = Task.objects.create(status="PENDING")

        # Dispatch task to Celery
        get_rustlog_task.delay(
            task.ticket, repo_name, channel_name, start_date_str, end_date_str
        )
        return Response(
            {
                "message": "Successfully enqueued file for preprocessing",
                "ticket": str(task.ticket),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def get_channels_rustlog(self, request, *args, **kwargs):
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
            response = requests.get(f"{repo_url}/channels")
        except requests.RequestException as e:
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
