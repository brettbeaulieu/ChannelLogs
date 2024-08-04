from django.test import TestCase, Client
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import ChatFile
import os

class FileUploadTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.upload_url = "/api/chatlogs/"

    def test_remove_files(self):
        file_content = b"Small test file. (Delete)"
        file = SimpleUploadedFile('test_file_1.txt', file_content, content_type='text/plain')
        chat_log = ChatFile.objects.create(file=file)

        # Perform delete request to delete file
        response = self.client.delete(f'{self.upload_url}{chat_log.id}/')

        # Check the response
        self.assertEqual(response.status_code, 204)

        # Verify the file was truly deleted
        self.assertFalse(ChatFile.objects.filter(id=chat_log.id).exists())

    def test_list_files(self):
        file_content = b"Small test file. (List)"
        file = SimpleUploadedFile(f'test_file_3.txt', file_content, content_type='text/plain')
        chat_log = ChatFile.objects.create(file=file)

        # Perform GET request to list files
        response = self.client.get(self.upload_url)

        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIsInstance(response_data, list)  # Expecting a list of files
        self.assertEqual(len(response_data), 1)  # Ensure there's one file

        # Delete entry
        response = self.client.delete(f'{self.upload_url}{chat_log.id}/')