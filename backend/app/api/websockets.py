from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import json
from app.connection_manager import manager
from app.config import settings

router = APIRouter()

@router.websocket("/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str, secret_key: str = Query(None), username: str = Query(None)):
    """
    Handles WebRTC signaling and real-time messaging between peers in a channel.
    This acts as the message router passing SDP offers, answers, and ICE candidates.
    """
    if secret_key != settings.SECRET_KEY:
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Invalid secret key. Access denied."})
        await websocket.close(code=1008, reason="Invalid secret key")
        return

    connected = await manager.connect(websocket, channel, username)
    if not connected:
        return

    try:
        # Notify existing peers that a new user joined
        await manager.broadcast({"type": "user_joined"}, channel, websocket)
        await manager.broadcast_users(channel)

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Broadcast incoming WebRTC signaling data to the other peer in the channel
            await manager.broadcast(message, channel, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
        await manager.broadcast({"type": "user_left"}, channel, websocket)
        await manager.broadcast_users(channel)
