import React, { useState, useEffect } from "react";
import { Community, AuditLog, CommunityEvent, User } from "../types";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calendar, ShieldAlert, BarChart3, Settings, Users, Plus, AlertCircle, Clock, MapPin, Check, UserCheck, Shield, Search, UserMinus } from "lucide-react";

interface ServerSettingsProps {
  currentUser: User;
  activeCommunity: Community;
  onUpdateCommunity: (name: string, description: string) => Promise<void>;
  onClose: () => void;
}

export default function ServerSettings({
  currentUser,
  activeCommunity,
  onUpdateCommunity,
  onClose
}: ServerSettingsProps) {
  const [activeTab, setActiveTab] = useState<"general" | "events" | "logs" | "analytics" | "roles">("general");
  
  // Roles and Permissions state
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [rolesSearch, setRolesSearch] = useState("");
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);

  // Load members on tab activation
  useEffect(() => {
    if (activeTab === "roles") {
      fetchMembers();
    }
  }, [activeTab, activeCommunity.id]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/members`);
      const data = await res.json();
      if (res.ok) {
        setMembers(data);
        if (data.length > 0) {
          setSelectedMember((prev: any) => {
            const found = data.find((m: any) => m.userId === prev?.userId);
            return found || data[0];
          });
        }
      }
    } catch (err) {
      console.error("Members load error:", err);
    }
  };

  const handleSaveMemberPermissions = async (targetUserId: string, role: string, permissions: string[]) => {
    setSavingMemberId(targetUserId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/members/${targetUserId}/role-permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          permissions,
          updaterId: currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update permissions.");
      
      setStatusMsg({ text: `Permissions for member @${selectedMember?.username || 'user'} successfully customized.`, type: "success" });
      await fetchMembers();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to edit permissions.", type: "error" });
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleKickMember = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to kick this member from the server?")) {
      return;
    }
    setKickingMemberId(targetUserId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/members/${targetUserId}?kickerId=${currentUser.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to kick member.");

      setStatusMsg({ text: "Member successfully kicked from the server.", type: "success" });
      setSelectedMember(null);
      await fetchMembers();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to kick member.", type: "error" });
    } finally {
      setKickingMemberId(null);
    }
  };

  const filteredMembers = members.filter((m: any) => {
    const search = rolesSearch.toLowerCase();
    return (
      (m.displayName || "").toLowerCase().includes(search) ||
      (m.username || "").toLowerCase().includes(search) ||
      (m.role || "").toLowerCase().includes(search)
    );
  });

  // General config form
  const [name, setName] = useState(activeCommunity.name);
  const [desc, setDesc] = useState(activeCommunity.description);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Events logic state
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDesc, setEvtDesc] = useState("");
  const [evtTime, setEvtTime] = useState("");
  const [evtLocation, setEvtLocation] = useState("");

  // Audit logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Fetch relevant server logs and event schedules on mount or change of tab
  useEffect(() => {
    if (activeTab === "logs") {
      fetch(`/api/communities/${activeCommunity.id}/audit-logs`)
        .then(res => res.json())
        .then(data => setLogs(data))
        .catch(err => console.error("Logs fetch failed:", err));
    } else if (activeTab === "events") {
      fetch(`/api/communities/${activeCommunity.id}/events`)
        .then(res => res.json())
        .then(data => setEvents(data))
        .catch(err => console.error("Events fetch failed:", err));
    }
  }, [activeTab, activeCommunity.id]);

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!name.trim()) return;

    try {
      await onUpdateCommunity(name.trim(), desc.trim());
      setStatusMsg({ text: "Community profile updated successfully!", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err?.message || "Failed to edit community settings.", type: "error" });
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!evtTitle || !evtTime || !evtLocation) {
      setStatusMsg({ text: "Title, date, and location are required.", type: "error" });
      return;
    }

    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: evtTitle,
          description: evtDesc,
          startTime: evtTime,
          location: evtLocation,
          creatorId: currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEvents([...events, data.event]);
      setEvtTitle("");
      setEvtDesc("");
      setEvtTime("");
      setEvtLocation("");
      setStatusMsg({ text: "New community event scheduled successfully!", type: "success" });
    } catch (err: any) {
      setStatusMsg({ text: err?.message || "Scheduler failed.", type: "error" });
    }
  };

  const handleRSVPEvent = async (evtId: string) => {
    try {
      const res = await fetch(`/api/events/${evtId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        setEvents(events.map(e => e.id === evtId ? { ...e, attendees: data.attendees } : e));
      }
    } catch (err) {
      console.error("RSVP error:", err);
    }
  };

  // Mock analytics arrays reflecting premium activity metrics
  const activeUserData = [
    { hour: "08:00", users: 12 },
    { hour: "10:00", users: 24 },
    { hour: "12:00", users: 56 },
    { hour: "14:00", users: 42 },
    { hour: "16:00", users: 84 },
    { hour: "18:00", users: 140 },
    { hour: "20:00", users: 110 },
    { hour: "22:00", users: 65 }
  ];

  const channelActivityData = [
    { channel: "#general-chat", messages: 180 },
    { channel: "#ai-playground", messages: 240 },
    { channel: "#welcome-and-rules", messages: 5 },
    { channel: "#dev-logs", messages: 45 }
  ];

  return (
    <div id="redcoad-server-settings" className="fixed inset-0 bg-black/90 p-4 md:p-8 flex justify-center items-center z-50">
      
      {/* Settings Card */}
      <div className="max-w-5xl w-full h-[85vh] bg-zinc-900 border border-zinc-850 rounded-2xl shadow-3xl text-left overflow-hidden flex flex-col md:flex-row divide-x divide-zinc-850">
        
        {/* Left Sub Tabs Navigation Sidebar */}
        <div className="w-full md:w-56 bg-zinc-900/60 p-4 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-4">
            <div className="px-2 truncate">
              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-550 block mb-0.5">Settings Dashboard</span>
              <h3 className="text-white text-sm font-extrabold truncate">{activeCommunity.name}</h3>
            </div>

            {/* Selector list */}
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 font-sans text-xs">
              <button
                onClick={() => { setActiveTab("general"); setStatusMsg(null); }}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded transition-colors text-left font-bold shrink-0 cursor-pointer ${
                  activeTab === "general" ? "bg-red-950/20 text-red-500 border border-red-900/40" : "text-zinc-450 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                <Settings className="h-4.5 w-4.5" />
                <span>General Profile</span>
              </button>

              <button
                onClick={() => { setActiveTab("events"); setStatusMsg(null); }}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded transition-colors text-left font-bold shrink-0 cursor-pointer ${
                  activeTab === "events" ? "bg-red-950/20 text-red-500 border border-red-900/40" : "text-zinc-450 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                <Calendar className="h-4.5 w-4.5" />
                <span>Community Events</span>
              </button>

              <button
                onClick={() => { setActiveTab("logs"); setStatusMsg(null); }}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded transition-colors text-left font-bold shrink-0 cursor-pointer ${
                  activeTab === "logs" ? "bg-red-950/20 text-red-500 border border-red-900/40" : "text-zinc-450 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                <ShieldAlert className="h-4.5 w-4.5" />
                <span>Audit Security Logs</span>
              </button>

              <button
                onClick={() => { setActiveTab("analytics"); setStatusMsg(null); }}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded transition-colors text-left font-bold shrink-0 cursor-pointer ${
                  activeTab === "analytics" ? "bg-red-950/20 text-red-500 border border-red-900/40" : "text-zinc-450 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                <BarChart3 className="h-4.5 w-4.5" />
                <span>analytics hub</span>
              </button>

              <button
                onClick={() => { setActiveTab("roles"); setStatusMsg(null); }}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded transition-colors text-left font-bold shrink-0 cursor-pointer ${
                  activeTab === "roles" ? "bg-red-950/20 text-red-500 border border-red-900/40" : "text-zinc-450 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                <UserCheck className="h-4.5 w-4.5" />
                <span>Roles & Permissions</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded text-xs text-center cursor-pointer uppercase transition-transform active:scale-98"
          >
            Exit Control Panel
          </button>
        </div>

        {/* Right Active pane workspace */}
        <div className="flex-1 bg-zinc-950/50 p-6 overflow-y-auto">
          
          {/* Diagnostic alert message banner */}
          {statusMsg && (
            <div className={`p-3 rounded-lg text-xs font-mono mb-4 flex items-center space-x-2 border animate-fade-in ${
              statusMsg.type === "success" 
                ? "bg-emerald-950/30 border-emerald-900 text-emerald-400" 
                : "bg-red-950/30 border-red-900 text-red-400"
            }`}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* GENERAL PROFILE PANE */}
          {activeTab === "general" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-white text-base font-extrabold flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-red-500" />
                  <span>General Community Profile</span>
                </h2>
                <p className="text-zinc-500 text-xs mt-0.5">Customize public meta labels of your workspace. Changes will log instantly.</p>
              </div>

              <form onSubmit={handleGeneralSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-400 tracking-wider mb-1.5">Server Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-400 tracking-wider mb-1.5">Sever Description Summary</label>
                  <textarea
                    rows={4}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 text-sm resize-none"
                  />
                </div>

                <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-2 select-none">
                  <span className="block text-[10px] uppercase font-mono text-zinc-450 tracking-wide">Invite Gate Authorization details:</span>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Invite Code</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Use this static code for quick member joins</span>
                    </div>
                    <span className="bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 font-mono text-red-500 font-bold uppercase rounded text-sm tracking-widest">{activeCommunity.inviteCode}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase px-5 py-2.5 rounded shadow shadow-red-500/10 transition-transform cursor-pointer"
                >
                  Save changes
                </button>
              </form>
            </div>
          )}

          {/* COMMUNITY EVENTS SCHEDULER PANE */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-900 pb-4">
                <div>
                  <h2 className="text-white text-base font-extrabold flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-red-500" />
                    <span>Coordinate Community Events</span>
                  </h2>
                  <p className="text-zinc-500 text-xs mt-0.5">Post and register upcoming Demonstration sessions and general server briefings.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Event Creation Form */}
                <div className="space-y-4 bg-zinc-900/40 p-5 border border-zinc-850 rounded-xl max-w-sm">
                  <span className="block text-[10px] uppercase font-mono text-zinc-400 tracking-wider">Schedule Event +</span>
                  
                  <form onSubmit={handleCreateEvent} className="space-y-3">
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-zinc-500 mb-1">Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gaming lounge championship"
                        value={evtTitle}
                        onChange={(e) => setEvtTitle(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-zinc-500 mb-1">Location Details</label>
                      <input
                        type="text"
                        required
                        placeholder="Lobby Voice channels or IRL"
                        value={evtLocation}
                        onChange={(e) => setEvtLocation(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-zinc-500 mb-1">Schedule date Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={evtTime}
                        onChange={(e) => setEvtTime(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-zinc-500 mb-1">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Brief agenda layout..."
                        value={evtDesc}
                        onChange={(e) => setEvtDesc(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-red-500 resize-none animate-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-red-650 hover:bg-red-550 text-white font-bold text-xs uppercase tracking-wide rounded select-none cursor-pointer"
                    >
                      Publish Event
                    </button>
                  </form>
                </div>

                {/* Event listings */}
                <div className="space-y-3.5">
                  <span className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Scheduled events queue ({events.length})</span>
                  
                  {events.map(e => {
                    const rsvp = e.attendees.includes(currentUser.id);
                    const formattedDate = new Date(e.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                    
                    return (
                      <div key={e.id} className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-3 animate-fade-in text-left">
                        <div>
                          <h4 className="text-white text-sm font-bold font-sans">{e.title}</h4>
                          <p className="text-zinc-500 text-xs mt-1">{e.description || "Agenda detail is pending allocation."}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 bg-zinc-950/50 p-2 border border-zinc-900 rounded">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-red-500" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="flex items-center space-x-1 truncate">
                            <MapPin className="h-3 w-3 text-red-500" />
                            <span className="truncate">{e.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-850 pt-2 text-xs">
                          <div className="flex items-center space-x-1.5 text-zinc-500 text-[10px] font-mono">
                            <Users className="h-3.5 w-3.5" />
                            <span>{e.attendees.length} RSVPs</span>
                          </div>

                          <button
                            onClick={() => handleRSVPEvent(e.id)}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase cursor-pointer tracking-wider flex items-center space-x-1 transition-colors ${
                              rsvp 
                                ? "bg-emerald-950/40 border border-emerald-900 text-emerald-400" 
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-350"
                            }`}
                          >
                            {rsvp ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Going</span>
                              </>
                            ) : (
                              <span>RSVP</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {events.length === 0 && (
                    <div className="py-12 border border-dashed border-zinc-850 text-center rounded-xl">
                      <Clock className="h-8 w-8 mx-auto text-zinc-750 block animate-pulse mb-1" />
                      <span className="text-zinc-600 font-sans text-xs">Queue empty. Use scheduling board to draft activities.</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* AUDIT LOGS SECURITY HISTORY PANE */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white text-base font-extrabold flex items-center space-x-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  <span>Administrative Audit History</span>
                </h2>
                <p className="text-zinc-500 text-xs mt-0.5">Permanent immutable trace registry monitoring community additions, joins, and automated moderating.</p>
              </div>

              {/* Logs loop scroller */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                {logs.map((log) => {
                  const stamp = new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
                  return (
                    <div
                      key={log.id}
                      className="bg-zinc-900/60 p-3.5 rounded-lg border border-zinc-855 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fade-in hover:border-zinc-800"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 text-red-500 text-[9px] font-semibold uppercase tracking-wider rounded shrink-0">{log.action}</span>
                        <span className="text-zinc-300 font-sans font-medium line-clamp-1">{log.details}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-zinc-550 text-[10px] shrink-0 self-end sm:self-center">
                        <span>@{log.username}</span>
                        <span>•</span>
                        <span>{stamp}</span>
                      </div>
                    </div>
                  );
                })}

                {logs.length === 0 && (
                  <div className="py-16 text-center border border-dashed border-zinc-850 rounded-xl">
                    <ShieldAlert className="h-8 w-8 mx-auto text-zinc-750 block animate-ping mb-1" />
                    <span className="text-zinc-600 font-sans text-xs">Query compiled. No system logs cataloged yet.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS SUBPANE INTERACTIVE RECHARTS */}
          {activeTab === "analytics" && (
            <div className="space-y-6 select-none animate-fade-in">
              <div>
                <h2 className="text-white text-base font-extrabold flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-red-500" />
                  <span>Real-time Community telemetry</span>
                </h2>
                <p className="text-zinc-500 text-xs mt-0.5">Visualizing active users and frequency indicators inside REDCOAD server context.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Hourly Area stats line chart */}
                <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Mutual Users Connection load (Hourly)</span>
                    <span className="block text-2xl text-white font-extrabold mt-0.5">140 peak <span className="text-xs text-red-400 font-mono uppercase font-normal">(Session active)</span></span>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activeUserData} margin={{ top: 2, right: 3, left: -25, bottom: 2 }}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="hour" stroke="#71717a" fontSize={9} fontClass="font-mono" />
                        <YAxis stroke="#71717a" fontSize={9} fontClass="font-mono" />
                        <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: 11, color: "#fff" }} />
                        <Area type="monotone" dataKey="users" stroke="#FF3B30" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={1.8} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Message count per text channel bar charts */}
                <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Sync Message frequency load</span>
                    <span className="block text-2xl text-white font-extrabold mt-0.5">465 <span className="text-xs text-zinc-550 font-sans font-normal">Accumulated inputs</span></span>
                  </div>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={channelActivityData} margin={{ top: 2, right: 3, left: -25, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="channel" stroke="#71717a" fontSize={8} />
                        <YAxis stroke="#71717a" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: 11 }} />
                        <Bar dataKey="messages" fill="#FF3B30" opacity={0.8} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Roles division segment cards */}
              <div className="bg-zinc-900/40 p-5 border border-zinc-850 rounded-xl space-y-3 font-sans">
                <span className="block text-[10px] uppercase font-mono text-zinc-400 tracking-wider">Server Role Distribution spectrum</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-zinc-950 p-3.5 border border-zinc-900 rounded-lg">
                    <span className="text-red-500 font-extrabold text-sm uppercase block font-mono">Owner</span>
                    <span className="text-white font-extrabold text-lg mt-0.5 block">1 Profile</span>
                  </div>
                  <div className="bg-zinc-950 p-3.5 border border-zinc-900 rounded-lg">
                    <span className="text-indigo-400 font-extrabold text-sm uppercase block font-mono">Admin</span>
                    <span className="text-white font-extrabold text-lg mt-0.5 block">1 Profile</span>
                  </div>
                  <div className="bg-zinc-950 p-3.5 border border-zinc-900 rounded-lg">
                    <span className="text-emerald-400 font-extrabold text-sm uppercase block font-mono">Mod</span>
                    <span className="text-white font-extrabold text-lg mt-0.5 block">1 Profile</span>
                  </div>
                  <div className="bg-zinc-950 p-3.5 border border-zinc-900 rounded-lg">
                    <span className="text-zinc-500 font-extrabold text-sm uppercase block font-mono">Members</span>
                    <span className="text-white font-extrabold text-lg mt-0.5 block">15 Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ROLES & CUSTOM PERMISSIONS CONTROL PANEL PANE */}
          {activeTab === "roles" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-white text-base font-extrabold flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-red-500" />
                  <span>Roles & Mutual Permissions</span>
                </h2>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Configure server hierarchies, assign staff tiers, or grant specific operational powers like kicking members and purging chat streams.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[480px]">
                
                {/* Left Side: Members Directory List */}
                <div className="md:col-span-5 bg-zinc-900 border border-zinc-850 rounded-xl flex flex-col overflow-hidden max-h-[500px]">
                  <div className="p-3 border-b border-zinc-850 bg-zinc-900/50 flex items-center space-x-2 shrink-0">
                    <Search className="h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search credentials or roles..."
                      value={rolesSearch}
                      onChange={(e) => setRolesSearch(e.target.value)}
                      className="bg-transparent focus:outline-none text-xs text-white placeholder-zinc-650 w-full"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar-y">
                    {filteredMembers.map((m) => {
                      const isSel = selectedMember?.userId === m.userId;
                      const isOwnerRole = m.role === "owner";
                      const isAdminRole = m.role === "admin";
                      const isModRole = m.role === "moderator";
                      
                      const roleBadgeColor = isOwnerRole 
                        ? "bg-red-950/40 text-red-400 border border-red-900/30"
                        : isAdminRole
                        ? "bg-purple-950/40 text-purple-400 border border-purple-900/30"
                        : isModRole
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                        : "bg-zinc-850/60 text-zinc-400 border border-zinc-800/20";

                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => setSelectedMember(m)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all cursor-pointer text-left ${
                            isSel ? "bg-zinc-850 border border-zinc-750" : "hover:bg-zinc-850/40 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <div className="relative shrink-0">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-mono font-bold uppercase ${m.avatarColor}`}>
                                {m.username.substring(0, 2)}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-zinc-900 ${
                                m.status === "online" ? "bg-emerald-500" : m.status === "idle" ? "bg-amber-500" : "bg-zinc-500"
                              }`} />
                            </div>

                            <div className="min-w-0">
                              <span className="text-white text-xs font-bold block truncate">{m.displayName}</span>
                              <span className="text-zinc-500 text-[10px] font-mono block truncate">@{m.username}</span>
                            </div>
                          </div>

                          <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold shrink-0 ${roleBadgeColor}`}>
                            {m.role}
                          </span>
                        </button>
                      );
                    })}

                    {filteredMembers.length === 0 && (
                      <div className="py-12 text-center">
                        <Users className="h-6 w-6 text-zinc-750 mx-auto block mb-1 animate-pulse" />
                        <span className="text-zinc-600 font-sans text-xs font-bold">No matching members found.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Configuration Stage */}
                <div className="md:col-span-7 bg-zinc-900 border border-zinc-850 rounded-xl flex flex-col overflow-hidden max-h-[500px]">
                  {selectedMember ? (
                    <PermissionsEditor
                      selectedMember={selectedMember}
                      currentUser={currentUser}
                      activeCommunity={activeCommunity}
                      members={members}
                      savingMemberId={savingMemberId}
                      kickingMemberId={kickingMemberId}
                      onSave={handleSaveMemberPermissions}
                      onKick={handleKickMember}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                      <Shield className="h-10 w-10 text-zinc-800 mb-1 animate-pulse" />
                      <span className="text-zinc-600 font-sans text-xs font-bold uppercase tracking-wider block">No Member Loaded</span>
                      <span className="text-zinc-700 text-[10px] max-w-[220px] block mt-1">
                        Select a record from the user roster on the left column to configure custom permission profiles or purge membership.
                      </span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

interface PermissionsEditorProps {
  selectedMember: any;
  currentUser: User;
  activeCommunity: Community;
  members: any[];
  savingMemberId: string | null;
  kickingMemberId: string | null;
  onSave: (targetUserId: string, role: string, permissions: string[]) => Promise<void>;
  onKick: (targetUserId: string) => Promise<void>;
}

function PermissionsEditor({
  selectedMember,
  currentUser,
  activeCommunity,
  members,
  savingMemberId,
  kickingMemberId,
  onSave,
  onKick
}: PermissionsEditorProps) {
  const isOwner = activeCommunity.ownerId === currentUser.id;
  const myMemberObj = members.find((m: any) => m.userId === currentUser.id);
  const myRole = isOwner ? "owner" : (myMemberObj ? myMemberObj.role : "member");
  const canManageRoles = myRole === "owner" || myRole === "admin";

  const canModifySelected = (member: any) => {
    if (!canManageRoles) return false;
    if (member.userId === currentUser.id) return false;
    if (member.role === "owner" || member.userId === activeCommunity.ownerId) return false;
    
    if (myRole === "admin" && (member.role === "admin" || member.role === "owner")) {
      return false;
    }
    return true;
  };

  const [selectedRoleState, setSelectedRoleState] = useState<string>("member");
  const [selectedPermsState, setSelectedPermsState] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMember) {
      setSelectedRoleState(selectedMember.role || "member");
      setSelectedPermsState(selectedMember.permissions || []);
    }
  }, [selectedMember]);

  const ALL_PERMISSIONS = [
    {
      id: "manage_messages",
      name: "Manage Messages",
      desc: "Allows deletion of other members' text and announcement messages."
    },
    {
      id: "kick_users",
      name: "Kick Users",
      desc: "Instantly disconnect and remove non-staff members from this community."
    },
    {
      id: "manage_channels",
      name: "Manage Channels",
      desc: "Permits creation, alteration, and permanent deletion of channels."
    },
    {
      id: "manage_events",
      name: "Manage Events",
      desc: "Coordinate and publish active timed events and scheduled assemblies."
    }
  ];

  const editable = canModifySelected(selectedMember);

  const handleTogglePerm = (permId: string) => {
    if (!editable) return;
    if (selectedPermsState.includes(permId)) {
      setSelectedPermsState(selectedPermsState.filter(p => p !== permId));
    } else {
      setSelectedPermsState([...selectedPermsState, permId]);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 space-y-5 no-scrollbar overflow-y-auto">
      <div className="space-y-5">
        
        {/* Profile header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div className="flex items-center space-x-3">
            <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold uppercase ${selectedMember.avatarColor}`}>
              {selectedMember.username ? selectedMember.username.substring(0, 2) : "ME"}
            </div>
            <div>
              <div className="flex items-center space-x-2 text-left">
                <h3 className="text-white text-sm font-extrabold">{selectedMember.displayName}</h3>
                <span className="bg-zinc-950 px-2 py-0.5 rounded font-mono text-[9px] text-zinc-500 uppercase">
                  {selectedMember.role}
                </span>
              </div>
              <span className="text-zinc-500 text-xs font-mono block text-left">@{selectedMember.username}</span>
            </div>
          </div>

          {!editable && (
            <div className="bg-amber-950/20 border border-amber-900/30 rounded px-2.5 py-1 text-[10px] text-amber-500 flex items-center space-x-1.5 shrink-0 max-w-[180px]">
              <Shield className="h-3 w-3 shrink-0" />
              <span className="truncate">Read-only security access</span>
            </div>
          )}
        </div>

        {/* Staff role assignation cards */}
        <div className="space-y-2">
          <span className="block text-[10px] uppercase font-mono text-zinc-400 tracking-wider">Server Role Tier selection</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: "admin", name: "Admin", desc: "Superintendent of server controls", color: "text-purple-400" },
              { id: "moderator", name: "Moderator", desc: "Monitors and balances forums", color: "text-emerald-400" },
              { id: "member", name: "Member", desc: "Standard community access level", color: "text-zinc-400" }
            ].map((rObj) => {
              const isChecked = selectedRoleState === rObj.id;
              
              return (
                <button
                  type="button"
                  key={rObj.id}
                  disabled={!editable}
                  onClick={() => setSelectedRoleState(rObj.id)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all select-none ${
                    isChecked
                      ? "bg-zinc-950 border-red-500/50 shadow shadow-red-500/5"
                      : "bg-zinc-950/20 border-zinc-850 hover:bg-zinc-950 hover:border-zinc-800"
                  } ${!editable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-extrabold font-mono ${rObj.color}`}>{rObj.name}</span>
                    {isChecked && <Check className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <span className="text-[9px] text-zinc-500 block mt-1 leading-snug">{rObj.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Permissions checklists */}
        <div className="space-y-2 pt-1">
          <span className="block text-[10px] uppercase font-mono text-zinc-400 tracking-wider">Custom Granted Permissions</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_PERMISSIONS.map((perm) => {
              const isGranted = selectedPermsState.includes(perm.id);

              return (
                <div
                  key={perm.id}
                  onClick={() => handleTogglePerm(perm.id)}
                  className={`p-2.5 rounded-lg border text-left flex items-start space-x-2.5 transition-all select-none ${
                    isGranted
                      ? "bg-zinc-950 border-zinc-750 font-sans"
                      : "bg-zinc-950/10 border-zinc-850/55 hover:bg-zinc-950 hover:border-zinc-800 font-sans"
                  } ${editable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                >
                  <div className="pt-0.5 shrink-0">
                    <div className={`h-4 w-4 rounded border border-zinc-700 flex items-center justify-center transition-all ${
                      isGranted ? "bg-red-600 border-red-500" : "bg-zinc-900"
                    }`}>
                      {isGranted && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-white block">{perm.name}</span>
                    <span className="text-[9px] text-zinc-500 block leading-tight mt-0.5">{perm.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Control Panel Action Deck (Danger Zone Included!) */}
      <div className="border-t border-zinc-850 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        {editable ? (
          <>
            {/* Danger Zone: Kick out */}
            <button
              type="button"
              onClick={() => onKick(selectedMember.userId)}
              disabled={kickingMemberId !== null}
              className="px-4 py-2 bg-red-950/20 hover:bg-red-950/50 text-red-500 border border-red-900/30 text-xs font-bold uppercase rounded flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <UserMinus className="h-4 w-4" />
              <span>{kickingMemberId === selectedMember.userId ? "Kicking..." : "Kick Member"}</span>
            </button>

            {/* Save changes */}
            <button
              type="button"
              disabled={savingMemberId !== null}
              onClick={() => onSave(selectedMember.userId, selectedRoleState, selectedPermsState)}
              className="w-full sm:w-auto bg-red-650 hover:bg-red-550 disabled:bg-zinc-800 text-white font-extrabold text-xs uppercase px-5 py-2 rounded shadow tracking-wider transition-colors cursor-pointer"
            >
              {savingMemberId === selectedMember.userId ? "Saving..." : "Save Member Permissions"}
            </button>
          </>
        ) : (
          <span className="text-[10px] text-zinc-550 font-mono italic">
            Hierarchy security restricts edits to equal/superordinate users.
          </span>
        )}
      </div>

    </div>
  );
}
