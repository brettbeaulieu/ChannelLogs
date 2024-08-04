from requests_toolbelt.multipart.encoder import MultipartEncoder
import json
import requests
import time

URL_MSG = "http://localhost:8000/api/chat/messages/"
URL_USER = "http://localhost:8000/api/chat/users/"
CREATE_PREFIX = "bulk_create/"


def extract_info(day: str, line: str) -> tuple:
    timestamp = f"{day} {line[1:9]}"
    line = line[11:]
    if ":" not in line:
        return {}
    user, message = line.split(":", 1)
    return {"timestamp": timestamp, "user": user, "message": message}

def get_user_list(session: requests.Session):
    user_list = session.get(URL_USER).json()
    return {user["username"]: user["id"] for user in user_list}

def post_users(session: requests.Session, new_users: list, batch_size: int):
    for i in range(0, len(new_users), batch_size):
        # Create a batch
        batch = new_users[i : i + batch_size]

        # Prepare for encoding
        encoder = MultipartEncoder(fields={"usernames": json.dumps(batch)})
        try:
            # Send request
            response = session.post(
                URL_USER + CREATE_PREFIX,
                data=encoder,
                headers={"Content-Type": encoder.content_type},
            )
            # Get the response
            user_data = response.json()

            # Update user-id list
            batch_ids = {user["username"]: user["id"] for user in user_data["users"]}
            return batch_ids
        except requests.RequestException as e:
            print(f"Request failed: {e}")
            raise ConnectionError() from e
        except KeyError as e:
            print(f"Unexpected response format: {e}")
            raise ValueError() from e


def preprocess_log(parent_id: int, log_path: str):
    BATCH_SIZE = 8192

    with requests.Session() as session:
        # Fetch users that exist in the table already
        user_ids = get_user_list(session)

        with open(log_path, mode="r", encoding="UTF-8") as log_file:
            log_lines = log_file.readlines()

        # Pull date from log start
        day = log_lines[0][19:29]

        # Process log lines
        form_data_list = [
            info for msg in log_lines[1:] if (info := extract_info(day, msg))
        ]

        # ID new users
        existing_users = set(user_ids.keys())
        new_users = {
            user["user"]
            for user in form_data_list
            if user["user"] not in existing_users
        }

        _ = post_users(session, list(new_users), BATCH_SIZE)

        user_ids = get_user_list(session)

        # Batch HTTP requests
        msg_list = [
            {
                "parent_log": parent_id,
                "timestamp": data["timestamp"],
                "user": user_ids[data["user"]],
                "message": data["message"],
            }
            for data in form_data_list
        ]

        start = time.perf_counter()

        for i in range(0, len(msg_list), BATCH_SIZE):
            batch = msg_list[i : i + BATCH_SIZE]
            encoder = MultipartEncoder(fields={"messages": json.dumps(batch)})
            response = session.post(
                URL_MSG + CREATE_PREFIX,
                data=encoder,
                headers={"Content-Type": encoder.content_type},
            )

        print(f"Requests took {time.perf_counter()-start:.3g}s")
