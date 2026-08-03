import jwt
import time
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
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
        'exp': int(time.time()) + 30 * 86400,  # 30 days
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


@api_view(['POST'])
def google_login(request):
    token = request.data.get('token', '')
    if not token:
        return Response({'error': 'token required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    user_id = info['sub']
    email = info.get('email', '')
    name = info.get('name', email)

    return Response({
        'token': make_jwt(user_id, email, name),
        'user': {'id': user_id, 'email': email, 'name': name},
    })
