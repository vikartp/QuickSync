"""
WebSocket signaling endpoint — now uses meeting_id (UUID) instead of channel name.
Validates that the meeting exists in MongoDB before allowing connection.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import json
from app.connection_manager import manager
from app.services import meeting_service

router = APIRouter()


@router.websocket("/{meeting_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    meeting_id: str,
    username: str = Query(None),
):
    """
    Handles WebRTC signaling and real-time messaging between peers in a meeting.
    The meeting_id (UUID) must correspond to a valid, active meeting in the database.
    No secret_key needed — having the UUID link IS the access token.
    """
    # Validate that the meeting exists and is active
    meeting = await meeting_service.get_meeting(meeting_id)
    if not meeting or meeting["status"] != "active":
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Meeting not found or has ended."})
        await websocket.close(code=1008, reason="Invalid meeting")
        return

    display_name = username or "Anonymous"

    # Try to add participant to meeting (enforces participant limit)
    can_join = await meeting_service.add_participant(meeting_id, display_name)
    if not can_join:
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Meeting is full. Only 2 participants allowed."})
        await websocket.close(code=1008, reason="Meeting full")
        return

    # Connect to the in-memory signaling manager
    connected = await manager.connect(websocket, meeting_id, display_name)
    if not connected:
        await meeting_service.remove_participant(meeting_id, display_name)
        return

    try:
        # Notify existing peers that a new user joined
        await manager.broadcast({"type": "user_joined"}, meeting_id, websocket)
        await manager.broadcast_users(meeting_id)

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Broadcast incoming WebRTC signaling data to the other peer
            await manager.broadcast(message, meeting_id, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, meeting_id)
        await meeting_service.remove_participant(meeting_id, display_name)
        await manager.broadcast({"type": "user_left"}, meeting_id, websocket)
        await manager.broadcast_users(meeting_id)
