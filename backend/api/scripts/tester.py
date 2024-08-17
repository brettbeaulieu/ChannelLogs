import re
from time import perf_counter

from datasets import Dataset
from transformers import pipeline

# Constants
URL_MSG = "http://django:8000/api/chat/messages/"
URL_USER = "http://django:8000/api/chat/users/"

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
    start_time = perf_counter()
    messages = filtered_dataset["message"]
    emotion_results = pipe(
        messages, ["positive opinion", "negative opinion", "neutral opinion"]
    )
    print(f'Time elapsed: {perf_counter() - start_time}')

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


if __name__ == "__main__":

    preprocess_log(
        0,
        "C:/Users/bbeau/AppData/Roaming/Chatterino2/Logs/Twitch/Channels/erobb221/test_log.log",
    )
