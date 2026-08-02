from pathlib import Path
from django.urls import path, include
from django.http import HttpResponse

_html = (Path(__file__).parent.parent / 'frontend.html').read_text()

def frontend(request):
    return HttpResponse(_html, content_type='text/html; charset=utf-8')

urlpatterns = [
    path('api/', include('api.urls')),
    path('', frontend),
]
