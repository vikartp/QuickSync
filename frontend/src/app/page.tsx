"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MonitorUp, MonitorOff, Send, PhoneOff, User, KeyRound, Hash, MessageSquare, Maximize, Minimize, MessageSquareOff, Camera, CameraOff, CircleDot, Square } from 'lucide-react';

export default function Home() {
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

  const ws = useRef<WebSocket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  
  const localScreenStream = useRef<MediaStream | null>(null);
  const localCameraStream = useRef<MediaStream | null>(null);
  const localAudioStream = useRef<MediaStream | null>(null);
  
  const remoteVideoRef = useRef<HTMLVideoElement>(null); 
  const remoteCameraRef = useRef<HTMLVideoElement>(null); 
  const localCameraRef = useRef<HTMLVideoElement>(null); 
  
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
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  const connectWebSocket = () => {
    if (!channel || !username || !secretKey) {
      setError('Please fill in all fields');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${baseUrl}/ws/${channel}?secret_key=${encodeURIComponent(secretKey)}`;
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
      } else if (data.type === 'chat') {
        setMessages(prev => [...prev, { sender: data.sender, text: data.text }]);
      } else if (data.type === 'stream_info') {
        remoteStreamIds.current = { camera: data.camera, screen: data.screen };
      } else if (data.type === 'user_joined') {
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
         if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
             remoteVideoRef.current.srcObject = stream;
         } else if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
             const existingStream = remoteVideoRef.current.srcObject as MediaStream;
             if (!existingStream.getAudioTracks().length) {
                 existingStream.addTrack(event.track);
             }
         }
      }
    };

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
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 font-sans">
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">QuickSync</h1>
            <p className="text-zinc-400 text-sm">Join a channel to share your screen and chat instantly.</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-zinc-500" />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Channel ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash size={16} className="text-zinc-500" />
                </div>
                <input 
                  type="text" 
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="e.g. daily-standup"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Secret Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound size={16} className="text-zinc-500" />
                </div>
                <input 
                  type="password" 
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="Required for access"
                />
              </div>
            </div>

            <button 
              onClick={connectWebSocket}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98]"
            >
              Join Channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden">
      {/* Header */}
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Screen Share Area */}
        <div className="flex-1 p-4 flex flex-col relative">
          <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative flex items-center justify-center shadow-2xl">
            
            {/* Main Screen Share Video */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-contain bg-black"
              style={{ display: (isRemoteScreenSharing || isScreenSharing) ? 'block' : 'none' }}
            />
            
            {/* Remote Camera */}
            <video 
              ref={remoteCameraRef} 
              autoPlay 
              playsInline 
              className={ (isRemoteScreenSharing || isScreenSharing) ? 
                "absolute top-4 left-4 w-48 h-32 rounded-xl object-cover border-2 border-zinc-700 shadow-xl z-20 bg-zinc-800" 
                : "w-full h-full object-contain bg-black" 
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

            {/* Recording Indicator Overlay */}
            {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 border border-red-500/50 text-red-500 px-3 py-1.5 rounded-full z-30 shadow-lg animate-pulse">
                    <CircleDot size={16} />
                    <span className="text-xs font-semibold tracking-wider uppercase">Recording</span>
                </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 h-16 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center gap-4 px-6 shrink-0 shadow-lg">
             <button 
              onClick={() => setIsChatVisible(!isChatVisible)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${!isChatVisible ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
              title={isChatVisible ? "Hide Chat" : "Show Chat"}
            >
              {isChatVisible ? <MessageSquareOff size={20} /> : <MessageSquare size={20} />}
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
              onClick={toggleFullscreen}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        {isChatVisible && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0 transition-all">
            <div className="h-14 border-b border-zinc-800 flex items-center px-4 gap-2">
              <MessageSquare size={16} className="text-zinc-400" />
              <h2 className="font-semibold text-sm">Live Chat</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center px-4">
                   <p className="text-zinc-500 text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-zinc-500 mb-1 px-1">{msg.sender}</span>
                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] ${msg.sender === username ? 'bg-indigo-600 text-white rounded-tr-sm' : msg.sender === 'System' ? 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 w-full text-center italic rounded-xl' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendChatMessage} className="p-4 border-t border-zinc-800 bg-zinc-900/50">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:bg-zinc-800 transition-colors"
                >
                  <Send size={14} className={chatInput.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
