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