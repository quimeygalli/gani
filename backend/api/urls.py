from django.urls import path
from . import views

urlpatterns = [
    path('chat/configure/', views.configure_chat),
    path('schedule/generate/', views.generate_schedule_view),
    path('schedule/clear/', views.clear_schedule),
    path('timeblocks/', views.list_timeblocks),
    path('timeblocks/<int:pk>/', views.timeblock_detail),
]
