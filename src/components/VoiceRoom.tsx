import React, { useEffect, useRef, useState } from "react";
import { Channel, User, VoiceState } from "../types";
import { Mic, MicOff, Headphones, Video, VideoOff, Monitor, PhoneOff, Disc, Volume2, ShieldCheck, Activity, Brain } from "lucide-react";

interface VoiceRoomProps {
  currentUser: User;
  activeChannel: Channel;
  voiceStates: VoiceState[];
  onDisconnect: () => void;
  onUpdateState: (fields: Partial<VoiceState>) => void;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMic: () => void;
  onToggleDeafen: () => void;
}

export default function VoiceRoom({
  currentUser,
  activeChannel,
  voiceStates,
  onDisconnect,
  onUpdateState,
  isMuted,
  isDeafened,
  onToggleMic,
  onToggleDeafen
}: VoiceRoomProps) {
  const [cameraOn, setCameraOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Simulated RTC stats
  const [bitrate, setBitrate] = useState(128);
  const [packetLoss, setPacketLoss] = useState(0.0);

  // Active speakers simulator (periodically changes outline to show real-time activity)
  const [activeSpeakers, setActiveSpeakers] = useState<{ [uid: string]: boolean }>({});

  useEffect(() => {
    // Speaker simulation loop
    const interval = setInterval(() => {
      const active: { [uid: string]: boolean } = {};
      voiceStates.forEach(vs => {
        if (!vs.isMuted) {
          // 40% chance of speaking if not muted
          active[vs.userId] = Math.random() > 0.6;
        }
      });
      // Always speak occasionally if we are unmuted
      if (!isMuted) {
        active[currentUser.id] = Math.random() > 0.5;
      }
      setActiveSpeakers(active);

      // Random jitter for WebRTC stats
      setBitrate(Math.floor(124 + Math.random() * 12));
      setPacketLoss(Number((Math.random() * 0.05).toFixed(2)));
    }, 1200);

    return () => clearInterval(interval);
  }, [voiceStates, isMuted, currentUser.id]);

  // Audio wave canvas animator loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isVoiceActive = !isMuted && !isDeafened;
      
      // Paint dark slate canvas base
      ctx.fillStyle = "rgba(18, 18, 18, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render sinusoidal grid lines
      ctx.lineWidth = 1.8;
      
      // Multiple overlapping running waves
      const wavesCount = 4;
      for (let w = 0; w < wavesCount; w++) {
        ctx.beginPath();
        const amplitude = isVoiceActive ? (35 - w * 6) * (Math.sin(phase * 1.5) * 0.3 + 0.8) : 2.5;
        const colorFactor = 255 - w * 40;
        
        ctx.strokeStyle = `rgba(255, 59, 48, ${0.15 + (w * 0.06)})`;
        if (w === wavesCount - 1) {
          ctx.strokeStyle = "rgba(255, 59, 48, 0.65)"; // Highlight top frequency
        }

        for (let x = 0; x < canvas.width; x++) {
          const deg = (x / canvas.width) * Math.PI * 4.5 + phase + (w * (Math.PI / 3));
          const y = (canvas.height / 2) + Math.sin(deg) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      phase += isVoiceActive ? 0.095 : 0.015;
      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [isMuted, isDeafened]);

  const toggleCamera = () => {
    const nextState = !cameraOn;
    setCameraOn(nextState);
    onUpdateState({ isCameraOn: nextState });
  };

  const toggleScreen = () => {
    const nextState = !screenShareOn;
    setScreenShareOn(nextState);
    onUpdateState({ isScreenSharing: nextState });
  };

  return (
    <div id="redcoad-voice-room" className="flex-1 bg-zinc-950 flex flex-col items-stretch overflow-hidden relative">
      
      {/* Top action/info bar */}
      <div className="h-14 border-b border-zinc-900 bg-zinc-900/40 px-6 flex items-center justify-between z-10 select-none">
        <div className="flex items-center space-x-2 text-left">
          <div className="p-1.5 bg-red-650/15 rounded text-red-500">
            <Volume2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold truncate tracking-wide">{activeChannel.name}</h3>
            <span className="text-[10px] text-zinc-500 font-mono">Simulated WebRTC Signal Endpoint • {voiceStates.length + 1} active connections</span>
          </div>
        </div>

        {/* Real-time stats pills */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-zinc-900/80 border border-zinc-850 px-2.5 py-1 rounded">
            <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
            <span className="text-zinc-400">Jitter: 3ms</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-zinc-900/80 border border-zinc-850 px-2.5 py-1 rounded">
            <span className="text-zinc-400">Packet Loss: {packetLoss}%</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-zinc-900/80 border border-zinc-850 px-2.5 py-1 rounded">
            <span className="text-red-500 font-bold">{bitrate} kbps</span>
          </div>
        </div>
      </div>

      {/* Main Grid containing Video grids & Canvas dynamic signal wave */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
        
        {/* Waveform Dynamic Signal Window */}
        <div className="relative h-28 bg-zinc-900 border border-zinc-900/60 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-center select-none grow-0 shrink-0">
          <canvas
            ref={canvasRef}
            width={700}
            height={110}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          <div className="absolute top-3 left-4 flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[10px] text-zinc-450 font-mono uppercase tracking-wide">REDCOAD Synced Audio Waveform</span>
          </div>

          <div className="absolute right-4 text-zinc-500 text-[10px] font-mono flex items-center space-x-2 bg-zinc-950/80 border border-zinc-855 px-2 py-1 rounded">
            {noiseSuppression ? (
              <>
                <Brain className="h-3.5 w-3.5 text-red-500/80 mr-0.5" />
                <span>AI noise suppression: Active</span>
              </>
            ) : (
              <span>Noise reduction: Off</span>
            )}
          </div>
        </div>

        {/* Voice Room Connected grid */}
        <div id="webrtc-participants-grid" className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[300px]">
          {/* User's own card */}
          <div
            id="part-card-me"
            className={`bg-zinc-900/60 border rounded-xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
              activeSpeakers[currentUser.id] 
                ? "border-red-500 shadow-md shadow-red-500/10 scale-102" 
                : "border-zinc-850"
            }`}
          >
            {/* Camera feed overlay */}
            {cameraOn ? (
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/80 via-zinc-900 to-zinc-950/80 flex flex-col items-center justify-center p-3 text-center border-2 border-emerald-500/20">
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-10 w-10 border border-emerald-400/40 rounded-full flex items-center justify-center text-emerald-400 animate-spin">
                    <Brain className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase bg-emerald-950 px-2 py-0.5 rounded">Me • Camera Feed live</span>
                </div>
              </div>
            ) : null}

            {/* Top row */}
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Core Agent</span>
              <div className="flex items-center space-x-1">
                {isMuted && <MicOff className="h-3.5 w-3.5 text-red-500" />}
                {cameraOn && <Video className="h-3.5 w-3.5 text-emerald-500" />}
                {screenShareOn && <Monitor className="h-3.5 w-3.5 text-sky-400" />}
              </div>
            </div>

            {/* Center Avatar initials */}
            <div className="flex items-center justify-center py-6 z-10 select-none">
              <div className={`h-22 w-22 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-lg relative ${currentUser.avatarColor}`}>
                {currentUser.avatarUrl ? currentUser.avatarUrl : currentUser.displayName.substring(0, 2).toUpperCase()}
                {activeSpeakers[currentUser.id] && (
                  <span className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping opacity-60" />
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between z-10 select-none">
              <span className="text-white text-xs font-bold truncate pr-1">@{currentUser.username} (You)</span>
              <span className="bg-zinc-950/80 border border-zinc-800 text-[9px] text-zinc-400 px-1.5 py-0.5 font-mono rounded">128 Kbps</span>
            </div>
          </div>

          {/* Active room participants mock cards */}
          {voiceStates.map((vs) => {
            const isSpeaking = activeSpeakers[vs.userId];
            const isMutedState = vs.isMuted || isDeafened;
            
            return (
              <div
                key={vs.userId}
                className={`bg-zinc-900/60 border rounded-xl p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  isSpeaking 
                    ? "border-red-500 shadow-md shadow-red-500/10 scale-102"
                    : "border-zinc-850"
                }`}
              >
                {/* Background camera feed simulator */}
                {vs.isCameraOn ? (
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/80 via-zinc-900 to-zinc-950/80 flex flex-col items-center justify-center p-3 text-center border-2 border-indigo-500/20 animate-pulse">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="h-10 w-10 border border-indigo-400/40 rounded-full flex items-center justify-center text-indigo-400 animate-bounce">
                        <Monitor className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase bg-indigo-950 px-2 py-0.5 rounded">@{vs.username} is broadasting video</span>
                    </div>
                  </div>
                ) : null}

                {/* Top Row */}
                <div className="flex items-center justify-between z-10 select-none">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">User Profile</span>
                  <div className="flex items-center space-x-1.5 lg:space-x-1">
                    {isMutedState && <MicOff className="h-3.5 w-3.5 text-red-500 font-bold" />}
                    {vs.isCameraOn && <Video className="h-3.5 w-3.5 text-indigo-400" />}
                    {vs.isScreenSharing && <Monitor className="h-3.5 w-3.5 text-pink-500 animate-pulse" />}
                  </div>
                </div>

                {/* Center Avatar */}
                <div className="flex items-center justify-center py-6 z-10 select-none">
                  <div className={`h-22 w-22 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-lg relative ${vs.avatarColor}`}>
                    {vs.userId === "user-ai-bot" ? "🤖" : vs.username.substring(0, 2).toUpperCase()}
                    {isSpeaking && (
                      <span className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping opacity-60" />
                    )}
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between z-10 select-none">
                  <span className="text-white text-xs font-bold truncate pr-1">@{vs.username}</span>
                  <span className="bg-zinc-950/80 border border-zinc-800 text-[9px] text-zinc-400 px-1.5 py-0.5 font-mono rounded">Connected</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Control bar bottom (matches Discord voice call tools bar) */}
      <div className="h-20 bg-zinc-900 border-t border-zinc-950 px-6 flex items-center justify-between select-none">
        
        {/* Noise Suppression & Diagnostics indicators */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setNoiseSuppression(!noiseSuppression)}
            className={`px-3 py-1.5 rounded text-xs font-mono border hover:scale-105 transition-transform cursor-pointer ${
              noiseSuppression 
                ? "bg-red-950/30 text-red-400 border-red-900/60" 
                : "bg-zinc-950 text-zinc-650 border-zinc-850"
            }`}
          >
            🔊 Deep AI Suppression: {noiseSuppression ? "ACTIVE" : "OFF"}
          </button>
        </div>

        {/* Primary Command Button bar */}
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onToggleMic}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
              isMuted ? "bg-red-650 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button
            onClick={onToggleDeafen}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
              isDeafened ? "bg-red-650 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={isDeafened ? "Enable Audio" : "Deafen Audio"}
          >
            <Headphones className="h-5 w-5" />
          </button>

          <button
            onClick={toggleCamera}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
              cameraOn ? "bg-emerald-650 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={cameraOn ? "Disable Camera" : "Share Web Camera"}
          >
            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleScreen}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer ${
              screenShareOn ? "bg-sky-655 text-white animate-pulse" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={screenShareOn ? "Stop Screen sharing" : "Share Client Screen"}
          >
            <Monitor className="h-5 w-5" />
          </button>

          <button
            onClick={onDisconnect}
            className="h-11 px-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center space-x-2 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-red-600/10 active:scale-95 transition-all animate-pulse"
            title="Disconnect Connection Layer"
          >
            <PhoneOff className="h-4 w-4" />
            <span>HQ Disconnect</span>
          </button>
        </div>

        {/* Right diagnostic space */}
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:block">
          Redcoad RTC Module V1.2.0
        </div>
      </div>

    </div>
  );
}
