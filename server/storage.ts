import { randomUUID } from "crypto";
import type {
  User, PublicMessage, PrivateConversation, PrivateMessage,
  FriendRequest, Friend, Notification, BlockedUser,
} from "@shared/schema";

export class MemStorage {
  private users = new Map<string, User>();
  private usersByUsername = new Map<string, string>(); // username -> id
  private usersByEmail = new Map<string, string>(); // email -> id
  private authTokens = new Map<string, string>(); // token -> userId
  private publicMessages = new Map<string, PublicMessage>();
  private privateConversations = new Map<string, PrivateConversation>();
  private privateMessages = new Map<string, PrivateMessage>();
  private friendRequests = new Map<string, FriendRequest>();
  private friends = new Map<string, Friend>();
  private notifications = new Map<string, Notification>();
  private blockedUsers = new Map<string, BlockedUser>();

  constructor() {
    // Clean up expired messages every hour
    setInterval(() => this.cleanupExpired(), 60 * 60 * 1000);
  }

  private cleanupExpired() {
    const now = Date.now();
    const lobbyExpiry = 72 * 60 * 60 * 1000;
    const dmExpiry = 60 * 24 * 60 * 60 * 1000;
    for (const [id, msg] of this.publicMessages) {
      if (now - msg.createdAt.getTime() > lobbyExpiry) this.publicMessages.delete(id);
    }
    for (const [id, msg] of this.privateMessages) {
      if (now - msg.createdAt.getTime() > dmExpiry) this.privateMessages.delete(id);
    }
  }

  // Auth tokens
  createToken(userId: string): string {
    const token = randomUUID() + randomUUID();
    this.authTokens.set(token, userId);
    return token;
  }
  getUserByToken(token: string): User | undefined {
    const userId = this.authTokens.get(token);
    if (!userId) return undefined;
    return this.users.get(userId);
  }
  deleteToken(token: string) {
    this.authTokens.delete(token);
  }

  // Users
  async createUser(data: Omit<User, "id" | "createdAt" | "lastSeen" | "onlineStatus">): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...data,
      id,
      createdAt: new Date(),
      lastSeen: new Date(),
      onlineStatus: "offline",
      bio: data.bio ?? "",
      profilePicture: data.profilePicture ?? null,
      quietHoursStart: data.quietHoursStart ?? null,
      quietHoursEnd: data.quietHoursEnd ?? null,
      theme: data.theme ?? "light",
    };
    this.users.set(id, user);
    this.usersByUsername.set(user.username.toLowerCase(), id);
    this.usersByEmail.set(user.email.toLowerCase(), id);
    return user;
  }
  getUserById(id: string): User | undefined { return this.users.get(id); }
  getUserByUsername(username: string): User | undefined {
    const id = this.usersByUsername.get(username.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }
  getUserByEmail(email: string): User | undefined {
    const id = this.usersByEmail.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }
  getAllUsers(): User[] { return Array.from(this.users.values()); }
  updateUser(id: string, data: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }
  setOnlineStatus(id: string, status: string) {
    const user = this.users.get(id);
    if (user) {
      user.onlineStatus = status;
      user.lastSeen = new Date();
      this.users.set(id, user);
    }
  }
  getOnlineUserCount(): number {
    return Array.from(this.users.values()).filter(u => u.onlineStatus === "online").length;
  }

  // Public messages
  createPublicMessage(data: Omit<PublicMessage, "id" | "createdAt" | "editedAt" | "deleted">): PublicMessage {
    const id = randomUUID();
    const msg: PublicMessage = {
      ...data,
      id,
      createdAt: new Date(),
      editedAt: null,
      deleted: false,
      reactions: data.reactions ?? "{}",
      replyToId: data.replyToId ?? null,
    };
    this.publicMessages.set(id, msg);
    return msg;
  }
  getPublicMessages(limit = 100): PublicMessage[] {
    const cutoff = Date.now() - 72 * 60 * 60 * 1000;
    return Array.from(this.publicMessages.values())
      .filter(m => m.createdAt.getTime() > cutoff)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit);
  }
  getPublicMessageById(id: string): PublicMessage | undefined { return this.publicMessages.get(id); }
  updatePublicMessage(id: string, content: string): PublicMessage | undefined {
    const msg = this.publicMessages.get(id);
    if (!msg) return undefined;
    const updated = { ...msg, content, editedAt: new Date() };
    this.publicMessages.set(id, updated);
    return updated;
  }
  deletePublicMessage(id: string): boolean {
    const msg = this.publicMessages.get(id);
    if (!msg) return false;
    const updated = { ...msg, deleted: true, content: "This message was deleted" };
    this.publicMessages.set(id, updated);
    return true;
  }
  reactPublicMessage(id: string, emoji: string, userId: string): PublicMessage | undefined {
    const msg = this.publicMessages.get(id);
    if (!msg) return undefined;
    const reactions = JSON.parse(msg.reactions || "{}");
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(userId);
    if (idx >= 0) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    const updated = { ...msg, reactions: JSON.stringify(reactions) };
    this.publicMessages.set(id, updated);
    return updated;
  }

  // Private conversations
  getOrCreateConversation(p1: string, p2: string): PrivateConversation {
    const existing = Array.from(this.privateConversations.values()).find(
      c => (c.participant1 === p1 && c.participant2 === p2) ||
           (c.participant1 === p2 && c.participant2 === p1)
    );
    if (existing) return existing;
    const conv: PrivateConversation = {
      id: randomUUID(),
      participant1: p1,
      participant2: p2,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };
    this.privateConversations.set(conv.id, conv);
    return conv;
  }
  getConversationById(id: string): PrivateConversation | undefined { return this.privateConversations.get(id); }
  getConversationsByUser(userId: string): PrivateConversation[] {
    return Array.from(this.privateConversations.values())
      .filter(c => c.participant1 === userId || c.participant2 === userId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }
  updateConversationLastMessage(id: string) {
    const conv = this.privateConversations.get(id);
    if (conv) {
      conv.lastMessageAt = new Date();
      this.privateConversations.set(id, conv);
    }
  }

  // Private messages
  createPrivateMessage(data: Omit<PrivateMessage, "id" | "createdAt" | "editedAt" | "deleted">): PrivateMessage {
    const id = randomUUID();
    const msg: PrivateMessage = {
      ...data,
      id,
      createdAt: new Date(),
      editedAt: null,
      deleted: false,
      reactions: data.reactions ?? "{}",
      replyToId: data.replyToId ?? null,
      voiceDuration: data.voiceDuration ?? null,
    };
    this.privateMessages.set(id, msg);
    this.updateConversationLastMessage(data.conversationId);
    return msg;
  }
  getPrivateMessages(conversationId: string): PrivateMessage[] {
    return Array.from(this.privateMessages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  updatePrivateMessage(id: string, content: string): PrivateMessage | undefined {
    const msg = this.privateMessages.get(id);
    if (!msg) return undefined;
    const updated = { ...msg, content, editedAt: new Date() };
    this.privateMessages.set(id, updated);
    return updated;
  }
  deletePrivateMessage(id: string): boolean {
    const msg = this.privateMessages.get(id);
    if (!msg) return false;
    const updated = { ...msg, deleted: true, content: "This message was deleted" };
    this.privateMessages.set(id, updated);
    return true;
  }
  markMessagesRead(conversationId: string, userId: string) {
    for (const [id, msg] of this.privateMessages) {
      if (msg.conversationId === conversationId && msg.senderId !== userId && !msg.read) {
        this.privateMessages.set(id, { ...msg, read: true });
      }
    }
  }
  reactPrivateMessage(id: string, emoji: string, userId: string): PrivateMessage | undefined {
    const msg = this.privateMessages.get(id);
    if (!msg) return undefined;
    const reactions = JSON.parse(msg.reactions || "{}");
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(userId);
    if (idx >= 0) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    const updated = { ...msg, reactions: JSON.stringify(reactions) };
    this.privateMessages.set(id, updated);
    return updated;
  }
  getUnreadCount(conversationId: string, userId: string): number {
    return Array.from(this.privateMessages.values())
      .filter(m => m.conversationId === conversationId && m.senderId !== userId && !m.read && !m.deleted)
      .length;
  }

  // Friends
  createFriendRequest(fromUserId: string, toUserId: string): FriendRequest {
    const req: FriendRequest = {
      id: randomUUID(),
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: new Date(),
    };
    this.friendRequests.set(req.id, req);
    return req;
  }
  getFriendRequest(id: string): FriendRequest | undefined { return this.friendRequests.get(id); }
  getPendingRequestBetween(fromId: string, toId: string): FriendRequest | undefined {
    return Array.from(this.friendRequests.values()).find(
      r => r.fromUserId === fromId && r.toUserId === toId && r.status === "pending"
    );
  }
  getPendingRequestsForUser(userId: string): FriendRequest[] {
    return Array.from(this.friendRequests.values())
      .filter(r => r.toUserId === userId && r.status === "pending");
  }
  updateFriendRequest(id: string, status: string): FriendRequest | undefined {
    const req = this.friendRequests.get(id);
    if (!req) return undefined;
    const updated = { ...req, status };
    this.friendRequests.set(id, updated);
    return updated;
  }
  areFriends(u1: string, u2: string): boolean {
    return Array.from(this.friends.values()).some(
      f => (f.userId1 === u1 && f.userId2 === u2) || (f.userId1 === u2 && f.userId2 === u1)
    );
  }
  createFriendship(u1: string, u2: string): Friend {
    const f: Friend = { id: randomUUID(), userId1: u1, userId2: u2, createdAt: new Date() };
    this.friends.set(f.id, f);
    return f;
  }
  removeFriend(u1: string, u2: string): boolean {
    for (const [id, f] of this.friends) {
      if ((f.userId1 === u1 && f.userId2 === u2) || (f.userId1 === u2 && f.userId2 === u1)) {
        this.friends.delete(id);
        return true;
      }
    }
    return false;
  }
  getFriendIds(userId: string): string[] {
    return Array.from(this.friends.values())
      .filter(f => f.userId1 === userId || f.userId2 === userId)
      .map(f => f.userId1 === userId ? f.userId2 : f.userId1);
  }

  // Notifications
  createNotification(data: Omit<Notification, "id" | "createdAt" | "read">): Notification {
    const n: Notification = {
      ...data,
      id: randomUUID(),
      read: false,
      createdAt: new Date(),
      fromUserId: data.fromUserId ?? null,
      relatedId: data.relatedId ?? null,
    };
    this.notifications.set(n.id, n);
    return n;
  }
  getNotificationsForUser(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  markNotificationsRead(userId: string) {
    for (const [id, n] of this.notifications) {
      if (n.userId === userId && !n.read) {
        this.notifications.set(id, { ...n, read: true });
      }
    }
  }
  getUnreadNotificationCount(userId: string): number {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId && !n.read).length;
  }

  // Blocked users
  blockUser(blockerId: string, blockedId: string): BlockedUser {
    const b: BlockedUser = { id: randomUUID(), blockerId, blockedId, createdAt: new Date() };
    this.blockedUsers.set(b.id, b);
    return b;
  }
  unblockUser(blockerId: string, blockedId: string): boolean {
    for (const [id, b] of this.blockedUsers) {
      if (b.blockerId === blockerId && b.blockedId === blockedId) {
        this.blockedUsers.delete(id);
        return true;
      }
    }
    return false;
  }
  isBlocked(blockerId: string, blockedId: string): boolean {
    return Array.from(this.blockedUsers.values()).some(
      b => b.blockerId === blockerId && b.blockedId === blockedId
    );
  }
  getBlockedByUser(blockerId: string): BlockedUser[] {
    return Array.from(this.blockedUsers.values()).filter(b => b.blockerId === blockerId);
  }
}

export const storage = new MemStorage();
