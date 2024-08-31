from datetime import datetime, timedelta
import numpy as np
from django.db.models import Count, Min, Avg, Sum
from django.utils.dateparse import parse_datetime
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from ..common import GRANULARITY
from ..models import Message, MessageEmote
from ..serializers import DateTimeSerializer, MessageSerializer


# Common Functions
def calculate_moving_average(data, period):
    """Calculate the moving average of the values."""
    values = [entry["value"] for entry in data]
    dates = [entry["date"] for entry in data]

    # Ensure all values are numbers and handle None
    values = [
        0 if v is None else v for v in values
    ]  # Replace None with 0 or use another default value

    # Compute the moving average
    moving_averages = []
    for i in range(len(values)):
        start = max(0, i - period + 1)
        window = values[start : i + 1]
        if window:
            moving_avg = np.mean(window)
        else:
            moving_avg = 0
        moving_averages.append(moving_avg)

    # Include the moving averages in the result
    return [
        {
            "date": dates[i],
            "value": moving_averages[i],
        }
        for i in range(len(dates))
    ]


def calculate_running_sum(data):
    """
    Calculate cumulative sum over the data.
    """
    running_total = 0
    result = []

    for entry in data:
        if entry["value"]:
            running_total += entry["value"]
        result.append({"date": entry["date"], "value": running_total})

    return result

def normalize(data):
    """Normalize data such that the maximum value is 1 and the minimum is -1, handling None values."""
    if data:
        # Filter out entries with None values
        valid_entries = [x["value"] for x in data if x["value"] is not None]
        
        if not valid_entries:
            # If no valid entries, return the original data with None values preserved
            return [{"date": entry["date"], "value": None} for entry in data]
        
        min_value = min(valid_entries)
        max_value = max(valid_entries)
        
        # Handle the case where all valid values are the same
        if min_value == max_value:
            return [{"date": entry["date"], "value": 0 if entry["value"] is not None else None} for entry in data]
        
        # Scale values to range [-1, 1]
        def scale(value):
            return 2 * (value - min_value) / (max_value - min_value) - 1
        
        return [
            {"date": entry["date"], "value": scale(entry["value"]) if entry["value"] is not None else None}
            for entry in data
        ]
    
    return []


def get_emote_sums(channel, start_date, end_date):
    # Filter messages between the two timestamps
    messages = Message.objects.filter(
        timestamp__range=[start_date, end_date], parent_log__channel=channel
    )

    # Get the emote occurrences in these messages
    emote_occurrences = (
        MessageEmote.objects.filter(message__in=messages)
        .values("emote__emote_id", "emote__name")
        .annotate(total_count=Sum("count"))
        .order_by("emote__name")
    )

    # Convert the result to a dictionary for easier usage
    emote_count_by_name = [
        {
            "id": item["emote__emote_id"],
            "name": item["emote__name"],
            "value": item["total_count"],
        }
        for item in emote_occurrences
    ]
    return sorted(emote_count_by_name, key=lambda x: x["value"], reverse=True)



def parse_dates(start_date_str: str, end_date_str: str) -> tuple[datetime]:
    if not start_date_str:
        start_date_str = "0001-01-01T00:00:00"
    if not end_date_str:
        end_date_str = "3001-01-01T00:00:00"
    try:
        start_date = parse_datetime(start_date_str)
        end_date = parse_datetime(end_date_str)+timedelta(hours=23, minutes=59, seconds=59)
        if not (start_date and end_date):
            raise ValueError("Invalid date format")
        return start_date, end_date
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")


def aggregate_data(request, aggregate_func, response_key, doNormalize=False):
    channel = request.query_params.get("channel")
    start_date_str = request.query_params.get("start_date")
    end_date_str = request.query_params.get("end_date")
    granularity = request.query_params.get("granularity", "day")  # Default to 'day'

    try:
        start_date, end_date = parse_dates(start_date_str, end_date_str)
        truncate_func = GRANULARITY.get(granularity)
        if not truncate_func:
            raise ValueError(f"Invalid granularity. Choose in {GRANULARITY}.")
    except ValueError as e:
        return Response(
            {"error": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    aggregated_data = (
        Message.objects.filter(
            timestamp__range=[start_date, end_date], parent_log__channel=channel
        )
        .annotate(period=truncate_func("timestamp"))
        .values("period")
        .annotate(total=aggregate_func)
        .order_by("period")
    )

    formatted_data = [
        {
            "date": entry["period"].isoformat(),
            response_key: entry["total"],
        }
        for entry in aggregated_data
    ]

    if doNormalize:
        formatted_data = normalize(formatted_data)

    return Response(formatted_data, status=status.HTTP_200_OK)


# Viewset
class MessageFilter(filters.FilterSet):
    start_date = filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    end_date = filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")
    channel = filters.CharFilter(field_name="parent_log__channel", lookup_expr="exact")

    class Meta:
        model = Message
        fields = ["start_date", "end_date", "channel"]


class MessagePagination(PageNumberPagination):
    page_size = 10  # Number of items per page
    page_size_query_param = "page_size"
    max_page_size = 100  # Maximum number of items per page


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    pagination_class = MessagePagination
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = MessageFilter
    ordering = ["timestamp"]  # Ensure default ordering by timestamp

    def get_queryset(self):
        """
        Optionally restricts the returned messages by applying filters and ordering.
        """
        queryset = super().get_queryset()

        # Apply ordering
        ordering = self.request.query_params.get("ordering", None)
        if ordering:
            # Allow ordering by specific fields if provided
            ordering_fields = ordering.split(",")
            queryset = queryset.order_by(*ordering_fields)
        else:
            # Apply default ordering if no ordering parameter is provided
            queryset = queryset.order_by("timestamp")

        return queryset

    @action(detail=False, methods=["get"])
    def message_count_aggregate(self, request):
        return aggregate_data(request, Count("id"), "value")

    @action(detail=False, methods=["get"])
    def message_count_cumulative(self, request):
        response = aggregate_data(request, Count("id"), "value")
        data = response.data
        return Response(calculate_running_sum(data), status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def get_earliest_date(self, request):
        channel = request.query_params.get("channel")
        # TODO: MAKE SURE THIS REFERENCES CHANNEL
        earliest_date = Message.objects.aggregate(
            earliest_date=Min("timestamp"), channel=channel
        )["earliest_date"]
        serializer = DateTimeSerializer(data={"date": earliest_date})
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def message_count(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Parse Parameters
        try:
            start_date, end_date = parse_dates(start_date_str, end_date_str)
        except ValueError as e:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Filter messages within the given date range
        message_count = Message.objects.filter(
            timestamp__range=[start_date, end_date], parent_log__channel=channel
        ).count()

        return Response({"value": message_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unique_users(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Parse Parameters
        try:
            start_date, end_date = parse_dates(start_date_str, end_date_str)
        except ValueError as e:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find the number of distinct users who sent messages within the given date range
        unique_users = (
            Message.objects.filter(
                timestamp__range=[start_date, end_date], parent_log__channel=channel
            )
            .values("username")
            .distinct()
            .aggregate(count=Count("username"))["count"]
        )

        return Response({"value": unique_users}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unique_users_aggregate(self, request):
        return aggregate_data(request, Count("username", distinct=True), "value")

    @action(detail=False, methods=["get"])
    def sentiment_aggregate(self, request):
        return aggregate_data(request, Avg("sentiment_score"), "value", True)

    @action(detail=False, methods=["get"])
    def sentiment_cumulative_aggregate(self, request):
        response = aggregate_data(request, Sum("sentiment_score"), "value")
        data = response.data
        period = int(request.query_params.get("period", 1))
        return Response(calculate_running_sum(data, period), status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def sentiment_pie(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Parse parameters
        try:
            start_date, end_date = parse_dates(start_date_str, end_date_str)
        except ValueError as e:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregate positive, neutral, and negative scores.
        aggregated_data = (
            Message.objects.filter(
                timestamp__range=[start_date, end_date], parent_log__channel=channel
            )
            .values("sentiment_score")
            .annotate(count=Count("sentiment_score"))
            .order_by("sentiment_score")
        )

        # Create a dictionary to map sentiment scores to their names
        sentiment_mapping = {1: "Positive", 0: "Neutral", -1: "Negative"}

        # Create a list to store the formatted response
        response_data = [
            {
                "name": sentiment_mapping.get(entry["sentiment_score"], "Unknown"),
                "value": entry["count"],
            }
            for entry in aggregated_data
        ]

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def popular_emotes(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Parse parameters
        try:
            start_date, end_date = parse_dates(start_date_str, end_date_str)
        except ValueError as e:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Query to sum values for each distinct key in 'emotes', and normalize to average at 0.
        response_data = get_emote_sums(channel, start_date, end_date)
        return Response(response_data, status=status.HTTP_200_OK)


