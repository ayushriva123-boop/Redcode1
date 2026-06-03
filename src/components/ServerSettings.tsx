import React, { useState, useEffect } from "react";
import { Community, AuditLog, CommunityEvent, User } from "../types";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calendar, ShieldAlert, BarChart3, Settings, Users, Plus, AlertCircle, Clock, MapPin, Check, UserCheck } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"general" | "events" | "logs" | "analytics">("general");
  
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

        </div>

      </div>

    </div>
  );
}
