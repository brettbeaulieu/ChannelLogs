from rest_framework import serializers

from .models import ChatFile, Emote, Message, MessageEmote, EmoteSet


class ChatFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatFile
        fields = [
            "id",
            "file",
            "filename",
            "channel",
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
        channel = validated_data.pop("channel", None)


        if file:
            instance.file = file
            # Derives filename from file if filename not provided
            instance.filename = file.name.split("/")[-1]
        if filename:
            # Allow filename to be manually set
            instance.filename = filename
        if channel:
            instance.channel = channel

        instance.save()
        return instance


class MessageSerializer(serializers.ModelSerializer):
    parent_log = serializers.PrimaryKeyRelatedField(queryset=ChatFile.objects.all())

    class Meta:
        model = Message
        fields = [
            "parent_log",
            "timestamp",
            "username",
            "message",
            "sentiment_score",
        ]
        extra_kwargs = {
            "sentiment_score": {"required": False},
        }


class DateTimeSerializer(serializers.Serializer):
    date = serializers.DateTimeField()


class EmoteSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmoteSet
        fields = ["id", "name", "set_id"]


class EmoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Emote
        fields = ["id", "parent_set", "name", "emote_id"]

class MessageEmoteSerializer(serializers.ModelSerializer):
    emote = EmoteSerializer()
    message = MessageSerializer()

    class Meta:
        model = MessageEmote
        fields = ['id', 'message', 'emote', 'count']
