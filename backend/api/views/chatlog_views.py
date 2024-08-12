from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import HttpRequest
from rest_framework.response import Response


from ..models import ChatFile
from ..serializers import ChatFileSerializer
from ..tasks import preprocess_task

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
            
            # Dispatch preprocessing task to Celery
            preprocess_task.delay(row, obj.file.path)

        return Response({"message": "Task dispatched!"}, status=status.HTTP_201_CREATED)