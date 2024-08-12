from celery import shared_task
from .models import ChatFile
from .scripts.preprocess import preprocess_log  # Import your preprocessing function


@shared_task
def preprocess_task(row_id, file_path):
    # Perform preprocessing here
    preprocess_log(row_id, file_path)

    # Update the model
    try:
        obj = ChatFile.objects.get(id=row_id)
        obj.is_preprocessed = True
        obj.save()
    except ChatFile.DoesNotExist:
        pass  # or handle the case where the object does not exist
