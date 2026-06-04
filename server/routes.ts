import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { signupSchema, loginSchema } from "@shared/schema";

interface WSClient extends WebSocket {
  userId?: string;
  token?: string;
}

const wsClients = new Map<string, Set<WSClient>>(); // userId -> set of connections

function broadcast(userId: string, data: object) {
  const clients = wsClients.get(userId);
  if (!clients) return;
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

function broadcastToAll(data: object, excludeUserId?: string) {
  const msg = JSON.stringify(data);
  for (const [uid, clients] of wsClients) {
    if (uid === excludeUserId) continue;
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  }
}

function broadcastToAllIncluding(data: object) {
  const msg = JSON.stringify(data);
  for (const [, clients] of wsClients) {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  }
}

function safeUser(u: ReturnType<typeof storage.getUserById>) {
  if (!u) return null;
  const { password, ...safe } = u;
  return safe;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // ── Auth middleware helper ──
  function getUser(req: any) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    return storage.getUserByToken(auth.slice(7)) ?? null;
  }
  function requireAuth(req: any, res: any, next: any) {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  }

  // ── AUTH ──
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      if (storage.getUserByUsername(data.username)) {
        return res.status(400).json({ error: "Username already taken" });
      }
      if (storage.getUserByEmail(data.email)) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const hashed = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashed,
        displayName: data.displayName || data.username,
        bio: "",
        profilePicture: null,
        quietHoursStart: null,
        quietHoursEnd: null,
        theme: "light",
      });
      const token = storage.createToken(user.id);
      return res.json({ token, user: safeUser(user) });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = storage.getUserByEmail(data.email);
      if (!user) return res.status(401).json({ error: "Invalid email or password" });
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid email or password" });
      const token = storage.createToken(user.id);
      storage.setOnlineStatus(user.id, "online");
      return res.json({ token, user: safeUser(user) });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, (req: any, res) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) storage.deleteToken(auth.slice(7));
    storage.setOnlineStatus(req.user.id, "offline");
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    return res.json({ user: safeUser(req.user) });
  });

  // ── USERS ──
  app.get("/api/users", requireAuth, (req: any, res) => {
    const q = (req.query.q as string || "").toLowerCase();
    const me = req.user.id;
    let users = storage.getAllUsers().filter(u => u.id !== me);
    if (q) users = users.filter(u =>
      u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
    );
    const blocked = storage.getBlockedByUser(me).map(b => b.blockedId);
    users = users.filter(u => !blocked.includes(u.id));
    const friendIds = storage.getFriendIds(me);
    const result = users.map(u => ({
      ...safeUser(u),
      isFriend: friendIds.includes(u.id),
    }));
    // Friends first
    result.sort((a, b) => (b.isFriend ? 1 : 0) - (a.isFriend ? 1 : 0));
    return res.json({ users: result });
  });

  app.get("/api/users/:id", requireAuth, (req: any, res) => {
    const user = storage.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const me = req.user.id;
    const friendIds = storage.getFriendIds(me);
    const pendingReq = storage.getPendingRequestBetween(me, user.id);
    const incomingReq = storage.getPendingRequestBetween(user.id, me);
    return res.json({
      user: safeUser(user),
      isFriend: friendIds.includes(user.id),
      pendingRequest: pendingReq ? pendingReq.id : null,
      incomingRequest: incomingReq ? incomingReq.id : null,
      isBlocked: storage.isBlocked(me, user.id),
    });
  });

  app.patch("/api/users/me", requireAuth, (req: any, res) => {
    const { displayName, bio, profilePicture, quietHoursStart, quietHoursEnd, theme } = req.body;
    const updated = storage.updateUser(req.user.id, {
      ...(displayName !== undefined && { displayName }),
      ...(bio !== undefined && { bio }),
      ...(profilePicture !== undefined && { profilePicture }),
      ...(quietHoursStart !== undefined && { quietHoursStart }),
      ...(quietHoursEnd !== undefined && { quietHoursEnd }),
      ...(theme !== undefined && { theme }),
    });
    return res.json({ user: safeUser(updated) });
  });

  // ── LOBBY ──
  app.get("/api/lobby/messages", requireAuth, (_req, res) => {
    const messages = storage.getPublicMessages();
    const enriched = messages.map(m => ({
      ...m,
      user: safeUser(storage.getUserById(m.userId)),
      replyTo: m.replyToId ? storage.getPublicMessageById(m.replyToId) : null,
    }));
    return res.json({ messages: enriched });
  });

  // ── CONVERSATIONS ──
  app.get("/api/conversations", requireAuth, (req: any, res) => {
    const convs = storage.getConversationsByUser(req.user.id);
    const enriched = convs.map(c => {
      const otherId = c.participant1 === req.user.id ? c.participant2 : c.participant1;
      const other = storage.getUserById(otherId);
      const messages = storage.getPrivateMessages(c.id);
      const lastMsg = messages[messages.length - 1] ?? null;
      const unread = storage.getUnreadCount(c.id, req.user.id);
      return { ...c, other: safeUser(other), lastMessage: lastMsg, unread };
    });
    return res.json({ conversations: enriched });
  });

  app.post("/api/conversations", requireAuth, (req: any, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const other = storage.getUserById(userId);
    if (!other) return res.status(404).json({ error: "User not found" });
    if (storage.isBlocked(userId, req.user.id)) {
      return res.status(403).json({ error: "Cannot message this user" });
    }
    const conv = storage.getOrCreateConversation(req.user.id, userId);
    return res.json({ conversation: conv });
  });

  app.get("/api/conversations/:id/messages", requireAuth, (req: any, res) => {
    const conv = storage.getConversationById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (conv.participant1 !== req.user.id && conv.participant2 !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    storage.markMessagesRead(req.params.id, req.user.id);
    const messages = storage.getPrivateMessages(req.params.id);
    const enriched = messages.map(m => ({
      ...m,
      user: safeUser(storage.getUserById(m.senderId)),
      replyTo: m.replyToId ? storage.getPrivateMessages(m.conversationId).find(x => x.id === m.replyToId) : null,
    }));
    return res.json({ messages: enriched });
  });

  // ── FRIENDS ──
  app.get("/api/friends", requireAuth, (req: any, res) => {
    const ids = storage.getFriendIds(req.user.id);
    const friends = ids.map(id => safeUser(storage.getUserById(id))).filter(Boolean);
    const requests = storage.getPendingRequestsForUser(req.user.id).map(r => ({
      ...r,
      from: safeUser(storage.getUserById(r.fromUserId)),
    }));
    return res.json({ friends, requests });
  });

  app.post("/api/friends/request", requireAuth, (req: any, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (userId === req.user.id) return res.status(400).json({ error: "Cannot friend yourself" });
    if (storage.areFriends(req.user.id, userId)) {
      return res.status(400).json({ error: "Already friends" });
    }
    if (storage.getPendingRequestBetween(req.user.id, userId)) {
      return res.status(400).json({ error: "Request already sent" });
    }
    const req2 = storage.createFriendRequest(req.user.id, userId);
    storage.createNotification({
      userId,
      type: "friend_request",
      fromUserId: req.user.id,
      message: `${req.user.displayName} sent you a friend request`,
      relatedId: req2.id,
    });
    broadcast(userId, { type: "notification", payload: { type: "friend_request" } });
    return res.json({ request: req2 });
  });

  app.patch("/api/friends/request/:id", requireAuth, (req: any, res) => {
    const { action } = req.body; // accept | decline
    const request = storage.getFriendRequest(req.params.id);
    if (!request) return res.status(404).json({ error: "Not found" });
    if (request.toUserId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    const updated = storage.updateFriendRequest(req.params.id, action === "accept" ? "accepted" : "declined");
    if (action === "accept") {
      storage.createFriendship(request.fromUserId, request.toUserId);
      storage.createNotification({
        userId: request.fromUserId,
        type: "friend_accepted",
        fromUserId: req.user.id,
        message: `${req.user.displayName} accepted your friend request`,
        relatedId: req.user.id,
      });
      broadcast(request.fromUserId, { type: "notification", payload: { type: "friend_accepted" } });
    }
    return res.json({ request: updated });
  });

  app.delete("/api/friends/:userId", requireAuth, (req: any, res) => {
    storage.removeFriend(req.user.id, req.params.userId);
    return res.json({ ok: true });
  });

  // ── NOTIFICATIONS ──
  app.get("/api/notifications", requireAuth, (req: any, res) => {
    const notifs = storage.getNotificationsForUser(req.user.id);
    return res.json({ notifications: notifs });
  });

  app.post("/api/notifications/read", requireAuth, (req: any, res) => {
    storage.markNotificationsRead(req.user.id);
    return res.json({ ok: true });
  });

  // ── BLOCKED USERS ──
  app.get("/api/blocked", requireAuth, (req: any, res) => {
    const blocked = storage.getBlockedByUser(req.user.id).map(b => ({
      ...b,
      user: safeUser(storage.getUserById(b.blockedId)),
    }));
    return res.json({ blocked });
  });

  app.post("/api/blocked", requireAuth, (req: any, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (storage.isBlocked(req.user.id, userId)) {
      return res.status(400).json({ error: "Already blocked" });
    }
    const b = storage.blockUser(req.user.id, userId);
    storage.removeFriend(req.user.id, userId);
    return res.json({ blocked: b });
  });

  app.delete("/api/blocked/:userId", requireAuth, (req: any, res) => {
    storage.unblockUser(req.user.id, req.params.userId);
    return res.json({ ok: true });
  });

  // ── ONLINE COUNT ──
  app.get("/api/online-count", (_req, res) => {
    return res.json({ count: storage.getOnlineUserCount() });
  });

  // ── WEBSOCKET ──
  wss.on("connection", (ws: WSClient, req) => {
    const url = new URL(req.url!, `http://localhost`);
    const token = url.searchParams.get("token");
    if (token) {
      const user = storage.getUserByToken(token);
      if (user) {
        ws.userId = user.id;
        ws.token = token;
        if (!wsClients.has(user.id)) wsClients.set(user.id, new Set());
        wsClients.get(user.id)!.add(ws);
        storage.setOnlineStatus(user.id, "online");
        broadcastToAll({ type: "user_status", payload: { userId: user.id, status: "online" } });
      }
    }

    ws.on("message", async (raw) => {
      if (!ws.userId) return;
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      const user = storage.getUserById(ws.userId)!;

      switch (msg.type) {
        case "lobby_message": {
          const content = (msg.content || "").trim();
          if (!content || content.length > 2000) return;
          const newMsg = storage.createPublicMessage({
            userId: ws.userId,
            content,
            replyToId: msg.replyToId ?? null,
            reactions: "{}",
          });
          broadcastToAllIncluding({
            type: "lobby_message",
            payload: { ...newMsg, user: { id: user.id, username: user.username, displayName: user.displayName, profilePicture: user.profilePicture } },
          });
          break;
        }
        case "lobby_edit": {
          const target = storage.getPublicMessageById(msg.messageId);
          if (!target || target.userId !== ws.userId) return;
          const age = Date.now() - target.createdAt.getTime();
          if (age > 5 * 60 * 1000) return;
          const updated = storage.updatePublicMessage(msg.messageId, msg.content);
          broadcastToAllIncluding({ type: "lobby_edit", payload: updated });
          break;
        }
        case "lobby_delete": {
          const target = storage.getPublicMessageById(msg.messageId);
          if (!target || target.userId !== ws.userId) return;
          storage.deletePublicMessage(msg.messageId);
          broadcastToAllIncluding({ type: "lobby_delete", payload: { id: msg.messageId } });
          break;
        }
        case "lobby_react": {
          const updated = storage.reactPublicMessage(msg.messageId, msg.emoji, ws.userId);
          if (updated) broadcastToAllIncluding({ type: "lobby_react", payload: updated });
          break;
        }
        case "lobby_typing": {
          broadcastToAll({ type: "lobby_typing", payload: { userId: ws.userId, username: user.username, isTyping: msg.isTyping } }, ws.userId);
          break;
        }
        case "private_message": {
          const conv = storage.getConversationById(msg.conversationId);
          if (!conv) return;
          if (conv.participant1 !== ws.userId && conv.participant2 !== ws.userId) return;
          const otherId = conv.participant1 === ws.userId ? conv.participant2 : conv.participant1;
          if (storage.isBlocked(otherId, ws.userId)) return;
          const content = (msg.content || "").trim();
          if (!content) return;
          const newMsg = storage.createPrivateMessage({
            conversationId: msg.conversationId,
            senderId: ws.userId,
            content,
            type: msg.msgType || "text",
            voiceDuration: msg.voiceDuration ?? null,
            read: false,
            replyToId: msg.replyToId ?? null,
            reactions: "{}",
          });
          const payload = { ...newMsg, user: { id: user.id, username: user.username, displayName: user.displayName, profilePicture: user.profilePicture } };
          broadcast(ws.userId, { type: "private_message", payload });
          broadcast(otherId, { type: "private_message", payload });
          // Notify other user
          const isOtherOnline = wsClients.has(otherId) && (wsClients.get(otherId)?.size ?? 0) > 0;
          if (!isOtherOnline) {
            storage.createNotification({
              userId: otherId,
              type: "new_message",
              fromUserId: ws.userId,
              message: `${user.displayName}: ${content.slice(0, 50)}`,
              relatedId: msg.conversationId,
            });
          }
          break;
        }
        case "private_edit": {
          const target = storage.getPrivateMessages(msg.conversationId).find(m => m.id === msg.messageId);
          if (!target || target.senderId !== ws.userId) return;
          const conv = storage.getConversationById(msg.conversationId);
          if (!conv) return;
          const updated = storage.updatePrivateMessage(msg.messageId, msg.content);
          const otherId = conv.participant1 === ws.userId ? conv.participant2 : conv.participant1;
          broadcast(ws.userId, { type: "private_edit", payload: updated });
          broadcast(otherId, { type: "private_edit", payload: updated });
          break;
        }
        case "private_delete": {
          const target = storage.getPrivateMessages(msg.conversationId || "").find(m => m.id === msg.messageId);
          if (!target || target.senderId !== ws.userId) return;
          const conv = storage.getConversationById(msg.conversationId);
          if (!conv) return;
          storage.deletePrivateMessage(msg.messageId);
          const otherId = conv.participant1 === ws.userId ? conv.participant2 : conv.participant1;
          broadcast(ws.userId, { type: "private_delete", payload: { id: msg.messageId, conversationId: msg.conversationId } });
          broadcast(otherId, { type: "private_delete", payload: { id: msg.messageId, conversationId: msg.conversationId } });
          break;
        }
        case "private_react": {
          const conv = storage.getConversationById(msg.conversationId);
          if (!conv) return;
          const updated = storage.reactPrivateMessage(msg.messageId, msg.emoji, ws.userId);
          if (updated) {
            const otherId = conv.participant1 === ws.userId ? conv.participant2 : conv.participant1;
            broadcast(ws.userId, { type: "private_react", payload: updated });
            broadcast(otherId, { type: "private_react", payload: updated });
          }
          break;
        }
        case "private_typing": {
          const conv = storage.getConversationById(msg.conversationId);
          if (!conv) return;
          const otherId = conv.participant1 === ws.userId ? conv.participant2 : conv.participant1;
          broadcast(otherId, { type: "private_typing", payload: { userId: ws.userId, conversationId: msg.conversationId, isTyping: msg.isTyping } });
          break;
        }
        case "mark_read": {
          storage.markMessagesRead(msg.conversationId, ws.userId);
          const conv = storage.getConversationById(msg.conversationId);
          if (conv) {
            const otherId = conv.participant1 === ws.userId ? conv.participant2 : conv.participant1;
            broadcast(otherId, { type: "messages_read", payload: { conversationId: msg.conversationId, byUserId: ws.userId } });
          }
          break;
        }
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        const clients = wsClients.get(ws.userId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            wsClients.delete(ws.userId);
            storage.setOnlineStatus(ws.userId, "offline");
            broadcastToAll({ type: "user_status", payload: { userId: ws.userId, status: "offline" } });
          }
        }
      }
    });
  });

  return httpServer;
}
