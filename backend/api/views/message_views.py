import numpy as np
from django.db import connection
from django.db.models import Count, Min, Avg, Sum
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..common import GRANULARITY
from ..models import Message, Emote
from ..serializers import DateTimeSerializer, MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    @action(detail=False, methods=["get"])
    def message_count_aggregate(self, request):
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
            Message.objects.filter(timestamp__range=[start_date, end_date])
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
            Message.objects.filter(timestamp__range=[start_date, end_date])
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
            timestamp__range=[start_date, end_date]
        ).count()

        return Response({"value": message_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unique_users(self, request):
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
            Message.objects.filter(timestamp__range=[start_date, end_date])
            .values("user")
            .distinct()
            .aggregate(count=Count("user"))["count"]
        )

        return Response({"value": unique_users}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unique_users_aggregate(self, request):
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
            Message.objects.filter(timestamp__range=[start_date, end_date])
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(unique_users=Count("user", distinct=True))  # Count unique users
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
            Message.objects.filter(timestamp__range=[start_date, end_date])
            .annotate(period=truncate_func("timestamp"))
            .values("period")
            .annotate(toxic=Avg("sentiment_score"))
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

        moving_avg_data = calculate_moving_average(formatted_data, period)

        return Response(moving_avg_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def sentiment_cumulative_aggregate(self, request):
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
            Message.objects.filter(timestamp__range=[start_date, end_date])
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
            Message.objects.filter(timestamp__range=[start_date, end_date])
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

        # Query to sum values for each distinct key in 'emotes'
        response_data = get_emote_sums(start_date, end_date)

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


def get_emote_sums(start_date, end_date):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH json_data AS (
                SELECT
                    key AS emote_key,
                    value AS emote_value
                FROM api_message
                CROSS JOIN LATERAL jsonb_each_text(emotes) AS emote_entry(key, value)
                WHERE
                    timestamp BETWEEN %s AND %s
            ),
            emote_sums AS (
                SELECT
                    emote_key,
                    SUM(CAST(emote_value AS INTEGER)) AS total_sum
                FROM json_data
                GROUP BY
                    emote_key
            )
            SELECT
                emote_key,
                total_sum
            FROM emote_sums
            ORDER BY
                total_sum 
            DESC;
            """,
            [start_date, end_date],
        )
        # Fetch all results
        results = cursor.fetchall()
        results = get_emote_ids(results)
    return results

def get_emote_ids(emote_counts: list[tuple[str,int]]):
    new_list = []
    for x in emote_counts:
        obj = Emote.objects.get(name=x[0])
        new_list.append({"id": obj.emote_id, "name": x[0], "value": x[1]})
    return new_list