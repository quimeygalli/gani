# Gani — AI-Driven Time-Blocking Assistant

Gani is a serverless web app that turns a short conversation into a structured daily schedule. An AI agent interviews you about your routine, then generates a time-blocked calendar for the day. You can view, edit, and track your blocks in a live dashboard.

---

## Features

### Chat Setup
- Conversational onboarding powered by Claude (via AWS Bedrock)
- The agent asks about your day start/end times, peak energy hours, and activity categories
- Once it has enough information it generates your schedule config automatically
- You can switch to the dashboard at any time using the **Go to Dashboard** button

### Dashboard
- **Day timeline bar** — proportional colored bar at the top showing every block's position in the day, with a live "now" marker
- **Active block panel** — highlights the currently running block with a real-time elapsed timer and progress bar
- **Block list** — all blocks for the day, each showing title, category badge, time range, and duration
- **Edit blocks** — click Edit on any block to change its title, category, start time, or end time
- **Delete blocks** — remove individual blocks from the edit modal
- **Mark complete** — toggle the checkbox on each block to track progress
- **Clear schedule** — remove all blocks and start fresh
- **Generate schedule** — ask the AI to rebuild your schedule from your saved preferences
- **Reconfigure** — return to the chat to update your preferences

### Sky background
The page background color shifts across a sky color gradient based on the current time of day — from deep midnight blue through dawn, midday sky blue, dusk, and back to night. Text and UI elements adapt their contrast accordingly.

---

## Architecture

```
Browser (React SPA)
       │  HTTP
       ▼
AWS API Gateway (HTTP API)
       │
       ▼
AWS Lambda (Python 3.12, arm64)
  ├── Django 5 + Django REST Framework  (request routing, business logic)
  ├── Mangum 0.17                       (ASGI adapter for Lambda)
  ├── boto3 → AWS Bedrock               (Claude LLM inference)
  └── boto3 → DynamoDB                  (persistent storage)
```

The entire React app is compiled to a single self-contained HTML file (JS and CSS inlined) and served directly from Lambda — no S3 or CloudFront needed.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 |
| Frontend build tool | Vite |
| Styling | Tailwind CSS |
| Backend framework | Django 5 + Django REST Framework |
| ASGI adapter | Mangum 0.17 |
| AI inference | AWS Bedrock — `claude-haiku-4-5` |
| Storage | AWS DynamoDB |
| Compute | AWS Lambda (Python 3.12, arm64) |
| API | AWS API Gateway (HTTP API) |
| Infrastructure | AWS SAM (Serverless Application Model) |

---

## Project Structure

```
gani/
├── template.yml          # SAM infrastructure definition
├── samconfig.toml        # SAM deploy defaults
├── backend/
│   ├── handler.py        # Lambda entry point (Mangum + Django ASGI)
│   ├── requirements.txt
│   ├── frontend.html     # Built frontend (generated — do not edit)
│   ├── core/
│   │   ├── settings.py   # Django settings (no SQL database)
│   │   ├── urls.py       # Root URL config + frontend HTML route
│   │   └── asgi.py
│   └── api/
│       ├── urls.py       # API route definitions
│       ├── views.py      # DRF view functions
│       ├── agent.py      # Bedrock inference + prompt logic
│       └── db.py         # DynamoDB read/write helpers
└── frontend/
    ├── src/
    │   ├── App.jsx        # View switcher (ChatSetup ↔ Dashboard)
    │   └── views/
    │       ├── ChatSetup.jsx
    │       └── Dashboard.jsx
    └── inline.mjs         # Post-build script: inlines assets → frontend.html
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat/configure/` | Send a chat message; returns AI reply and config when complete |
| `POST` | `/api/schedule/generate/` | Generate time blocks from saved preferences |
| `POST` | `/api/schedule/clear/` | Delete all time blocks |
| `GET` | `/api/timeblocks/` | List all time blocks |
| `PATCH` | `/api/timeblocks/<id>/` | Update a block (title, times, completion) |
| `DELETE` | `/api/timeblocks/<id>/` | Delete a single block |

---

## DynamoDB Storage

All data is stored in a single DynamoDB table (`agent-sessions`) using three key patterns:

| Key | Data |
|---|---|
| `chat#<session>` | Conversation history (list of messages) |
| `prefs#<user>` | Schedule preferences (day start/end, categories, peak hours) |
| `blocks#<user>` | List of time block objects |

---

## Deployment

Requires AWS SAM CLI and an IAM role with Bedrock + DynamoDB permissions.

```bash
# Build
sam build --no-cached

# Deploy (first time)
sam deploy --guided

# Force-push Lambda code after a build
cd .aws-sam/build/ApiFunction
zip -r /tmp/gani-lambda.zip .
aws lambda update-function-code --function-name gani-api --zip-file fileb:///tmp/gani-lambda.zip
aws lambda wait function-updated --function-name gani-api
```

To rebuild the frontend and include it in the next deploy:

```bash
cd frontend
npm run build
node inline.mjs
cp dist/inline.html ../backend/frontend.html
```
