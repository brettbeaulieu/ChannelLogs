# Generated by Django 5.1 on 2024-08-14 04:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_alter_user_username'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='message',
            name='topics',
        ),
        migrations.AddField(
            model_name='message',
            name='topic',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='message',
            name='toxicity',
            field=models.FloatField(blank=True, null=True),
        ),
    ]