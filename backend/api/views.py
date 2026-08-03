from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .db import load_blocks, save_blocks
from .auth import get_user


def _uid(request):
    user = get_user(request)
    if not user:
        return None
    return user['sub']


@api_view(['GET', 'POST'])
def timeblocks(request):
    uid = _uid(request)
    if not uid:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        return Response(load_blocks(uid))

    # POST — create a new block
    data = request.data
    required = ('title', 'category', 'start_time', 'end_time')
    if not all(data.get(k) for k in required):
        return Response({'error': 'title, category, start_time and end_time are required'},
                        status=status.HTTP_400_BAD_REQUEST)

    blocks = load_blocks(uid)
    new_id = max((b['id'] for b in blocks), default=0) + 1
    block = {
        'id': new_id,
        'title': data['title'],
        'category': data['category'],
        'start_time': data['start_time'],
        'end_time': data['end_time'],
        'is_completed': False,
        'order': new_id,
    }
    blocks.append(block)
    blocks.sort(key=lambda b: b['start_time'])
    save_blocks(uid, blocks)
    return Response(block, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
def timeblock_detail(request, pk):
    uid = _uid(request)
    if not uid:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    blocks = load_blocks(uid)

    if request.method == 'DELETE':
        save_blocks(uid, [b for b in blocks if b['id'] != pk])
        return Response(status=status.HTTP_204_NO_CONTENT)

    updated = [b if b['id'] != pk else {**b, **request.data} for b in blocks]
    save_blocks(uid, updated)
    block = next((b for b in updated if b['id'] == pk), None)
    if block is None:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(block)


@api_view(['POST'])
def clear_schedule(request):
    uid = _uid(request)
    if not uid:
        return Response({'error': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    save_blocks(uid, [])
    return Response([])
