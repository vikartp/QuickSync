"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MonitorUp, MonitorOff, Send, PhoneOff, User, KeyRound, Hash, MessageSquare, Maximize, Minimize, MessageSquareOff } from 'lucide-react';

export default function Home() {
  const [isJoined, setIsJoined] = useState(false);
  const [channel, setChannel] = useState('');
  const [username, setUsername] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState('');
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
      remoteVideoRef.current?.parentElement?.requestFullscreen().catch(err => {
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
      } else if (data.type === 'user_joined') {
        // We are the initiator
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
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (peerConnection.current) {
            peerConnection.current.close();
            setupWebRTC(); // Re-initialize for next user
        }
      } else if (data.type === 'stop_screen_share') {
        setIsRemoteScreenSharing(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      if (event.track.kind === 'video') {
        setIsRemoteScreenSharing(true);
        event.track.onmute = () => {
          setIsRemoteScreenSharing(false);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        };
        event.track.onended = () => {
          setIsRemoteScreenSharing(false);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        };
      }
    };

    peerConnection.current = pc;
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

  const toggleScreenShare = async () => {
    if (!peerConnection.current) return;

    if (isScreenSharing) {
      const senders = peerConnection.current.getSenders();
      const screenSender = senders.find(s => s.track?.kind === 'video');
      if (screenSender) {
        peerConnection.current.removeTrack(screenSender);
      }
      if (localStream.current) {
        localStream.current.getVideoTracks().forEach(t => t.stop());
      }
      setIsScreenSharing(false);
      setIsRemoteScreenSharing(false);
      if (remoteVideoRef.current?.srcObject === localStream.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Need to renegotiate
      createOffer();
      ws.current?.send(JSON.stringify({ type: 'stop_screen_share' }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        stream.getVideoTracks()[0].onended = () => {
            if (isScreenSharing) toggleScreenShare(); // Stop sharing when user stops it via browser UI
        };

        if (!localStream.current) {
          localStream.current = stream;
        } else {
          stream.getTracks().forEach(t => localStream.current?.addTrack(t));
        }

        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        
        if (videoTrack) peerConnection.current.addTrack(videoTrack, localStream.current);
        if (audioTrack && !isMuted) peerConnection.current.addTrack(audioTrack, localStream.current);

        setIsScreenSharing(true);
        setIsRemoteScreenSharing(true);
        if (remoteVideoRef.current) {
           remoteVideoRef.current.srcObject = localStream.current;
        }
        
        // Renegotiate
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
              const audioTrack = stream.getAudioTracks()[0];
              
              if (localStream.current) {
                  localStream.current.addTrack(audioTrack);
              } else {
                  localStream.current = stream;
              }
              
              peerConnection.current.addTrack(audioTrack, localStream.current);
              setIsMuted(false);
              createOffer();
          } catch(err) {
              console.error("Error accessing mic:", err);
          }
      } else {
          if (localStream.current) {
              const audioTracks = localStream.current.getAudioTracks();
              audioTracks.forEach(track => {
                  track.stop();
                  if (peerConnection.current) {
                      const senders = peerConnection.current.getSenders();
                      const sender = senders.find(s => s.track === track);
                      if (sender) peerConnection.current.removeTrack(sender);
                  }
              });
          }
          setIsMuted(true);
          createOffer();
      }
  }

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
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    setIsScreenSharing(false);
    setIsRemoteScreenSharing(false);
    setIsMuted(true); // default to muted
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
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-contain bg-black"
            />
            {(!isRemoteScreenSharing) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10 pointer-events-none">
                <MonitorOff size={48} className="text-zinc-700 mb-4" />
                <p className="text-zinc-400 font-medium">Waiting for screen share...</p>
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
              onClick={toggleScreenShare}
              className={`px-6 h-12 rounded-full flex items-center gap-2 font-medium transition-all ${isScreenSharing ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
            >
              <MonitorUp size={20} />
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
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
