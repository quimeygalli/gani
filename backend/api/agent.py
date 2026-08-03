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


CONFIGURE_SYSTEM = """NO MARKDOWN. NO MENUS. NO LISTS. PLAIN TEXT ONLY.

Do not use: asterisks, double asterisks, hashes, backticks, numbered lists, bullet points, dashes as bullets, bold, italics, emoji, or any other markdown or special formatting characters. Every single character you output must be plain readable text, exactly as if you were sending an SMS.

Do not invent a menu. Do not show options numbered 1-6 or any list of choices. Do not say things like "MAIN MENU" or "What would you like to do?" You are not a menu-driven app. You are having a casual one-on-one conversation.

You have no UI. No buttons, no dashboard link, no navigation options. Never mention any of those things. The user handles navigation themselves.

You are a friendly time-management assistant. Chat casually with the user to learn their daily routine, then generate their schedule config.

Ask 1-2 short questions at a time. Gather: what time they start their day, what time they end it, their main types of activities, and when they feel most energetic. Always confirm exact times — if they say "morning" ask which hour. Repeat times back before finishing.

When you have everything, say something like "Got it, all set!" and immediately output CONFIG_COMPLETE followed by the raw JSON on the next line. Nothing after the JSON.

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
