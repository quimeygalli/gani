import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-only-change-in-prod')
DEBUG = False
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

# No real DB needed — all data lives in DynamoDB
DATABASES = {}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}

DYNAMODB_TABLE = os.environ.get('SESSIONS_TABLE', 'agent-sessions')
AWS_REGION = os.environ.get('AWS_DEFAULT_REGION', os.environ.get('AWS_REGION', 'us-east-1'))

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
JWT_SECRET = os.environ.get('JWT_SECRET', SECRET_KEY)
