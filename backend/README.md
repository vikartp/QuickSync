# QuickSync Signaling Server (Backend)

The QuickSync backend is built using **FastAPI**, **Python 3.11**, **Motor** (async MongoDB driver), and **PyJWT**. It serves as both a WebRTC signaling server and a full REST API for authentication and meeting management.

## 🏗️ Technical Architecture

The backend has evolved from a simple signaling relay into a production-grade API server:

1.  **Google OAuth + JWT Auth**: Verifies Google `id_token`, upserts users in MongoDB, issues JWTs for session management.
2.  **Meeting CRUD**: Create, fetch, and manage meetings with UUID-based shareable links. Supports both authenticated users and guests.
3.  **WebSocket Signaling**: Routes SDP Offers, Answers, and ICE Candidates between peers in a meeting room. Validates meeting existence before allowing connections.
4.  **Presence Tracking**: Broadcasts `"users_list"` updates whenever peers connect or disconnect.
5.  **Admin API**: Monitor active meetings and forcefully close them.

### Module Structure

```
backend/
├── main.py                     # FastAPI app entrypoint, lifespan, CORS, routers
├── pyproject.toml              # Project metadata & dependencies (uv)
├── requirements.txt            # Fallback pip dependencies
├── app/
│   ├── config.py               # Environment variables & settings
│   ├── database.py             # Motor MongoDB client, indexes
│   ├── connection_manager.py   # In-memory WebSocket connection tracker
│   ├── core/
│   │   └── __init__.py         # Auth dependencies (get_current_user, get_optional_user)
│   ├── api/
│   │   ├── auth.py             # POST /api/auth/google, GET /api/auth/me
│   │   ├── meetings.py         # POST /api/meetings/create, GET /api/meetings/my, etc.
│   │   ├── websockets.py       # WS /ws/{meeting_id}
│   │   └── admin.py            # GET/DELETE /admin/sessions
│   ├── models/
│   │   ├── user.py             # Pydantic models for auth requests/responses
│   │   └── meeting.py          # Pydantic models for meeting requests/responses
│   └── services/
│       ├── auth_service.py     # Google token verification, JWT creation, user upsert
│       └── meeting_service.py  # Meeting lifecycle (create, join, leave, end)
```

## 🚀 Running Locally

Using **uv** (recommended):

```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or with pip:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/quicksync` |
| `JWT_SECRET` | Secret for signing JWTs | `change_me_in_production` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for token verification | *(required)* |
| `ADMIN_KEY` | Secret key for admin panel operations | `default_secret` |

## 📡 API Endpoints

### Auth
*   `POST /api/auth/google` — Exchange a Google `id_token` for a QuickSync JWT.
*   `GET /api/auth/me` — Get the currently authenticated user's profile.

### Meetings
*   `POST /api/meetings/create` — Create a new meeting (works for logged-in users and guests).
*   `GET /api/meetings/my` — Get all meetings created by the authenticated user.
*   `GET /api/meetings/{meeting_id}` — Get meeting details by ID.
*   `POST /api/meetings/{meeting_id}/end` — End a meeting.
*   `DELETE /api/meetings/{meeting_id}` — Delete a meeting permanently.

### WebSockets
*   `WS /ws/{meeting_id}` — Connect to a meeting room. Requires `username` query parameter. Meeting must exist and be active.

### Admin
*   `GET /admin/sessions?admin_key=...` — Returns active meetings with live participant data.
*   `DELETE /admin/sessions/{meeting_id}?admin_key=...` — Forcefully closes a meeting.
