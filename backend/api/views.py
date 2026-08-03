from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .db import (
    load_history, save_history,
    load_prefs, save_prefs,
    load_blocks, save_blocks,
)
from .agent import chat_configure, generate_schedule
from .auth import get_user


def _ids(request):
    user = get_user(request)
    if not user:
        return None, None
    uid = user['sub']
    return uid, f"{uid}-session"


@api_view(['POST'])
def configure_chat(request):
    user_id, session_id = _ids(request)
    if not user_id:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'message required'}, status=status.HTTP_400_BAD_REQUEST)

    history = load_history(session_id)
    result = chat_configure(history, message)
    save_history(session_id, result['updated_history'])

    if result['is_complete'] and result['schedule_config']:
        save_prefs(user_id, result['schedule_config'])

    return Response({
        'message': result['message'],
        'is_complete': result['is_complete'],
        'schedule_config': result['schedule_config'],
    })


@api_view(['POST'])
def generate_schedule_view(request):
    user_id, _ = _ids(request)
    if not user_id:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    prefs = load_prefs(user_id)
    if not prefs:
        return Response({'error': 'Run chat setup first'}, status=status.HTTP_400_BAD_REQUEST)

    blocks_data = generate_schedule(prefs)
    blocks = [
        {**b, 'id': i + 1, 'is_completed': False, 'order': i}
        for i, b in enumerate(blocks_data)
    ]
    save_blocks(user_id, blocks)
    return Response(blocks)


@api_view(['POST'])
def clear_schedule(request):
    user_id, _ = _ids(request)
    if not user_id:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    save_blocks(user_id, [])
    return Response([])


@api_view(['GET'])
def list_timeblocks(request):
    user_id, _ = _ids(request)
    if not user_id:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(load_blocks(user_id))


@api_view(['PATCH', 'DELETE'])
def timeblock_detail(request, pk):
    user_id, _ = _ids(request)
    if not user_id:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    blocks = load_blocks(user_id)

    if request.method == 'DELETE':
        save_blocks(user_id, [b for b in blocks if b['id'] != pk])
        return Response(status=status.HTTP_204_NO_CONTENT)

    updated = [b if b['id'] != pk else {**b, **request.data} for b in blocks]
    save_blocks(user_id, updated)
    block = next((b for b in updated if b['id'] == pk), None)
    if block is None:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(block)
