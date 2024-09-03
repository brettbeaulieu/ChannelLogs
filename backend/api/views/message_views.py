'''
Module for Message views.
'''

import numpy as np
from django.db.models import Count, Sum
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from ..common import GRANULARITY, parse_dates
from ..models import ChatFile, Message, MessageEmote
from ..serializers import MessageSerializer


# Common Functions
def calculate_moving_average(data, period):
    """
    Calculate the moving average of the values in a list of dictionaries.

    Args:
        data (list): A list of dictionaries, where each dictionary contains
            a 'date' key (str) and a 'value' key (float or int).

    Returns:
        list: A list of dictionaries, where each dictionary contains a 'date'
            key (str) and a 'value' key (int) representing the
            moving average at that date.
    """
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
    Calculate the cumulative sum of values in a list of dictionaries.

    Args:
        data (list): A list of dictionaries, where each dictionary contains
            a 'date' key (str) and a 'value' key (float or int).

    Returns:
        list: A list of dictionaries, where each dictionary contains a 'date'
            key (str) and a 'value' key (float or int) representing the
            cumulative sum up to that date.
    """
    running_total = 0
    result = []

    for entry in data:
        if entry["value"]:
            running_total += entry["value"]
        result.append({"date": entry["date"], "value": running_total})

    return result


def normalize(data):
    """
    Normalize a list of dictionaries containing 'date' and 'value' keys.

    The normalization scales the 'value' entries such that the maximum value
    is 1 and the minimum value is -1. If all valid 'value' entries are the
    same, they are set to 0.5. Entries with 'value' set to None are preserved.

    Args:
        data (list): A list of dictionaries, where each dictionary contains
            a 'date' key (str) and a 'value' key (float or int).

    Returns:
        list: A list of dictionaries with normalized 'value' entries, where
            each dictionary contains a 'date' key (str) and a 'value' key
            (float or None).
    """
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
            return [
                {
                    "date": entry["date"],
                    "value": 0.5 if entry["value"] is not None else None,
                }
                for entry in data
            ]

        # Scale values to range [-1, 1]
        def scale(value):
            return 2 * (value - min_value) / (max_value - min_value) - 1

        return [
            {
                "date": entry["date"],
                "value": scale(entry["value"]) if entry["value"] is not None else None,
            }
            for entry in data
        ]

    return []


def get_emote_sums(channel, start_date, end_date) -> list[dict]:
    """
    Retrieve the sum of emote counts for a given channel within a specified date range.

    Args:
        channel (Channel): The channel object for which to retrieve emote counts.
        start_date (datetime): The start date of the date range.
        end_date (datetime): The end date of the date range.

    Returns:
        list: A list of dictionaries, where each dictionary contains the following keys:
            - 'id' (int): The ID of the emote.
            - 'name' (str): The name of the emote.
            - 'value' (int): The total count of the emote within the specified date range.
        The list is sorted in descending order by the 'value' key.
    """
    # Filter messages between the two timestamps
    channel_logs = ChatFile.objects.filter(channel=channel)

    # Retrieve Message objects associated with the Channel's ChatFiles in the date range
    messages = Message.objects.filter(
        parent_log__in=channel_logs, timestamp__range=[start_date, end_date]
    )

    # Retrieve MessageEmote objects associated with the filtered messages,
    # and sum counts
    emote_occurrences = (
        MessageEmote.objects.filter(message__in=messages)
        .values("emote__name", "emote__emote_id")
        .annotate(total_count=Sum("count"))
        .order_by("-total_count")
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


def aggregate_data(request, aggregate_func, response_key, do_normalize=False) -> Response:
    """
    Aggregate message data for a given channel within a specified date range.

    Args:
        request (Request): The incoming HTTP request.
        aggregate_func (function): The function to use for aggregating the data.
        response_key (str): The key to use for the aggregated value in the response.
        do_normalize (bool, optional): Whether to normalize the aggregated data. Defaults to False.

    Returns:
        Response: A Django REST Framework Response object containing the aggregated data.
    """
    channel = request.query_params.get("channel")
    start_date_str = request.query_params.get("start_date")
    end_date_str = request.query_params.get("end_date")
    granularity = request.query_params.get("granularity", "day")  # Default to 'day'

    try:
        start_date, end_date = parse_dates(start_date_str, end_date_str)
        truncate_func = GRANULARITY.get(granularity)
        if not truncate_func:
            raise ValueError(f"Invalid granularity. Choose in {GRANULARITY}.")
    except ValueError:
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

    if do_normalize:
        formatted_data = normalize(formatted_data)

    return Response(formatted_data, status=status.HTTP_200_OK)


# Viewset
class MessageFilter(filters.FilterSet):
    """
    A filter class for the Message model that allows filtering messages
    by a date range.

    Attributes:
        start_date (filters.DateTimeFilter): A filter for messages with a
            timestamp greater than or equal to the specified start date.
        end_date (filters.DateTimeFilter): A filter for messages with a
            timestamp less than or equal to the specified end date.
    """

    start_date = filters.DateTimeFilter(field_name="timestamp", lookup_expr="gte")
    end_date = filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = Message
        fields = ["start_date", "end_date"]


class MessagePagination(PageNumberPagination):
    """
    A pagination class for the Message model that allows paginating messages
    by with a configurable page size.

    Attributes:
        page_size (int): The number of items per page.
        page_size_query_param (str): The query parameter for the page size.
        max_page_size (int): The maximum number of items per page.
    """

    page_size = 10  # Number of items per page
    page_size_query_param = "page_size"
    max_page_size = 100  # Maximum number of items per page


class MessageViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for the Message model
    Attributes:
        queryset (QuerySet): The base queryset for the Message model.
        serializer_class (Serializer): The serializer class for the Message model.
        pagination_class (Pagination): The pagination class for the Message model.
        filter_backends (tuple): The filter backends to be used for filtering the queryset.
        filterset_class (FilterSet): The filterset class for the Message model.
        ordering (list): The default ordering for the queryset.
    """
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
        """
        Retrieve the aggregated message counts for a given channel within a specified date range.

        Query Parameters:
            - channel (str): The name of the channel for which to aggregate message counts.
            - start_date (str): The start date of the date range in YYYY-MM-DD format.
            - end_date (str): The end date of the date range in YYYY-MM-DD format.
            - granularity (str, optional): The granularity of the aggregation
              (e.g., 'day', 'week', 'month').
                Defaults to 'day'.

        Returns:
            Response: A Django REST Framework Response object containing a list of dictionaries,
                where each dictionary contains the following keys:
                - 'date' (str): The date or period for which the message count is aggregated.
                - 'total_messages' (int): The total number of messages within the
                   specified date range.
            The aggregated data is normalized such that the maximum value is 1 and the
            minimum value is -1.
        """
        return aggregate_data(request, Count("id"), "value")

    @action(detail=False, methods=["get"])
    def message_count_cumulative(self, request):
        """
        Retrieve the running sum of message counts for a given channel within a specified
        date range.

        Query Parameters:
            - channel (str): The name of the channel for which to calculate the running 
              sum of message counts.
            - start_date (str): The start date of the date range in YYYY-MM-DD format.
            - end_date (str): The end date of the date range in YYYY-MM-DD format.
            - granularity (str, optional): The granularity of the aggregation 
              (e.g., 'day', 'week', 'month'). Defaults to 'day'.

        Returns:
            Response: A Django REST Framework Response object containing a list of dictionaries,
                where each dictionary contains the following keys:
                - 'date' (str): The date or period for which the message count is aggregated.
                - 'total_messages' (int): The running sum of message counts up to the specified
                   date or period.
        """
        response = aggregate_data(request, Count("id"), "value")
        data = response.data
        return Response(calculate_running_sum(data), status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def message_count(self, request):
        """
        Retrieve the total count of messages for a given channel within a specified date range.

        Query Parameters:
            - channel (str): The name of the channel for which to retrieve the message count.
            - start_date (str): The start date of the date range in YYYY-MM-DD format.
            - end_date (str): The end date of the date range in YYYY-MM-DD format.

        Returns:
            Response: A Django REST Framework Response object containing a dictionary
                     with the following key:
                - 'value' (int): The total count of messages within the specified date range.

        Raises:
            Response (HTTP 400 Bad Request): If the provided date strings are not in the 
            expected format.
        """
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Parse Parameters
        try:
            start_date, end_date = parse_dates(start_date_str, end_date_str)
        except ValueError:
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
        """
        Retrieve the number of unique users who sent messages in a channel within 
        a specified date range.

        Query Parameters:
            - channel (str): The name of the channel for which to retrieve the message count.
            - start_date (str): The start date of the date range in YYYY-MM-DD format.
            - end_date (str): The end date of the date range in YYYY-MM-DD format.

        Returns:
            Response: A Django REST Framework Response object containing a dictionary
                     with the following key:
                - 'value' (int): The total count of messages within the specified date range.

        Raises:
            Response (HTTP 400 Bad Request): If the provided date strings are not in the 
            expected format.
        """
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Parse Parameters
        try:
            start_date, end_date = parse_dates(start_date_str, end_date_str)
        except ValueError:
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
        """
        Retrieve the aggregated unique users for a given channel within a specified date range.

        Query Parameters:
            - channel (str): The name of the channel for which to aggregate unique users.
            - start_date (str): The start date of the date range in YYYY-MM-DD format.
            - end_date (str): The end date of the date range in YYYY-MM-DD format.
            - granularity (str, optional): The granularity of the aggregation
              (e.g., 'day', 'week', 'month').
                Defaults to 'day'.

        Returns:
            Response: A Django REST Framework Response object containing a list of dictionaries,
                where each dictionary contains the following keys:
                - 'date' (str): The date or period for which the unique users are aggregated.
                - 'value' (int): The total number of unique users within the
                   specified date range.
            The aggregated data is normalized such that the maximum value is 1 and the
            minimum value is -1.
        """
        return aggregate_data(request, Count("username", distinct=True), "value")

    @action(detail=False, methods=["get"])
    def popular_emotes(self, request):
        """
        Retrieve the most popular emotes for a given channel within a specified date range.

        Query Parameters:
            - channel (str): The name of the channel for which to retrieve emote counts.
            - start_date (str): The start date of the date range in YYYY-MM-DD format.
            - end_date (str): The end date of the date range in YYYY-MM-DD format.

        Returns:
            Response: A Django REST Framework Response object containing a list of dictionaries,
                where each dictionary contains the following keys:
                - 'id' (int): The ID of the emote.
                - 'name' (str): The name of the emote.
                - 'value' (int): The total count of the emote within the specified date range.
            The list is sorted in descending order by the 'value' key.
        """
        channel = request.query_params.get("channel")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        # Parse parameters
        try:
            start_date, end_date = parse_dates(start_date_str, end_date_str)
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Query to sum values for each distinct key in 'emotes', and normalize to average at 0.
        response_data = get_emote_sums(channel, start_date, end_date)
        return Response(response_data, status=status.HTTP_200_OK)
