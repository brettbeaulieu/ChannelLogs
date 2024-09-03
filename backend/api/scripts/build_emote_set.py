import requests
from ..models import Emote, EmoteSet


def build_emote_set(set_id: str) -> None:
    response = requests.get(f"http://7tv.io/v3/emote-sets/{set_id}", timeout=3)
    if response.status_code != 200:
        raise ConnectionError("Couldn't recover emote set, it may not exist.")

    data = response.json()

    # First create parent EmoteSet
    obj = EmoteSet.objects.create(name=data["name"], set_id=set_id)

    # Use a dictionary to store unique emotes by their emote_id
    unique_emotes = {}
    for emote_dict in data["emotes"]:
        emote_id = emote_dict["id"]
        # Store only the first occurrence of each emote_id
        if emote_id not in unique_emotes:
            unique_emotes[emote_id] = {
                "name": emote_dict["name"],
                "emote_id": emote_id,
            }

    # Create emote objects
    emotes_list = [
        Emote.objects.create(**emote_data) for emote_data in unique_emotes.values()
    ]

    obj.emotes.set(emotes_list)  # Set the emotes for this EmoteSet
