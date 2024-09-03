from django.forms import ValidationError
from rest_framework import serializers

from .models import Channel, ChatFile, Emote, Message, EmoteSet


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = "__all__"
        extra_kwargs = {
            "name_lower": {"required": False},
        }


class EmoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Emote
        fields = ["id", "name", "emote_id"]


class EmoteSetSerializer(serializers.ModelSerializer):
    channels = ChannelSerializer(many=True)
    emotes = EmoteSerializer(many=True)

    class Meta:
        model = EmoteSet
        fields = ["id", "name", "set_id", "channels", "emotes"]


class ChatFileSerializer(serializers.ModelSerializer):
    channel = ChannelSerializer(read_only=False, required=False)

    class Meta:
        model = ChatFile
        fields = "__all__"

    def update(self, instance, validated_data):
        channel_data = validated_data.pop("channel", None)
        print(f"Provided validated_data: {validated_data}")
        if channel_data:
            channel_instance = Channel.objects.get(id=instance.channel.id)
            instance.channel = channel_instance

        # Update other fields
        return super().update(instance, validated_data)


class MessageSerializer(serializers.ModelSerializer):
    parent_log = ChatFileSerializer()
    emotes = EmoteSerializer(many=True)

    class Meta:
        model = Message
        fields = [
            "parent_log",
            "timestamp",
            "username",
            "message",
            "emotes",
            "sentiment_score",
        ]
        extra_kwargs = {
            "sentiment_score": {"required": False},
        }
