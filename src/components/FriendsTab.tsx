import React, { useState } from "react";
import { Friend, User } from "../types";
import { MessageSquare, UserCheck, Clock, UserMinus, Plus, ShieldAlert, Check, X, AlertCircle } from "lucide-react";

interface FriendsTabProps {
  currentUser: User;
  friends: Friend[];
  onAddFriend: (username: string) => Promise<string | null>;
  onFriendAction: (id: string, action: "accept" | "decline" | "block") => Promise<void>;
  onSelectPrivateChat: (friend: Friend) => void;
}

export default function FriendsTab({
  currentUser,
  friends,
  onAddFriend,
  onFriendAction,
  onSelectPrivateChat
}: FriendsTabProps) {
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "blocked" | "add">("all");
  const [friendUsername, setFriendUsername] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!friendUsername.trim()) return;

    const errMsg = await onAddFriend(friendUsername.trim());
    if (errMsg) {
      setStatusMsg({ text: errMsg, type: "error" });
    } else {
      setStatusMsg({ text: `Friend invitation successfully dispatched to @${friendUsername}!`, type: "success" });
      setFriendUsername("");
    }
  };

  // Safe checks for lists
  const allAccepted = friends.filter(f => f.status === "accepted");
  const allPending = friends.filter(f => f.status === "pending_sent" || f.status === "pending_received");
  const allBlocked = friends.filter(f => f.status === "blocked");

  const getStatusDot = (st: string) => {
    switch (st) {
      case "online": return "bg-emerald-500";
      case "idle": return "bg-amber-500";
      case "dnd": return "bg-red-500";
      default: return "bg-zinc-550";
    }
  };

  return (
    <div id="redcoad-friends-workspace" className="flex-1 bg-zinc-950 flex flex-col items-stretch overflow-hidden">
      
      {/* Search Header and tabs selector bar */}
      <div className="h-14 border-b border-zinc-900 bg-zinc-900/30 px-6 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 font-bold font-sans text-white text-sm">
            <UserCheck className="h-4 w-4 text-red-500 animate-pulse" />
            <span>Friends Control Workspace</span>
          </div>
          <div className="h-4 w-[1px] bg-zinc-800" />
          
          {/* Sub tabs list selectors */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => { setActiveTab("all"); setStatusMsg(null); }}
              className={`px-3 py-1.5 rounded font-sans font-semibold cursor-pointer transition-all ${
                activeTab === "all" ? "bg-zinc-800 text-white" : "text-zinc-450 hover:text-zinc-200"
              }`}
            >
              All Mutuals <span className="bg-zinc-950/60 text-zinc-500 px-1 py-0.5 rounded text-[10px] ml-1">{allAccepted.length}</span>
            </button>
            <button
              onClick={() => { setActiveTab("pending"); setStatusMsg(null); }}
              className={`px-3 py-1.5 rounded font-sans font-semibold cursor-pointer transition-all ${
                activeTab === "pending" ? "bg-zinc-800 text-white" : "text-zinc-450 hover:text-zinc-200"
              }`}
            >
              Pending Inbox <span className="bg-zinc-950/60 text-zinc-500 px-1 py-0.5 rounded text-[10px] ml-1">{allPending.length}</span>
            </button>
            <button
              onClick={() => { setActiveTab("blocked"); setStatusMsg(null); }}
              className={`px-3 py-1.5 rounded font-sans font-semibold cursor-pointer transition-all ${
                activeTab === "blocked" ? "bg-zinc-800 text-white" : "text-zinc-450 hover:text-zinc-200"
              }`}
            >
              Blocked <span className="bg-zinc-950/60 text-zinc-500 px-1 py-0.5 rounded text-[10px] ml-1">{allBlocked.length}</span>
            </button>
            <button
              onClick={() => { setActiveTab("add"); setStatusMsg(null); }}
              className={`px-3 py-1.5 rounded font-sans font-semibold font-bold text-red-500 hover:text-red-400 cursor-pointer transition-all ${
                activeTab === "add" ? "bg-red-950/20 text-red-500 font-bold border border-red-900/40" : ""
              }`}
            >
              Add Friend +
            </button>
          </div>
        </div>
      </div>

      {/* Main Container contents panel based on active tab selection */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* ADD FRIEND TAB VIEW */}
        {activeTab === "add" && (
          <div className="max-w-xl space-y-4 text-left">
            <div>
              <h2 className="text-white text-base font-bold font-sans">Send Connection Request</h2>
              <p className="text-zinc-450 text-xs mt-1">You can include friends inside your workspace using their lowercase profile username. E.g. <span className="text-red-400 font-mono italic">alan_turing</span> or <span className="text-red-400 font-mono italic">ada_lovelace</span></p>
            </div>

            {statusMsg && (
              <div className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 border ${
                statusMsg.type === "success" 
                  ? "bg-emerald-950/20 border-emerald-900 text-emerald-400" 
                  : "bg-red-950/20 border-red-900 text-red-400"
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="flex space-x-2 bg-zinc-900/60 border border-zinc-850 p-1 rounded-xl shadow-inner max-w-lg">
              <input
                type="text"
                required
                placeholder="Enter lower_case_username..."
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-700 font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 rounded-lg flex items-center space-x-1 transition-transform active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Request Connection</span>
              </button>
            </form>

            <div className="pt-6 border-t border-zinc-900">
              <span className="text-[10px] uppercase font-mono text-zinc-550 tracking-wider">Simulated Sandbox profiles list in server:</span>
              <div className="grid grid-cols-2 gap-3 mt-3 max-w-md">
                <div className="bg-zinc-90 w-full p-2.5 rounded-lg border border-zinc-850/40 text-xs font-mono flex items-center justify-between">
                  <span className="text-zinc-400">@alan_turing</span>
                  <span className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-[9px] px-1.5 py-[1px] rounded uppercase font-bold">Online</span>
                </div>
                <div className="bg-zinc-90 w-full p-2.5 rounded-lg border border-zinc-850/40 text-xs font-mono flex items-center justify-between">
                  <span className="text-zinc-400">@ada_lovelace</span>
                  <span className="bg-amber-950/40 border border-amber-900 text-amber-400 text-[9px] px-1.5 py-[1px] rounded uppercase font-bold text-center">Idle</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALL FRIENDS TAB VIEW */}
        {activeTab === "all" && (
          <div className="space-y-3.5 text-left max-w-3xl">
            <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2 font-semibold">Authorized Connection Mutuals ({allAccepted.length})</h3>
            
            {allAccepted.map((f) => (
              <div
                key={f.id}
                className="bg-zinc-900/30 border border-zinc-900/60 rounded-xl p-3.5 flex items-center justify-between hover:border-zinc-850 hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex items-center space-x-3 truncate">
                  {/* Avatar wrapper */}
                  <div className="relative shrink-0">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow-md ${f.avatarColor}`}>
                      {f.username.substring(0, 2).toUpperCase()}
                    </div>
                    {/* Status dot */}
                    <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${getStatusDot(f.onlineStatus)}`} />
                  </div>

                  <div className="truncate flex flex-col">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-bold text-white truncate">{f.displayName}</span>
                      <span className="text-zinc-550 text-[11px] font-mono truncate">(@{f.username})</span>
                    </div>
                    <span className="text-xs text-zinc-500 mt-0.5 truncate font-mono">
                      {f.onlineStatus !== "offline" ? "Interactive Session active" : "Offline portal locked"}
                    </span>
                  </div>
                </div>

                {/* Operations bar */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => onSelectPrivateChat(f)}
                    className="p-2 bg-zinc-850 hover:bg-zinc-8 w-9 h-9 rounded-full text-zinc-350 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    title="Open DM thread"
                  >
                    <MessageSquare className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => onFriendAction(f.id, "block")}
                    className="p-2 bg-zinc-850 hover:bg-red-950/40 w-9 h-9 rounded-full text-red-500 hover:text-red-400 transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-red-900/40"
                    title="Block profile"
                  >
                    <ShieldAlert className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}

            {allAccepted.length === 0 && (
              <div className="py-20 text-center space-y-2">
                <Clock className="mx-auto h-10 w-10 text-zinc-700 animate-pulse" />
                <span className="text-zinc-550 text-sm block font-sans">No mutual connections found. Head over to additive panel to send invite invitations!</span>
              </div>
            )}
          </div>
        )}

        {/* PENDING FRIENDS TAB VIEW */}
        {activeTab === "pending" && (
          <div className="space-y-3.5 text-left max-w-3xl">
            <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2 font-semibold">Incoming & Outgoing Invitations ({allPending.length})</h3>
            
            {allPending.map((f) => {
              const isIncoming = f.status === "pending_received" || (f.friendId === currentUser.id && f.status === "pending_sent");
              
              return (
                <div
                  key={f.id}
                  className="bg-zinc-900/30 border border-zinc-900/60 rounded-xl p-3.5 flex items-center justify-between hover:border-zinc-850"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow ${f.avatarColor}`}>
                      {f.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate flex flex-col">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-bold text-white truncate">{f.displayName}</span>
                        <span className="text-zinc-550 text-[11px] font-mono truncate">(@{f.username})</span>
                      </div>
                      <span className="text-xs text-zinc-500 mt-0.5 truncate font-mono">
                        {isIncoming ? "📩 Pending authorization (incoming)" : "✉️ Awaiting response (outgoing)"}
                      </span>
                    </div>
                  </div>

                  {/* Actions depending on role */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isIncoming ? (
                      <>
                        <button
                          onClick={() => onFriendAction(f.id, "accept")}
                          className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-full cursor-pointer h-9 w-9 flex items-center justify-center shadow"
                          title="Authorize Friend Relationship"
                        >
                          <Check className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => onFriendAction(f.id, "decline")}
                          className="bg-zinc-800 hover:bg-red-600 text-zinc-350 hover:text-white p-2 rounded-full cursor-pointer h-9 w-9 flex items-center justify-center"
                          title="Decline invitation"
                        >
                          <X className="h-4.5 w-4.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onFriendAction(f.id, "decline")}
                        className="px-3 py-1.5 bg-zinc-850 hover:bg-red-950/40 text-red-500 rounded text-[10px] font-mono uppercase tracking-wide border border-transparent hover:border-red-900/40 cursor-pointer"
                        title="Cancel Outgoing Request"
                      >
                        Cancel request
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {allPending.length === 0 && (
              <div className="py-20 text-center space-y-2">
                <Clock className="mx-auto h-10 w-10 text-zinc-700 animate-pulse" />
                <span className="text-zinc-550 text-sm block font-sans">No pending connection invitations in mailbox.</span>
              </div>
            )}
          </div>
        )}

        {/* BLOCKED USERS TAB VIEW */}
        {activeTab === "blocked" && (
          <div className="space-y-3.5 text-left max-w-3xl">
            <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2 font-semibold">Restricted / Blocked Profiles ({allBlocked.length})</h3>
            
            {allBlocked.map((f) => (
              <div
                key={f.id}
                className="bg-zinc-900/30 border border-zinc-900/60 rounded-xl p-3.5 flex items-center justify-between hover:border-zinc-850"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow ${f.avatarColor}`}>
                    {f.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate flex flex-col">
                    <span className="text-sm font-bold text-white truncate">{f.displayName}</span>
                    <span className="text-xs text-red-500/80 mt-0.5 truncate font-mono">Profile blocked. Text synchronization locked.</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => onFriendAction(f.id, "decline")}
                    className="px-3.5 py-1.5 bg-zinc-850 hover:bg-red-950/40 text-red-500 hover:text-red-400 text-xs font-bold rounded border border-transparent hover:border-red-900/40 transition-colors cursor-pointer"
                    title="Unblock User profile"
                  >
                    Unblock profile
                  </button>
                </div>
              </div>
            ))}

            {allBlocked.length === 0 && (
              <div className="py-20 text-center space-y-2 select-none">
                <Clock className="mx-auto h-10 w-10 text-zinc-700 animate-pulse" />
                <span className="text-zinc-550 text-sm block font-sans">Block list cache is entirely empty.</span>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
