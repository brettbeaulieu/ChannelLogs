import json
from django.db import models
import os

from django.forms import ValidationError


# Create your models here.
class ChatFile(models.Model):
    file: models.FileField = models.FileField(upload_to="media/chat", unique=True)
    filename = models.CharField(max_length=255, blank=True, null=True)
    is_preprocessed = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(null=True, blank=True)

    def __str__(self):
        return self.filename if self.filename else "No file"

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


class Message(models.Model):
    parent_log = models.ForeignKey(ChatFile, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(null=False, blank=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=True)
    sentiment_score = models.FloatField(null=True, blank=True)

class EmoteSet(models.Model):
    name = models.TextField(blank=False)
    set_id = models.TextField(blank=False, unique=True)
    counts = models.JSONField(default=dict, blank=True) # Store occurance counts

    def clean(self):
        """Remove invalid ChatFile ID entries from counts."""
        # Retrieve all existing ChatFile IDs
        valid_chat_file_ids = set(ChatFile.objects.values_list('id', flat=True))

        try:
            # Load counts as a dictionary
            counts_dict = json.loads(json.dumps(self.counts))
        except (TypeError, ValueError):
            raise ValidationError("Counts field must be a valid JSON object.")

        # Remove entries with invalid ChatFile IDs
        for chat_file_id in list(counts_dict.keys()):
            if chat_file_id not in valid_chat_file_ids:
                del counts_dict[chat_file_id]

        # Update the counts field with the cleaned data
        self.counts = counts_dict

    def save(self, *args, **kwargs):
        # Clean the model instance to ensure all constraints are met
        self.clean()
        super().save(*args, **kwargs)

    def add_occurrence(self, chat_file_id, emote, count):
        """Add or update the occurrence count for a given emote in a specific log file."""
        if chat_file_id not in self.counts:
            self.counts[chat_file_id] = {}
        if emote not in self.counts[chat_file_id]:
            self.counts[chat_file_id][emote] = 0
        self.counts[chat_file_id][emote] += count
        self.save()

    def get_occurrences(self, chat_file_id):
        """Get the occurrence counts for all emotes in a specific log file."""
        return self.counts.get(chat_file_id, {})