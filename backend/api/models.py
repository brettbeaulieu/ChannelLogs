import uuid
from django.db import models
import os


# Create your models here.
class ChatFile(models.Model):
    file: models.FileField = models.FileField(upload_to="media/chat", unique=True)
    filename = models.CharField(max_length=255, blank=True, null=False)
    channel = models.CharField(max_length=255,blank=False, null=False)
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


class User(models.Model):
    username = models.CharField(max_length=64, unique=True)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["username", "metadata"], name="unique_user")
        ]

class EmoteSet(models.Model):
    name = models.TextField(blank=False)
    set_id = models.TextField(blank=False, unique=True)


class Emote(models.Model):
    parent_set = models.ForeignKey(EmoteSet, on_delete=models.CASCADE)
    name = models.TextField(blank=False)
    emote_id = models.TextField(blank=False)

class Message(models.Model):
    parent_log = models.ForeignKey(ChatFile, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(null=False, blank=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=True)
    sentiment_score = models.FloatField(null=True, blank=True)

    def delete(self, *args, **kwargs):
        # Check if user should be deleted
        user = self.user
        super().delete(*args, **kwargs)

        # Check if user has any other messages left
        if not Message.objects.filter(user=user).exists():
            user.delete()

class MessageEmote(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    emote = models.ForeignKey(Emote, on_delete=models.CASCADE)
    count = models.PositiveIntegerField(default=1)
    
    class Meta:
        unique_together = ('message', 'emote')

class Task(models.Model):
    TICKET_STATUSES = [
        ("PENDING", "Pending"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    ticket = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=TICKET_STATUSES, default="PENDING")
    result = models.TextField(
        null=True, blank=True
    )  # Store result or error message here


# TODO: Emote culling
