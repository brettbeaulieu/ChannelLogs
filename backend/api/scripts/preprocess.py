import re
from collections import Counter
from transformers import pipeline

from ..models import ChatFile, Emote, EmoteSet, MessageEmote, Message

# Constants
CREATE_PREFIX = "bulk_create/"


def extract_info_chatterino(path: str, emote_names: list[str] = []) -> list:
    form_data_list = []
    with open(path, mode="r", encoding="UTF-8") as log_file:
        lines = log_file.readlines()
        day = lines[0][19:29]
        for line in lines[1:]:
            info = read_line_chatterino(day, line, emote_names)
            if info:
                form_data_list.append(info)
    return form_data_list


def extract_info_rustlog(path: str, emote_names: list[str] = []) -> list:
    form_data_list = []
    with open(path, mode="r", encoding="UTF-8") as log_file:
        for line in log_file:
            info = read_line_rustlog(line, emote_names)
            if info:
                form_data_list.append(info)
    return form_data_list


def read_line_chatterino(
    day: str, line: str, emote_names: list[str] = []
) -> dict[str, any]:
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
    else:
        # If the line does not match the expected format, return an empty dictionary
        return {}


def read_line_rustlog(line: str, emote_names: list[str] = []) -> dict[str, any]:
    # Define the regex pattern for extracting the timestamp, username, and message
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
    else:
        # If the line does not match the expected format, return an empty dictionary
        return {}


def count_emotes_in_msg(message: str, emote_names: list[str]) -> dict[str, int]:
    # Split the message into words
    words = message.split()

    # Create a Counter to count occurrences of each word
    word_counts = Counter(words)

    # Store counts of only the emotes
    emote_counts = {
        emote: word_counts[emote] for emote in emote_names if emote in word_counts
    }

    return emote_counts


def get_emote_list(emoteSetName):
    return Emote.objects.filter(parent_set__name=emoteSetName)


def filter_emotes_from_message(message):
    """Remove any emotes from the message"""
    cleaned_message = message["message"]

    for emote_name in message["emotes"]:
        cleaned_message = cleaned_message.replace(emote_name, "")

    return cleaned_message


def is_valid_message(message: str, minWords: int, useEmotes: bool) -> bool:
    """
    Check if the message has a minimum number of words.
    Optionally, do not consider emotes as words.
    """
    num_words = len(re.findall(r"\w+", message["message"]))

    if useEmotes and message["emotes"]:
        num_words -= sum(message["emotes"].values())
    return num_words >= minWords


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

    # Get emote set, if emotes anbled
    if useEmotes:
        emoteList = get_emote_list(emoteSetName)
        emote_names = [x.name for x in emoteList]
    else:
        emote_names = []

    # Get log lines
    extract_info = extract_info_rustlog
    if format == "Chatterino":
        extract_info = extract_info_chatterino

    # Extract info from lines
    form_data_list = extract_info(log_path, emote_names)

    # Validate messages by length for sentiment analysis
    msg_validator = lambda x: is_valid_message(x, minWords, useEmotes)

    # Do sentiment analysis, if desired
    if useSentiment:
        # Initialize pipeline for zero-shot
        pipe = pipeline(
            "zero-shot-classification",
            model="cross-encoder/nli-distilroberta-base",
            device=0,
            batch_size=16,
        )

        if filterEmotes:
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
        message = Message(parent_log=parent_log, username=user_data["username"], timestamp=user_data["timestamp"], message=user_data["message"], sentiment_score=user_data["sentiment_score"])
        messages_to_create.append(message)

        emotes = user_data.get("emotes", {})
        for emote_name, count in emotes.items():
            emote_obj = Emote.objects.get(name=emote_name, parent_set=EmoteSet.objects.get(name=emoteSetName))
            message_emotes_to_create.append(MessageEmote(
                message=message,
                emote=emote_obj,
                count=count
            ))
    # Insert messages in bulk
    Message.objects.bulk_create(messages_to_create)
    MessageEmote.objects.bulk_create(message_emotes_to_create)