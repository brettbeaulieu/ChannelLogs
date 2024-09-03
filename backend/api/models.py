'''
Module to define the Model objects. These objects will likewise define our database
'''

import os
import uuid

from django.db import models
from django.forms import ValidationError

# Create your models here.


class Channel(models.Model):
    """
    Model for a user's Channel

    Attributes:
        name: The name of the channel
        name_lower: The lowercase version of the channel name (automatically generated)
    """

    name = models.CharField(
        max_length=255, blank=False, null=False, unique=True, default="Untitled Channel"
    )
    name_lower = models.CharField(
        max_length=255, blank=False, null=False, unique=True, default="untitled channel"
    )

    def save(self, *args, **kwargs):
        self.name_lower = self.name.lower()  # Convert name to lowercase for uniqueness
        if (
            Channel.objects.exclude(id=self.id)
            .filter(name_lower=self.name_lower)
            .exists()
        ):
            raise ValidationError("A channel with this name already exists.")
        super().save(*args, **kwargs)  # Call the superclass save() method


def get_default_channel():
    """Return a backup default channel"""
    return Channel.objects.get_or_create(name="Untitled Channel")[0]


class Emote(models.Model):
    """
    Model for a 7TV Emote

    Attributes:
        name: The name of the emote
        emote_id: The ID of the emote on 7TV
    """

    name = models.TextField(blank=False)
    emote_id = models.TextField(blank=False)


class EmoteSet(models.Model):
    """
    Model for a 7TV EmoteSet

    Attributes:
        name: The name of the emote set
        set_id: The ID of the emote set on 7TV
        chanels: The channels that the emote set is associated with
        emotes: The emotes that the emote set contains
    """

    name = models.TextField(blank=False)
    set_id = models.TextField(blank=False, unique=True)
    channels = models.ManyToManyField(Channel, related_name="emote_sets_associated")
    emotes = models.ManyToManyField(Emote, related_name="emote_sets_containing")


class ChatFile(models.Model):
    ''' 
    Model for a chat file

    Attributes:
        file: The file object
        filename: The name of the file
        channel: The channel that the file is associated with
        is_preprocessed: Whether the file has been preprocessed
        uploaded_at: The date and time the file was uploaded
        metadata: The metadata of the file
    '''
    file: models.FileField = models.FileField(upload_to="media/chat", unique=True)
    filename = models.CharField(max_length=255, blank=True, null=False)
    channel = models.ForeignKey(
        Channel, on_delete=models.SET_DEFAULT, default=get_default_channel
    )
    is_preprocessed = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Update the filename field if the file is present and filename is not manually set
        if not self.filename and self.file:
            self.filename = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Delete the file from the filesystem
        if self.file and os.path.isfile(self.file.path):
            os.remove(self.file.path)
        super().delete(*args, **kwargs)


class Message(models.Model):
    '''
    Model for a chat message.

    Attributes:
        parent_log: The chat file that the message is associated with
        timestamp: The timestamp of the message
        username: The username of the message sender
        message: The message text
        emotes: The emotes associated with the message
        sentiment_score: The sentiment score of the message
    '''
    parent_log = models.ForeignKey(ChatFile, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(null=False, blank=False)
    username = models.CharField(
        max_length=255, null=False, blank=False, default="Default"
    )
    message = models.TextField(blank=True)
    emotes = models.ManyToManyField(Emote, blank=True, related_name="emotes_associated")
    sentiment_score = models.FloatField(null=True, blank=True)


class MessageEmote(models.Model):
    '''
    Many-to-Many relationship between Message and Emote
    to store the counts of each emote in a message 

    Attributes:
        message: The message that the emote is associated with
        emote: The emote that is associated with the message
        count: The count of the emote in the message
    '''
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    emote = models.ForeignKey(Emote, on_delete=models.CASCADE)
    count = models.IntegerField()

    class Meta:
        unique_together = ("message", "emote")


class Task(models.Model):
    '''
    Model for an asynchronous task

    Attributes:
        task_id: The ID of the task
        task_type: The type of the task
        status: The status of the task
        result: The result of the task
    '''
    task_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    task_type = models.CharField(max_length=255)
    status = models.CharField(max_length=20)
    result = models.TextField(null=True, blank=True)
    TICKET_STATUSES = [
        ("PENDING", "Pending"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    ticket = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=TICKET_STATUSES, default="PENDING")
    result = models.TextField(null=True, blank=True)
