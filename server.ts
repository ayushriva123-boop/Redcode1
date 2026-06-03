import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db-data.json");

// Define in-memory storage interfaces
interface UserData {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string; // Dynamic simulated auth
  avatarColor: string;
  avatarUrl?: string;
  status: "online" | "idle" | "dnd" | "offline";
  customStatus?: string;
  createdAt: string;
}

interface CommunityData {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  iconColor: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  categories: { id: string; name: string }[];
}

interface ChannelData {
  id: string;
  communityId: string;
  categoryId: string;
  name: string;
  type: "text" | "voice" | "announcement";
  isPrivate: boolean;
  allowedRoles?: string[];
  description?: string;
}

interface MessageData {
  id: string;
  channelId: string;
  userId: string;
  userDisplayName: string;
  userAvatarColor: string;
  text: string;
  timestamp: string;
  reactions?: { emoji: string; userIds: string[] }[];
  parentId?: string;
  isEdited?: boolean;
  aiTranslated?: { [lang: string]: string };
  aiModerated?: boolean;
  attachment?: {
    name: string;
    url: string;
    type: "image" | "file" | "video";
    size: string;
  };
}

interface VoiceStateData {
  userId: string;
  channelId: string;
  communityId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
  username: string; // for easier client rendering
  avatarColor: string;
}

interface FriendData {
  id: string;
  userId: string;
  friendId: string;
  status: "pending_sent" | "pending_received" | "accepted" | "blocked";
}

interface CommunityMemberData {
  userId: string;
  communityId: string;
  role: "owner" | "admin" | "moderator" | "member";
  joinedAt: string;
}

interface CommunityEventData {
  id: string;
  communityId: string;
  title: string;
  description: string;
  startTime: string;
  location: string;
  creatorId: string;
  attendees: string[];
}

interface PollData {
  id: string;
  channelId: string;
  question: string;
  options: string[];
  votes: { [optionIndex: number]: string[] }; // optionIndex -> userIds
  creatorId: string;
  creatorName: string;
  createdAt: string;
}

interface AuditLogData {
  id: string;
  communityId: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

interface SchemaDB {
  users: UserData[];
  communities: CommunityData[];
  channels: ChannelData[];
  messages: MessageData[];
  friends: FriendData[];
  members: CommunityMemberData[];
  events: CommunityEventData[];
  polls: PollData[];
  auditLogs: AuditLogData[];
}

// Active UI runtime variables (not persisted)
let activeVoiceStates: VoiceStateData[] = [];
let typingStatus: { [channelId: string]: { userId: string; username: string; timestamp: number }[] } = {};

// Default initial database content
const INITIAL_DB: SchemaDB = {
  users: [
    {
      id: "user-ai-bot",
      username: "redcoad_ai",
      displayName: "REDCOAD AI Assistant",
      email: "ai@redcoad.io",
      passwordHash: "secure",
      avatarColor: "bg-red-600 border border-white/20",
      avatarUrl: "🤖",
      status: "online",
      customStatus: "AI power dynamic online • Connect. Collaborate. Communicate.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-alan",
      username: "alan_turing",
      displayName: "Alan Turing",
      email: "alan@redcoad.io",
      passwordHash: "secure",
      avatarColor: "bg-teal-600",
      status: "online",
      customStatus: "Cracking the enigma of connection...",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-ada",
      username: "ada_lovelace",
      displayName: "Ada Lovelace",
      email: "ada@redcoad.io",
      passwordHash: "secure",
      avatarColor: "bg-purple-600",
      status: "idle",
      customStatus: "Weaving algebraical patterns",
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-grace",
      username: "grace_hopper",
      displayName: "Grace Hopper",
      email: "grace@redcoad.io",
      passwordHash: "secure",
      avatarColor: "bg-amber-600",
      status: "dnd",
      customStatus: "It is easier to ask forgiveness than dynamic permission",
      createdAt: new Date().toISOString(),
    }
  ],
  communities: [
    {
      id: "community-hq",
      name: "REDCOAD Headquarters",
      description: "Primary server for connection, discussion, and design updates on REDCOAD platform.",
      iconColor: "bg-red-500 text-white font-bold font-sans",
      ownerId: "user-ai-bot",
      inviteCode: "REDCOAD100",
      createdAt: new Date().toISOString(),
      categories: [
        { id: "cat-info", name: "⚠️ Information" },
        { id: "cat-text", name: "💬 Text Lounge" },
        { id: "cat-voice", name: "🔊 Voice Rooms" }
      ]
    },
    {
      id: "community-science",
      name: "Futurism & Tech",
      description: "Discuss quantum tech, space, and developer paradigms.",
      iconColor: "bg-slate-800 text-red-500 font-bold border border-red-500/20",
      ownerId: "user-alan",
      inviteCode: "TECHSOURCE",
      createdAt: new Date().toISOString(),
      categories: [
        { id: "cat-sci-info", name: "Welcome" },
        { id: "cat-sci-general", name: "Discussions" }
      ]
    }
  ],
  channels: [
    {
      id: "chan-welcome",
      communityId: "community-hq",
      categoryId: "cat-info",
      name: "welcome-and-rules",
      type: "announcement",
      isPrivate: false,
      description: "Welcome to REDCOAD! The next-gen real-time communication platform."
    },
    {
      id: "chan-general",
      communityId: "community-hq",
      categoryId: "cat-text",
      name: "general-chat",
      type: "text",
      isPrivate: false,
      description: "Our primary main thread. Speak freely!"
    },
    {
      id: "chan-ai-playground",
      communityId: "community-hq",
      categoryId: "cat-text",
      name: "ai-playground",
      type: "text",
      isPrivate: false,
      description: "Interact directly with REDCOAD AI! Mention @redcoad_ai or write queries."
    },
    {
      id: "chan-voice-lobby",
      communityId: "community-hq",
      categoryId: "cat-voice",
      name: "REDCOAD Core Lobby",
      type: "voice",
      isPrivate: false
    },
    {
      id: "chan-voice-gaming",
      communityId: "community-hq",
      categoryId: "cat-voice",
      name: "Ultra Gaming Lounge",
      type: "voice",
      isPrivate: false
    },
    // Science Community channels
    {
      id: "chan-sci-welcome",
      communityId: "community-science",
      categoryId: "cat-sci-info",
      name: "welcome-station",
      type: "announcement",
      isPrivate: false
    },
    {
      id: "chan-sci-general",
      communityId: "community-science",
      categoryId: "cat-sci-general",
      name: "deep-tech-talk",
      type: "text",
      isPrivate: false,
      description: "Quantum networking, compilers, and hardware designs."
    }
  ],
  messages: [
    {
      id: "msg-welcome-1",
      channelId: "chan-welcome",
      userId: "user-ai-bot",
      userDisplayName: "REDCOAD AI Assistant",
      userAvatarColor: "bg-red-600 border border-white/20",
      text: "💥 **Welcome to REDCOAD** — a futuristic community platform designed with an ultra-premium dark theme, robust file-based database syncing, real-time message feeds, active simulated voice channels, and native server-side Gemini AI features! 🌌 Here you can test everything from chats, emojis, custom statuses, audits, and real translation.",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "msg-gen-1",
      channelId: "chan-general",
      userId: "user-alan",
      userDisplayName: "Alan Turing",
      userAvatarColor: "bg-teal-600",
      text: "Hello everyone, the platform looks astonishingly slick! The Red and Charcoal palette feels highly professional. Checking the voice channel states and performance metrics.",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      reactions: [
        { emoji: "🔥", userIds: ["user-ai-bot", "user-ada"] },
        { emoji: "🚀", userIds: ["user-grace"] }
      ]
    },
    {
      id: "msg-gen-2",
      channelId: "chan-general",
      userId: "user-grace",
      userDisplayName: "Grace Hopper",
      userAvatarColor: "bg-amber-600",
      text: "Agreed. First compiled test is completely clean. Make sure to try out the AI chat in #ai-playground or click the Summary button on top of general-chat to see what we've been up to!",
      timestamp: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  friends: [],
  members: [
    { userId: "user-ai-bot", communityId: "community-hq", role: "owner", joinedAt: new Date().toISOString() },
    { userId: "user-alan", communityId: "community-hq", role: "admin", joinedAt: new Date().toISOString() },
    { userId: "user-ada", communityId: "community-hq", role: "moderator", joinedAt: new Date().toISOString() },
    { userId: "user-grace", communityId: "community-hq", role: "member", joinedAt: new Date().toISOString() },
    // Science hub members
    { userId: "user-alan", communityId: "community-science", role: "owner", joinedAt: new Date().toISOString() },
    { userId: "user-ada", communityId: "community-science", role: "member", joinedAt: new Date().toISOString() }
  ],
  events: [
    {
      id: "evt-welcome",
      communityId: "community-hq",
      title: "REDCOAD Platform Demonstration",
      description: "Live preview of high-fidelity responsive layout, mock WebRTC screensharing, real-time sync mechanism, and our Gemini smart summary toolkit.",
      startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
      location: "REDCOAD Core Lobby (Voice Channel)",
      creatorId: "user-ai-bot",
      attendees: ["user-alan", "user-grace"]
    }
  ],
  polls: [
    {
      id: "poll-1",
      channelId: "chan-general",
      question: "Which feature of REDCOAD are you most excited to try out?",
      options: [
        "Server-Side Gemini AI (Summary/Translate)",
        "Premium Low-Latency Dark UI Panels",
        "Mock WebRTC Voice Room & Screenshare Waveforms",
        "Robust File-backed Event Coordination Engine"
      ],
      votes: {
        0: ["user-alan", "user-ai-bot"],
        1: ["user-ada", "user-grace"],
        2: [],
        3: []
      },
      creatorId: "user-ai-bot",
      creatorName: "REDCOAD AI Assistant",
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  auditLogs: [
    {
      id: "audit-1",
      communityId: "community-hq",
      userId: "user-ai-bot",
      username: "redcoad_ai",
      action: "COMMUNITY_CREATED",
      details: "Database bootstrapping created REDCOAD Headquarters server.",
      timestamp: new Date().toISOString()
    }
  ]
};

// Database read / write persistence handlers
let dbData: SchemaDB = { ...INITIAL_DB };

function loadDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2));
      dbData = { ...INITIAL_DB };
      console.log("[DB] Created file-based database:", DB_FILE);
    } else {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      dbData = JSON.parse(data);
      console.log("[DB] Loaded existing data from:", DB_FILE);
    }
  } catch (err) {
    console.error("[DB] Failed reading system database, using fallback memory state:", err);
    dbData = { ...INITIAL_DB };
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
  } catch (err) {
    console.error("[DB] Critical error saving database:", err);
  }
}

// Clean up typing status periodically (remove old than 5 seconds)
setInterval(() => {
  const cutoff = Date.now() - 5000;
  for (const cid in typingStatus) {
    typingStatus[cid] = typingStatus[cid].filter(t => t.timestamp > cutoff);
  }
}, 3000);

// Lazy Gemini API instantiation
let aiClient: any = null;
function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Autonomic simple audit log entry
function addAuditLog(communityId: string, userId: string, username: string, action: string, details: string) {
  const newLog: AuditLogData = {
    id: "log-" + crypto.randomUUID(),
    communityId,
    userId,
    username,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  dbData.auditLogs.unshift(newLog);
  // Keep logs capped at last 500 to save space
  if (dbData.auditLogs.length > 500) {
    dbData.auditLogs = dbData.auditLogs.slice(0, 500);
  }
  saveDatabase();
}

// Start Server Core
async function startServer() {
  loadDatabase();

  const app = express();
  app.use(express.json());

  // API ROUTING

  // Authentication REST APIs
  app.post("/api/auth/register", (req, res) => {
    const { username, displayName, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing mandatory registration variables." });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    
    // Check duplication
    const exists = dbData.users.find(u => u.username === cleanUsername || u.email === email);
    if (exists) {
      return res.status(400).json({ error: "Username or email is already registered." });
    }

    const newUser: UserData = {
      id: "user-" + crypto.randomUUID(),
      username: cleanUsername,
      displayName: displayName ? displayName.trim() : username.trim(),
      email: email.trim(),
      passwordHash: password, // Simple plain string simulated hash
      avatarColor: ["bg-red-500", "bg-orange-500", "bg-sky-500", "bg-indigo-500", "bg-pink-500", "bg-emerald-500"][Math.floor(Math.random() * 6)],
      status: "online",
      createdAt: new Date().toISOString()
    };

    dbData.users.push(newUser);
    
    // Automatically make user join community-hq
    dbData.members.push({
      userId: newUser.id,
      communityId: "community-hq",
      role: "member",
      joinedAt: new Date().toISOString()
    });

    addAuditLog("community-hq", newUser.id, newUser.username, "USER_REGISTERED", `New user profile registree: @${newUser.username}`);
    saveDatabase();

    res.json({ success: true, user: newUser });
  });

  app.post("/api/auth/login", (req, res) => {
    const { loginKey, password } = req.body; // username or email
    if (!loginKey || !password) {
      return res.status(400).json({ error: "Required fields missing." });
    }

    const cleanKey = loginKey.trim().toLowerCase();
    const matched = dbData.users.find(u => u.username === cleanKey || u.email === cleanKey);

    if (!matched || matched.passwordHash !== password) {
      return res.status(401).json({ error: "Invalid username, email, or password payload." });
    }

    // Set online
    matched.status = "online";
    saveDatabase();

    res.json({ success: true, user: matched });
  });

  app.post("/api/auth/logout", (req, res) => {
    const { userId } = req.body;
    const user = dbData.users.find(u => u.id === userId);
    if (user) {
      user.status = "offline";
      saveDatabase();
    }
    res.json({ success: true });
  });

  app.post("/api/auth/update", (req, res) => {
    const { userId, displayName, status, customStatus, avatarColor } = req.body;
    const user = dbData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Profile user not found." });
    }

    if (displayName) user.displayName = displayName.trim().substring(0, 50);
    if (status) user.status = status;
    if (customStatus !== undefined) user.customStatus = customStatus.trim().substring(0, 100);
    if (avatarColor) user.avatarColor = avatarColor;

    saveDatabase();
    res.json({ success: true, user });
  });

  // Get active user data
  app.get("/api/users/:id", (req, res) => {
    const user = dbData.users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User identity offline or missing." });
    }
    res.json(user);
  });

  // Communities (Servers) REST APIs
  app.get("/api/communities", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);

    // Find communities the user is a member of
    const memberCommunities = dbData.members
      .filter(m => m.userId === userId)
      .map(m => m.communityId);

    const lists = dbData.communities.filter(c => memberCommunities.includes(c.id));
    res.json(lists);
  });

  app.post("/api/communities", (req, res) => {
    const { name, description, ownerId } = req.body;
    if (!name || !ownerId) {
      return res.status(400).json({ error: "Mandatory name or ownerId variable missing." });
    }

    const invites = crypto.randomBytes(3).toString("hex").toUpperCase();
    const newComm: CommunityData = {
      id: "community-" + crypto.randomUUID(),
      name: name.trim().substring(0, 80),
      description: (description || "").trim().substring(0, 300),
      iconColor: ["bg-red-500", "bg-indigo-600", "bg-zinc-800 border border-red-500", "bg-emerald-600"][Math.floor(Math.random() * 4)],
      ownerId,
      inviteCode: invites,
      createdAt: new Date().toISOString(),
      categories: [
        { id: "cat-text-gen-" + invites, name: "💬 Conversations" },
        { id: "cat-voice-gen-" + invites, name: "🔊 Voice Rooms" }
      ]
    };

    dbData.communities.push(newComm);

    // Initial default channels
    const welcomeC: ChannelData = {
      id: "chan-text-" + crypto.randomUUID(),
      communityId: newComm.id,
      categoryId: newComm.categories[0].id,
      name: "general",
      type: "text",
      isPrivate: false,
      description: "Default server text hub."
    };

    const lobbyC: ChannelData = {
      id: "chan-voice-" + crypto.randomUUID(),
      communityId: newComm.id,
      categoryId: newComm.categories[1].id,
      name: "REDCOAD Core Lobby",
      type: "voice",
      isPrivate: false
    };

    dbData.channels.push(welcomeC, lobbyC);

    // Add owner member
    dbData.members.push({
      userId: ownerId,
      communityId: newComm.id,
      role: "owner",
      joinedAt: new Date().toISOString()
    });

    addAuditLog(newComm.id, ownerId, "Creator", "COMMUNITY_CREATED", `Community server '${newComm.name}' created with invite code ${invites}`);
    saveDatabase();

    res.json({ success: true, community: newComm });
  });

  app.post("/api/communities/join", (req, res) => {
    const { inviteCode, userId } = req.body;
    if (!inviteCode || !userId) {
      return res.status(400).json({ error: "Empty credentials payload." });
    }

    const target = dbData.communities.find(c => c.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase());
    if (!target) {
      return res.status(404).json({ error: "Community server with this invite code not found." });
    }

    // Check if member already
    const isMember = dbData.members.some(m => m.userId === userId && m.communityId === target.id);
    if (isMember) {
      return res.json({ success: true, community: target, alreadyJoined: true });
    }

    dbData.members.push({
      userId,
      communityId: target.id,
      role: "member",
      joinedAt: new Date().toISOString()
    });

    const user = dbData.users.find(u => u.id === userId);
    addAuditLog(target.id, userId, user ? user.username : "User", "MEMBER_JOIN", `Joined via invite code: ${inviteCode}`);
    saveDatabase();

    res.json({ success: true, community: target });
  });

  app.get("/api/communities/:id/channels", (req, res) => {
    const chans = dbData.channels.filter(c => c.communityId === req.params.id);
    res.json(chans);
  });

  app.post("/api/communities/:id/channels", (req, res) => {
    const { name, type, categoryId, isPrivate, userId } = req.body;
    const communityId = req.params.id;

    if (!name || !type || !categoryId) {
      return res.status(400).json({ error: "Required fields missing." });
    }

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    const newChan: ChannelData = {
      id: "chan-" + crypto.randomUUID(),
      communityId,
      categoryId,
      name: cleanName,
      type,
      isPrivate: !!isPrivate
    };

    dbData.channels.push(newChan);

    const user = dbData.users.find(u => u.id === userId);
    addAuditLog(communityId, userId || "system", user ? user.username : "Staff", "CHANNEL_CREATED", `Created channel #${cleanName} (${type})`);
    saveDatabase();

    res.json({ success: true, channel: newChan });
  });

  app.get("/api/communities/:id/members", (req, res) => {
    const items = dbData.members.filter(m => m.communityId === req.params.id);
    const joined = items.map(m => {
      const user = dbData.users.find(u => u.id === m.userId);
      return {
        ...m,
        displayName: user ? user.displayName : "Unknown User",
        username: user ? user.username : "deleted",
        avatarColor: user ? user.avatarColor : "bg-zinc-600",
        avatarUrl: user ? user.avatarUrl : undefined,
        status: user ? user.status : "offline",
        customStatus: user ? user.customStatus : ""
      };
    });
    res.json(joined);
  });

  app.get("/api/communities/:id/audit-logs", (req, res) => {
    const logs = dbData.auditLogs.filter(l => l.communityId === req.params.id);
    res.json(logs.slice(0, 50));
  });

  // Messages Core API
  app.get("/api/channels/:channelId/messages", (req, res) => {
    const items = dbData.messages.filter(m => m.channelId === req.params.channelId);
    // Sort chronological order
    const sorted = items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(sorted);
  });

  app.post("/api/messages", async (req, res) => {
    let { channelId, userId, text, attachment, replyToId, privateFriendId } = req.body;

    if (!userId || (!text && !attachment)) {
      return res.status(400).json({ error: "Cannot send empty message." });
    }

    const user = dbData.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User profile missing." });

    // Secure fallback: if activeChannel.id is like dm-friendId
    if (!channelId && privateFriendId) {
      channelId = `dm-${privateFriendId}`;
    }

    if (!channelId) {
      return res.status(400).json({ error: "Target channel parameter required." });
    }

    const newMsg: MessageData = {
      id: "msg-" + crypto.randomUUID(),
      channelId,
      userId,
      userDisplayName: user.displayName,
      userAvatarColor: user.avatarColor,
      text: text || "",
      timestamp: new Date().toISOString(),
      attachment,
      parentId: replyToId || undefined
    };

    // Substantive AI Content Moderation checks
    const ai = getAI();
    let isFlagged = false;
    if (ai && text) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Evaluate this community chat message and decide whether it contains aggressive hate speech, extreme toxicity, explicit illegality, or spam/scams. Return exactly "SAFE" or "FLAGGED". Message: "${text}"`,
        });
        const verdict = response.text?.trim() || "SAFE";
        if (verdict.includes("FLAGGED")) {
          isFlagged = true;
          newMsg.aiModerated = true;
          newMsg.text = "⚠️ [Under evaluation. Retracted automatically by REDCOAD AI Safety filter.]";
          addAuditLog("community-hq", "user-ai-bot", "REDCOAD AI", "MESSAGE_MODERATOR_AUTO", `Flagged toxic text from @${user.username}: '${text.substring(0, 40)}...'`);
        }
      } catch (err) {
        console.error("AI automated moderation error, default safe:", err);
      }
    }

    dbData.messages.push(newMsg);
    saveDatabase();

    res.json({ success: true, message: newMsg });

    // Handle asynchronous AI Bot responses if mentioned, in playground channel, or in DM with the AI Assistant
    const playChan = dbData.channels.find(c => c.id === channelId);
    const mentionsBot = text && (text.includes("@redcoad_ai") || text.includes("REDCOAD AI") || text.toLowerCase().includes("ai bot"));
    const isPlayground = playChan && playChan.id === "chan-ai-playground";

    let isAiDm = false;
    if (channelId.startsWith("dm-")) {
      const fId = channelId.substring(3);
      const fRecord = dbData.friends.find(f => f.id === fId);
      if (fRecord) {
        const recipientId = fRecord.userId === userId ? fRecord.friendId : fRecord.userId;
        if (recipientId === "user-ai-bot") {
          isAiDm = true;
        }
      }
    }

    if (!isFlagged && (mentionsBot || isPlayground || isAiDm) && userId !== "user-ai-bot") {
      setTimeout(async () => {
        if (!ai) {
          // Fallback response if no core developer key
          const fallbackMsg: MessageData = {
            id: "msg-" + crypto.randomUUID(),
            channelId,
            userId: "user-ai-bot",
            userDisplayName: "REDCOAD AI Assistant",
            userAvatarColor: "bg-red-600 border border-white/20",
            text: "📡 *System Alert: Real-time Gemini AI integration activated, but GEMINI_API_KEY is not defined in system secrets yet. Go to Settings > Secrets and add your key to fully unlock real-time intelligence!* 🚀",
            timestamp: new Date().toISOString()
          };
          dbData.messages.push(fallbackMsg);
          saveDatabase();
          return;
        }

        try {
          // Simulate typing status before replying
          typingStatus[channelId] = typingStatus[channelId] || [];
          typingStatus[channelId].push({ userId: "user-ai-bot", username: "redcoad_ai", timestamp: Date.now() + 5000 });

          // Gather brief context of previous logs here to give coherent chat replies
          const channelLogs = dbData.messages
            .filter(m => m.channelId === channelId)
            .slice(-6)
            .map(m => `${m.userDisplayName} (@${m.userId === "user-ai-bot" ? "redcoad_ai" : "user"}): ${m.text}`)
            .join("\n");

          const promptText = `You are REDCOAD AI Assistant, active inside Discord-like chat community REDCOAD (red, dark theme, tagline: Connect. Collaborate. Communicate.). Answer concisely in Markdown format like a professional community co-host. Context:\n${channelLogs}\n\nGenerate your reply to the last message:`;
          
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptText,
          });

          // Delete typing status
          typingStatus[channelId] = typingStatus[channelId].filter(t => t.userId !== "user-ai-bot");

          const aiReply: MessageData = {
            id: "msg-" + crypto.randomUUID(),
            channelId,
            userId: "user-ai-bot",
            userDisplayName: "REDCOAD AI Assistant",
            userAvatarColor: "bg-red-600 border border-white/20",
            text: response.text || "I processed that message successfully. Let me know what else you need!",
            timestamp: new Date().toISOString()
          };

          dbData.messages.push(aiReply);
          saveDatabase();
        } catch (err) {
          console.error("Gemini Assistant callback error:", err);
        }
      }, 1000);
    }
  });

  app.post("/api/channels/:channelId/messages", async (req, res) => {
    const { userId, text, attachment } = req.body;
    const { channelId } = req.params;

    if (!userId || (!text && !attachment)) {
      return res.status(400).json({ error: "Cannot send empty message." });
    }

    const user = dbData.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: "User profile missing." });

    const newMsg: MessageData = {
      id: "msg-" + crypto.randomUUID(),
      channelId,
      userId,
      userDisplayName: user.displayName,
      userAvatarColor: user.avatarColor,
      text: text || "",
      timestamp: new Date().toISOString(),
      attachment
    };

    // Substantive AI Content Moderation checks
    const ai = getAI();
    let isFlagged = false;
    if (ai && text) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Evaluate this community chat message and decide whether it contains aggressive hate speech, extreme toxicity, explicit illegality, or spam/scams. Return exactly "SAFE" or "FLAGGED". Message: "${text}"`,
        });
        const verdict = response.text?.trim() || "SAFE";
        if (verdict.includes("FLAGGED")) {
          isFlagged = true;
          newMsg.aiModerated = true;
          newMsg.text = "⚠️ [Under evaluation. Retracted automatically by REDCOAD AI Safety filter.]";
          addAuditLog("community-hq", "user-ai-bot", "REDCOAD AI", "MESSAGE_MODERATOR_AUTO", `Flagged toxic text from @${user.username}: '${text.substring(0, 40)}...'`);
        }
      } catch (err) {
        console.error("AI automated moderation error, default safe:", err);
      }
    }

    dbData.messages.push(newMsg);
    saveDatabase();

    res.json({ success: true, message: newMsg });

    // Handle asynchronous AI Bot responses if mentioned or in play channel
    const playChan = dbData.channels.find(c => c.id === channelId);
    const mentionsBot = text && (text.includes("@redcoad_ai") || text.includes("REDCOAD AI") || text.toLowerCase().includes("ai bot"));
    const isPlayground = playChan && playChan.id === "chan-ai-playground";

    if (!isFlagged && (mentionsBot || isPlayground) && userId !== "user-ai-bot") {
      setTimeout(async () => {
        if (!ai) {
          // Fallback response if no core developer key
          const fallbackMsg: MessageData = {
            id: "msg-" + crypto.randomUUID(),
            channelId,
            userId: "user-ai-bot",
            userDisplayName: "REDCOAD AI Assistant",
            userAvatarColor: "bg-red-600 border border-white/20",
            text: "📡 *System Alert: Real-time Gemini AI integration activated, but GEMINI_API_KEY is not defined in system secrets yet. Go to Settings > Secrets and add your key to fully unlock real-time intelligence!* 🚀",
            timestamp: new Date().toISOString()
          };
          dbData.messages.push(fallbackMsg);
          saveDatabase();
          return;
        }

        try {
          // Simulate typing status before replying
          typingStatus[channelId] = typingStatus[channelId] || [];
          typingStatus[channelId].push({ userId: "user-ai-bot", username: "redcoad_ai", timestamp: Date.now() + 5000 });

          // Gather brief context of previous logs here to give coherent chat replies
          const channelLogs = dbData.messages
            .filter(m => m.channelId === channelId)
            .slice(-6)
            .map(m => `${m.userDisplayName} (@${m.userId === "user-ai-bot" ? "redcoad_ai" : "user"}): ${m.text}`)
            .join("\n");

          const promptText = `You are REDCOAD AI Assistant, active inside Discord-like chat community REDCOAD (red, dark theme, tagline: Connect. Collaborate. Communicate.). Answer concisely in Markdown format like a professional community co-host. Context:\n${channelLogs}\n\nGenerate your reply to the last message:`;
          
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: promptText,
          });

          // Delete typing status
          typingStatus[channelId] = typingStatus[channelId].filter(t => t.userId !== "user-ai-bot");

          const aiReply: MessageData = {
            id: "msg-" + crypto.randomUUID(),
            channelId,
            userId: "user-ai-bot",
            userDisplayName: "REDCOAD AI Assistant",
            userAvatarColor: "bg-red-600 border border-white/20",
            text: response.text || "I processed that message successfully. Let me know what else you need!",
            timestamp: new Date().toISOString()
          };

          dbData.messages.push(aiReply);
          saveDatabase();
        } catch (err) {
          console.error("Gemini Assistant callback error:", err);
        }
      }, 1000);
    }
  });

  app.put("/api/messages/:id", (req, res) => {
    const { text, userId } = req.body;
    const msg = dbData.messages.find(m => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: "Message missing." });
    if (msg.userId !== userId) return res.status(403).json({ error: "Forbidden edit parameters." });

    msg.text = text;
    msg.isEdited = true;
    saveDatabase();
    res.json({ success: true, message: msg });
  });

  app.delete("/api/messages/:id", (req, res) => {
    const { userId } = req.query;
    const msgIndex = dbData.messages.findIndex(m => m.id === req.params.id);
    if (msgIndex === -1) return res.status(404).json({ error: "Message missing." });
    
    const msg = dbData.messages[msgIndex];
    if (msg.userId !== userId && userId !== "user-ai-bot" && userId !== "user-alan") {
      return res.status(403).json({ error: "Unauthorized message deletion action." });
    }

    dbData.messages.splice(msgIndex, 1);
    saveDatabase();
    res.json({ success: true });
  });

  app.post("/api/messages/:id/react", (req, res) => {
    const { emoji, userId } = req.body;
    const msg = dbData.messages.find(m => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found." });

    if (!msg.reactions) msg.reactions = [];

    const existingReactIndex = msg.reactions.findIndex(r => r.emoji === emoji);
    if (existingReactIndex > -1) {
      const reactEntry = msg.reactions[existingReactIndex];
      const hasReacted = reactEntry.userIds.includes(userId);
      if (hasReacted) {
        // Toggle off
        reactEntry.userIds = reactEntry.userIds.filter(id => id !== userId);
        if (reactEntry.userIds.length === 0) {
          msg.reactions.splice(existingReactIndex, 1);
        }
      } else {
        reactEntry.userIds.push(userId);
      }
    } else {
      msg.reactions.push({ emoji, userIds: [userId] });
    }

    saveDatabase();
    res.json({ success: true, reactions: msg.reactions });
  });

  // Events system
  app.get("/api/communities/:communityId/events", (req, res) => {
    const evts = dbData.events.filter(e => e.communityId === req.params.communityId);
    res.json(evts);
  });

  app.post("/api/communities/:communityId/events", (req, res) => {
    const { title, description, startTime, location, creatorId } = req.body;
    const { communityId } = req.params;

    if (!title || !startTime || !location || !creatorId) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    const newEvt: CommunityEventData = {
      id: "evt-" + crypto.randomUUID(),
      communityId,
      title: title.trim(),
      description: (description || "").trim(),
      startTime,
      location: location.trim(),
      creatorId,
      attendees: [creatorId]
    };

    dbData.events.push(newEvt);
    
    const user = dbData.users.find(u => u.id === creatorId);
    addAuditLog(communityId, creatorId, user ? user.username : "User", "EVENT_CREATED", `Scheduled group event: ${title}`);
    saveDatabase();

    res.json({ success: true, event: newEvt });
  });

  app.post("/api/events/:evtId/join", (req, res) => {
    const { userId } = req.body;
    const evt = dbData.events.find(e => e.id === req.params.evtId);
    if (!evt) return res.status(404).json({ error: "Event listing missing." });

    if (evt.attendees.includes(userId)) {
      evt.attendees = evt.attendees.filter(id => id !== userId);
    } else {
      evt.attendees.push(userId);
    }

    saveDatabase();
    res.json({ success: true, attendees: evt.attendees });
  });

  // Polls API
  app.get("/api/channels/:channelId/polls", (req, res) => {
    const pls = dbData.polls.filter(p => p.channelId === req.params.channelId);
    res.json(pls);
  });

  app.post("/api/channels/:channelId/polls", (req, res) => {
    const { question, options, creatorId, creatorName } = req.body;
    const { channelId } = req.params;

    if (!question || !options || options.length === 0 || !creatorId) {
      return res.status(400).json({ error: "Required parameters missing." });
    }

    const initialVotes: { [key: number]: string[] } = {};
    options.forEach((_, i: number) => {
      initialVotes[i] = [];
    });

    const newPoll: PollData = {
      id: "poll-" + crypto.randomUUID(),
      channelId,
      question,
      options,
      votes: initialVotes,
      creatorId,
      creatorName,
      createdAt: new Date().toISOString()
    };

    dbData.polls.push(newPoll);
    saveDatabase();
    res.json({ success: true, poll: newPoll });
  });

  app.post("/api/polls/:pollId/vote", (req, res) => {
    const { optionIndex, userId } = req.body;
    const poll = dbData.polls.find(p => p.id === req.params.pollId);
    if (!poll) return res.status(404).json({ error: "System poll listing missing." });

    // Remove user votes in other options of the same poll
    Object.keys(poll.votes).forEach((key) => {
      const idx = Number(key);
      poll.votes[idx] = poll.votes[idx].filter(id => id !== userId);
    });

    // Add user vote to selected option
    if (poll.votes[optionIndex]) {
      poll.votes[optionIndex].push(userId);
    }

    saveDatabase();
    res.json({ success: true, votes: poll.votes });
  });

  // Friends System
  app.get("/api/friends", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);

    const items = dbData.friends.filter(f => f.userId === userId || f.friendId === userId);
    const joined = items.map(f => {
      const searchId = f.userId === userId ? f.friendId : f.userId;
      const fUser = dbData.users.find(u => u.id === searchId);
      
      // Calculate pending state
      let relStatus = f.status;
      if (f.status === "pending_sent" && f.friendId === userId) {
        relStatus = "pending_received";
      } else if (f.status === "pending_sent" && f.userId === userId) {
        relStatus = "pending_sent";
      }

      return {
        id: f.id,
        userId: f.userId,
        friendId: f.friendId,
        status: relStatus,
        username: fUser ? fUser.username : "user_deleted",
        displayName: fUser ? fUser.displayName : "Deleted User",
        avatarColor: fUser ? fUser.avatarColor : "bg-zinc-600",
        onlineStatus: fUser ? fUser.status : "offline"
      };
    });
    res.json(joined);
  });

  app.post("/api/friends/request", (req, res) => {
    const { userId, targetUsername } = req.body;
    if (!userId || !targetUsername) {
      return res.status(400).json({ error: "Missing required details." });
    }

    const cleanUsername = targetUsername.trim().toLowerCase();
    const sourceUser = dbData.users.find(u => u.id === userId);
    const targetUser = dbData.users.find(u => u.username === cleanUsername);

    if (!targetUser) {
      return res.status(404).json({ error: `User with username @${targetUsername} not found.` });
    }
    if (targetUser.id === userId) {
      return res.status(400).json({ error: "You cannot add yourself as friend." });
    }

    // Check relationship duplicate
    const duplicate = dbData.friends.find(
      f => (f.userId === userId && f.friendId === targetUser.id) || 
           (f.userId === targetUser.id && f.friendId === userId)
    );

    if (duplicate) {
      return res.status(400).json({ error: `A relationship status already exists: ${duplicate.status}` });
    }

    const newF: FriendData = {
      id: "friend-" + crypto.randomUUID(),
      userId,
      friendId: targetUser.id,
      status: "pending_sent"
    };

    dbData.friends.push(newF);
    saveDatabase();

    res.json({ success: true, relationship: newF });
  });

  app.post("/api/friends/action", (req, res) => {
    const { id, friendshipId, action } = req.body; // action: 'accept' | 'decline' | 'block' | 'unblock'
    const targetId = id || friendshipId;
    const matchIndex = dbData.friends.findIndex(f => f.id === targetId);

    if (matchIndex === -1) {
      return res.status(404).json({ error: "Relationship record missing." });
    }

    const record = dbData.friends[matchIndex];

    if (action === "accept") {
      record.status = "accepted";
    } else if (action === "decline") {
      dbData.friends.splice(matchIndex, 1);
    } else if (action === "block") {
      record.status = "blocked";
    }

    saveDatabase();
    res.json({ success: true });
  });

  // Active User Status Sync & Real-Time Sync Packet API
  app.post("/api/sync", (req, res) => {
    const {
      userId,
      activeCommunityId,
      activeChannelId,
      connectedVoiceChannelId,
      isMuted,
      isDeafened,
      typingStatus: clientTypingStatus,
      privateFriendId
    } = req.body;

    if (!userId) return res.status(400).json({ error: "Sign-in context required." });

    const activeVoiceChannelId = connectedVoiceChannelId;
    const isTyping = clientTypingStatus;

    // Fetch user status
    const current = dbData.users.find(u => u.id === userId);
    if (current) {
      // Keep online status healthy
      if (current.status === "offline") {
        current.status = "online";
      }
    }

    // Auto-accept seed bot friend requests dynamically
    const seedUserIds = ["user-ai-bot", "user-alan", "user-ada", "user-grace"];
    dbData.friends.forEach(f => {
      // If invitation was sent by current user to a seed bot, auto accept so they appear immediately
      if (f.status === "pending_sent" && seedUserIds.includes(f.friendId)) {
        f.status = "accepted";
      }
      // If invitation was received list, auto-accept too
      if (f.status === "pending_received" && seedUserIds.includes(f.userId)) {
        f.status = "accepted";
      }
    });

    // Capture active typing if flagged
    if (activeChannelId && isTyping && current) {
      typingStatus[activeChannelId] = typingStatus[activeChannelId] || [];
      const hasTyping = typingStatus[activeChannelId].find(t => t.userId === userId);
      if (hasTyping) {
        hasTyping.timestamp = Date.now();
      } else {
        typingStatus[activeChannelId].push({
          userId,
          username: current.username,
          timestamp: Date.now()
        });
      }
    }

    // Keep voice states synced if user is connected
    if (activeVoiceChannelId && current) {
      const dbChan = dbData.channels.find(c => c.id === activeVoiceChannelId);
      if (dbChan) {
        const existingVoice = activeVoiceStates.find(v => v.userId === userId);
        if (existingVoice) {
          existingVoice.channelId = activeVoiceChannelId;
          existingVoice.communityId = dbChan.communityId;
          if (isMuted !== undefined) existingVoice.isMuted = isMuted;
          if (isDeafened !== undefined) existingVoice.isDeafened = isDeafened;
        } else {
          activeVoiceStates.push({
            userId,
            username: current.username,
            avatarColor: current.avatarColor,
            channelId: activeVoiceChannelId,
            communityId: dbChan.communityId,
            isMuted: isMuted || false,
            isDeafened: isDeafened || false,
            isCameraOn: false,
            isScreenSharing: false,
            joinedAt: new Date().toISOString()
          });
        }
      }
    } else {
      // Leave voice if activeVoiceChannelId is empty
      activeVoiceStates = activeVoiceStates.filter(v => v.userId !== userId);
    }

    // Load active community list for the user
    const memberCommunities = dbData.members
      .filter(m => m.userId === userId)
      .map(m => m.communityId);
    const userCommunities = dbData.communities.filter(c => memberCommunities.includes(c.id));

    // Load channels for active community
    const targetCommunityId = activeCommunityId || (userCommunities[0]?.id || null);
    const activeChans = targetCommunityId ? dbData.channels.filter(c => c.communityId === targetCommunityId) : [];

    // Load messages list for current active channel (could be group or DM)
    let activeMsgs: MessageData[] = [];
    if (activeChannelId) {
      activeMsgs = dbData.messages
        .filter(m => m.channelId === activeChannelId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    // Load friends list
    const friendRecords = dbData.friends.filter(f => f.userId === userId || f.friendId === userId);
    const userFriends = friendRecords.map(f => {
      const searchId = f.userId === userId ? f.friendId : f.userId;
      const fUser = dbData.users.find(u => u.id === searchId);
      
      let relStatus = f.status;
      // Invert status for rendering relative incoming direction
      if (f.status === "pending_sent" && f.friendId === userId) {
        relStatus = "pending_received";
      } else if (f.status === "pending_received" && f.friendId === userId) {
        relStatus = "pending_sent";
      }

      return {
        id: f.id,
        userId: f.userId,
        friendId: f.friendId,
        status: relStatus,
        username: fUser ? fUser.username : "user_deleted",
        displayName: fUser ? fUser.displayName : "Deleted User",
        avatarColor: fUser ? fUser.avatarColor : "bg-gradient-to-tr from-zinc-700 to-zinc-650",
        onlineStatus: fUser ? fUser.status : "offline"
      };
    });

    // Build immediate synchronization feedback package
    const responsePayload = {
      timestamp: new Date().toISOString(),
      activeTypingUsers: activeChannelId ? (typingStatus[activeChannelId] || []).filter(t => t.userId !== userId) : [],
      voiceStates: activeVoiceChannelId ? activeVoiceStates.filter(v => v.channelId === activeVoiceChannelId) : [],
      globalVoiceStates: activeVoiceStates,
      allUsersOnlineStatuses: dbData.users.map(u => ({ id: u.id, status: u.status, customStatus: u.customStatus, displayName: u.displayName })),
      communities: userCommunities,
      channels: activeChans,
      messages: activeMsgs,
      friends: userFriends,
      updatedUser: current,
      polls: activeChannelId ? dbData.polls.filter(p => p.channelId === activeChannelId) : []
    };

    res.json(responsePayload);
  });

  app.post("/api/voice/state-update", (req, res) => {
    const { userId, channelId, isMuted, isDeafened, isCameraOn, isScreenSharing } = req.body;
    const v = activeVoiceStates.find(s => s.userId === userId && s.channelId === channelId);
    if (v) {
      if (isMuted !== undefined) v.isMuted = isMuted;
      if (isDeafened !== undefined) v.isDeafened = isDeafened;
      if (isCameraOn !== undefined) v.isCameraOn = isCameraOn;
      if (isScreenSharing !== undefined) v.isScreenSharing = isScreenSharing;
    }
    res.json({ success: true, state: v });
  });

  // AI Message Super Summarizer
  app.post("/api/ai/summarize", async (req, res) => {
    const { channelId } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: "channelId is required for summarization." });
    }

    const ai = getAI();
    if (!ai) {
      return res.json({ summary: "⚠️ Gemini API key is missing. Add your GEMINI_API_KEY inside Settings > Secrets to unlock the AI summarizer tool!" });
    }

    // Fetch last 15 messages in the channel
    const msgs = dbData.messages
      .filter(m => m.channelId === channelId)
      .slice(-15)
      .map(m => `${m.userDisplayName}: ${m.text}`)
      .join("\n");

    if (msgs.trim().length === 0) {
      return res.json({ summary: "No message logs found in this channel to formulate an AI summary." });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Summarize the following Discord channel chat conversation flow into a single scannable paragraph, calling out major ideas, action items, or conclusions. Highlight with strong formatting:\n\n${msgs}`
      });

      res.json({ summary: response.text || "Summary compilation empty." });
    } catch (err: any) {
      console.error("Summary engine failed:", err);
      res.status(500).json({ error: err?.message || "AI summaries failed to execute." });
    }
  });

  // AI Translation Service
  app.post("/api/ai/translate", async (req, res) => {
    const { messageId, targetLang } = req.body;
    if (!messageId || !targetLang) {
      return res.status(400).json({ error: "Missing required translation params." });
    }

    const msg = dbData.messages.find(m => m.id === messageId);
    if (!msg) {
      return res.status(404).json({ error: "Target message not found." });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not defined in credentials workspace." });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Translate the following text exactly into the language: "${targetLang}". Do not include explanations, notes, or intros. Return only the translated string.\n\nText: "${msg.text}"`
      });

      if (!msg.aiTranslated) msg.aiTranslated = {};
      msg.aiTranslated[targetLang] = (response.text || "").trim();
      saveDatabase();

      res.json({ success: true, translation: msg.aiTranslated[targetLang] });
    } catch (err: any) {
      console.error("AI Translation engine failed:", err);
      res.status(500).json({ error: err?.message || "AI translation call failed." });
    }
  });

  // Smart Global Search system
  app.get("/api/search", (req, res) => {
    const { query } = req.query;
    if (!query) return res.json({ messages: [], users: [], communities: [] });

    const cleanQ = String(query).toLowerCase();

    // Direct filters
    const matchedMsgs = dbData.messages.filter(m => m.text.toLowerCase().includes(cleanQ)).slice(0, 15);
    const matchedUsers = dbData.users.filter(u => u.username.toLowerCase().includes(cleanQ) || u.displayName.toLowerCase().includes(cleanQ)).slice(0, 10);
    const matchedComm = dbData.communities.filter(c => c.name.toLowerCase().includes(cleanQ) || c.description.toLowerCase().includes(cleanQ)).slice(0, 5);

    res.json({
      messages: matchedMsgs,
      users: matchedUsers,
      communities: matchedComm
    });
  });

  // Vite development middleware vs Static Production Build router
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("[Runtime] Dev mode: integrated Vite middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Runtime] Production mode: serving static index.html.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[REDCOAD] Ready and powering real-time sync on port ${PORT}`);
  });
}

startServer();
