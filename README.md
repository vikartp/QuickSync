# QuickSync

QuickSync is a real-time, peer-to-peer screen sharing and chat application built with Next.js and FastAPI. It leverages WebRTC for seamless screen sharing and audio communication, and WebSockets for ephemeral live chat and signaling. 

## Features

- **Peer-to-Peer Screen Sharing:** Share your screen directly with another user via WebRTC.
- **Audio Communication:** Built-in microphone toggle to talk while sharing or viewing.
- **Live Chat:** Real-time, ephemeral chat using WebSockets. No messages are stored in a database.
- **Secure Channels:** Join specific channels with a predefined secret key.
- **Modern Premium UI:** Built using Next.js 15, Tailwind CSS, and Lucide React icons.

## Architecture

- **Frontend:** Next.js (App Router), React, Tailwind CSS. Handles WebRTC peer connections and media streams.
- **Backend:** FastAPI, Python, Uvicorn. Acts as a WebSocket signaling server for WebRTC handshakes (Offer, Answer, ICE candidates) and relays live chat messages.

## Quick Setup with Docker

The easiest way to run QuickSync is using Docker Compose.

1. Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop) installed.
2. Open a terminal at the root of the project (`c:\Space\workspaces\QuickSync`).
3. Run the following command:
   ```bash
   docker-compose up -d --build
   ```
4. Access the application:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend WebSocket: `ws://localhost:8000`

## Manual Setup

If you prefer to run the application locally without Docker, follow these steps:

### Backend (FastAPI)
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `uvicorn main:app --reload` (Runs on port 8000)

### Frontend (Next.js)
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Open QuickSync in two different browser windows or on two different devices on the same network.
2. Enter any username.
3. Enter a Channel ID (e.g., `standup`).
4. Enter the Secret Key. By default, the environment is configured to use `my_secure_secret_123`.
5. Click **Join Channel**.
6. Once both peers are joined, you can click **Share Screen** to broadcast your screen and **Unmute** to speak.
