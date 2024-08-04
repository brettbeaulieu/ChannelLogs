import json
from datetime import timedelta

from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import HttpRequest
from rest_framework.response import Response


from .models import ChatFile, Message, User
from .scripts.preprocess import preprocess_log
from .serializers import ChatFileSerializer, MessageSerializer, UserSerializer

MAX_FILE_SIZE = 10485760  # 10 MB


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
        # Obtain id for the row to preprocess
        row_ids = request.POST.getlist("id")

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
            preprocess_log(row, obj.file.path)
            obj.is_preprocessed = True
            obj.save()

        return Response({"message": "Success!"}, status=status.HTTP_201_CREATED)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    @action(detail=False, methods=["post"])
    def bulk_create(self, request):
        msgs = [json.loads(x) for x in request.POST.getlist("messages")][0]

        if not msgs:
            return Response(
                {"error": "No message(s) uploaded"}, status=status.HTTP_400_BAD_REQUEST
            )

        msg_data = []
        errors = []

        # Deserialize messages and collect valid ones
        for msg in msgs:
            try:
                serializer = self.get_serializer(data=msg)
                if serializer.is_valid():
                    msg_data.append(serializer.validated_data)
                else:
                    errors.append(serializer.errors)
            except json.JSONDecodeError:
                errors.append({"error": "Invalid JSON format"})

        if not msg_data:
            return Response(
                {"error": "No valid messages to create", "errors": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use bulk_create to insert all valid messages in one go
        msg_objs = [Message(**data) for data in msg_data]

        with transaction.atomic():
            Message.objects.bulk_create(msg_objs)

        # Prepare response
        created_messages = Message.objects.filter(id__in=[msg.id for msg in msg_objs])
        created_data = self.get_serializer(created_messages, many=True).data

        headers = self.get_success_headers(created_data[0]) if created_data else {}
        return Response(
            {"files": created_data}, status=status.HTTP_201_CREATED, headers=headers
        )


class MessageAggregationViewSet(viewsets.ViewSet):

    @action(detail=False, methods=["get"])
    def aggregate_by_date_range(self, request):
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        granularity = request.query_params.get("granularity", "day")  # Default to 'day'

        if not start_date_str or not end_date_str:
            return Response(
                {"error": "Both start_date and end_date parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)
            if not start_date or not end_date:
                raise ValueError("Invalid date format")
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure end_date is inclusive
        end_date = end_date + timedelta(days=1)

        # Determine the truncation function based on granularity
        if granularity == "day":
            truncate_func = TruncDate
        elif granularity == "week":
            truncate_func = TruncWeek
        elif granularity == "month":
            truncate_func = TruncMonth
        else:
            return Response(
                {"error": "Invalid granularity. Choose 'day', 'week', or 'month'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        aggregated_data = (
            Message.objects.filter(timestamp__range=[start_date, end_date])
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(message_count=Count("id"))
            .order_by("period")
        )

        data = list(aggregated_data)

        return Response(data, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=["post"])
    def bulk_create(self, request):
        users = {"username": json.loads(x) for x in request.POST.getlist("usernames")}

        if not users:
            return Response(
                {"error": "No user(s) uploaded"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Deserialize messages and collect valid ones
        user_data = []
        errors = []
        for user in users['username']:
            try:
                serializer = self.get_serializer(data={"username": user})
                if serializer.is_valid():
                    user_data.append(serializer.validated_data)
                else:
                    errors.append(serializer.errors)
            except json.JSONDecodeError:
                errors.append({"error": "Invalid JSON format"})

        # Use bulk_create to insert all valid messages in one go
        user_objs = [User(**data) for data in user_data]

        with transaction.atomic():
            User.objects.bulk_create(user_objs)

        # Prepare response
        created_messages = User.objects.filter(id__in=[msg.id for msg in user_objs])
        created_data = self.get_serializer(created_messages, many=True).data

        headers = self.get_success_headers(created_data[0]) if created_data else {}
        return Response(
            {"users": created_data}, status=status.HTTP_201_CREATED, headers=headers
        )
