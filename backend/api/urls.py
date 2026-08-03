from django.urls import path
from . import views
from .auth import google_login

urlpatterns = [
    path('auth/google/', google_login),
    path('timeblocks/', views.timeblocks),
    path('timeblocks/<int:pk>/', views.timeblock_detail),
    path('schedule/clear/', views.clear_schedule),
]
