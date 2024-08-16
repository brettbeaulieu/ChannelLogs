from datetime import timedelta
import numpy as np
import pandas as pd
from django.db.models import Count, Min, Avg
from django.db.models.functions import (
    TruncDate,
)
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..common import GRANULARITY
from ..models import Message
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

        # Get sentiment data
        aggregated_data = (
            Message.objects.filter(timestamp__range=[start_date, end_date])
            .annotate(period=truncate_func('timestamp'))  # Truncate the date in the query
            .values('period', 'sentiment_label', 'sentiment_score')
            .order_by('period')
        )
        # Convert to DataFrame for rolling average calculation
        df = pd.DataFrame(aggregated_data)
        df['period'] = pd.to_datetime(df['period'])

        # Period-indexed pivot table; labels as columns, scores as values
        pivot_df = df.pivot_table(
            index="period", columns="sentiment_label", values="sentiment_score"
        )

        # Calculate rolling averages for each sentiment label
        rolling_avg = pivot_df.rolling(
            window=14, min_periods=1
        ).mean()  # 7-day window; adjust as needed

        # Round the rolling averages to 4 decimal places
        rolling_avg = rolling_avg.replace([pd.NA, float('inf'), float('-inf'), np.nan], 0)
        rolling_avg = rolling_avg.round(2)


        # Transform the data to match the desired format
        formatted_data = []
        for period, row in rolling_avg.iterrows():
            formatted_data.append(
                {
                    "date": period.date().isoformat(),
                    **row.to_dict(),  # Add all sentiment labels and their rolling averages
                }
            )

        return Response(formatted_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def toxicity_aggregate(self, request):
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
            .annotate(toxic=Avg("toxicity"))
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

        return Response(formatted_data, status=status.HTTP_200_OK)
