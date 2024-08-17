import re

import psycopg2
from datasets import Dataset
from psycopg2 import sql
from transformers import pipeline

# Constants
URL_MSG = "http://django:8000/api/chat/messages/"
DB_MSG = "api_message"
URL_USER = "http://django:8000/api/chat/users/"
DB_USER = "api_user"
DB_PARAMS = {
    "dbname": "backenddb",
    "user": "maire",
    "password": "maire",
    "host": "db",
    "port": "5432",
}
CREATE_PREFIX = "bulk_create/"
BATCH_SIZE = 4096 * 4


def extract_info_chatterino(day: str, line: str) -> dict[str, any]:
    # Define the regex pattern for extracting the timestamp, username, and message
    pattern = re.compile(
        r"^\[(?P<time>\d{2}:\d{2}:\d{2})\] (?P<user>[^:]+): (?P<message>.*)$"
    )

    # Match the line against the pattern
    match = pattern.match(line)

    if match:
        timestamp = f"{day} {match.group('time')}"
        user = match.group("user")
        message = match.group("message").strip()
        return {"timestamp": timestamp, "user": user, "message": message}
    else:
        # If the line does not match the expected format, return an empty dictionary
        return {}


def extract_info(line: str) -> dict[str, any]:
    # Define the regex pattern for extracting the timestamp, username, and message
    pattern = re.compile(
        r"^\[(?P<datetime>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] #[^ ]+ (?P<username>[^:]+): (?P<message>.*)$"
    )

    # Define the regex pattern for identifying links
    link_pattern = re.compile(r"http[s]?://\S+")

    # Match the line against the pattern
    match = pattern.match(line)

    if match:
        timestamp = match.group("datetime")
        user = match.group("username")
        message = match.group("message").strip()

        # Replace links in the message with <link>
        message = link_pattern.sub("<link>", message)

        return {"timestamp": timestamp, "user": user, "message": message}
    else:
        # If the line does not match the expected format, return an empty dictionary
        return {}


def batch_insert_users(cursor, users_list, batch_size):
    query = sql.SQL(
        "INSERT INTO {table} (username) VALUES (%s) ON CONFLICT (username) DO NOTHING"
    ).format(table=sql.Identifier(DB_USER))
    for i in range(0, len(users_list), batch_size):
        batch = users_list[i : i + batch_size]
        cursor.executemany(query, [(user,) for user in batch])


def batch_insert_messages(cursor, messages_list, batch_size):
    query = sql.SQL(
        "INSERT INTO {table} (parent_log_id, timestamp, user_id, message, sentiment_score) VALUES (%s, %s, %s, %s, %s)"
    ).format(table=sql.Identifier(DB_MSG))
    for i in range(0, len(messages_list), batch_size):
        batch = messages_list[i : i + batch_size]
        cursor.executemany(query, batch)


def preprocess_log(parent_id: int, log_path: str):
    form_data_list = []
    new_users = set()

    # Read file and extract info
    with open(log_path, mode="r", encoding="UTF-8") as log_file:
        lines = log_file.readlines()
        for line in lines:
            info = extract_info(line)
            if info:
                form_data_list.append(info)
                new_users.add(info["user"])

    # Initialize pipelines for tasks
    pipe = pipeline(
        "zero-shot-classification",
        model="cross-encoder/nli-distilroberta-base",
        device=0,
        batch_size=16,
    )

    # Create a Dataset object
    dataset = Dataset.from_dict(
        {
            "timestamp": [item["timestamp"] for item in form_data_list],
            "user": [item["user"] for item in form_data_list],
            "message": [item["message"] for item in form_data_list],
        }
    )

    # Filter out single-word messages efficiently
    def is_valid_message(message):
        return len(re.findall(r"\w+", message)) > 2

    filtered_dataset = dataset.filter(lambda x: is_valid_message(x["message"]))

    # Perform classification
    messages = filtered_dataset["message"]
    emotion_results = pipe(
        messages, ["positive opinion", "negative opinion", "neutral opinion"]
    )

    translate = {
        "negative opinion": -1,
        "neutral opinion": 0,
        "positive opinion": 1,
    }

    # Map results back to the dataset
    sentiment_score = [translate[result["labels"][0]] for result in emotion_results]

    filtered_dataset = filtered_dataset.add_column("sentiment_score", sentiment_score)

    # Build a dictionary for quick lookup
    filtered_data_dict = {item["message"]: item for item in filtered_dataset}

    # Update the original list with classification results
    for item in form_data_list:
        if not is_valid_message(item["message"]):
            item.update({"sentiment_score": None})
        else:
            filtered_item = filtered_data_dict.get(item["message"], {})
            item.update({"sentiment_score": filtered_item.get("sentiment_score")})

    # Use context management for database connection and cursor
    with psycopg2.connect(**DB_PARAMS) as conn:
        with conn.cursor() as cursor:
            # Batch insert new users
            batch_insert_users(cursor, list(new_users), BATCH_SIZE)

            # Fetch user IDs from the database
            cursor.execute(
                sql.SQL("SELECT id, username FROM {table}").format(
                    table=sql.Identifier(DB_USER)
                )
            )
            user_ids = {row[1]: row[0] for row in cursor.fetchall()}

            # Format messages for batch insertion
            msg_list = [
                (
                    parent_id,
                    data["timestamp"],
                    user_ids.get(data["user"], None),
                    data["message"],
                    data["sentiment_score"],
                )
                for data in form_data_list
            ]

            # Batch insert messages
            batch_insert_messages(cursor, msg_list, BATCH_SIZE)
