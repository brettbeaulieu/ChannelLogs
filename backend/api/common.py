from django.db.models.functions import (
    TruncDate,
    TruncHour,
    TruncMonth,
    TruncWeek,
    TruncMinute,
)

GRANULARITY = {
    "minute": TruncMinute,
    "hour": TruncHour,
    "day": TruncDate,
    "week": TruncWeek,
    "month": TruncMonth,
}