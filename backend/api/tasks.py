from celery import shared_task
from .models import ChatFile
from .scripts.preprocess import preprocess_log  # Import your preprocessing function


@shared_task
def preprocess_task(row_id, file_path, format, use_sentiment, use_emotes, emote_set, filter_emotes, min_words):
    # Perform preprocessing here
    preprocess_log(row_id, file_path, format, use_sentiment, use_emotes, emote_set, filter_emotes, min_words)

    # Update the model
    obj = ChatFile.objects.get(id=row_id)
    obj.is_preprocessed = True
    obj.save()
