import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
import json
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "default_secret")

class ConnectionManager:
    def __init__(self):
        # Maps channel to list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        
        if len(self.active_connections[channel]) >= 2:
            await websocket.send_json({"type": "error", "message": "Channel is full. Only 2 users allowed."})
            await websocket.close(code=1008)
            return False
            
        self.active_connections[channel].append(websocket)
        return True

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
            if len(self.active_connections[channel]) == 0:
                del self.active_connections[channel]

    async def broadcast(self, message: dict, channel: str, sender: WebSocket):
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                if connection != sender:
                    await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str, secret_key: str = Query(None)):
    if secret_key != SECRET_KEY:
        await websocket.accept() # Must accept before closing with custom code/reason in some uvicorn versions, or just close.
        await websocket.close(code=1008, reason="Invalid secret key")
        return

    connected = await manager.connect(websocket, channel)
    if not connected:
        return

    try:
        # Notify the other peer that a new user joined
        await manager.broadcast({"type": "user_joined"}, channel, websocket)

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Broadcast message to the other peer in the channel
            await manager.broadcast(message, channel, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
        await manager.broadcast({"type": "user_left"}, channel, websocket)

@app.get("/")
def health_check():
    return {"status": "ok"}
