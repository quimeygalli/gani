import json
import time
import boto3
from django.conf import settings

_client = None

def _ddb():
    global _client
    if _client is None:
        _client = boto3.resource('dynamodb', region_name=settings.AWS_REGION)
    return _client

def _table():
    return _ddb().Table(settings.DYNAMODB_TABLE)

def _get(key):
    r = _table().get_item(Key={'sessionId': key})
    return r.get('Item')

def _put(key, data):
    _table().put_item(Item={
        'sessionId': key,
        **data,
        'ttl': int(time.time()) + 7 * 86400,
    })

def load_history(session_id):
    item = _get(f'chat#{session_id}')
    return json.loads(item['messages']) if item else []

def save_history(session_id, messages):
    _put(f'chat#{session_id}', {'messages': json.dumps(messages)})

def load_prefs(user_id):
    return _get(f'prefs#{user_id}')

def save_prefs(user_id, prefs):
    _put(f'prefs#{user_id}', prefs)

def load_blocks(user_id):
    item = _get(f'blocks#{user_id}')
    return json.loads(item['blocks']) if item else []

def save_blocks(user_id, blocks):
    _put(f'blocks#{user_id}', {'blocks': json.dumps(blocks)})
