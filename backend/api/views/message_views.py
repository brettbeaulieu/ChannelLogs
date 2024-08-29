import numpy as np
from django.db import connection
from django.db.models import Count, Min, Avg, Sum
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..common import GRANULARITY
from ..models import Message, Emote, MessageEmote
from ..serializers import DateTimeSerializer, MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    @action(detail=False, methods=["get"])
    def message_count_aggregate(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        granularity = request.query_params.get("granularity", "day")  # Default to 'day'

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

        # Determine the truncation function based on granularity
        if granularity in GRANULARITY:
            truncate_func = GRANULARITY[granularity]
        else:
            return Response(
                {"error": f"Invalid granularity. Choose in {GRANULARITY}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregate message counts based on the specified granularity
        aggregated_data = (
            Message.objects.filter(
                timestamp__range=[start_date, end_date], parent_log__channel=channel
            )
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(total_messages=Count("id"))
            .order_by("period")
        )

        # Transform the data to match the desired format
        formatted_data = [
            {
                "date": entry["period"].isoformat(),
                "value": entry["total_messages"],
            }
            for entry in aggregated_data
        ]

        return Response(formatted_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def message_count_cumulative(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        granularity = request.query_params.get("granularity", "day")  # Default to 'day'

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

        # Determine the truncation function based on granularity
        if granularity in GRANULARITY:
            truncate_func = GRANULARITY[granularity]
        else:
            return Response(
                {"error": f"Invalid granularity. Choose in {GRANULARITY}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregate message counts based on the specified granularity
        aggregated_data = (
            Message.objects.filter(
                timestamp__range=[start_date, end_date], parent_log__channel=channel
            )
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(total_messages=Count("id"))
            .order_by("period")
        )

        # Transform the data to match the desired format
        formatted_data = [
            {
                "date": entry["period"].isoformat(),
                "value": entry["total_messages"],
            }
            for entry in aggregated_data
        ]

        running_sum_data = calculate_running_sum(formatted_data)

        return Response(running_sum_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def get_earliest_date(self, request, *args, **kwargs):
        # Get the earliest message's date
        channel = request.query_params.get("channel")

        earliest_date = Message.objects.aggregate(earliest_date=Min("timestamp"))[
            "earliest_date"
        ]

        # Serialize date
        serializer = DateTimeSerializer(data={"date": earliest_date})

        # Return response
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def message_count(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Validate and parse the dates
        if not start_date_str or not end_date_str:
            return Response(
                {"error": "Both 'start_date' and 'end_date' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = parse_datetime(start_date_str)
            end_date = parse_datetime(end_date_str)
            if not start_date or not end_date:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {
                    "error": "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)."
                },
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

        # Validate and parse the dates
        if not start_date_str or not end_date_str:
            return Response(
                {"error": "Both 'start_date' and 'end_date' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = parse_datetime(start_date_str)
            end_date = parse_datetime(end_date_str)
            if not start_date or not end_date:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {
                    "error": "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)."
                },
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
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        granularity = request.query_params.get("granularity", "day")  # Default to 'day'

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

        # Determine the truncation function based on granularity
        if granularity in GRANULARITY:
            truncate_func = GRANULARITY[granularity]
        else:
            return Response(
                {"error": f"Invalid granularity. Choose in {GRANULARITY}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregate unique users based on the specified granularity
        aggregated_data = (
            Message.objects.filter(
                timestamp__range=[start_date, end_date], parent_log__channel=channel
            )
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(unique_users=Count("username", distinct=True))  # Count unique users
            .order_by("period")
        )

        # Transform the data to match the desired format
        formatted_data = [
            {
                "date": entry["period"].isoformat(),
                "value": entry["unique_users"],
            }
            for entry in aggregated_data
        ]

        return Response(formatted_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def sentiment_aggregate(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        granularity = request.query_params.get("granularity", "day")  # Default to 'day'

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

        # Determine the truncation function based on granularity
        if granularity in GRANULARITY:
            truncate_func = GRANULARITY[granularity]
        else:
            return Response(
                {"error": f"Invalid granularity. Choose in {GRANULARITY}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregate message counts based on the specified granularity
        aggregated_data = (
            Message.objects.filter(
                timestamp__range=[start_date, end_date], parent_log__channel=channel
            )
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(senti=Avg("sentiment_score"))
            .order_by("period")
        )

        # Transform the data to match the desired format
        formatted_data = [
            {
                "date": entry["period"].isoformat(),
                "value": entry["senti"],
            }
            for entry in aggregated_data
        ]

        moving_avg_data = formatted_data

        return Response(moving_avg_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def sentiment_cumulative_aggregate(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        granularity = request.query_params.get("granularity", "day")  # Default to 'day'
        period = int(
            request.query_params.get("period", 1)
        )  # Default period if not provided

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

        # Determine the truncation function based on granularity
        if granularity in GRANULARITY:
            truncate_func = GRANULARITY[granularity]
        else:
            return Response(
                {"error": f"Invalid granularity. Choose in {GRANULARITY}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aggregate message counts based on the specified granularity
        aggregated_data = (
            Message.objects.filter(
                timestamp__range=[start_date, end_date], parent_log__channel=channel
            )
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(toxic=Sum("sentiment_score"))
            .order_by("period")
        )

        # Transform the data to match the desired format
        formatted_data = [
            {
                "date": entry["period"].isoformat(),
                "value": entry["toxic"],
            }
            for entry in aggregated_data
        ]

        # Calculate the running sum with the specified period
        running_sum_data = calculate_running_sum(formatted_data)

        return Response(running_sum_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def sentiment_pie(self, request):
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
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

        # Query to sum values for each distinct key in 'emotes', and normalize to average at 0.
        response_data = get_emote_sums(channel, start_date, end_date)

        return Response(response_data, status=status.HTTP_200_OK)


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
    """Normalize data as returned from calculate_running_sum"""
    if data:
        values = [x["value"] for x in data]
        average = sum(values) / len(values)
        return [
            {"date": entry["date"], "value": entry["value"] - average} for entry in data
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
