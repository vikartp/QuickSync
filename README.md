# QuickSync 🚀

QuickSync is a highly scalable, zero-latency WebRTC-based application for Peer-to-Peer (P2P) screen sharing, real-time video calls, and instant messaging. It is built to be blisteringly fast, perfectly secure, and incredibly lightweight.

![QuickSync Demo](https://via.placeholder.com/1200x600.png?text=QuickSync+-+P2P+Collaboration)

## 🌟 Features

*   **⚡ Zero-Latency P2P Video/Audio**: Directly connect browsers together using WebRTC. Media never touches a central server.
*   **🖥️ High-Fidelity Screen Sharing**: Share your screen instantly. Supports "Kick-Out" logic to ensure only one screen is shared gracefully.
*   **💬 Real-Time Chat**: Send messages instantly over the P2P data channel or WebSocket signaling layer.
*   **🔒 Channel Security**: Rooms are protected by Secret Keys. Nobody can join without your permission.
*   **👥 Smart Participant Tracking**: See exactly who is in your room with the sleek active users modal.
*   **📹 Local Session Recording**: Record the entire meeting (video, screen, and audio) locally to your machine without any cloud storage limits.
*   **📱 Immersive Fullscreen Mode**: A completely distraction-free, cinematic, edge-to-edge viewing mode with auto-hiding controls.
*   **🛡️ Stealth Admin Panel**: A hidden dashboard for administrators to monitor active sessions and forcefully close channels.

## 🏗️ Architecture Overview

QuickSync is split into two specialized components:

1.  **Frontend (Next.js / React)**: The powerhouse of the application. It acts as both the beautiful UI and the WebRTC media engine. It dynamically manages hardware devices, renders media streams, and renegotiates connections on the fly.
2.  **Backend (FastAPI / Python)**: A highly efficient, stateless Signaling Server. Its only job is to route WebSocket messages to help peers discover each other. It uses almost zero CPU and bandwidth.

## 🚀 Getting Started

The easiest way to run QuickSync is using Docker.

```bash
# Clone the repository
git clone https://github.com/vikartp/QuickSync.git
cd QuickSync

# Start both frontend and backend using Docker Compose
docker compose up --build
```

*   **Frontend**: http://localhost:3000
*   **Backend API**: http://localhost:8000

## 🧪 End-to-End Testing

QuickSync uses **Playwright** for robust End-to-End (E2E) testing. It fakes hardware media streams (camera/microphone) to test WebRTC P2P connections automatically.

```bash
cd e2e
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
