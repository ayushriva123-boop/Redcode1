export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  avatarColor: string; // Tailwind bg color class
  status: "online" | "idle" | "dnd" | "offline";
  customStatus?: string;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string; // or initials
  iconColor: string; // Tailwind bg color class
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  categories: {
    id: string;
    name: string; // e.g. "Text Channels", "Voice Channels"
  }[];
}

export type ChannelType = "text" | "voice" | "announcement";

export interface Channel {
  id: string;
  communityId: string;
  categoryId: string; // references category.id
  name: string;
  type: ChannelType;
  isPrivate: boolean;
  allowedRoles?: string[];
  description?: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[]; // list of user ids who reacted
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  userDisplayName: string;
  userAvatarColor: string;
  text: string;
  timestamp: string;
  reactions?: Reaction[];
  parentId?: string; // for threading/replies
  isEdited?: boolean;
  aiTranslated?: {
    [lang: string]: string;
  };
  aiModerated?: boolean;
  attachment?: {
    name: string;
    url: string;
    type: "image" | "file" | "video";
    size: string;
  };
}

export interface VoiceState {
  userId: string;
  channelId: string;
  communityId: string;
  username: string;
  avatarColor: string;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: "pending_sent" | "pending_received" | "accepted" | "blocked";
  username: string;
  displayName: string;
  avatarColor: string;
  onlineStatus: "online" | "idle" | "dnd" | "offline";
}

export interface CommunityMember {
  userId: string;
  communityId: string;
  role: "owner" | "admin" | "moderator" | "member";
  joinedAt: string;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  startTime: string;
  location: string;
  creatorId: string;
  attendees: string[]; // user IDs
}

export interface Poll {
  id: string;
  channelId: string;
  question: string;
  options: string[];
  votes: { [optionIndex: number]: string[] }; // optionIndex -> list of user IDs
  creatorId: string;
  creatorName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  communityId: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}
