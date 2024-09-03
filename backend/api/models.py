import uuid
from django.db import models
import os

from django.forms import ValidationError


# Create your models here.


class Channel(models.Model):
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


# Define a backup default channel
def get_default_channel():
    return Channel.objects.get_or_create(name="Untitled Channel")[0]


class Emote(models.Model):
    name = models.TextField(blank=False)
    emote_id = models.TextField(blank=False)


class EmoteSet(models.Model):
    name = models.TextField(blank=False)
    set_id = models.TextField(blank=False, unique=True)
    channels = models.ManyToManyField(Channel, related_name="emote_sets_associated")
    emotes = models.ManyToManyField(Emote, related_name="emote_sets_containing")


class ChatFile(models.Model):
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
        super(ChatFile, self).delete(*args, **kwargs)


class Message(models.Model):
    parent_log = models.ForeignKey(ChatFile, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(null=False, blank=False)
    username = models.CharField(
        max_length=255, null=False, blank=False, default="Default"
    )
    message = models.TextField(blank=True)
    emotes = models.ManyToManyField(Emote, blank=True, related_name="emotes_associated")
    sentiment_score = models.FloatField(null=True, blank=True)


class MessageEmote(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    emote = models.ForeignKey(Emote, on_delete=models.CASCADE)
    count = models.IntegerField()

    class Meta:
        unique_together = ("message", "emote")


class Task(models.Model):
    TICKET_STATUSES = [
        ("PENDING", "Pending"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    ticket = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=TICKET_STATUSES, default="PENDING")
    result = models.TextField(null=True, blank=True)
