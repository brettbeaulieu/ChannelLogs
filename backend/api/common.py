'''
A collection of common functions and variables used in the project
'''

from datetime import datetime, timedelta
from django.utils.dateparse import parse_datetime

from django.db.models.functions import (
    TruncMonth,
    TruncWeek,
    TruncDay,
    TruncHour,
    TruncMinute,
)

GRANULARITY = {
    "minute": TruncMinute,
    "hour": TruncHour,
    "day": TruncDay,
    "week": TruncWeek,
    "month": TruncMonth,
}

def parse_dates(start_date_str: str, end_date_str: str) -> tuple[datetime]:
    '''
    Parse two date strings, and return their datetime equivalents in a tuple.
    Arguments:
        start_date_str (str): The start date string
        end_date_str (str): The end date string
    Returns:
        tuple[datetime]: A tuple containing the start and end date 
    '''
    if not start_date_str:
        start_date_str = "0001-01-01T00:00:00"
    if not end_date_str:
        end_date_str = "3001-01-01T00:00:00"
    try:
        start_date = parse_datetime(start_date_str)
        end_date = parse_datetime(end_date_str) + timedelta(
            hours=23, minutes=59, seconds=59
        )
        if not (start_date and end_date):
            raise ValueError("Invalid date format")
        return start_date, end_date
    except ValueError as exc:
        raise ValueError("Invalid date format. Use YYYY-MM-DD.") from exc
