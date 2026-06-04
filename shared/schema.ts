import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio").default(""),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  onlineStatus: text("online_status").default("offline").notNull(),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  theme: text("theme").default("light").notNull(),
});

export const publicMessages = pgTable("public_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  replyToId: text("reply_to_id"),
  reactions: text("reactions").default("{}").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
  deleted: boolean("deleted").default(false).notNull(),
});

export const privateConversations = pgTable("private_conversations", {
  id: text("id").primaryKey(),
  participant1: text("participant1").notNull(),
  participant2: text("participant2").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

export const privateMessages = pgTable("private_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  type: text("type").default("text").notNull(),
  voiceDuration: integer("voice_duration"),
  read: boolean("read").default(false).notNull(),
  replyToId: text("reply_to_id"),
  reactions: text("reactions").default("{}").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
  deleted: boolean("deleted").default(false).notNull(),
});

export const friendRequests = pgTable("friend_requests", {
  id: text("id").primaryKey(),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friends = pgTable("friends", {
  id: text("id").primaryKey(),
  userId1: text("user_id_1").notNull(),
  userId2: text("user_id_2").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  fromUserId: text("from_user_id"),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  relatedId: text("related_id"),
});

export const blockedUsers = pgTable("blocked_users", {
  id: text("id").primaryKey(),
  blockerId: text("blocker_id").notNull(),
  blockedId: text("blocked_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true, createdAt: true, lastSeen: true, onlineStatus: true,
});
export const signupSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(50).optional(),
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PublicMessage = typeof publicMessages.$inferSelect;
export type PrivateConversation = typeof privateConversations.$inferSelect;
export type PrivateMessage = typeof privateMessages.$inferSelect;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type Friend = typeof friends.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type BlockedUser = typeof blockedUsers.$inferSelect;
