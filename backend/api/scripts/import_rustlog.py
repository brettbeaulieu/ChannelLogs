from datetime import datetime, timedelta
import os

import requests
from django.core.files import File

from ..models import ChatFile, Channel


def import_rustlog(repo_name: str, channel_name: str, start_date: str, end_date: str):
    # Convert date strings to datetime objects
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    channel = Channel.objects.get_or_create(name=channel_name)[0]

    # List to hold the formatted date strings
    date_list = []

    # Iterate over the date range
    current_date = start
    while current_date <= end:
        # Format date as 'YYYY/M/D'
        formatted_date = current_date.strftime("%Y/%-m/%-d")
        date_list.append(formatted_date)
        # Move to the next day
        current_date += timedelta(days=1)


    for date in date_list:
        try:
            link = f"http://{repo_name}/channel/{channel_name}/{date}"
            response = requests.get(link, timeout=3)

            # Define the file path and name
            file_path = f"/tmp/{channel_name}/{date}.log"
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            # Write the response content to a .log file
            with open(file_path, "w") as file:
                file.write(response.text)

            # Create ChatFile instance
            with open(file_path, "rb") as file:
                chat_file = ChatFile(
                    file=File(file, name=os.path.basename(file_path)),
                    filename=f"{channel_name}/{date}.log",
                    channel=channel,
                    is_preprocessed=False,
                    metadata=None,
                )
                chat_file.save()

            # Remove the temp file after uploading
            os.remove(file_path)

        except requests.RequestException as e:
            print(f"Error fetching URL {link}: {e}")
        except IOError as e:
            print(f"Error handling file {file_path}: {e}")
