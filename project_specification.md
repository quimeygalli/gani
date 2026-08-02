# Project Specification: AI-Driven Time-Blocking Assistant

## 1. Overview & Architecture
An intelligent time-management web application designed to reduce cognitive load. The onboarding and schedule generation are fully handled by an AI agent (Claude Sonnet 4.6) through a chat interface, which converts natural language routines into a structured time-blocked calendar.

* **Backend:** Python 3.12 / Django 5 (Django REST Framework)
* **Frontend:** React 18 (Vite) + Tailwind CSS + `@dnd-kit/core`
* **Database:** SQLite (Development) / PostgreSQL (Production)
* **AI Integration:** Anthropic Claude API (Sonnet 4.6 via `anthropic` Python SDK)

---

## 2. Database Schema (Django Models)

```python
from django.db import models
from django.contrib.auth.models import User

class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    raw_chat_history = models.JSONField(default=list)  # Stores configuration conversation
    peak_hours = models.JSONField(default=list)        # e.g., ["09:00-12:00", "15:00-18:00"]
    day_start = models.TimeField(default="08:00")
    day_end = models.TimeField(default="22:00")
    categories = models.JSONField(default=list)       # e.g., ["Study", "Coding", "Rest"]
    updated_at = models.DateTimeField(auto_now=True)

class TimeBlock(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_completed = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['start_time', 'order']
```

---

## 3. API Endpoints

### `POST /api/chat/configure/`
* **Purpose:** Handles the ongoing onboarding/re-configuration conversation with the agent.
* **Request Body:**
  ```json
  {
    "message": "I study from 9 AM to 1 PM and like working on coding projects in the afternoon."
  }
  ```
* **Response:**
  ```json
  {
    "message": "Got it. What time do you usually finish your day and head to bed?",
    "is_complete": false,
    "schedule_config": null
  }
  ```

### `POST /api/schedule/generate/`
* **Purpose:** Triggers the AI agent to build a time-blocked day based on stored `UserPreference`.
* **Response:** Array of newly created `TimeBlock` records.

### `GET /api/timeblocks/` & `PATCH /api/timeblocks/<id>/`
* **Purpose:** Standard CRUD operations to display, reorder, resize, or mark tasks as complete in the React interface.

---

## 4. Frontend View State Flow

```
 [ View 1: Chat Setup ]  ──(is_complete = true)──>  [ View 2: Main Dashboard ]
 ┌──────────────────────┐                           ┌──────────────────────────────┐
 │ - Interactive Chat   │                           │ - Drag-and-drop Schedule     │
 │ - "Reset Setup" Btn  │                           │ - Focused Active Block View  │
 └──────────────────────┘                           │ - Integrated Execution Timer │
                                                    └──────────────────────────────┘
```

---

## 5. Claude Agent System Instructions

```text
You are an empathetic, efficient time-management assistant. Your goal is to interview the user about their routine (commitments, peak hours, preferred schedule limits).

Guidelines:
1. Ask clear, direct, short questions (1-2 at a time).
2. Gather information on: day start/end times, main categories of activity, fixed commitments, and high-energy hours.
3. Once sufficient detail is gathered, finalize by emitting a response with the tag `CONFIG_COMPLETE` followed strictly by a raw JSON block matching this structure:

{
  "day_start": "08:00",
  "day_end": "22:00",
  "peak_hours": ["09:00-12:00"],
  "categories": ["Study", "Coding", "Rest"]
}
```
