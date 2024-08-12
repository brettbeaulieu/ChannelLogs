import sqlite3
from pathlib import Path


URL_MSG = "http://django:8000/api/chat/messages/"
DB_MSG = "api_message"
URL_USER = "http://django:8000/api/chat/users/"
DB_USER = "api_user"

script_dir = Path(__file__).resolve().parent
DATABASE = script_dir.parent.parent / "db.sqlite3"

CREATE_PREFIX = "bulk_create/"
BATCH_SIZE = 4096


def extract_info(day: str, line: str) -> dict[str, any]:
    try:
        timestamp = f"{day} {line[1:9]}"
        line = line[11:]
        if ":" not in line:
            return {}
        user, message = line.split(":", 1)
        return {"timestamp": timestamp, "user": user, "message": message.strip()}
    except Exception as e:
        print(f"Error extracting info: {e}")
        return {}


def batch_insert_users(conn, users_list, batch_size):
    cursor = conn.cursor()
    for i in range(0, len(users_list), batch_size):
        batch = users_list[i : i + batch_size]
        cursor.executemany(
            f"INSERT OR IGNORE INTO {DB_USER} (username) VALUES (?)",
            [(user,) for user in batch],
        )
    conn.commit()


def batch_insert_messages(conn, messages_list, batch_size):
    cursor = conn.cursor()
    for i in range(0, len(messages_list), batch_size):
        batch = messages_list[i : i + batch_size]
        cursor.executemany(
            f"INSERT INTO {DB_MSG} (parent_log_id, timestamp, user_id, message) VALUES (?, ?, ?, ?)",
            batch,
        )
    conn.commit()


def preprocess_log(parent_id: int, log_path: str):
    form_data_list = []
    new_users = set()

    with open(log_path, mode="r", encoding="UTF-8") as log_file:
        lines = log_file.readlines()
        day = lines[0][19:29]

    for line in lines[1:]:
        info = extract_info(day, line)
        if info:
            form_data_list.append(info)
            new_users.add(info["user"])

    conn = sqlite3.connect(DATABASE)

    # Batch insert new users and messages
    batch_insert_users(conn, list(new_users), BATCH_SIZE)

    # Fetch user IDs from the database
    user_ids = {
        row[1]: row[0]
        for row in conn.execute(f"SELECT id, username FROM {DB_USER}").fetchall()
    }

    msg_list = [
        (
            parent_id,
            data["timestamp"],
            user_ids.get(
                data["user"], None
            ),  # Handle case where user might not be in the database
            data["message"],
        )
        for data in form_data_list
    ]

    batch_insert_messages(conn, msg_list, BATCH_SIZE)
    conn.close()
