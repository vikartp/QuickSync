"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Mic, MicOff, MonitorUp, MonitorOff, PhoneOff, User, MessageSquare, Maximize, Minimize, Camera, CameraOff, CircleDot, Square, X, Loader2, ArrowRight, Link2, Check, ChevronUp, WifiOff, RefreshCw } from 'lucide-react';
import { ChatSidebar } from '../../../components/ChatSidebar';
import { getMeeting } from '../../../lib/api';
import { getWsUrl } from '../../../lib/url';
import { useAuth } from '../../../components/AuthProvider';

export default function MeetingRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const meetingId = params.id as string;
  const nameFromQuery = searchParams.get('name') || '';
  // ==========================================
  // 1. APPLICATION STATE
  // ==========================================

  // Connection & User State
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [username, setUsername] = useState(nameFromQuery);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingValid, setMeetingValid] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [audioInputId, setAudioInputId] = useState<string>('');
  const [audioOutputId, setAudioOutputId] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [screenShareSupported, setScreenShareSupported] = useState(true);
  const [screenShareTooltip, setScreenShareTooltip] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);
  const usersMenuRef = useRef<HTMLDivElement>(null);

  // Reconnection refs
  const intentionalDisconnect = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 20;
  const BASE_RECONNECT_DELAY = 1000; // 1s, will exponentially backoff up to 15s

  // ==========================================
  // 2. WEBRTC & DOM REFERENCES
  // ==========================================

  // Networking Refs
  const ws = useRef<WebSocket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const localScreenStream = useRef<MediaStream | null>(null);
  const localCameraStream = useRef<MediaStream | null>(null);
  const localAudioStream = useRef<MediaStream | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCameraRef = useRef<HTMLVideoElement>(null);
  const localCameraRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioStream = useRef<MediaStream | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const remoteStreamIds = useRef<{ camera?: string, screen?: string }>({});

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Close audio device menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target as Node)) {
        setShowAudioMenu(false);
      }
    };
    if (showAudioMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAudioMenu]);

  // Close participants popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (usersMenuRef.current && !usersMenuRef.current.contains(e.target as Node)) {
        setShowUsersModal(false);
      }
    };
    if (showUsersModal) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUsersModal]);

  useEffect(() => {
    if (isRecording && recordingAudioCtxRef.current && recordingDestRef.current) {
      if (micSourceNodeRef.current) {
        try { micSourceNodeRef.current.disconnect(); } catch (e) {}
        micSourceNodeRef.current = null;
      }
      if (!isMuted && localAudioStream.current && localAudioStream.current.getAudioTracks().length > 0) {
        try {
          const source = recordingAudioCtxRef.current.createMediaStreamSource(localAudioStream.current);
          source.connect(recordingDestRef.current);
          micSourceNodeRef.current = source;
        } catch (e) {
          console.error('Error connecting mic to recorder', e);
        }
      }
    }
  }, [isMuted, isRecording]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices);
      } catch (err) {
        console.error("Error fetching devices", err);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  // Detect screen share support (getDisplayMedia is missing on iOS Safari and older Android browsers)
  useEffect(() => {
    const supported = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
    setScreenShareSupported(supported);
  }, []);

  useEffect(() => {
    const updateOutput = async (element: HTMLMediaElement | null) => {
      if (element && audioOutputId) {
        // @ts-ignore
        if (typeof element.setSinkId === 'function') {
          // @ts-ignore
          await element.setSinkId(audioOutputId).catch(console.error);
        }
      }
    };
    updateOutput(remoteAudioRef.current);
    updateOutput(remoteVideoRef.current);
  }, [audioOutputId, isJoined]);

  useEffect(() => {
    if (!isMuted && localAudioStream.current && peerConnection.current) {
      navigator.mediaDevices.getUserMedia({
        audio: audioInputId ? { deviceId: { exact: audioInputId } } : true
      }).then(newStream => {
        const newTrack = newStream.getAudioTracks()[0];
        const senders = peerConnection.current?.getSenders() || [];
        const sender = senders.find(s => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(newTrack);

        localAudioStream.current?.getTracks().forEach(t => t.stop());
        localAudioStream.current = newStream;
      }).catch(console.error);
    }
  }, [audioInputId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup reconnect timer on unmount
  useEffect(() => {
    return () => {
      intentionalDisconnect.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, []);
  const autoJoinAttempted = useRef(false);

  // Validate meeting exists on mount and auto-join for logged-in users or name-from-query
  useEffect(() => {
    if (!meetingId) return;
    // Wait for auth to finish loading before deciding
    if (authLoading) return;

    getMeeting(meetingId)
      .then((m) => {
        setMeetingValid(true);
        setMeetingTitle(m.title || `Meeting ${meetingId.slice(0, 8)}`);

        if (autoJoinAttempted.current) return;

        // Determine the name to auto-join with
        const autoName = nameFromQuery || (user?.name ?? '');
        if (autoName) {
          autoJoinAttempted.current = true;
          setUsername(autoName);
          setIsConnecting(true);
          connectWebSocket(autoName);
        }
      })
      .catch(() => setMeetingValid(false));
  }, [meetingId, authLoading]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // ==========================================
  // 3. CORE NETWORKING (WEBSOCKET & SIGNALING)
  // ==========================================

  /**
   * Initializes the WebSocket connection and sets up signaling listeners.
   * This is the gateway to entering a channel and discovering peers.
   */
  const connectWebSocket = (autoJoinName?: string, isReconnect = false) => {
    if (ws.current) return;

    const finalName = autoJoinName || username;
    if (!finalName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!isReconnect) {
      setIsConnecting(true);
      intentionalDisconnect.current = false;
    }

    const baseUrl = getWsUrl();
    const wsUrl = `${baseUrl}/ws/${meetingId}?username=${encodeURIComponent(finalName.trim())}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (err) {
      // WebSocket constructor can throw if the URL is invalid or server is down.
      // During reconnect, schedule the next retry directly.
      console.error('[QuickSync] WebSocket constructor failed:', err);
      if (isReconnect) {
        scheduleReconnect(finalName);
      } else {
        setError('Connection failed. Please check your network and try again.');
        setIsConnecting(false);
      }
      return;
    }

    ws.current = socket;

    socket.onopen = () => {
      setIsJoined(true);
      setIsConnecting(false);
      setError('');

      // If we successfully reconnected, reset reconnection state
      if (isReconnect) {
        setIsReconnecting(false);
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0;
        setMessages(prev => [...prev, { sender: 'System', text: '✅ Reconnected successfully!' }]);
      }

      setupWebRTC();
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'error') {
        if (!isReconnect) {
          // Initial connection failed (user was never in the meeting).
          // Show error and prevent onclose from starting reconnect loop.
          setError(data.message);
          setIsConnecting(false);
          intentionalDisconnect.current = true;
        } else {
          // During reconnect: check if the meeting is permanently gone.
          // "not found" or "has ended" means the meeting was explicitly ended
          // or deleted — stop retrying. Other errors (e.g., "full") are
          // transient and the retry loop should continue.
          const msg = (data.message || '').toLowerCase();
          if (msg.includes('not found') || msg.includes('has ended') || msg.includes('ended')) {
            setIsReconnecting(false);
            setReconnectAttempt(0);
            reconnectAttemptRef.current = 0;
            intentionalDisconnect.current = true;
            setIsJoined(false);
            setError(data.message);
            cleanupLocalMedia();
          }
          // For other errors (e.g., "Meeting is full"), onclose will continue retry loop
        }
        socket.close();
      } else if (data.type === 'users_list') {
        setActiveUsers(data.users);
      } else if (data.type === 'chat') {
        setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
      } else if (data.type === 'stream_info') {
        remoteStreamIds.current = { camera: data.camera, screen: data.screen };
      } else if (data.type === 'user_joined') {
        broadcastStreamInfo();
        createOffer({ iceRestart: true });
      } else if (data.type === 'offer') {
        await handleOffer(data.offer);
      } else if (data.type === 'answer') {
        await handleAnswer(data.answer);
      } else if (data.type === 'ice_candidate') {
        await handleIceCandidate(data.candidate);
      } else if (data.type === 'user_left') {
        setMessages(prev => [...prev, { sender: 'System', text: 'Peer left the channel.' }]);
        setIsRemoteScreenSharing(false);
        setIsRemoteCameraOn(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (remoteCameraRef.current) remoteCameraRef.current.srcObject = null;
        if (remoteAudioStream.current) {
          remoteAudioStream.current.getTracks().forEach(t => t.stop());
          remoteAudioStream.current = null;
        }
        if (peerConnection.current) {
          peerConnection.current.close();
          setupWebRTC();
        }
      } else if (data.type === 'stop_screen_share') {
        setIsRemoteScreenSharing(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      } else if (data.type === 'stop_camera') {
        setIsRemoteCameraOn(false);
        if (remoteCameraRef.current) remoteCameraRef.current.srcObject = null;
      } else if (data.type === 'force_stop_screen_share') {
        if (localScreenStream.current && peerConnection.current) {
          const senders = peerConnection.current.getSenders();
          localScreenStream.current.getTracks().forEach(track => {
            const sender = senders.find(s => s.track === track);
            if (sender) peerConnection.current?.removeTrack(sender);
            track.stop();
          });
          const oldStream = localScreenStream.current;
          localScreenStream.current = null;
          setIsScreenSharing(false);
          if (remoteVideoRef.current && remoteVideoRef.current.srcObject === oldStream) {
            remoteVideoRef.current.srcObject = null;
          }
        }
      }
    };

    socket.onerror = () => {
      // Don't show error toast when reconnecting — the banner handles it
      if (!isReconnect) {
        setError('Connection failed. Please check your network and try again.');
        setIsConnecting(false);
      }
    };

    socket.onclose = () => {
      ws.current = null;

      // Only close the peer connection, NOT the local media streams
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      // Clear remote streams (peer is gone anyway)
      setIsRemoteScreenSharing(false);
      setIsRemoteCameraOn(false);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteCameraRef.current) remoteCameraRef.current.srcObject = null;
      if (remoteAudioStream.current) {
        remoteAudioStream.current.getTracks().forEach(t => t.stop());
        remoteAudioStream.current = null;
      }

      // If the user intentionally left, do a full cleanup
      if (intentionalDisconnect.current) {
        setIsJoined(false);
        setIsConnecting(false);
        cleanupLocalMedia();
        return;
      }

      // Unintentional disconnect — schedule reconnect
      scheduleReconnect(finalName);
    };
  };

  /** Schedules the next reconnect attempt with exponential backoff. */
  const scheduleReconnect = (nameToUse: string) => {
    const attempt = reconnectAttemptRef.current + 1;
    reconnectAttemptRef.current = attempt;
    setReconnectAttempt(attempt);

    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      setIsReconnecting(false);
      setIsJoined(false);
      setError('Unable to reconnect after multiple attempts. Please rejoin the meeting.');
      cleanupLocalMedia();
      return;
    }

    setIsReconnecting(true);
    // Keep isJoined true so the meeting room UI stays visible

    // Exponential backoff: 1s, 2s, 4s, 8s, capped at 15s
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempt - 1), 15000);
    console.log(`[QuickSync] Reconnecting in ${delay}ms (attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS})...`);

    reconnectTimerRef.current = setTimeout(() => {
      connectWebSocket(nameToUse, true);
    }, delay);
  };

  // ==========================================
  // 4. WEBRTC CONNECTION MANAGEMENT
  // ==========================================

  /**
   * Initializes the RTCPeerConnection, attaches active local streams if they exist
   * (useful during reconnection drops), and sets up handlers for incoming media tracks.
   */
  const setupWebRTC = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ice_candidate', candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      const isCamera = stream.id === remoteStreamIds.current.camera;

      if (event.track.kind === 'video') {
        if (isCamera) {
          if (remoteCameraRef.current) remoteCameraRef.current.srcObject = stream;
          setIsRemoteCameraOn(true);
        } else {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
          setIsRemoteScreenSharing(true);
        }
      } else if (event.track.kind === 'audio') {
        if (!remoteAudioStream.current) {
          remoteAudioStream.current = new MediaStream();
        }

        // Clear previous tracks to avoid accumulating ended tracks
        remoteAudioStream.current.getAudioTracks().forEach(t => {
          if (t.id !== event.track.id) {
            remoteAudioStream.current?.removeTrack(t);
          }
        });

        const existingTracks = remoteAudioStream.current.getAudioTracks();
        if (!existingTracks.find(t => t.id === event.track.id)) {
          remoteAudioStream.current.addTrack(event.track);
        }

        // Re-assign srcObject to force browser to play the new track
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteAudioStream.current;
        }

        // If recording is active, reconnect the updated remote audio to the recording graph
        if (recordingAudioCtxRef.current && recordingDestRef.current) {
          try {
            if (remoteSourceNodeRef.current) {
              remoteSourceNodeRef.current.disconnect();
            }
            remoteSourceNodeRef.current = recordingAudioCtxRef.current.createMediaStreamSource(remoteAudioStream.current);
            remoteSourceNodeRef.current.connect(recordingDestRef.current);
          } catch (e) {
            console.error('Error connecting remote audio to recorder', e);
          }
        }
      }
    };

    if (localCameraStream.current) {
      localCameraStream.current.getTracks().forEach(track => pc.addTrack(track, localCameraStream.current!));
    }
    if (localScreenStream.current) {
      localScreenStream.current.getTracks().forEach(track => pc.addTrack(track, localScreenStream.current!));
    }
    if (localAudioStream.current) {
      localAudioStream.current.getTracks().forEach(track => pc.addTrack(track, localAudioStream.current!));
    }

    peerConnection.current = pc;
  };

  const broadcastStreamInfo = () => {
    ws.current?.send(JSON.stringify({
      type: 'stream_info',
      camera: localCameraStream.current?.id,
      screen: localScreenStream.current?.id
    }));
  };

  const createOffer = async (options?: RTCOfferOptions) => {
    if (!peerConnection.current) return;
    try {
      const offer = await peerConnection.current.createOffer(options);
      await peerConnection.current.setLocalDescription(offer);
      ws.current?.send(JSON.stringify({ type: 'offer', offer }));
    } catch (err) {
      console.error('Error creating offer', err);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current) return;
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      ws.current?.send(JSON.stringify({ type: 'answer', answer }));
    } catch (err) {
      console.error('Error handling offer', err);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current) return;
    if (peerConnection.current.signalingState !== 'have-local-offer') {
      console.warn('Ignoring answer in state: ', peerConnection.current.signalingState);
      return;
    }
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer', err);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection.current) return;
    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error handling ice candidate', err);
    }
  };

  // ==========================================
  // 5. MEDIA CONTROLS (CAMERA, SCREEN, MIC)
  // ==========================================

  /**
   * Toggles the user's local camera. 
   * Acquires the hardware stream, displays local preview, and injects it into the active WebRTC tunnel.
   */
  const toggleCamera = async () => {
    if (!peerConnection.current) return;

    if (isCameraOn) {
      const senders = peerConnection.current.getSenders();
      if (localCameraStream.current) {
        localCameraStream.current.getTracks().forEach(track => {
          const sender = senders.find(s => s.track === track);
          if (sender) peerConnection.current?.removeTrack(sender);
          track.stop();
        });
        localCameraStream.current = null;
      }
      if (localCameraRef.current) localCameraRef.current.srcObject = null;
      setIsCameraOn(false);

      broadcastStreamInfo();
      createOffer();
      ws.current?.send(JSON.stringify({ type: 'stop_camera' }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        localCameraStream.current = stream;
        if (localCameraRef.current) localCameraRef.current.srcObject = stream;

        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });

        setIsCameraOn(true);
        broadcastStreamInfo();
        createOffer();
      } catch (err) {
        console.error("Error accessing camera", err);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnection.current) return;

    // If screen share isn't supported on this device, show tooltip instead
    if (!screenShareSupported && !isScreenSharing) {
      setScreenShareTooltip(true);
      setTimeout(() => setScreenShareTooltip(false), 3000);
      return;
    }

    if (isScreenSharing) {
      const senders = peerConnection.current.getSenders();
      if (localScreenStream.current) {
        localScreenStream.current.getTracks().forEach(track => {
          const sender = senders.find(s => s.track === track);
          if (sender) peerConnection.current?.removeTrack(sender);
          track.stop();
        });
        localScreenStream.current = null;
      }
      setIsScreenSharing(false);
      setIsRemoteScreenSharing(false);
      if (remoteVideoRef.current?.srcObject === localScreenStream.current) {
        remoteVideoRef.current.srcObject = null;
      }

      broadcastStreamInfo();
      createOffer();
      ws.current?.send(JSON.stringify({ type: 'stop_screen_share' }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        // Tell the other user to stop sharing their screen so ours can take over
        ws.current?.send(JSON.stringify({ type: 'force_stop_screen_share' }));

        stream.getVideoTracks()[0].onended = () => {
          if (isScreenSharing) toggleScreenShare();
        };

        localScreenStream.current = stream;

        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });

        setIsScreenSharing(true);
        setIsRemoteScreenSharing(true);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }

        broadcastStreamInfo();
        createOffer();
      } catch (err) {
        console.error('Error sharing screen:', err);
        // On mobile, getDisplayMedia can throw even if "supported" — show helpful message
        const msg = (err as Error)?.message || '';
        if (msg.includes('denied') || msg.includes('NotAllowedError')) {
          setMessages(prev => [...prev, { sender: 'System', text: 'Screen sharing permission was denied.' }]);
        } else {
          setMessages(prev => [...prev, { sender: 'System', text: 'Screen sharing is not available on this browser. Try using a desktop browser.' }]);
        }
      }
    }
  };

  const toggleMute = async () => {
    if (!peerConnection.current) return;

    if (isMuted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioInputId ? { deviceId: { exact: audioInputId } } : true
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices);
        localAudioStream.current = stream;

        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });

        setIsMuted(false);
        createOffer();
      } catch (err) {
        console.error("Error accessing mic:", err);
      }
    } else {
      if (localAudioStream.current) {
        const senders = peerConnection.current.getSenders();
        localAudioStream.current.getTracks().forEach(track => {
          const sender = senders.find(s => s.track === track);
          if (sender) peerConnection.current?.removeTrack(sender);
          track.stop();
        });
        localAudioStream.current = null;
      }
      setIsMuted(true);
      createOffer();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordingAudioCtxRef.current?.state !== 'closed') {
        recordingAudioCtxRef.current?.close();
      }
      recordingAudioCtxRef.current = null;
      recordingDestRef.current = null;
      micSourceNodeRef.current = null;
    } else {
      try {
        let stream: MediaStream;
        let isMobileRecording = false;

        if (screenShareSupported) {
          // Desktop: capture the screen/tab for full-session recording
          // @ts-ignore
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true });
        } else {
          // Mobile fallback: record camera feed (or blank video) + audio
          isMobileRecording = true;
          setMessages(prev => [...prev, { sender: 'System', text: '📱 Recording on mobile — capturing camera and audio only.' }]);

          if (localCameraStream.current && localCameraStream.current.getVideoTracks().length > 0) {
            // Clone the existing camera stream for recording
            stream = localCameraStream.current.clone();
          } else {
            // No camera active — get a camera stream just for recording
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            } catch {
              // If no camera at all, create audio-only recording
              stream = new MediaStream();
              setMessages(prev => [...prev, { sender: 'System', text: 'No camera available — recording audio only.' }]);
            }
          }
        }
        
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        recordingAudioCtxRef.current = audioCtx;
        recordingDestRef.current = dest;

        // Mix display audio if the browser provides it (tab audio capture — desktop only)
        if (!isMobileRecording) {
          const displayAudioTracks = stream.getAudioTracks();
          if (displayAudioTracks.length > 0) {
            audioCtx.createMediaStreamSource(new MediaStream([displayAudioTracks[0]])).connect(dest);
          }
        }

        // Always mix remote audio from WebRTC peer (other participants)
        if (remoteAudioStream.current && remoteAudioStream.current.getAudioTracks().length > 0) {
          const remoteSource = audioCtx.createMediaStreamSource(remoteAudioStream.current);
          remoteSource.connect(dest);
          remoteSourceNodeRef.current = remoteSource;
        }

        // Mix local mic if currently unmuted
        if (!isMuted && localAudioStream.current && localAudioStream.current.getAudioTracks().length > 0) {
          const micSource = audioCtx.createMediaStreamSource(localAudioStream.current);
          micSource.connect(dest);
          micSourceNodeRef.current = micSource;
        }

        const videoTracks = stream.getVideoTracks();
        const combinedStream = new MediaStream([
          ...videoTracks,
          ...dest.stream.getAudioTracks()
        ]);

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(combinedStream);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quicksync-recording-${new Date().getTime()}.webm`;
          a.click();
          stream.getTracks().forEach(t => t.stop());
          if (audioCtx.state !== 'closed') { audioCtx.close(); }
        };

        if (videoTracks.length > 0) {
          videoTracks[0].onended = () => {
            if (mediaRecorderRef.current?.state !== 'inactive') {
              mediaRecorderRef.current?.stop();
              setIsRecording(false);
              if (recordingAudioCtxRef.current?.state !== 'closed') {
                recordingAudioCtxRef.current?.close();
              }
            }
          };
        }

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Recording failed", err);
        setMessages(prev => [...prev, { sender: 'System', text: 'Recording failed. Your browser may not support this feature.' }]);
      }
    }
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !ws.current) return;

    const messageObj = { type: 'chat', sender: username, text: chatInput };
    ws.current.send(JSON.stringify(messageObj));
    setMessages(prev => [...prev, messageObj]);
    setChatInput('');
  };

  const leaveChannel = () => {
    // Mark as intentional so onclose won't trigger reconnect
    intentionalDisconnect.current = true;
    // Cancel any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsReconnecting(false);
    setReconnectAttempt(0);
    reconnectAttemptRef.current = 0;
    cleanup();
    setIsJoined(false);
    setMessages([]);
    setError('');
    router.push('/dashboard');
  };

  /** Stops all local media tracks (camera, mic, screen). Used on intentional leave. */
  const cleanupLocalMedia = () => {
    if (localScreenStream.current) {
      localScreenStream.current.getTracks().forEach(t => t.stop());
      localScreenStream.current = null;
    }
    if (localCameraStream.current) {
      localCameraStream.current.getTracks().forEach(t => t.stop());
      localCameraStream.current = null;
    }
    if (localAudioStream.current) {
      localAudioStream.current.getTracks().forEach(t => t.stop());
      localAudioStream.current = null;
    }
    if (remoteAudioStream.current) {
      remoteAudioStream.current.getTracks().forEach(t => t.stop());
      remoteAudioStream.current = null;
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsScreenSharing(false);
    setIsRemoteScreenSharing(false);
    setIsCameraOn(false);
    setIsRemoteCameraOn(false);
    setIsRecording(false);
    setIsMuted(true);
  };

  /** Full cleanup: closes WS, peer connection, AND local media. */
  const cleanup = () => {
    intentionalDisconnect.current = true;
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    cleanupLocalMedia();
  };

  // ==========================================
  // 7. RENDER: MEETING NOT FOUND
  // ==========================================
  if (meetingValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-transition" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="text-center">
          <MonitorOff size={48} className="mx-auto mb-4" style={{ color: 'var(--fg-ghost)' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Meeting Not Found</h2>
          <p className="mb-6" style={{ color: 'var(--fg-muted)' }}>This meeting may have ended or the link is invalid.</p>
          <button onClick={() => router.push('/auth')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors">Go Home</button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 7b. RENDER: JOIN PROMPT
  // ==========================================
  if (!isJoined) {
    // Show spinner while validating meeting, loading auth, or auto-connecting
    if (meetingValid === null || authLoading || (isConnecting && !error)) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg)' }}>
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {authLoading ? 'Checking your account...' : isConnecting ? 'Joining meeting...' : 'Validating meeting...'}
          </p>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center px-4 font-sans theme-transition" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="w-full max-w-md p-8 rounded-3xl backdrop-blur-xl shadow-xl theme-transition" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg"><MonitorUp size={24} className="text-white" /></div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{meetingTitle}</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-faint)' }}>ID: {meetingId.slice(0, 8)}...</p>
          </div>
          {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User size={18} style={{ color: 'var(--fg-faint)' }} /></div>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && connectWebSocket()} className="w-full rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-all theme-transition" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }} placeholder="Enter your name" />
          </div>
          <button disabled={isConnecting} onClick={() => connectWebSocket()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            {isConnecting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>Join Meeting</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 8. RENDER: MAIN MEETING ROOM
  // ==========================================
  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden theme-transition" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Reconnecting Banner */}
      {isReconnecting && (
        <div
          className="shrink-0 flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium animate-pulse"
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.20) 50%, rgba(245, 158, 11, 0.12) 100%)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#f59e0b',
          }}
        >
          <RefreshCw size={16} className="animate-spin" style={{ animationDuration: '1.5s' }} />
          <span>
            Trying to get you back in the meeting…
            <span className="ml-1.5 text-xs opacity-70">(attempt {reconnectAttempt}/{MAX_RECONNECT_ATTEMPTS})</span>
          </span>
        </div>
      )}
      {/* Header */}
      {!isFullscreen && (
        <header className="h-14 sm:h-16 backdrop-blur flex items-center justify-between px-3 sm:px-6 shrink-0 theme-transition" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <MonitorUp size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight" style={{ color: 'var(--fg)' }}>QuickSync</h1>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{meetingTitle} <span style={{ color: 'var(--fg-faint)' }}>({meetingId.slice(0, 8)})</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href.split('?')[0]);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium border transition-all duration-200 ${linkCopied
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'hover:opacity-80'
                }`}
              style={linkCopied ? {} : { background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
            >
              {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
              <span className="hidden sm:inline">{linkCopied ? 'Copied!' : 'Copy Meeting Link'}</span>
              <span className="sm:hidden">{linkCopied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={leaveChannel}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-xs sm:text-sm font-medium border border-red-500/20"
            >
              <PhoneOff size={14} />
              Leave
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Screen Share Area */}
        <div className={isFullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : 'flex-1 flex flex-col relative p-2 sm:p-4'}>
          <div className={`flex-1 overflow-hidden relative flex items-center justify-center shadow-2xl transition-[border-radius,border-color,box-shadow] duration-300 ${isFullscreen ? 'rounded-none border-none' : 'rounded-2xl'}`} style={{ background: 'var(--bg-subtle)', border: isFullscreen ? 'none' : '1px solid var(--border)' }}>

            {/* Top Close Button (Fullscreen only) */}
            {isFullscreen && (
              <div className="absolute top-0 left-0 right-0 h-32 flex items-start justify-center pt-6 opacity-0 hover:opacity-100 transition-opacity duration-300 z-50 bg-gradient-to-b from-black/80 to-transparent">
                <button
                  onClick={toggleFullscreen}
                  className="bg-red-500/80 hover:bg-red-500 p-3 rounded-full text-white backdrop-blur shadow-2xl transition-all transform hover:scale-110"
                  title="Exit Fullscreen"
                >
                  <X size={28} />
                </button>
              </div>
            )}

            {/* Main Screen Share Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full bg-black ${isFullscreen ? 'object-cover' : 'object-contain'}`}
              style={{ display: (isRemoteScreenSharing || isScreenSharing) ? 'block' : 'none' }}
            />

            {/* Remote Camera */}
            <video
              ref={remoteCameraRef}
              autoPlay
              playsInline
              className={(isRemoteScreenSharing || isScreenSharing) ?
                "absolute top-2 left-2 sm:top-4 sm:left-4 w-24 h-16 sm:w-48 sm:h-32 rounded-lg sm:rounded-xl object-cover border-2 border-zinc-700 shadow-xl z-20 bg-zinc-800"
                : `w-full h-full bg-black ${isFullscreen ? 'object-cover' : 'object-contain'}`
              }
              style={{ display: isRemoteCameraOn ? 'block' : 'none' }}
            />

            {/* Local Camera PiP */}
            <video
              ref={localCameraRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-24 h-16 sm:w-48 sm:h-32 rounded-lg sm:rounded-xl object-cover border-2 border-indigo-500 shadow-xl z-20 bg-zinc-800 transform scale-x-[-1]"
              style={{ display: isCameraOn ? 'block' : 'none' }}
            />

            {/* Placeholder if nothing */}
            {(!isRemoteScreenSharing && !isScreenSharing && !isRemoteCameraOn && !isCameraOn) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10 pointer-events-none" style={{ background: 'var(--bg-subtle)' }}>
                <MonitorOff size={48} className="mb-4" style={{ color: 'var(--fg-ghost)' }} />
                <p className="font-medium" style={{ color: 'var(--fg-muted)' }}>Waiting for video or screen share...</p>
              </div>
            )}

            {/* Dedicated Remote Audio Player */}
            <audio ref={remoteAudioRef} autoPlay playsInline />

            {/* Recording Indicator Overlay */}
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 border border-red-500/50 text-red-500 px-3 py-1.5 rounded-full z-30 shadow-lg animate-pulse">
                <CircleDot size={16} />
                <span className="text-xs font-semibold tracking-wider uppercase">Recording</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className={`h-14 sm:h-16 flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 shrink-0 shadow-lg transition-[opacity,background-color,border-color,transform] duration-300 theme-transition ${isFullscreen ? 'absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-700/50 z-50 opacity-0 hover:opacity-100' : 'mt-2 sm:mt-4 rounded-xl sm:rounded-2xl'}`} style={isFullscreen ? {} : { background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="relative" ref={usersMenuRef}>
              {showUsersModal && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 rounded-xl shadow-2xl p-3 z-50"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
                      Participants ({activeUsers.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {activeUsers.length === 0 ? (
                      <p className="text-xs text-center py-3" style={{ color: 'var(--fg-faint)' }}>No participants</p>
                    ) : (
                      activeUsers.map((u, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                            {u.substring(0, 2)}
                          </div>
                          <span className="text-xs font-medium truncate" style={{ color: 'var(--fg)' }}>
                            {u} {u === username && <span className="text-[10px] font-normal" style={{ color: 'var(--fg-faint)' }}>(You)</span>}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowUsersModal(!showUsersModal)}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
                title="Participants"
              >
                <User size={18} />
              </button>
            </div>

            <div className="relative" ref={audioMenuRef}>
              {/* Audio device popover */}
              {showAudioMenu && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 rounded-xl shadow-2xl p-3 space-y-3 z-50"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fg-faint)' }}>Microphone</label>
                    <select
                      value={audioInputId}
                      onChange={e => setAudioInputId(e.target.value)}
                      aria-label="Microphone"
                      className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
                    >
                      <option value="">Default Microphone</option>
                      {audioDevices.filter(d => d.kind === 'audioinput').map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic (${d.deviceId.substring(0, 5)})`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fg-faint)' }}>Speaker</label>
                    <select
                      value={audioOutputId}
                      onChange={e => setAudioOutputId(e.target.value)}
                      aria-label="Speaker"
                      className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg)' }}
                    >
                      <option value="">Default Speaker</option>
                      {audioDevices.filter(d => d.kind === 'audiooutput').map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker (${d.deviceId.substring(0, 5)})`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Split button: Mute | Device picker */}
              <div className="flex items-center">
                <button
                  onClick={toggleMute}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-l-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'hover:opacity-80'}`}
                  style={isMuted ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    if (audioDevices.some(d => !d.label)) {
                      navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(s => { s.getTracks().forEach(t => t.stop()); navigator.mediaDevices.enumerateDevices().then(setAudioDevices); })
                        .catch(console.error);
                    }
                  }}
                  className={`w-6 sm:w-7 h-10 sm:h-12 rounded-r-full flex items-center justify-center transition-all border-l-0 ${isMuted ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'hover:opacity-80'}`}
                  style={isMuted ? { borderLeft: '1px solid rgba(239,68,68,0.15)' } : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)', borderLeft: '1px solid var(--border)' }}
                  title="Audio settings"
                >
                  <ChevronUp size={13} />
                </button>
              </div>
            </div>
            <button
              onClick={toggleCamera}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${isCameraOn ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'hover:opacity-80'}`}
              style={isCameraOn ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              title={isCameraOn ? "Stop Camera" : "Start Camera"}
            >
              {isCameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
            </button>
            <div className="relative">
              {screenShareTooltip && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 sm:w-64 rounded-xl shadow-2xl p-3 z-50 text-center"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--fg)' }}>Screen sharing is not available</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--fg-faint)' }}>Your mobile browser doesn't support screen sharing. Use a desktop browser for this feature.</p>
                </div>
              )}
              <button
                title={!screenShareSupported ? 'Screen sharing not available on this device' : isScreenSharing ? 'Stop Screen Share' : 'Share Your Screen'}
                onClick={toggleScreenShare}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-medium transition-all ${isScreenSharing ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'hover:opacity-80'} ${!screenShareSupported ? 'opacity-50' : ''}`}
                style={isScreenSharing ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              >
                {!screenShareSupported ? <MonitorOff size={18} /> : <MonitorUp size={18} />}
              </button>
            </div>
            <button
              onClick={toggleRecording}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-medium transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'hover:opacity-80'}`}
              style={isRecording ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              title={isRecording ? "Stop Recording" : "Record Session"}
            >
              {isRecording ? <Square size={16} fill="currentColor" /> : <CircleDot size={18} className="text-red-400" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
        {/* Floating Chat Toggle */}
        {!isChatVisible && !isFullscreen && (
          <button
            onClick={() => setIsChatVisible(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 py-4 px-2 rounded-l-xl hover:text-indigo-400 transition-all shadow-2xl flex flex-col items-center gap-2 theme-transition"
            style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', color: 'var(--fg-muted)' }}
            title="Show Chat"
          >
            <MessageSquare size={18} />
            <div className="[writing-mode:vertical-lr] text-[10px] font-bold uppercase tracking-widest">Chat</div>
          </button>
        )}

        {/* Chat Sidebar */}
        <ChatSidebar
          isChatVisible={isChatVisible}
          setIsChatVisible={setIsChatVisible}
          isFullscreen={isFullscreen}
          messages={messages}
          username={username}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendChatMessage={sendChatMessage}
          chatContainerRef={chatContainerRef}
        />
      </div>
    </div>
  );
}
