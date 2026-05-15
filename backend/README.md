# QuickSync Signaling Server (Backend)

The QuickSync backend is built using **FastAPI** and **Python 3.11**. It is designed to be a highly concurrent, low-latency signaling server for WebRTC.

## 🏗️ Technical Architecture

Because WebRTC transmits media (video/audio) directly between peers, this backend **does not handle any media data**. Its primary responsibilities are:
1.  **WebSocket Handshake Route**: Passing SDP Offers, Answers, and ICE Candidates between users in a specific channel.
2.  **Room/State Management**: Ensuring no more than 2 users join a specific P2P channel to maintain optimal performance.
3.  **Presence Tracking**: Broadcasting `"users_list"` updates whenever peers connect or disconnect.

The application has been refactored into a scalable modular architecture:
*   `app/main.py`: The FastAPI application entrypoint and middleware configuration.
*   `app/connection_manager.py`: The `ConnectionManager` singleton that tracks active WebSocket connections in memory.
*   `app/api/websockets.py`: The WebSocket endpoint logic handling the real-time routing.
*   `app/api/admin.py`: REST API endpoints for administrative monitoring and session termination.
*   `app/config.py`: Environment variable and configuration loading.

## 🚀 Running Locally

If you wish to run the backend independently of Docker:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔐 Environment Variables

*   `SECRET_KEY`: Used to authenticate both standard users joining a room and the Admin API.

## 📡 API Endpoints

### WebSockets
*   `WS /ws/{channel}`: Connect to a channel. Requires `secret_key` and `username` as query parameters.

### REST (Admin)
*   `GET /admin/sessions`: Returns a dictionary of active channels and participants.
*   `DELETE /admin/sessions/{channel}`: Forcefully closes the specified channel.
