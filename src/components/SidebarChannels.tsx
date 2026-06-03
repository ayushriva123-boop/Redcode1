import React, { useState } from "react";
import { Community, Channel, User, VoiceState } from "../types";
import { Hash, MessageSquare, Volume2, Plus, Settings, Calendar, Users, Eye, EyeOff, ShieldCheck, HelpCircle, Mic, MicOff, Headphones, Megaphone } from "lucide-react";

interface SidebarChannelsProps {
  currentUser: User;
  activeCommunity: Community;
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onOpenSettings: () => void;
  onCreateChannel: (name: string, type: "text" | "voice" | "announcement", categoryId: string) => Promise<void>;
  globalVoiceStates: VoiceState[];
  connectedVoiceChannelId: string | null;
  onToggleVoiceMic: () => void;
  onToggleVoiceDeafen: () => void;
  isVoiceMuted: boolean;
  isVoiceDeafened: boolean;
}

export default function SidebarChannels({
  currentUser,
  activeCommunity,
  channels,
  activeChannel,
  onSelectChannel,
  onOpenSettings,
  onCreateChannel,
  globalVoiceStates,
  connectedVoiceChannelId,
  onToggleVoiceMic,
  onToggleVoiceDeafen,
  isVoiceMuted,
  isVoiceDeafened
}: SidebarChannelsProps) {
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice" | "announcement">("text");

  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    await onCreateChannel(newChannelName.trim(), newChannelType, targetCategoryId);
    setNewChannelName("");
    setShowChannelModal(false);
  };

  // Group channels by category
  const chanMap = activeCommunity.categories.reduce((acc, cat) => {
    acc[cat.id] = channels.filter(c => c.categoryId === cat.id);
    return acc;
  }, {} as { [catId: string]: Channel[] });

  // Get users in a specific voice channel
  const getVoiceUsers = (chanId: string) => {
    return globalVoiceStates.filter(vs => vs.channelId === chanId);
  };

  return (
    <div id="redcoad-channels-bar" className="w-60 bg-zinc-900/90 flex flex-col justify-between border-r border-zinc-850 shrink-0 z-10 select-none">
      
      {/* Top community header */}
      <div id="channels-header" className="h-14 border-b border-zinc-950 px-4 flex items-center justify-between bg-zinc-900/60 shrink-0 select-none">
        <div className="flex flex-col truncate pr-2">
          <h2 className="text-white text-sm font-bold truncate tracking-wide">{activeCommunity.name}</h2>
          <span className="text-[10px] text-red-500 font-mono flex items-center space-x-1 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping inline-block mr-1"></span>
            Invite: {activeCommunity.inviteCode}
          </span>
        </div>

        {/* Community settings toggle */}
        <button
          onClick={onOpenSettings}
          className="p-1 px-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer group"
          title="Community Panel & Discovery Settings"
        >
          <Settings className="h-4.5 w-4.5 group-hover:rotate-45 transition-transform duration-200" />
        </button>
      </div>

      {/* Categories and Channels list */}
      <div id="channels-scroller" className="flex-1 overflow-y-auto px-2 py-4 space-y-4 text-left no-scrollbar">
        {/* Description helper card optionally */}
        <div className="p-3 bg-zinc-950/40 border border-zinc-800/40 rounded-lg space-y-1 mb-2">
          <p className="text-[10px] text-zinc-500 leading-normal line-clamp-2">
            {activeCommunity.description || "The core digital workstation workspace."}
          </p>
        </div>

        {activeCommunity.categories.map((cat) => (
          <div key={cat.id} id={`cat-group-${cat.id}`} className="space-y-0.5">
            {/* Category header title */}
            <div className="flex items-center justify-between text-zinc-400 px-1 py-1 font-semibold text-[11px] font-sans uppercase tracking-wider">
              <span>{cat.name}</span>
              <button
                onClick={() => {
                  setTargetCategoryId(cat.id);
                  setShowChannelModal(true);
                }}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title={`Create channel in ${cat.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Channels within category */}
            <div className="space-y-0.5">
              {(chanMap[cat.id] || []).length === 0 ? (
                <span className="block text-[10px] text-zinc-650 italic pl-5 py-1">No channels yet</span>
              ) : (
                chanMap[cat.id].map((chan) => {
                  const isSelected = activeChannel?.id === chan.id;
                  
                  return (
                    <div key={chan.id} className="space-y-0.5">
                      <button
                        onClick={() => onSelectChannel(chan)}
                        className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-zinc-800 text-white font-semibold"
                            : "text-zinc-450 hover:bg-zinc-850/60 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {chan.type === "text" && <Hash className="h-4 w-4 shrink-0 text-zinc-500" />}
                          {chan.type === "announcement" && <Megaphone className="h-4 w-4 shrink-0 text-red-500/80" />}
                          {chan.type === "voice" && <Volume2 className="h-4 w-4 shrink-0 text-zinc-500" />}
                          <span className="truncate">{chan.name}</span>
                        </div>
                        {chan.isPrivate && <EyeOff className="h-3 w-3 text-zinc-600" />}
                      </button>

                      {/* Real-time Voice Room participants inline nested */}
                      {chan.type === "voice" && (
                        <div className="pl-6 pr-2 space-y-1 py-0.5 border-l border-zinc-850/60 ml-4 mb-1">
                          {getVoiceUsers(chan.id).map((vMember) => (
                            <div
                              key={vMember.userId}
                              className="flex items-center justify-between bg-zinc-950/20 px-2 py-0.5 rounded text-[10px] text-zinc-450 font-mono animate-fade-in border border-transparent hover:border-zinc-800/30"
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ${vMember.isCameraOn ? "animate-pulse" : ""}`}></span>
                                <span className="truncate text-zinc-300">@{vMember.username}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-zinc-600 shrink-0">
                                {vMember.isMuted && <MicOff className="h-2.5 w-2.5 text-red-500/80" />}
                                {vMember.isScreenSharing && (
                                  <span className="bg-red-950/60 border border-red-900/60 px-1 py-[1px] text-[8px] text-red-400 font-bold uppercase rounded scale-90">Live</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {getVoiceUsers(chan.id).length === 0 && (
                            <span className="text-[9px] text-zinc-650 block italic">Empty lobby</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Voice Status Tray (matches Discord Active Call block) */}
      {connectedVoiceChannelId && (
        <div id="active-voice-connection-tray" className="bg-zinc-950 border-t border-zinc-900 p-2.5 space-y-2.5 animate-slide-up shrink-0 select-none">
          <div className="flex items-center justify-between text-xs">
            <div className="flex flex-col text-left">
              <span className="text-emerald-500 font-bold font-sans flex items-center">
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Voice Connected
              </span>
              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[130px]">
                {channels.find(c => c.id === connectedVoiceChannelId)?.name || "Interactive Studio"}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-zinc-400">
              <span className="text-[9px] font-mono text-zinc-600 bg-zinc-900/60 border border-zinc-850 px-1 py-[2px] rounded">RTC: 24ms</span>
            </div>
          </div>

          {/* Quick Voice Control Toggles */}
          <div className="grid grid-cols-2 gap-1 px-1.5">
            <button
              onClick={onToggleVoiceMic}
              className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-sans font-medium uppercase tracking-wider cursor-pointer transition-all ${
                isVoiceMuted 
                  ? "bg-red-900/30 text-red-400 border border-red-900/45" 
                  : "bg-zinc-900 border border-zinc-850 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {isVoiceMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              <span>{isVoiceMuted ? "Muted" : "Active"}</span>
            </button>
            <button
              onClick={onToggleVoiceDeafen}
              className={`flex items-center justify-center space-x-1 py-1.5 rounded text-[10px] font-sans font-medium uppercase tracking-wider cursor-pointer transition-all ${
                isVoiceDeafened 
                  ? "bg-red-900/30 text-red-400 border border-red-900/45" 
                  : "bg-zinc-900 border border-zinc-850 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <HeadonesToggle isDeafened={isVoiceDeafened} />
              <span>{isVoiceDeafened ? "Deafened" : "Sound ON"}</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE CHANNEL DIALOG MODAL */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-805 rounded-xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowChannelModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-1.5">Create Channel</h3>
            <p className="text-zinc-400 text-xs mb-4">Introduce a new text thread, announcement channel, or real-time voice lobby.</p>

            <form onSubmit={handleChannelSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-450 text-[10px] uppercase font-mono tracking-wider mb-2">Channel Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChannelType("text")}
                    className={`p-3 rounded border text-left flex flex-col space-y-1 cursor-pointer transition-all ${
                      newChannelType === "text"
                        ? "bg-red-900/10 border-red-500 text-white"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Hash className="h-4 w-4" />
                    <span className="text-xs font-bold font-sans">Text</span>
                    <span className="text-[9px] text-zinc-500 leading-none">Standard chats</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChannelType("announcement")}
                    className={`p-3 rounded border text-left flex flex-col space-y-1 cursor-pointer transition-all ${
                      newChannelType === "announcement"
                        ? "bg-red-900/10 border-red-500 text-white"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Megaphone className="h-4 w-4" />
                    <span className="text-xs font-bold font-sans">Announcement</span>
                    <span className="text-[9px] text-zinc-500 leading-none">Broadcast feeds</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChannelType("voice")}
                    className={`p-3 rounded border text-left flex flex-col space-y-1 cursor-pointer transition-all ${
                      newChannelType === "voice"
                        ? "bg-red-900/10 border-red-500 text-white"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Volume2 className="h-4 w-4" />
                    <span className="text-xs font-bold font-sans">Voice</span>
                    <span className="text-[9px] text-zinc-500 leading-none">Live spaces</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-450 text-[10px] uppercase font-mono tracking-wider mb-1.5">Channel Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 font-bold">#</span>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="e.g. general-discussions"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded pl-7 pr-3 py-2 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowChannelModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-xs bg-zinc-850 rounded hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-650 hover:bg-red-550 text-white text-xs font-bold rounded shadow"
                >
                  Deploy Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline support subcomponent
function HeadonesToggle({ isDeafened }: { isDeafened: boolean }) {
  return (
    <Headphones className={`h-3.5 w-3.5 ${isDeafened ? "text-red-500 line-through animate-none" : "text-zinc-400"}`} />
  );
}
