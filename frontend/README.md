# QuickSync Client (Frontend)

The QuickSync frontend is built using **Next.js 16**, **React 19**, **Tailwind CSS**, and **@react-oauth/google**. It is a multi-page application that manages authentication, meeting lifecycle, and the full WebRTC media engine.

## 🏗️ Technical Architecture

The frontend is structured as a multi-page Next.js app with the following routes:

| Route | Purpose |
|-------|---------|
| `/` | Root redirect — sends authenticated users to `/dashboard`, guests to `/auth` |
| `/auth` | Google OAuth login + guest quick-join |
| `/dashboard` | Authenticated user's meeting management (create, view history, join) |
| `/meeting/[id]` | The live WebRTC meeting room |
| `/admin` | Admin panel for monitoring/closing active meetings |

### Authentication Flow
1.  User signs in via Google OAuth (`@react-oauth/google`).
2.  The Google `id_token` is sent to `POST /api/auth/google` on the backend.
3.  Backend verifies token, upserts user in MongoDB, and returns a QuickSync JWT.
4.  JWT is stored in `localStorage` and auto-injected into all API calls via the `api.ts` client.
5.  `AuthProvider` context provides `user`, `loading`, `logout`, and `refreshUser` across the app.

### Meeting Flow
1.  Authenticated users create meetings from the dashboard → `POST /api/meetings/create`.
2.  Backend returns a UUID-based `meeting_id`. The shareable link is `/meeting/{meeting_id}`.
3.  Guests can also create meetings directly from the `/auth` page with a display name.
4.  On joining a meeting, the frontend connects via WebSocket to `ws://backend/ws/{meeting_id}`.

### WebRTC State Engine
The meeting page handles the intricate WebRTC connection lifecycle:
1.  **Hardware Access**: Uses `navigator.mediaDevices` to capture Camera, Microphone, and Screen streams.
2.  **PeerConnection Management**: Initializes `RTCPeerConnection` and maps local media streams (`addTrack`) into the tunnel.
3.  **Renegotiation**: Generates and handles SDP offers dynamically when media tracks are added/removed mid-call.
4.  **Resilience**: Automatically re-attaches active hardware streams if the peer connection drops.

### Theme System
*   **Light & Dark mode** powered by CSS variables and a `ThemeProvider` context.
*   Theme preference persisted in `localStorage`.
*   All components use `var(--fg)`, `var(--bg-card)`, `var(--border)` etc. for consistent theming.

## 🎨 UI & Components

The UI is built with Tailwind CSS and CSS custom properties for theming. Key components:

*   `AuthProvider` — React context for auth state
*   `ThemeProvider` — React context for light/dark theme
*   `Header` / `Footer` — Shared layout components
*   `MeetingCard` — Dashboard meeting list item
*   `ChatSidebar` — In-meeting live chat panel
*   `SettingsModal` — Audio device configuration + admin panel
*   `ParticipantsModal` — Active participants list

Icons are provided by `lucide-react`.

## 🚀 Running Locally

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend REST API base URL | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket base URL | `ws://localhost:8000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID | *(required for login)* |
