import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from core.asgi import application
from mangum import Mangum

handler = Mangum(application, lifespan='off')
