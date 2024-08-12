from django.db import models
import os


# Create your models here.
class ChatFile(models.Model):
    file: models.FileField = models.FileField(upload_to="media/chat")
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
    username = models.CharField(max_length=64)
    metadata = models.JSONField(null=True, blank=True)


class Message(models.Model):
    parent_log = models.ForeignKey(ChatFile, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(null=False, blank=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField(blank=True)
    sentiment_label = models.TextField(null=True, blank=True)
    sentiment_score = models.FloatField(null=True, blank=True)
    topics = models.JSONField(null=True, blank=True)
