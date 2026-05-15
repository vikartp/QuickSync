"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MonitorUp, MonitorOff, Send, PhoneOff, User, KeyRound, Hash, MessageSquare, Maximize, Minimize, MessageSquareOff, Camera, CameraOff, CircleDot, Square, Settings, Trash2, X } from 'lucide-react';
import { LandingPage } from '../components/LandingPage';
import { ParticipantsModal } from '../components/ParticipantsModal';
import { SettingsModal } from '../components/SettingsModal';
import { ChatSidebar } from '../components/ChatSidebar';

export default function Home() {
  // ==========================================
  // 1. APPLICATION STATE
  // ==========================================
  
  // Connection & User State
  const [isJoined, setIsJoined] = useState(false);
  const [channel, setChannel] = useState('');
  const [username, setUsername] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
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
  const [showSettings, setShowSettings] = useState(false);
  const [audioInputId, setAudioInputId] = useState<string>('');
  const [audioOutputId, setAudioOutputId] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSessions, setAdminSessions] = useState<Record<string, string[]>>({});
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [showUsersModal, setShowUsersModal] = useState(false);

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

  const remoteStreamIds = useRef<{ camera?: string, screen?: string }>({});

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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

  useEffect(() => {
    const savedUsername = localStorage.getItem('quicksync_username');
    const savedChannel = localStorage.getItem('quicksync_channel');
    const savedSecretKey = localStorage.getItem('quicksync_secretKey');
    const savedIsAdmin = localStorage.getItem('isAdmin');
    
    if (savedUsername) setUsername(savedUsername);
    if (savedChannel) setChannel(savedChannel);
    if (savedSecretKey) setSecretKey(savedSecretKey);
    if (savedIsAdmin === 'true') setIsAdmin(true);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const fetchAdminSessions = async () => {
      try {
          const baseUrl = process.env.NEXT_PUBLIC_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8000';
          const res = await fetch(`${baseUrl}/admin/sessions?secret_key=${encodeURIComponent(secretKey)}`);
          if (res.ok) {
              const data = await res.json();
              setAdminSessions(data.sessions);
          }
      } catch (err) {
          console.error("Failed to fetch admin sessions", err);
      }
  };

  useEffect(() => {
      if (isAdmin && showSettings) {
          fetchAdminSessions();
          const int = setInterval(fetchAdminSessions, 5000);
          return () => clearInterval(int);
      }
  }, [isAdmin, showSettings, secretKey]);

  // ==========================================
  // 3. CORE NETWORKING (WEBSOCKET & SIGNALING)
  // ==========================================
  
  /**
   * Initializes the WebSocket connection and sets up signaling listeners.
   * This is the gateway to entering a channel and discovering peers.
   */
  const connectWebSocket = () => {
    if (!channel || !username || !secretKey) {
      setError('Please fill in all fields');
      return;
    }

    localStorage.setItem('quicksync_username', username);
    localStorage.setItem('quicksync_channel', channel);
    localStorage.setItem('quicksync_secretKey', secretKey);

    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${baseUrl}/ws/${channel}?secret_key=${encodeURIComponent(secretKey)}&username=${encodeURIComponent(username)}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsJoined(true);
      setError('');
      ws.current = socket;
      setupWebRTC();
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'error') {
        setError(data.message);
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
    };

    socket.onclose = () => {
      setIsJoined(false);
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
          } catch(err) {
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
      } else {
          try {
              // Ask user to capture the current tab/screen to record the whole session (videos + chat)
              // @ts-ignore
              const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true, preferCurrentTab: true });
              recordedChunksRef.current = [];
              const recorder = new MediaRecorder(stream);
              
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
              };
              
              stream.getVideoTracks()[0].onended = () => {
                  if (mediaRecorderRef.current?.state !== 'inactive') {
                      mediaRecorderRef.current?.stop();
                      setIsRecording(false);
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
    setChannel('');
    setSecretKey('');
    setMessages([]);
    setError('');
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
  // 7. RENDER: LANDING PAGE
  // ==========================================
  if (!isJoined) {
    return (
      <LandingPage 
        username={username} setUsername={setUsername}
        channel={channel} setChannel={setChannel}
        secretKey={secretKey} setSecretKey={setSecretKey}
        error={error} connectWebSocket={connectWebSocket}
      />
    );
  }

  // ==========================================
  // 8. RENDER: MAIN MEETING ROOM
  // ==========================================
  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      {!isFullscreen && (
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <MonitorUp size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight">QuickSync</h1>
            <p className="text-xs text-zinc-400">Channel: <span className="text-indigo-400">#{channel}</span></p>
          </div>
        </div>
        <button 
          onClick={leaveChannel}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/20"
        >
          <PhoneOff size={14} />
          Leave
        </button>
      </header>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Screen Share Area */}
        <div className={isFullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : 'flex-1 flex flex-col relative transition-all duration-300 p-4'}>
          <div className={`flex-1 bg-zinc-900 overflow-hidden relative flex items-center justify-center shadow-2xl transition-all duration-300 ${isFullscreen ? 'rounded-none border-none' : 'rounded-2xl border border-zinc-800'}`}>
            
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
              className={ (isRemoteScreenSharing || isScreenSharing) ? 
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10 pointer-events-none">
                <MonitorOff size={48} className="text-zinc-700 mb-4" />
                <p className="text-zinc-400 font-medium">Waiting for video or screen share...</p>
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
          <div className={`h-16 flex items-center justify-center gap-4 px-6 shrink-0 shadow-lg transition-all duration-300 ${isFullscreen ? 'absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-700/50 z-50 opacity-0 hover:opacity-100' : 'mt-4 bg-zinc-900 rounded-2xl border border-zinc-800'}`}>
             <button 
              onClick={() => setShowUsersModal(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              title="Participants"
            >
              <User size={20} />
            </button>

             <button 
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button 
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCameraOn ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
              title={isCameraOn ? "Stop Camera" : "Start Camera"}
            >
              {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
            </button>
            <button 
              onClick={toggleScreenShare}
              className={`px-6 h-12 rounded-full flex items-center gap-2 font-medium transition-all ${isScreenSharing ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
            >
              <MonitorUp size={20} />
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </button>
            <button 
              onClick={toggleRecording}
              className={`px-6 h-12 rounded-full flex items-center gap-2 font-medium transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
              title={isRecording ? "Stop Recording" : "Record Session"}
            >
              {isRecording ? <Square size={16} fill="currentColor" /> : <CircleDot size={18} className="text-red-400" />}
              {isRecording ? 'Stop Rec' : 'Record'}
            </button>
            <button 
              onClick={() => {
                  setShowSettings(true);
                  if (audioDevices.some(d => !d.label)) {
                      navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(s => { s.getTracks().forEach(t => t.stop()); navigator.mediaDevices.enumerateDevices().then(setAudioDevices); })
                        .catch(console.error);
                  }
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={toggleFullscreen}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
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
            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-zinc-900 border-l border-y border-zinc-800 py-4 px-2 rounded-l-xl text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-all shadow-2xl flex flex-col items-center gap-2"
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
      <SettingsModal 
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        audioInputId={audioInputId}
        setAudioInputId={setAudioInputId}
        audioOutputId={audioOutputId}
        setAudioOutputId={setAudioOutputId}
        audioDevices={audioDevices}
        isAdmin={isAdmin}
        adminSessions={adminSessions}
        secretKey={secretKey}
        fetchAdminSessions={fetchAdminSessions}
      />

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
