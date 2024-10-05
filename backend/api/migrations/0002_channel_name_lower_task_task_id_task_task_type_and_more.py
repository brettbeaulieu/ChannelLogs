# Generated by Django 5.1.1 on 2024-09-05 12:30

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='channel',
            name='name_lower',
            field=models.CharField(default='untitled channel', max_length=255, unique=True),
        ),
        migrations.AddField(
            model_name='task',
            name='task_id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddField(
            model_name='task',
            name='task_type',
            field=models.CharField(default='No type', max_length=255),
        ),
        migrations.AlterField(
            model_name='channel',
            name='name',
            field=models.CharField(default='Untitled Channel', max_length=255, unique=True),
        ),
        migrations.CreateModel(
            name='MessageEmote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('count', models.IntegerField()),
                ('emote', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.emote')),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='api.message')),
            ],
            options={
                'unique_together': {('message', 'emote')},
            },
        ),
    ]