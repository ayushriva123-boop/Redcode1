import React, { useState } from "react";
import { Community, User } from "../types";
import { MessageSquare, Plus, Compass, LogOut, Radio, UserCheck, Shield, ChevronUp, Check, AlertCircle } from "lucide-react";

interface SidebarServerProps {
  currentUser: User;
  communities: Community[];
  activeCommunity: Community | null;
  onSelectCommunity: (community: Community | null) => void;
  onLogout: () => void;
  onCreateCommunity: (name: string, description: string) => Promise<void>;
  onJoinCommunity: (inviteCode: string) => Promise<string | null>;
  onUpdatePresence: (fields: Partial<User>) => Promise<void>;
}

export default function SidebarServer({
  currentUser,
  communities,
  activeCommunity,
  onSelectCommunity,
  onLogout,
  onCreateCommunity,
  onJoinCommunity,
  onUpdatePresence
}: SidebarServerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Form states
  const [serverName, setServerName] = useState("");
  const [serverDesc, setServerDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [customStatusText, setCustomStatusText] = useState(currentUser.customStatus || "");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!serverName.trim()) {
      setModalError("Server name cannot be empty.");
      return;
    }
    await onCreateCommunity(serverName.trim(), serverDesc.trim());
    setServerName("");
    setServerDesc("");
    setShowCreateModal(false);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!inviteCode.trim()) {
      setModalError("Invite Code required.");
      return;
    }
    const err = await onJoinCommunity(inviteCode.trim());
    if (err) {
      setModalError(err);
    } else {
      setInviteCode("");
      setShowJoinModal(false);
    }
  };

  const changeStatus = async (status: "online" | "idle" | "dnd" | "offline") => {
    await onUpdatePresence({ status });
    setShowProfileMenu(false);
  };

  const saveCustomStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePresence({ customStatus: customStatusText });
    setShowProfileMenu(false);
  };

  // Status indicator dot helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-emerald-500";
      case "idle": return "bg-amber-500";
      case "dnd": return "bg-red-500";
      default: return "bg-zinc-500";
    }
  };

  return (
    <div id="redcoad-server-bar" className="w-[72px] bg-zinc-950 flex flex-col justify-between items-center py-4 border-r border-zinc-900/60 shrink-0 z-20">
      
      {/* Top logo & Standard DM panel button */}
      <div id="sidebar-top-actions" className="flex flex-col items-center space-y-2 w-full">
        {/* Abstract R Logo */}
        <button
          id="btn-sidebar-home"
          onClick={() => onSelectCommunity(null)}
          className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative group cursor-pointer ${
            activeCommunity === null 
              ? "bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20" 
              : "bg-zinc-900 text-zinc-400 hover:bg-red-600 hover:text-white hover:rounded-xl"
          }`}
          title="REDCOAD Space / Direct Messages"
        >
          {/* Active side indicator pill */}
          <span className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all ${
            activeCommunity === null ? "h-10" : "h-0 group-hover:h-5"
          }`} />
          <Radio className="h-5 w-5 animate-pulse" />
        </button>

        <div className="w-8 h-[2px] bg-zinc-900 my-1 rounded-full" />

        {/* Communities scroll list */}
        <div id="servers-scroller" className="flex flex-col items-center space-y-2.5 w-full max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
          {communities.map((comm) => {
            const isActive = activeCommunity?.id === comm.id;
            const initials = comm.name.split(" ").map(n => n[0]).join("").substring(0, 3).toUpperCase();
            
            return (
              <button
                key={comm.id}
                onClick={() => onSelectCommunity(comm)}
                className={`h-12 w-12 flex items-center justify-center text-xs font-bold tracking-tight transition-all duration-300 relative group cursor-pointer ${
                  isActive 
                    ? "bg-zinc-100 text-black rounded-xl border border-red-500/30 shadow-md shadow-red-500/5" 
                    : `${comm.iconColor} text-zinc-350 bg-zinc-900 hover:bg-red-600 hover:text-white hover:rounded-xl hover:shadow-lg hover:shadow-red-500/10 rounded-3xl`
                }`}
                title={comm.name}
              >
                {/* Side indicator pill */}
                <span className={`absolute left-0 w-1 bg-red-500 rounded-r-lg transition-all ${
                  isActive ? "h-10" : "h-0 group-hover:h-5 z-25"
                }`} />
                {initials}
              </button>
            );
          })}
        </div>

        <div className="w-8 h-[1px] bg-zinc-900 my-1" />

        {/* Create and Discovery Controls */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-12 w-12 bg-zinc-900 hover:bg-green-600/90 text-green-500 hover:text-white rounded-3xl hover:rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer group"
          title="Create a Community"
        >
          <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={() => setShowJoinModal(true)}
          className="h-12 w-12 bg-zinc-900 hover:bg-red-600 text-red-500 hover:text-white rounded-3xl hover:rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer group"
          title="Join Server via Link"
        >
          <Compass className="h-5 w-5 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Profile & Logouts on bottom */}
      <div id="sidebar-bottom-actions" className="flex flex-col items-center space-y-4 w-full relative">
        <div className="w-8 h-[1px] bg-zinc-900" />
        
        {/* User avatar with status ring */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-200 border border-zinc-700/60 cursor-pointer overflow-hidden relative shadow-lg active:scale-95 transition-all text-sm font-semibold hover:border-red-500/40"
            title="Profile Presence Settings"
          >
            {currentUser.avatarUrl ? (
              <span className="text-xl">{currentUser.avatarUrl}</span>
            ) : (
              currentUser.displayName.substring(0, 2).toUpperCase()
            )}
          </button>
          {/* Presence state circle */}
          <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-zinc-950 ${getStatusColor(currentUser.status)}`} />
        </div>

        {/* Dynamic Context Profile Menu */}
        {showProfileMenu && (
          <div id="presence-overlay-menu" className="absolute bottom-16 left-16 w-64 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl z-50 text-left space-y-3.5 divide-y divide-zinc-850">
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <h4 className="text-white text-sm font-bold truncate">{currentUser.displayName}</h4>
                <Shield className="h-3.5 w-3.5 text-red-500" />
              </div>
              <p className="text-zinc-500 text-xs font-mono">@{currentUser.username}</p>
              {currentUser.customStatus && (
                <div className="text-zinc-400 bg-zinc-950/60 p-2 border border-zinc-900 rounded text-xs font-mono break-all italic mt-1.5">
                  "{currentUser.customStatus}"
                </div>
              )}
            </div>

            {/* Custom Status Input Form */}
            <form onSubmit={saveCustomStatus} className="pt-3 space-y-2">
              <label className="block text-zinc-400 text-[10px] font-mono tracking-wider uppercase">Set Custom Status</label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="What's going on..."
                  value={customStatusText}
                  onChange={(e) => setCustomStatusText(e.target.value)}
                  className="bg-zinc-950 border border-zinc-805 text-xs text-white max-w-[155px] px-2 py-1 rounded placeholder-zinc-700 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white p-1 rounded hover:scale-105 transition-transform"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            </form>

            <div className="pt-3 space-y-2.5">
              <span className="text-[10px] block text-zinc-500 font-mono tracking-wider uppercase">Connection Presence</span>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
                <button
                  onClick={() => changeStatus("online")}
                  className="flex items-center space-x-1.5 text-emerald-400 hover:bg-zinc-850 p-1 rounded text-left transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Online</span>
                </button>
                <button
                  onClick={() => changeStatus("idle")}
                  className="flex items-center space-x-1.5 text-amber-400 hover:bg-zinc-850 p-1 rounded text-left transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span>Idle</span>
                </button>
                <button
                  onClick={() => changeStatus("dnd")}
                  className="flex items-center space-x-1.5 text-red-400 hover:bg-zinc-850 p-1 rounded text-left transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  <span>Do Not Disturb</span>
                </button>
                <button
                  onClick={() => changeStatus("offline")}
                  className="flex items-center space-x-1.5 text-zinc-400 hover:bg-zinc-850 p-1 rounded text-left transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
                  <span>Invisible</span>
                </button>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full pt-3.5 flex items-center space-x-2 text-xs text-zinc-450 hover:text-red-450 transition-colors cursor-pointer text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Disconnect Gateway</span>
            </button>
          </div>
        )}
      </div>

      {/* CREATE COMMUNITY DIALOG MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-805 rounded-xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-2 font-sans">Initialize Community Server</h3>
            <p className="text-zinc-400 text-xs mb-4">Create your own private space for discussions, voice logs, and dynamic coordination.</p>
            
            {modalError && (
              <div className="bg-red-950/40 border border-red-900 text-red-400 text-xs px-3 py-2 rounded mb-3 flex items-center space-x-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-450 text-[10px] uppercase font-mono tracking-wider mb-1.5">Community Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Space Explorers Hub"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-zinc-450 text-[10px] uppercase font-mono tracking-wider mb-1.5">Channel Description</label>
                <textarea
                  placeholder="Summarize the core purpose of your community..."
                  value={serverDesc}
                  onChange={(e) => setServerDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-750 text-sm focus:outline-none focus:border-red-500 h-20 resize-none animate-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-xs bg-zinc-850 rounded hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-650 hover:bg-red-550 text-white text-xs font-bold rounded shadow shadow-red-600/10 transition-transform"
                >
                  Deploy Server Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN COMMUNITY DIALOG MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-805 rounded-xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Connect to server via Code</h3>
            <p className="text-zinc-400 text-xs mb-4">Input any valid invite code payload below to authorize your registration in the target community.</p>

            {modalError && (
              <div className="bg-red-950/40 border border-red-900 text-red-400 text-xs px-3 py-2 rounded mb-3 flex items-center space-x-1.5">
                <AlertCircle className="h-3.5 w-3.5 animate-spin" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-450 text-[10px] uppercase font-mono tracking-wider mb-1.5">Invite Code Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., REDCOAD100 or TECHSOURCE"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-red-500 font-mono tracking-widest text-center text-lg uppercase"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-xs bg-zinc-850 rounded hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-650 hover:bg-red-550 text-white text-xs font-bold rounded shadow"
                >
                  Authorize Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
