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


def extract_info(day: str, line: str) -> dict[str, any]:
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


def batch_insert_users(cursor, users_list, batch_size):
    query = sql.SQL(
        "INSERT INTO {table} (username) VALUES (%s) ON CONFLICT (username) DO NOTHING"
    ).format(table=sql.Identifier(DB_USER))
    for i in range(0, len(users_list), batch_size):
        batch = users_list[i : i + batch_size]
        cursor.executemany(query, [(user,) for user in batch])


def batch_insert_messages(cursor, messages_list, batch_size):
    query = sql.SQL(
        "INSERT INTO {table} (parent_log_id, timestamp, user_id, message, toxicity, sentiment_score, sentiment_label) VALUES (%s, %s, %s, %s, %s, %s, %s)"
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
        day = lines[0][19:29]
        for line in lines[1:]:
            info = extract_info(day, line)
            if info:
                form_data_list.append(info)
                new_users.add(info["user"])

    # Initialize pipelines for tasks
    toxic_task = pipeline(
        "text-classification", model="unitary/toxic-bert", device=0, batch_size=16
    )
    emotion_task = pipeline(
        "text-classification",
        model="michellejieli/emotion_text_classifier",
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
    toxic_results = toxic_task(messages)
    emotion_results = emotion_task(messages)

    # Map results back to the dataset efficiently
    toxicity_scores = [result["score"] for result in toxic_results]
    sentiment_scores = [result["score"] for result in emotion_results]
    sentiment_labels = [result["label"] for result in emotion_results]

    filtered_dataset = filtered_dataset.add_column("toxicity", toxicity_scores)
    filtered_dataset = filtered_dataset.add_column("sentiment_score", sentiment_scores)
    filtered_dataset = filtered_dataset.add_column("sentiment_label", sentiment_labels)

    # Build a dictionary for quick lookup
    filtered_data_dict = {item["message"]: item for item in filtered_dataset}

    # Update the original list with classification results
    for item in form_data_list:
        if not is_valid_message(item["message"]):
            item.update(
                {"toxicity": None, "sentiment_score": None, "sentiment_label": None}
            )
        else:
            filtered_item = filtered_data_dict.get(item["message"], {})
            item.update(
                {
                    "toxicity": filtered_item.get("toxicity"),
                    "sentiment_score": filtered_item.get("sentiment_score"),
                    "sentiment_label": filtered_item.get("sentiment_label"),
                }
            )

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
                    user_ids.get(
                        data["user"], None
                    ),  # Handle case where user might not be in the database
                    data["message"],
                    data["toxicity"],
                    data["sentiment_score"],
                    data["sentiment_label"],
                )
                for data in form_data_list
            ]

            # Batch insert messages
            batch_insert_messages(cursor, msg_list, BATCH_SIZE)
