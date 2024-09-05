'''
Module to define the Celery tasks dispatched by the django backend.
'''

from datetime import datetime
from celery import shared_task
from .models import ChatFile, Task
from .scripts import preprocess_log, import_rustlog, build_emote_set


@shared_task
def preprocess_task(
    ticket_id,
    row_id,
    file_path,
    format_str,
    use_sentiment,
    use_emotes,
    emote_set,
    filter_emotes,
    min_words,
):
    '''
    Celery task to preprocess a log file.
    '''

    # Get task object, and set in progress
    task = Task.objects.get(ticket=ticket_id)
    task.status = "IN_PROGRESS"
    task.save()

    try:
        # Perform preprocessing here
        preprocess_log(
            row_id,
            file_path,
            format_str,
            use_sentiment,
            use_emotes,
            emote_set,
            filter_emotes,
            min_words,
        )

        # Update the model
        obj = ChatFile.objects.get(id=row_id)
        obj.is_preprocessed = True
        obj.save()
        task.status = "COMPLETED"

    except Exception as e:
        task.status = "FAILED"
        task.result = str(e)

    task.save()


@shared_task
def build_emote_set_task(set_id, ticket_id):
    '''
    Celery task to build an emote set.
    '''

    # Get task object, and set in progress
    task = Task.objects.get(ticket=ticket_id)
    task.status = "IN_PROGRESS"
    task.save()

    try:
        build_emote_set(set_id)
        task.status = "COMPLETED"

    except Exception as e:
        task.status = "FAILED"
        task.result = str(e)

    task.save()


@shared_task
def get_rustlog_task(
    ticket_id, repo_name: str, channel_name: str, start_date: datetime, end_date: str
):
    # Get task object, and set in progress
    task = Task.objects.get(ticket=ticket_id)
    task.status = "IN_PROGRESS"
    task.save()

    try:
        import_rustlog(repo_name, channel_name, start_date, end_date)
        task.status = "COMPLETED"
    except Exception as e:
        task.status = "FAILED"
        task.result = str(e)

    task.save()
