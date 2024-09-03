'''
Module to register the api app
'''

from django.apps import AppConfig


class ApiConfig(AppConfig):
    ''' 
    Config class for the api app. 

    Attributes:
        default_auto_field (str): The default auto field to use for models.
        name (str): The name of the app
    '''
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
