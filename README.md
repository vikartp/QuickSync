# QuickSync 🚀

QuickSync is a production-grade, zero-latency WebRTC-based application for Peer-to-Peer (P2P) screen sharing, real-time video calls, and instant messaging — with Google OAuth, shareable meeting links, and a MongoDB-backed persistence layer.

![QuickSync Demo](https://via.placeholder.com/1200x600.png?text=QuickSync+-+P2P+Collaboration)

## 🌟 Features

*   **⚡ Zero-Latency P2P Video/Audio**: Directly connect browsers together using WebRTC. Media never touches a central server.
*   **🖥️ High-Fidelity Screen Sharing**: Share your screen instantly. Supports "Kick-Out" logic to ensure only one screen is shared gracefully.
*   **💬 Real-Time Chat**: Send messages instantly over the WebSocket signaling layer.
*   **🔐 Google OAuth Login**: Sign in with Google to create and manage meetings from a personal dashboard.
*   **🔗 Shareable Meeting Links**: Create a meeting and share the UUID-based link — no secret key needed. Having the link IS the access.
*   **👤 Guest Access**: Guests can create instant meetings without signing in.
*   **� Recurring Meetings**: Create permanent channels shared with specific users — always available, never expire.
*   **⏱️ Meeting Duration Tracking**: Automatically tracks and displays how long each meeting lasted.
*   **👥 Smart Participant Tracking**: See exactly who is in your room with the active participants modal.
*   **📹 Dynamic Local Recording**: Record the entire meeting (video, screen, and audio) locally to your machine.
*   **🎙️ Split Mute with Device Picker**: Mute/unmute with a single click, or expand to pick a specific audio input device.
*   **📱 Immersive Fullscreen Mode**: Distraction-free, edge-to-edge viewing with auto-hiding controls.
*   **🛡️ Admin Panel**: Dashboard for administrators to monitor active meetings and forcefully close them.
*   **🎨 Light & Dark Theme**: Toggle between light and dark mode with a fully themed UI using CSS variables.
*   **🌐 Timezone-Aware Timestamps**: All times displayed in the user's local timezone.
*   **🗄️ MongoDB Persistence**: Meetings and user accounts are stored in MongoDB Atlas for history and management.

## 🏗️ Architecture Overview

QuickSync is split into two specialized components:

1.  **Frontend (Next.js 16 / React 19)**: Multi-page application with Google OAuth, a user dashboard, meeting rooms with full WebRTC media engine, and light/dark theme support.
2.  **Backend (FastAPI / Python 3.11)**: Signaling server + REST API. Handles authentication (JWT), meeting CRUD, WebSocket signaling, and admin operations. Backed by MongoDB via Motor (async driver).

### Key Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS, `@react-oauth/google` |
| Backend | FastAPI, Motor (MongoDB async), PyJWT, httpx |
| Database | MongoDB Atlas |
| Auth | Google OAuth 2.0 + JWT |
| Realtime | WebSockets + WebRTC |
| Package Mgmt | uv (backend), npm (frontend) |
| Deployment | Docker Compose |

## 🚀 Getting Started

### Prerequisites

*   Docker & Docker Compose
*   A MongoDB Atlas connection string (or local MongoDB instance)
*   A Google OAuth Client ID (from Google Cloud Console)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/vikartp/QuickSync.git
cd QuickSync

# Start both frontend and backend using Docker Compose
docker compose up --build
```

*   **Frontend**: http://localhost:3000
*   **Backend API**: http://localhost:8000

### Environment Variables

The `docker-compose.yml` passes these to the backend:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `ADMIN_KEY` | Admin key for the admin panel |

The frontend receives these as build args:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID |

## 🧪 End-to-End Testing

QuickSync uses **Playwright** for robust End-to-End (E2E) testing. It fakes hardware media streams (camera/microphone) to test WebRTC P2P connections automatically.

```bash
cd e2e
npm install
npm test
# Or run with UI mode to watch the browsers interact:
npm run test:ui
```

## 📚 Technical Documentation

For deep dives into the specific codebases, refer to the individual documentation files:

*   [Frontend Documentation](./frontend/README.md)
*   [Backend Documentation](./backend/README.md)

---
*Built by Vikash Kumar with ❤️*
