import React, { useState, useEffect, useRef } from "react";
import { User, Community, Channel, Message, VoiceState, Friend, Poll } from "./types";
import AuthLayout from "./components/AuthLayout";
import SidebarServer from "./components/SidebarServer";
import SidebarChannels from "./components/SidebarChannels";
import ChatPanel from "./components/ChatPanel";
import VoiceRoom from "./components/VoiceRoom";
import FriendsTab from "./components/FriendsTab";
import ServerSettings from "./components/ServerSettings";
import { MessageSquare, Users, ShieldAlert, Radio, HelpCircle, Activity, Globe, Compass } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // App primary state
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Real-time voice parameters
  const [globalVoiceStates, setGlobalVoiceStates] = useState<VoiceState[]>([]);
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isVoiceDeafened, setIsVoiceDeafened] = useState(false);

  // Sync state loop pings
  const [friends, setFriends] = useState<Friend[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeTypingUsers, setActiveTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);

  // Panels configs
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPrivateFriendChat, setSelectedPrivateFriendChat] = useState<Friend | null>(null);

  // Initial local loading
  const [initialLoading, setInitialLoading] = useState(true);

  // Persist session locally
  useEffect(() => {
    const savedUser = localStorage.getItem("redcoad_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      } catch (e) {
        localStorage.removeItem("redcoad_user");
      }
    }
    setInitialLoading(false);
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("redcoad_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" })
      .finally(() => {
        setCurrentUser(null);
        setActiveCommunity(null);
        setActiveChannel(null);
        setConnectedVoiceChannelId(null);
        localStorage.removeItem("redcoad_user");
      });
  };

  // Real-time synchronization interval loop: Pings /api/sync every 1100ms
  useEffect(() => {
    if (!currentUser) return;

    let isActive = true;

    const performSyncCycle = async () => {
      try {
        const isCurrentlyTyping = (window as any).isTypingRef === true;
        if (isCurrentlyTyping) {
          // Reset global writing trigger ref
          (window as any).isTypingRef = false;
        }

         const payload = {
          userId: currentUser.id,
          activeCommunityId: activeCommunity?.id || null,
          activeChannelId: activeChannel?.id || (selectedPrivateFriendChat ? `dm-${selectedPrivateFriendChat.id}` : null),
          connectedVoiceChannelId: connectedVoiceChannelId || null,
          isMuted: isVoiceMuted,
          isDeafened: isVoiceDeafened,
          typingStatus: isCurrentlyTyping,
          privateFriendId: selectedPrivateFriendChat?.id || null
        };

        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Sync cycle broken");
        const data = await res.json();

        if (!isActive) return;

        // Auto balance states returned from background simulator!
        if (data.communities) setCommunities(data.communities);
        if (data.channels) setChannels(data.channels);
        if (data.messages) setMessages(data.messages);
        if (data.voiceStates) setGlobalVoiceStates(data.voiceStates);
        if (data.friends) setFriends(data.friends);
        if (data.members) setCommunityMembers(data.members);
        if (data.activeTypingUsers) setActiveTypingUsers(data.activeTypingUsers);
        if (data.polls) setPolls(data.polls);

        // Update local user state representation in case status updated
        if (data.updatedUser) {
          setCurrentUser(data.updatedUser);
        }
      } catch (err) {
        console.error("REDCOAD background sync ticker error:", err);
      }
    };

    // Execute first run immediately, then recurring
    performSyncCycle();
    const interval = setInterval(performSyncCycle, 1100);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [currentUser, activeCommunity, activeChannel, connectedVoiceChannelId, isVoiceMuted, isVoiceDeafened, selectedPrivateFriendChat]);

  // Handle active channel switches
  const handleSelectChannel = (chan: Channel) => {
    // If voice channel clicked, connect instantly
    if (chan.type === "voice") {
      setConnectedVoiceChannelId(chan.id);
      setActiveChannel(chan);
    } else {
      setActiveChannel(chan);
    }
    setSelectedPrivateFriendChat(null);
  };

  // Set selected DM thread
  const handleSelectPrivateChat = (friendObj: Friend) => {
    setSelectedPrivateFriendChat(friendObj);
    setActiveCommunity(null);
    setActiveChannel(null);
  };

  // Switch community hubs
  const handleSelectCommunity = (comm: Community | null) => {
    setActiveCommunity(comm);
    setSelectedPrivateFriendChat(null);
    if (!comm) {
      setActiveChannel(null);
    } else {
      // Auto-choose General channel in community if available
      fetch(`/api/communities/${comm.id}/channels`)
        .then(res => res.json())
        .then(chans => {
          setChannels(chans);
          const firstTxt = chans.find((c: Channel) => c.type === "text" || c.type === "announcement");
          if (firstTxt) setActiveChannel(firstTxt);
        });
    }
  };

  // Presence controls
  const handleUpdatePresence = async (fields: Partial<User>) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/auth/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, ...fields })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem("redcoad_user", JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("Presence adjustment failed:", err);
    }
  };

  // Direct channel creation dispatch
  const handleCreateChannel = async (name: string, type: "text" | "voice" | "announcement", categoryId: string) => {
    if (!activeCommunity) return;
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, categoryId, creatorId: currentUser?.id })
      });
      const data = await res.json();
      if (res.ok) {
        setChannels([...channels, data.channel]);
      }
    } catch (err) {
      console.error("Channel deployment error:", err);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!activeCommunity || !currentUser) return;
    try {
      const res = await fetch(`/api/communities/${activeCommunity.id}/channels/${channelId}?userId=${currentUser.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        setChannels(channels.filter(c => c.id !== channelId));
        if (activeChannel?.id === channelId) {
          const remaining = channels.filter(c => c.id !== channelId);
          setActiveChannel(remaining[0] || null);
        }
      } else {
        alert(data.error || "Failed to delete channel");
      }
    } catch (err) {
      console.error("Channel deletion error:", err);
    }
  };

  // Server metadata updates
  const handleUpdateCommunity = async (updatedName: string, updatedDesc: string) => {
    if (!activeCommunity) return;
    const res = await fetch(`/api/communities/${activeCommunity.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: updatedName, description: updatedDesc })
    });
    const data = await res.json();
    if (res.ok) {
      setActiveCommunity(data.community);
    } else {
      throw new Error(data.error);
    }
  };

  // Chat message actions dispatch
  const handleSendMessage = async (text: string, attachment?: any) => {
    if (!activeChannel && !selectedPrivateFriendChat) return;
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChannel?.id || null,
          userId: currentUser?.id,
          username: currentUser?.username,
          displayName: currentUser?.displayName,
          text,
          attachment,
          privateFriendId: selectedPrivateFriendChat?.id || null
        })
      });
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const handleEditMessage = async (msgId: string, updatedText: string) => {
    try {
      await fetch(`/api/messages/${msgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: updatedText })
      });
    } catch (err) {
      console.error("Edit message error:", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await fetch(`/api/messages/${msgId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete message error:", err);
    }
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${msgId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id, emoji })
      });
    } catch (err) {
      console.error("Reaction toggle error:", err);
    }
  };

  const handleSendReply = async (parentMsgId: string, replyText: string) => {
    if (!activeChannel && !selectedPrivateFriendChat) return;
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChannel?.id || null,
          userId: currentUser?.id,
          username: currentUser?.username,
          displayName: currentUser?.displayName,
          text: replyText,
          replyToId: parentMsgId,
          privateFriendId: selectedPrivateFriendChat?.id || null
        })
      });
    } catch (err) {
      console.error("Reply sending error:", err);
    }
  };

  // Friend actions selectors
  const handleAddFriendRequest = async (targetUsername: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id, targetUsername })
      });
      const data = await res.json();
      if (!res.ok) return data.error;
      return null;
    } catch (err: any) {
      return err.message;
    }
  };

  const handleFriendAction = async (friendshipId: string, actionChoice: "accept" | "decline" | "block") => {
    try {
      await fetch("/api/friends/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action: actionChoice })
      });
    } catch (err) {
      console.error("Friend action error:", err);
    }
  };

  // Community managers
  const handleCreateCommunityServer = async (serverNameName: string, serverDescDesc: string) => {
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: serverNameName, description: serverDescDesc, ownerId: currentUser?.id })
      });
      const data = await res.json();
      if (res.ok) {
        setCommunities([...communities, data.community]);
        setActiveCommunity(data.community);
        // Load target channel for user
        setChannels(data.channels);
        if (data.channels?.length > 0) setActiveChannel(data.channels[0]);
      }
    } catch (e) {
      console.error("Server deployment fail:", e);
    }
  };

  const handleJoinCommunityServerWithCode = async (code: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/communities/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code, userId: currentUser?.id })
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Authorization error";
      
      setCommunities([...communities, data.community]);
      setActiveCommunity(data.community);
      return null;
    } catch (e: any) {
      return e.message;
    }
  };

  // Poll utilities pings
  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!activeChannel) return;
    try {
      await fetch(`/api/channels/${activeChannel.id}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options, creatorId: currentUser?.id, creatorName: currentUser?.username })
      });
    } catch (e) {
      console.error("Poll post error:", e);
    }
  };

  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    try {
      await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser?.id, optionIndex })
      });
    } catch (e) {
      console.error("Vote poll error:", e);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center font-sans space-y-4">
        <div className="h-12 w-12 border-t-2 border-red-500 rounded-full animate-spin" />
        <span className="text-zinc-500 text-xs font-mono">Syncing system profiles...</span>
      </div>
    );
  }

  // Not logged in -> Show premium credentials layout
  if (!currentUser) {
    return <AuthLayout onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div id="redcoad-applet-root" className="h-screen w-screen overflow-hidden bg-zinc-950 flex items-stretch text-zinc-300 font-sans leading-normal">
      
      {/* 1. Left-most Server guild tray element bubble */}
      <SidebarServer
        currentUser={currentUser}
        communities={communities}
        activeCommunity={activeCommunity}
        onSelectCommunity={handleSelectCommunity}
        onLogout={handleLogout}
        onCreateCommunity={handleCreateCommunityServer}
        onJoinCommunity={handleJoinCommunityServerWithCode}
        onUpdatePresence={handleUpdatePresence}
      />

      {/* 2. Middle channels directories lists or Direct message side elements */}
      {activeCommunity ? (
        <SidebarChannels
          currentUser={currentUser}
          activeCommunity={activeCommunity}
          channels={channels}
          activeChannel={activeChannel}
          onSelectChannel={handleSelectChannel}
          onOpenSettings={() => setShowSettings(true)}
          onCreateChannel={handleCreateChannel}
          globalVoiceStates={globalVoiceStates}
          connectedVoiceChannelId={connectedVoiceChannelId}
          onToggleVoiceMic={() => setIsVoiceMuted(!isVoiceMuted)}
          onToggleVoiceDeafen={() => setIsVoiceDeafened(!isVoiceDeafened)}
          isVoiceMuted={isVoiceMuted}
          isVoiceDeafened={isVoiceDeafened}
          communityMembers={communityMembers}
          onDeleteChannel={handleDeleteChannel}
        />
      ) : (
        /* DM Channels Sidebar list (matches Discord's Home page layout) */
        <div className="w-60 bg-zinc-900/90 flex flex-col border-r border-zinc-850 shrink-0 z-10 select-none text-left">
          <div className="h-14 border-b border-zinc-950 px-4 flex items-center bg-zinc-90 w-full font-bold text-white text-sm">
            <span>Direct Conversations</span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 no-scrollbar">
            {/* Friends Selector menu bubble item */}
            <button
              onClick={() => setSelectedPrivateFriendChat(null)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-bold transition-all cursor-pointer ${
                selectedPrivateFriendChat === null 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-400 hover:bg-zinc-850/60 hover:text-white"
              }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Friends Workspace</span>
            </button>

            {/* List active DM Mutuals to quickly switch */}
            <div className="space-y-1">
              <span className="block text-[10px] text-zinc-550 font-mono uppercase tracking-wider pl-3 py-1 font-semibold">Active Private Chats</span>
              {friends.filter(f => f.status === "accepted").map((frObj) => {
                const isMyDm = selectedPrivateFriendChat?.id === frObj.id;
                
                return (
                  <button
                    key={frObj.id}
                    onClick={() => handleSelectPrivateChat(frObj)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs transition-all cursor-pointer ${
                      isMyDm 
                        ? "bg-zinc-800 text-white font-bold" 
                        : "text-zinc-450 hover:bg-zinc-850/40 hover:text-white"
                    }`}
                  >
                    <div className="relative">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] uppercase font-bold ${frObj.avatarColor}`}>
                        {frObj.username.substring(0, 2)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-zinc-950 ${
                        frObj.onlineStatus === "online" ? "bg-emerald-500" : frObj.onlineStatus === "idle" ? "bg-amber-500" : "bg-zinc-500"
                      }`} />
                    </div>
                    <span className="truncate">@{frObj.username}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Center Workspace Area (Chat panel, voice room dashboard, or Friends hub) */}
      {selectedPrivateFriendChat ? (
        /* Render Private Direct Messages Chat stream */
        <ChatPanel
          currentUser={currentUser}
          activeChannel={{
            id: `dm-${selectedPrivateFriendChat.id}`,
            categoryId: "dm",
            communityId: "dm",
            name: `@${selectedPrivateFriendChat.username}`,
            type: "text",
            isPrivate: true,
            description: `Secure end-to-end encrypted direct discussion log with @${selectedPrivateFriendChat.username}.`
          }}
          activeCommunity={null}
          communityMembers={[]}
          messages={messages}
          activeTypingUsers={activeTypingUsers}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onToggleReaction={handleToggleReaction}
          onSendReply={handleSendReply}
          polls={[]}
          onCreatePoll={async () => {}}
          onVotePoll={async () => {}}
          voiceStates={globalVoiceStates}
        />
      ) : activeCommunity ? (
        /* Inside server community view */
        activeChannel?.type === "voice" && connectedVoiceChannelId === activeChannel.id ? (
          /* Live call space card */
          <VoiceRoom
            currentUser={currentUser}
            activeChannel={activeChannel}
            voiceStates={globalVoiceStates}
            onDisconnect={() => setConnectedVoiceChannelId(null)}
            onUpdateState={async (fields) => {
              try {
                await fetch("/api/voice/state-update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: currentUser.id,
                    channelId: activeChannel.id,
                    ...fields
                  })
                });
              } catch (err) {
                console.error("Failed voice states update:", err);
              }
            }}
            isMuted={isVoiceMuted}
            isDeafened={isVoiceDeafened}
            onToggleMic={() => setIsVoiceMuted(!isVoiceMuted)}
            onToggleDeafen={() => setIsVoiceDeafened(!isVoiceDeafened)}
          />
        ) : activeChannel ? (
          /* Plain Text Chat panel */
          <ChatPanel
            currentUser={currentUser}
            activeChannel={activeChannel}
            activeCommunity={activeCommunity}
            communityMembers={communityMembers}
            messages={messages}
            activeTypingUsers={activeTypingUsers}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onToggleReaction={handleToggleReaction}
            onSendReply={handleSendReply}
            polls={polls.filter(p => p.channelId === activeChannel.id)}
            onCreatePoll={handleCreatePoll}
            onVotePoll={handleVotePoll}
            voiceStates={globalVoiceStates}
          />
        ) : (
          /* Fallback view when channels empty */
          <div className="flex-1 bg-zinc-950 flex flex-col justify-center items-center select-none space-y-2">
            <Radio className="h-10 w-10 text-zinc-700 animate-pulse" />
            <span className="text-xs text-zinc-500 font-sans">Server initialized. Deploy a text channel using sidebar button to begin syncing logs.</span>
          </div>
        )
      ) : (
        /* Home space selector: Friends lists workspace control center */
        <FriendsTab
          currentUser={currentUser}
          friends={friends}
          onAddFriend={handleAddFriendRequest}
          onFriendAction={handleFriendAction}
          onSelectPrivateChat={handleSelectPrivateChat}
        />
      )}

      {/* 4. Settings Dashboard Panel Overlay (Audit logs scheduler, dynamic charts with Recharts) */}
      {showSettings && activeCommunity && (
        <ServerSettings
          currentUser={currentUser}
          activeCommunity={activeCommunity}
          onUpdateCommunity={handleUpdateCommunity}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  );
}
