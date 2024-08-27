from celery import shared_task
import requests
from .models import ChatFile, Emote, EmoteSet
from .scripts.preprocess import preprocess_log  # Import your preprocessing function

@shared_task
def preprocess_task(row_id, file_path, format, use_sentiment, use_emotes, emote_set, filter_emotes, min_words):
    # Perform preprocessing here
    preprocess_log(row_id, file_path, format, use_sentiment, use_emotes, emote_set, filter_emotes, min_words)

    # Update the model
    obj = ChatFile.objects.get(id=row_id)
    obj.is_preprocessed = True
    obj.save()

@shared_task
def build_emote_set_task(set_id):
    response = requests.get(f"http://7tv.io/v3/emote-sets/{set_id}")
    if response.status_code != 200:
        raise ConnectionError("Couldn't recover emote set, it may not exist.")
    
    data = response.json()

    # Use a dictionary to store unique emotes by their emote_id
    unique_emotes = {}
    for emote_dict in data['emotes']:
        emote_id = emote_dict['id']
        # Store only the first occurrence of each emote_id
        if emote_id not in unique_emotes:
            unique_emotes[emote_id] = {
                'name': emote_dict['name'],
                'emote_id': emote_id
            }
    
    # Convert dictionary values to a list
    emotes_list = [Emote.objects.create(**emote_data) for emote_data in unique_emotes.values()]

    emote_set_data = {
        'name': data['name'],
        'set_id': set_id,
    }
    # First create EmoteSet without emotes, then update the emotes list
    obj = EmoteSet.objects.create(**emote_set_data)
    obj.emotes.add(*emotes_list)
    obj.save()
