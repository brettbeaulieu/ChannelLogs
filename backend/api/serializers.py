from rest_framework import serializers

from .models import ChatFile, Message, User, EmoteSet


class ChatFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatFile
        fields = [
            "id",
            "file",
            "filename",
            "is_preprocessed",
            "uploaded_at",
            "metadata",
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")
        return representation

    def update(self, instance, validated_data):
        file = validated_data.pop("file", None)
        filename = validated_data.pop("filename", None)

        if file:
            instance.file = file
            # Derives filename from file if filename not provided
            instance.filename = file.name.split("/")[-1]
        elif filename:
            # Allow filename to be manually set
            instance.filename = filename

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class MessageSerializer(serializers.ModelSerializer):
    parent_log = serializers.PrimaryKeyRelatedField(queryset=ChatFile.objects.all())

    class Meta:
        model = Message
        fields = [
            "parent_log",
            "timestamp",
            "user",
            "message",
            "sentiment_label",
            "sentiment_score",
            "topics",
        ]
        extra_kwargs = {
            "sentiment_label": {"required": False},
            "sentiment_score": {"required": False},
            "topics": {"required": False},
        }


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "metadata",
        ]


class DateTimeSerializer(serializers.Serializer):
    date = serializers.DateTimeField()


class EmoteSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmoteSet
        fields = ["id", "name", "set_id", "counts"]
