'''
Module to store functions for preprocessing data from Chatterino, or Rustlog files.
Also contains functionality for posting data to the databse on completion.
'''

import re
from collections import Counter
from transformers import pipeline

from ..models import ChatFile, EmoteSet, Message, MessageEmote

# Constants
CREATE_PREFIX = "bulk_create/"


def extract_info_chatterino(path: str, emote_names: list[str] = None) -> list:
    """
    Extract chat message information from a Chatterino log file.

    Args:
        path (str): The file path of the Chatterino log file.
        emote_names (list[str], optional): A list of emote names to include
        in the extracted information. If not provided, emote information will not be included.

    Returns:
        list: A list of dictionaries, where each dictionary represents a chat message and contains
            keys for the message timestamp, username, message text, and emote information
            (if emote_names were provided).
    """
    form_data_list = []
    with open(path, mode="r", encoding="UTF-8") as log_file:
        lines = log_file.readlines()
        day = lines[0][19:29]
        for line in lines[1:]:
            info = read_line_chatterino(day, line, emote_names)
            if info:
                form_data_list.append(info)
    return form_data_list


def extract_info_rustlog(path: str, emote_names: list[str] = None) -> list:
    """
    Extract chat message information from a Rustlog log file.

    Args:
        path (str): The file path of the Rustlog log file.
        emote_names (list[str], optional): A list of emote names to include 
        in the extracted information. If not provided, emote information 
        will not be included.

    Returns:
        list: A list of dictionaries, where each dictionary represents a chat message and contains
        keys for the message timestamp, username, message text, and emote information 
        (if emote_names were provided).
    """
    form_data_list = []
    with open(path, mode="r", encoding="UTF-8") as log_file:
        for line in log_file:
            info = read_line_rustlog(line, emote_names)
            if info:
                form_data_list.append(info)
    return form_data_list


def read_line_chatterino(
    day: str, line: str, emote_names: list[str] = None
) -> dict[str, any]:
    """
    Extract chat message information from a single line of a Chatterino log file.

    Args:
        day (str): The date portion of the timestamp, in the format "YYYY-MM-DD".
        line (str): The line from the Chatterino log file to extract information from.
        emote_names (list[str], optional): A list of emote names to include in the 
        extracted information. If not provided, emote information will not be included.

    Returns:
        dict[str, any]: A dictionary containing the extracted information, with keys for timestamp,
            username, message text, and emote information (if emote_names were provided).
            If the line does not match the expected format, an empty dictionary is returned.
    """

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
        emote_count = {}
        if emote_names:
            emote_count = count_emotes_in_msg(message, emote_names)
        return {
            "timestamp": timestamp,
            "username": user,
            "message": message,
            "emotes": emote_count,
        }
    # If the line does not match the expected format, return an empty dictionary
    return {}


def read_line_rustlog(line: str, emote_names: list[str] = None) -> dict[str, any]:
    # Define the regex pattern for extracting the timestamp, username, and message
    """
    Extract chat message information from a single line of a Rustlog log file.

    Args:
        line (str): The line from the Rustlog log file to extract information from.
        emote_names (list[str], optional): A list of emote names to include in the 
        extracted information. If not provided, emote information will not be included.

    Returns:
        dict[str, any]: A dictionary containing the extracted information, with keys for timestamp,
            username, message text, and emote information (if emote_names were provided).
            If the line does not match the expected format, an empty dictionary is returned.
    """
    pattern = re.compile(
        r"^\[(?P<datetime>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] #[^ ]+ (?P<username>[^:]+): (?P<message>.*)$"
    )

    # Match the line against the pattern
    match = pattern.match(line)
    if match:
        timestamp = match.group("datetime")
        user = match.group("username")
        message = match.group("message").strip()
        emote_count = {}
        if emote_names:
            emote_count = count_emotes_in_msg(message, emote_names)

        return {
            "timestamp": timestamp,
            "username": user,
            "message": message,
            "emotes": emote_count,
        }
    # If the line does not match the expected format, return an empty dictionary
    return {}


def count_emotes_in_msg(message: str, emote_names: list[str]) -> dict[str, int]:
    """
    Count the occurrences of specified emotes in a given message.

    Args:
        message (str): The message text to search for emotes.
        emote_names (list[str]): A list of emote names to count occurrences for.

    Returns:
        dict[str, int]: A dictionary mapping each emote name to the number of times
        it occurs in the message. Emotes that do not appear in the message are not
        included in the dictionary.
    """
    # Split the message into words
    words = message.split()

    # Create a Counter to count occurrences of each word
    word_counts = Counter(words)

    # Store counts of only the emotes
    emote_counts = {
        emote: word_counts[emote] for emote in emote_names if emote in word_counts
    }

    return emote_counts


def get_emote_set(emote_set_name):
    """
    Retrieve an EmoteSet object from the database based on its name.

    Args:
        emote_set_name (str): The name of the EmoteSet to retrieve.

    Returns:
        QuerySet: A QuerySet containing the Emote objects associated with the retrieved EmoteSet.

    Raises:
        EmoteSet.DoesNotExist: If an EmoteSet with the given name does not exist in the database.
    """
    emote_set = EmoteSet.objects.get(name=emote_set_name)
    return emote_set.emotes.all()


def filter_emotes_from_message(message):
    """Remove any emotes from the message"""
    cleaned_message = message["message"]

    for emote_name in message["emotes"]:
        cleaned_message = cleaned_message.replace(emote_name, "")

    return cleaned_message


def is_valid_message(message: str, min_words: int, use_emotes: bool) -> bool:
    """
    Check if the message has a minimum number of words.
    Optionally, do not consider emotes as words.
    """
    num_words = len(re.findall(r"\w+", message["message"]))

    if use_emotes and message["emotes"]:
        num_words -= sum(message["emotes"].values())
    return num_words >= min_words


def preprocess_log(
    parent_id: int,
    log_path: str,
    format_str: str,
    use_sentiment: bool,
    use_emotes: bool,
    emote_set_name: str,
    filter_emotes: bool,
    min_words: int,
):

    # Get emote set, if emotes anbled
    if use_emotes:
        emote_set_obj = get_emote_set(emote_set_name)
        emote_names = [x.name for x in emote_set_obj]
    else:
        emote_names = []

    # Get log lines
    extract_info = extract_info_rustlog
    if format_str == "Chatterino":
        extract_info = extract_info_chatterino

    # Extract info from lines
    form_data_list = extract_info(log_path, emote_names)

    # Validate messages by length for sentiment analysis
    def msg_validator(x):
        return is_valid_message(x, min_words, use_emotes)

    # Do sentiment analysis, if desired
    if use_sentiment:
        # Initialize pipeline for zero-shot
        pipe = pipeline(
            "zero-shot-classification",
            model="cross-encoder/nli-distilroberta-base",
            device=0,
            batch_size=16,
        )

        # Filter emotes, if desired
        if filter_emotes:
            messages = [
                filter_emotes_from_message(msg)
                for msg in form_data_list
                if msg_validator(msg)
            ]
        else:
            messages = [msg["message"] for msg in form_data_list if msg_validator(msg)]

        emotion_results = pipe(
            messages, ["positive opinion", "negative opinion", "neutral opinion"]
        )


        # Map labels to numeric scores
        translate = {
            "negative opinion": -1,
            "neutral opinion": 0,
            "positive opinion": 1,
        }
        sentiment_score = [translate[result["labels"][0]] for result in emotion_results]

        # Update the original list with classification results
        for item in form_data_list:
            if not msg_validator(item):
                item.update({"sentiment_score": None})
            else:
                item.update({"sentiment_score": sentiment_score.pop(0)})

    # Prepare messages in bulk
    parent_log = ChatFile.objects.get(id=parent_id)
    messages_to_create = []
    message_emotes_to_create = []

    for user_data in form_data_list:
        # Extract user and remove it from the data dictionary

        # Create a Message instance with the remaining data
        if use_sentiment:
            message = Message(
                parent_log=parent_log,
                username=user_data["username"],
                timestamp=user_data["timestamp"],
                message=user_data["message"],
                sentiment_score=user_data["sentiment_score"],
            )
        else:
            message = Message(
                parent_log=parent_log,
                username=user_data["username"],
                timestamp=user_data["timestamp"],
                message=user_data["message"],
            )

        messages_to_create.append(message)

        message.save()
        if use_emotes:
            emotes = user_data.get("emotes", {})
            for emote_name, count in emotes.items():
                emote_obj = emote_set_obj.get(name=emote_name)
                message_emotes_to_create.append(
                    MessageEmote(message=message, emote=emote_obj, count=count)
                )

    # Insert messages in bulk
    Message.objects.bulk_create(messages_to_create, ignore_conflicts=True)
    if use_emotes:
        MessageEmote.objects.bulk_create(
            message_emotes_to_create, ignore_conflicts=True
        )
