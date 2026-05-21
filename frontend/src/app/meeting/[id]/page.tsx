"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Mic, MicOff, MonitorUp, MonitorOff, PhoneOff, User, MessageSquare, Maximize, Minimize, Camera, CameraOff, CircleDot, Square, X, Loader2, ArrowRight, Link2, Check, ChevronUp } from 'lucide-react';
import { ParticipantsModal } from '../../../components/ParticipantsModal';
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
  const [isChatVisible, setIsChatVisible] = useState(true);
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
  const audioMenuRef = useRef<HTMLDivElement>(null);

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
  const connectWebSocket = (autoJoinName?: string) => {
    if (ws.current) return;

    const finalName = autoJoinName || username;
    if (!finalName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsConnecting(true);

    const baseUrl = getWsUrl();
    const wsUrl = `${baseUrl}/ws/${meetingId}?username=${encodeURIComponent(finalName.trim())}`;
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      setIsJoined(true);
      setIsConnecting(false);
      setError('');
      setupWebRTC();
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'error') {
        setError(data.message);
        setIsConnecting(false);
        socket.close();
      } else if (data.type === 'users_list') {
        setActiveUsers(data.users);
      } else if (data.type === 'chat') {
        setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
      } else if (data.type === 'stream_info') {
        remoteStreamIds.current = { camera: data.camera, screen: data.screen };
      } else if (data.type === 'user_joined') {
        broadcastStreamInfo();
        createOffer();
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
      setError('Connection failed. Please check your secret key and try again.');
      setIsConnecting(false);
    };

    socket.onclose = () => {
      setIsJoined(false);
      setIsConnecting(false);
      cleanup();
    };
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

  const createOffer = async () => {
    if (!peerConnection.current) return;
    try {
      const offer = await peerConnection.current.createOffer();
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
        // Ask user to capture the current tab/screen to record the whole session (videos + chat)
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true });
        
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        recordingAudioCtxRef.current = audioCtx;
        recordingDestRef.current = dest;

        // Mix display audio if the browser provides it (tab audio capture)
        const displayAudioTracks = stream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
          audioCtx.createMediaStreamSource(new MediaStream([displayAudioTracks[0]])).connect(dest);
        }

        // Always mix remote audio from WebRTC peer (other participants)
        if (remoteAudioStream.current && remoteAudioStream.current.getAudioTracks().length > 0) {
          audioCtx.createMediaStreamSource(remoteAudioStream.current).connect(dest);
        }

        // Mix local mic if currently unmuted
        if (!isMuted && localAudioStream.current && localAudioStream.current.getAudioTracks().length > 0) {
          const micSource = audioCtx.createMediaStreamSource(localAudioStream.current);
          micSource.connect(dest);
          micSourceNodeRef.current = micSource;
        }

        const combinedStream = new MediaStream([
          ...stream.getVideoTracks(),
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

        stream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            if (recordingAudioCtxRef.current?.state !== 'closed') {
              recordingAudioCtxRef.current?.close();
            }
          }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Recording failed", err);
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
    cleanup();
    setIsJoined(false);
    setMessages([]);
    setError('');
    router.push('/dashboard');
  };

  const cleanup = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
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
      <div className="min-h-screen flex items-center justify-center font-sans theme-transition" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
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
      {/* Header */}
      {!isFullscreen && (
        <header className="h-16 backdrop-blur flex items-center justify-between px-6 shrink-0 theme-transition" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-all duration-200 ${linkCopied
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'hover:opacity-80'
                }`}
              style={linkCopied ? {} : { background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--fg-muted)' }}
            >
              {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
              {linkCopied ? 'Copied!' : 'Copy Meeting Link'}
            </button>
            <button
              onClick={leaveChannel}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/20"
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
        <div className={isFullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : 'flex-1 flex flex-col relative transition-all duration-300 p-4'}>
          <div className={`flex-1 overflow-hidden relative flex items-center justify-center shadow-2xl transition-all duration-300 ${isFullscreen ? 'rounded-none border-none' : 'rounded-2xl'}`} style={{ background: 'var(--bg-subtle)', border: isFullscreen ? 'none' : '1px solid var(--border)' }}>

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
                "absolute top-4 left-4 w-48 h-32 rounded-xl object-cover border-2 border-zinc-700 shadow-xl z-20 bg-zinc-800"
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
              className="absolute bottom-4 right-4 w-48 h-32 rounded-xl object-cover border-2 border-indigo-500 shadow-xl z-20 bg-zinc-800 transform scale-x-[-1]"
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
          <div className={`h-16 flex items-center justify-center gap-4 px-6 shrink-0 shadow-lg transition-all duration-300 theme-transition ${isFullscreen ? 'absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-700/50 z-50 opacity-0 hover:opacity-100' : 'mt-4 rounded-2xl'}`} style={isFullscreen ? {} : { background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowUsersModal(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              title="Participants"
            >
              <User size={20} />
            </button>

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
                  className={`w-12 h-12 rounded-l-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'hover:opacity-80'}`}
                  style={isMuted ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
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
                  className={`w-7 h-12 rounded-r-full flex items-center justify-center transition-all border-l-0 ${isMuted ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'hover:opacity-80'}`}
                  style={isMuted ? { borderLeft: '1px solid rgba(239,68,68,0.15)' } : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)', borderLeft: '1px solid var(--border)' }}
                  title="Audio settings"
                >
                  <ChevronUp size={13} />
                </button>
              </div>
            </div>
            <button
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCameraOn ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'hover:opacity-80'}`}
              style={isCameraOn ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              title={isCameraOn ? "Stop Camera" : "Start Camera"}
            >
              {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
            </button>
            <button
              onClick={toggleScreenShare}
              className={`px-6 h-12 rounded-full flex items-center gap-2 font-medium transition-all ${isScreenSharing ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'hover:opacity-80'}`}
              style={isScreenSharing ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
            >
              <MonitorUp size={20} />
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </button>
            <button
              onClick={toggleRecording}
              className={`px-6 h-12 rounded-full flex items-center gap-2 font-medium transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'hover:opacity-80'}`}
              style={isRecording ? {} : { background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              title={isRecording ? "Stop Recording" : "Record Session"}
            >
              {isRecording ? <Square size={16} fill="currentColor" /> : <CircleDot size={18} className="text-red-400" />}
              {isRecording ? 'Stop Rec' : 'Record'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--bg-input)', color: 'var(--fg-muted)', border: '1px solid var(--border-input)' }}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
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

      {/* Participants Modal */}
      <ParticipantsModal
        showUsersModal={showUsersModal}
        setShowUsersModal={setShowUsersModal}
        activeUsers={activeUsers}
        username={username}
      />
    </div>
  );
}
