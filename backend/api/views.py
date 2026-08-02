from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .db import (
    load_history, save_history,
    load_prefs, save_prefs,
    load_blocks, save_blocks,
)
from .agent import chat_configure, generate_schedule

DEMO_USER = 'demo'
DEMO_SESSION = 'demo-session'


@api_view(['POST'])
def configure_chat(request):
    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'message required'}, status=status.HTTP_400_BAD_REQUEST)

    history = load_history(DEMO_SESSION)
    result = chat_configure(history, message)
    save_history(DEMO_SESSION, result['updated_history'])

    if result['is_complete'] and result['schedule_config']:
        save_prefs(DEMO_USER, result['schedule_config'])

    return Response({
        'message': result['message'],
        'is_complete': result['is_complete'],
        'schedule_config': result['schedule_config'],
    })


@api_view(['POST'])
def generate_schedule_view(request):
    prefs = load_prefs(DEMO_USER)
    if not prefs:
        return Response({'error': 'Run chat setup first'}, status=status.HTTP_400_BAD_REQUEST)

    blocks_data = generate_schedule(prefs)
    blocks = [
        {**b, 'id': i + 1, 'is_completed': False, 'order': i}
        for i, b in enumerate(blocks_data)
    ]
    save_blocks(DEMO_USER, blocks)
    return Response(blocks)


@api_view(['POST'])
def clear_schedule(request):
    save_blocks(DEMO_USER, [])
    return Response([])


@api_view(['GET'])
def list_timeblocks(request):
    return Response(load_blocks(DEMO_USER))


@api_view(['PATCH', 'DELETE'])
def timeblock_detail(request, pk):
    blocks = load_blocks(DEMO_USER)

    if request.method == 'DELETE':
        save_blocks(DEMO_USER, [b for b in blocks if b['id'] != pk])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    updated = [b if b['id'] != pk else {**b, **request.data} for b in blocks]
    save_blocks(DEMO_USER, updated)
    block = next((b for b in updated if b['id'] == pk), None)
    if block is None:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(block)
