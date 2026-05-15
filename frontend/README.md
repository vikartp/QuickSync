# QuickSync Client (Frontend)

The QuickSync frontend is built using **Next.js 16**, **React 18**, and **Tailwind CSS**. It is a heavy-lifting client that manages complex state, WebRTC media tunnels, and hardware APIs.

## 🏗️ Technical Architecture

Unlike traditional web applications where the frontend is just a "dumb view," the QuickSync frontend acts as the core application engine. 

### WebRTC State Engine
The `page.tsx` component handles the intricate WebRTC connection lifecycle:
1.  **Hardware Access**: Uses `navigator.mediaDevices` to capture user Camera, Microphone, and Screen streams.
2.  **PeerConnection Management**: Initializes `RTCPeerConnection` and maps local media streams (`addTrack`) into the tunnel.
3.  **Renegotiation**: Generates and handles SDP (Session Description Protocol) offers dynamically. If a user unbrakes their microphone mid-call, the frontend rebuilds the SDP and syncs it with the remote peer without dropping the connection.
4.  **Resilience**: The `setupWebRTC()` function automatically re-attaches active hardware streams if the peer connection drops and rebuilds.

### Key Features Under the Hood
*   **MediaStream Re-Assignment**: Safari and Chrome require `srcObject` to be explicitly re-assigned when tracks are dynamically appended to an existing `MediaStream`. The frontend intercepts the `ontrack` event to enforce this playback.
*   **Forced Screen Takeovers**: Implements custom signaling logic (`force_stop_screen_share`) to elegantly drop local screens if a peer requests presentation control.
*   **Local Recording**: Uses the `MediaRecorder` API attached to a synthesized `getDisplayMedia` stream to capture full session video and audio entirely locally.

## 🎨 UI & Aesthetics

The UI is built with Tailwind CSS, leveraging extensive `backdrop-blur`, `bg-gradient`, and custom `box-shadow` properties to create a premium "Glassmorphism" aesthetic.

Icons are provided by `lucide-react`.

## 🚀 Running Locally

If you wish to run the frontend independently of Docker:

```bash
cd frontend
npm install
npm run dev
```

*Note: The frontend requires the `NEXT_PUBLIC_WS_URL` environment variable to locate the signaling server (defaults to `ws://localhost:8000`).*
