from rest_framework import status, viewsets
import requests
from ..models import EmoteSet
from ..serializers import EmoteSetSerializer
from rest_framework.response import Response
from rest_framework.decorators import action


class EmoteSetViewSet(viewsets.ModelViewSet):
    queryset = EmoteSet.objects.all()
    serializer_class = EmoteSetSerializer

    def create(self, request, *args, **kwargs):

        # Perform basic validation
        data = self.get_url_metadata(request)

        if not data:
            return Response({'error': 'ID validation failed'}, status=status.HTTP_400_BAD_REQUEST)

        data_obj = {'set_id': data["id"], 'name': data["name"], 'counts': {}}

        serializer = self.get_serializer(data=data_obj)
        # Ensure the data is valid before saving
        serializer.is_valid(raise_exception=True)

        # Proceed with the default creation process
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['delete'])
    def delete_all(self, request, *args, **kwargs):
        """
        Custom action to delete all instances of EmoteSet.
        """
        count, _ = EmoteSet.objects.all().delete()
        return Response({'message': f'{count} instances deleted'}, status=status.HTTP_204_NO_CONTENT)

    def get_url_metadata(self, request):
        """
        Get the data from the API endpoint.
        """
        id = request.data.get('id', '')

        response = requests.get(f"http://7tv.io/v3/emote-sets/{id}")
        if response.status_code != 200:
            return {}
        return response.json()
 