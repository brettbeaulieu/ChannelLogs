import json
import re

import psycopg2
from collections import defaultdict
from datasets import Dataset
from psycopg2 import sql
import requests
from transformers import pipeline

# Constants
URL_MSG = "http://django:8000/api/chat/messages/"
DB_MSG = "api_message"
URL_USER = "http://django:8000/api/chat/users/"
DB_USER = "api_user"
DB_EMOTE = "api_emoteset"
DB_PARAMS = {
    "dbname": "backenddb",
    "user": "maire",
    "password": "maire",
    "host": "db",
    "port": "5432",
}
CREATE_PREFIX = "bulk_create/"
BATCH_SIZE = 4096 * 4


def extract_info_chatterino(path: str) -> tuple[list, set]:
    form_data_list = []
    new_users = set()
    with open(path, mode="r", encoding="UTF-8") as log_file:
        lines = log_file.readlines()
        day = lines[0][19:29]
        for line in lines[1:]:
            info = read_line_chatterino(day, line)
            if info:
                form_data_list.append(info)
                new_users.add(info["user"])
    return form_data_list, new_users


def extract_info_rustlog(path: str) -> tuple[list, set]:
    form_data_list = []
    new_users = set()
    with open(path, mode="r", encoding="UTF-8") as log_file:
        for line in log_file:
            info = read_line_rustlog(line)
            if info:
                form_data_list.append(info)
                new_users.add(info["user"])
    return form_data_list, new_users


def read_line_chatterino(day: str, line: str) -> dict[str, any]:
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


def read_line_rustlog(line: str) -> dict[str, any]:
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


def get_emote_list(emoteSetName):
    with psycopg2.connect(**DB_PARAMS) as conn:
        with conn.cursor() as cursor:
            query = sql.SQL("SELECT id, set_id FROM {table} WHERE name = %s").format(
                table=sql.Identifier(DB_EMOTE)
            )
            cursor.execute(query, (emoteSetName,))

            # Fetch the result
            result = cursor.fetchone()

            emoteSetID = result[1]

            if result:
                response = requests.get(f"http://7tv.io/v3/emote-sets/{emoteSetID}")
                if response.status_code != 200:
                    return {}
                data = response.json()
                return [x["name"] for x in data["emotes"]]
            else:
                return {}


def batch_insert_users(cursor, users_list, batch_size):
    query = sql.SQL(
        "INSERT INTO {table} (username) VALUES (%s) ON CONFLICT (username) DO NOTHING"
    ).format(table=sql.Identifier(DB_USER))
    for i in range(0, len(users_list), batch_size):
        batch = users_list[i : i + batch_size]
        cursor.executemany(query, [(user,) for user in batch])


def batch_insert_messages(cursor, useSentiment, messages_list, batch_size):
    if useSentiment:
        query = sql.SQL(
            "INSERT INTO {table} (parent_log_id, timestamp, user_id, message, sentiment_score) VALUES (%s, %s, %s, %s, %s)"
        ).format(table=sql.Identifier(DB_MSG))
    else:
        query = sql.SQL(
            "INSERT INTO {table} (parent_log_id, timestamp, user_id, message) VALUES (%s, %s, %s, %s)"
        ).format(table=sql.Identifier(DB_MSG))
    for i in range(0, len(messages_list), batch_size):
        batch = messages_list[i : i + batch_size]
        cursor.executemany(query, batch)


def filter_emotes_from_message(message: str, emote_list: list):
    """Remove emotes from the message and count their occurrences."""

    emote_counts = defaultdict(int)
    pattern = re.compile(
        r"(?<!\w)(?:" + "|".join(re.escape(emote) for emote in emote_list) + r")(?!\w)"
    )

    def replace_emote(match):
        emote = match.group(0)
        emote_counts[emote] += 1
        return ""

    cleaned_message = pattern.sub(replace_emote, message)
    return cleaned_message, dict(emote_counts)


def is_valid_message_with_filter(message: str, minWords: int, emoteList: list) -> bool:
    message, _ = filter_emotes_from_message(message, emoteList)
    return len(re.findall(r"\w+", message)) >= minWords


def count_emotes(dataset, emoteSet):
    # Count emotes in messages
    emote_counts = defaultdict(int)
    for message in dataset["message"]:
        _, counts = filter_emotes_from_message(message, emoteSet)
        for emote, count in counts.items():
            emote_counts[emote] += count
    return emote_counts


def is_valid_message(message: str, minWords: int) -> bool:
    """Check if the message has a minimum number of words."""
    return len(re.findall(r"\w+", message)) >= minWords


def update_emote_counts(parent_id, emoteSetName, emote_counts_dict):
    """Update the emote counts for existing messages in the database."""
    with psycopg2.connect(**DB_PARAMS) as conn:
        with conn.cursor() as cursor:
            # Fetch the current counts
            fetch_query = sql.SQL("SELECT counts FROM {table} WHERE name = %s").format(
                table=sql.Identifier(DB_EMOTE)
            )

            cursor.execute(fetch_query, (emoteSetName,))
            result = cursor.fetchone()

            if result:
                # Parse the existing counts JSON
                existing_counts = result[0]

                # Append the new key-value pair
                existing_counts[parent_id] = emote_counts_dict

                # Convert the updated counts back to JSON
                updated_counts_json = json.dumps(existing_counts)

                # Update the record with the new counts
                update_query = sql.SQL(
                    "UPDATE {table} SET counts = %s WHERE name = %s"
                ).format(table=sql.Identifier(DB_EMOTE))

                cursor.execute(update_query, (updated_counts_json, emoteSetName))


def preprocess_log(
    parent_id: int,
    log_path: str,
    format: str,
    useSentiment: bool,
    useEmotes: bool,
    emoteSetName: str,
    filterEmotes: bool,
    minWords: int,
):
    # Get emote set
    emoteList = None

    if useEmotes:
        emoteList = get_emote_list(emoteSetName)

    # Get log lines
    extract_info = extract_info_rustlog
    if format == "Chatterino":
        extract_info = extract_info_chatterino
    form_data_list, new_users = extract_info(log_path)

    message_validator = is_valid_message
    message_lambda = lambda x: message_validator(x["message"], minWords)
    if filterEmotes:
        message_validator = is_valid_message_with_filter
        message_lambda = lambda x: message_validator(x["message"], minWords, emoteList)

    if useSentiment:
        # Initialize pipeline for zero-shot
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

        filtered_dataset = dataset.filter(message_lambda)

        # Perform classification
        messages = [
            filter_emotes_from_message(msg, emoteList)[0] if filterEmotes else msg
            for msg in filtered_dataset["message"]
        ]
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

        # Count emotes in messages
        if useEmotes:
            emote_counts = count_emotes(dataset, emoteList)

        # Update the original list with classification results
        for item in form_data_list:

            if not message_lambda(item):
                item.update({"sentiment_score": None})
            else:
                filtered_item = filtered_data_dict.get(item["message"], {})
                item.update({"sentiment_score": filtered_item.get("sentiment_score")})

    # Patch emote counts, add key to record containing value of the 'emote_counts' data structure
    if useEmotes:
        update_emote_counts(parent_id, emoteSetName, emote_counts)

    # Batch insert new users + messages
    with psycopg2.connect(**DB_PARAMS) as conn:
        with conn.cursor() as cursor:
            batch_insert_users(cursor, list(new_users), BATCH_SIZE)
            # Fetch user IDs from the database
            cursor.execute(
                sql.SQL("SELECT id, username FROM {title}").format(
                    title=sql.Identifier(DB_USER)
                )
            )

            user_ids = {row[1]: row[0] for row in cursor.fetchall()}

            # Format messages for batch insertion
            if useSentiment:
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
            else:
                msg_list = [
                    (
                        parent_id,
                        data["timestamp"],
                        user_ids.get(data["user"], None),
                        data["message"],
                    )
                    for data in form_data_list
                ]

            # Batch insert messages
            batch_insert_messages(cursor, useSentiment, msg_list, BATCH_SIZE)
