import json
import re
import boto3
from datetime import date
from django.conf import settings

_client = None

def _bedrock():
    global _client
    if _client is None:
        _client = boto3.client('bedrock-runtime', region_name=settings.AWS_REGION)
    return _client

def _invoke(system, messages):
    body = json.dumps({
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 1024,
        'system': system,
        'messages': messages,
    })
    r = _bedrock().invoke_model(
        modelId=settings.BEDROCK_MODEL,
        contentType='application/json',
        accept='application/json',
        body=body,
    )
    return json.loads(r['body'].read())['content'][0]['text']


CONFIGURE_SYSTEM = """You are an empathetic time-management assistant having a casual conversation. Interview the user about their daily routine.

CRITICAL FORMATTING RULE: Plain text ONLY. Never use markdown. No asterisks, no backticks, no hashes, no dashes as bullets, no numbered lists, no bold, no code blocks. Write exactly as you would in an SMS message.

Guidelines:
1. Ask 1-2 short conversational questions at a time.
2. Gather: day start/end times, main activity categories, fixed commitments, high-energy hours.
3. Once you have enough detail, end your reply with CONFIG_COMPLETE followed by a raw JSON block:

CONFIG_COMPLETE
{
  "day_start": "08:00",
  "day_end": "22:00",
  "peak_hours": ["09:00-12:00"],
  "categories": ["Study", "Coding", "Rest"]
}"""

SCHEDULE_SYSTEM = """You are a time-blocking scheduler. Given user preferences, return a JSON array of time blocks for today.
Each object must have: title (string), category (string), start_time (ISO 8601), end_time (ISO 8601).
Return ONLY the raw JSON array — no markdown, no explanation."""


def chat_configure(history, user_message):
    messages = history + [{'role': 'user', 'content': user_message}]
    reply = _invoke(CONFIGURE_SYSTEM, messages)

    is_complete = 'CONFIG_COMPLETE' in reply
    schedule_config = None
    clean_reply = reply

    if is_complete:
        match = re.search(r'\{[\s\S]+\}', reply)
        if match:
            try:
                schedule_config = json.loads(match.group())
            except json.JSONDecodeError:
                pass
        clean_reply = re.sub(r'CONFIG_COMPLETE', '', reply)
        clean_reply = re.sub(r'\{[\s\S]+\}', '', clean_reply).strip()
        if not clean_reply:
            clean_reply = 'Perfect! I have everything I need. Your schedule is ready to generate.'

    updated_history = messages + [{'role': 'assistant', 'content': reply}]
    return {
        'message': clean_reply,
        'is_complete': is_complete,
        'schedule_config': schedule_config,
        'updated_history': updated_history,
    }


def generate_schedule(prefs):
    today = date.today().isoformat()
    prompt = (
        f"Today is {today}. Generate a time-blocked schedule:\n"
        f"Day: {prefs['day_start']} to {prefs['day_end']}\n"
        f"Peak hours: {prefs['peak_hours']}\n"
        f"Categories: {prefs['categories']}\n"
        f"Create 6-10 blocks covering the full day."
    )
    raw = _invoke(SCHEDULE_SYSTEM, [{'role': 'user', 'content': prompt}])
    clean = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.MULTILINE)
    clean = re.sub(r'\s*```\s*$', '', clean, flags=re.MULTILINE).strip()
    return json.loads(clean)
