import jwt
import time
import json
import urllib.request
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings


def make_jwt(user_id, email, name):
    payload = {
        'sub': user_id,
        'email': email,
        'name': name,
        'iat': int(time.time()),
        'exp': int(time.time()) + 30 * 86400,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')


def verify_jwt(token):
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
    except jwt.PyJWTError:
        return None


def get_user(request):
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    return verify_jwt(auth[7:])


def _verify_google_token(token, client_id):
    url = f'https://oauth2.googleapis.com/tokeninfo?id_token={token}'
    with urllib.request.urlopen(url, timeout=5) as resp:
        info = json.loads(resp.read())
    if info.get('aud') != client_id:
        raise ValueError('Token audience mismatch')
    if info.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
        raise ValueError('Invalid token issuer')
    if int(info.get('exp', 0)) < int(time.time()):
        raise ValueError('Token expired')
    return info


@api_view(['POST'])
def google_login(request):
    token = request.data.get('token', '')
    if not token:
        return Response({'error': 'token required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        info = _verify_google_token(token, settings.GOOGLE_CLIENT_ID)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    user_id = info['sub']
    email = info.get('email', '')
    name = info.get('name', email)

    return Response({
        'token': make_jwt(user_id, email, name),
        'user': {'id': user_id, 'email': email, 'name': name},
    })
