from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    """
    Manages WebSocket connections and channel state for the QuickSync signaling server.
    Ensures that rooms do not exceed their capacity and broadcasts messages appropriately.
    """
    def __init__(self):
        # Maps channel name to list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Stores session info (e.g., usernames) per channel
        self.session_data: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, channel: str, username: str) -> bool:
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
            self.session_data[channel] = []
            
        # Enforce strict 2-user limit for P2P performance, overriding legacy DB limits
        if len(self.active_connections[channel]) >= 2:
            await websocket.send_json({"type": "error", "message": "Meeting is full. Only 2 participants allowed."})
            await websocket.close(code=1008)
            return False
            
        self.active_connections[channel].append(websocket)
        self.session_data[channel].append(username or "Anonymous")
        
        # Tag the websocket with the username for easy cleanup later
        setattr(websocket, "qs_username", username or "Anonymous")
        return True

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
                try:
                    username = getattr(websocket, "qs_username", "Anonymous")
                    if username in self.session_data[channel]:
                        self.session_data[channel].remove(username)
                except ValueError:
                    pass
            
            # Clean up empty channels
            if len(self.active_connections[channel]) == 0:
                del self.active_connections[channel]
                if channel in self.session_data:
                    del self.session_data[channel]

    async def broadcast(self, message: dict, channel: str, sender: WebSocket = None):
        """Broadcast a message to everyone in the channel, optionally excluding the sender."""
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                if sender is None or connection != sender:
                    await connection.send_json(message)

    async def broadcast_users(self, channel: str):
        """Send the updated list of users to everyone in the channel."""
        if channel in self.session_data:
            users = self.session_data[channel]
            await self.broadcast({"type": "users_list", "users": users}, channel)

    async def close_channel(self, channel: str):
        """Forcefully disconnect all users in a channel (used by Admin API)."""
        if channel in self.active_connections:
            websockets = list(self.active_connections[channel])
            for ws in websockets:
                try:
                    await ws.send_json({"type": "error", "message": "Admin closed the session."})
                    await ws.close(code=1008, reason="Admin closed session")
                except Exception:
                    pass
            self.active_connections.pop(channel, None)
            self.session_data.pop(channel, None)

# Singleton instance to be shared across routes
manager = ConnectionManager()
