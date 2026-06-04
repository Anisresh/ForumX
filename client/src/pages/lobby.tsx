import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { wsClient } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/UserAvatar";
import EmojiPicker, { ReactionPicker } from "@/components/EmojiPicker";
import { Send, Reply, Edit2, Trash2, Copy, MoreHorizontal, Wifi } from "lucide-react";
import { formatDistanceToNow, format, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Msg = {
  id: string; userId: string; content: string; createdAt: string; editedAt?: string | null;
  deleted: boolean; replyToId?: string | null; reactions: string;
  user?: { id: string; username: string; displayName: string; profilePicture?: string | null };
  replyTo?: Msg | null;
};

export default function LobbyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showReactFor, setShowReactFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/lobby/messages"],
    staleTime: 0,
  });

  const { data: onlineData } = useQuery<any>({ queryKey: ["/api/online-count"], refetchInterval: 15000 });

  useEffect(() => {
    if (data?.messages) setMessages(data.messages);
  }, [data]);

  useEffect(() => {
    const unsubs = [
      wsClient.on("lobby_message", (msg) => {
        setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
      }),
      wsClient.on("lobby_edit", (msg) => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
      }),
      wsClient.on("lobby_delete", ({ id }) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true, content: "This message was deleted" } : m));
      }),
      wsClient.on("lobby_react", (msg) => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: msg.reactions } : m));
      }),
      wsClient.on("lobby_typing", ({ userId: uid, username, isTyping }) => {
        if (uid === user?.id) return;
        const existing = typingTimeouts.current.get(uid);
        if (existing) clearTimeout(existing);
        if (isTyping) {
          setTypingUsers(p => p.includes(username) ? p : [...p, username]);
          const t = setTimeout(() => {
            setTypingUsers(p => p.filter(u => u !== username));
            typingTimeouts.current.delete(uid);
          }, 4000);
          typingTimeouts.current.set(uid, t);
        } else {
          setTypingUsers(p => p.filter(u => u !== username));
        }
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextChange = (v: string) => {
    setText(v);
    if (!typingRef.current) {
      wsClient.sendLobbyTyping(true);
      typingRef.current = true;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      wsClient.sendLobbyTyping(false);
      typingRef.current = false;
    }, 2500);
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content) return;
    wsClient.sendLobbyMessage(content, replyTo?.id);
    setText("");
    setReplyTo(null);
    wsClient.sendLobbyTyping(false);
    typingRef.current = false;
    clearTimeout(typingTimer.current);
  };

  const handleEdit = (msg: Msg) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const submitEdit = (id: string) => {
    const content = editText.trim();
    if (!content) return;
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    const age = Date.now() - new Date(msg.createdAt).getTime();
    if (age > 5 * 60 * 1000) {
      toast({ title: "Too late", description: "Messages can only be edited within 5 minutes.", variant: "destructive" });
      setEditingId(null);
      return;
    }
    wsClient.editLobbyMessage(id, content);
    setEditingId(null);
  };

  const parsedReactions = useCallback((r: string) => {
    try { return JSON.parse(r || "{}") as Record<string, string[]>; }
    catch { return {}; }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 glass">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <div>
            <h1 className="font-semibold">Public Lobby</h1>
            <p className="text-xs text-muted-foreground">{onlineData?.count ?? 0} online · messages expire after 72h</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wifi className="w-3.5 h-3.5 text-green-400" />
          <span>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading messages…</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <div className="text-4xl">☕</div>
            <p className="text-sm">The café is quiet. Be the first to say hello!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.userId === user?.id;
          const reactions = parsedReactions(msg.reactions);
          const canEdit = isMe && !msg.deleted && Date.now() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000;

          return (
            <div key={msg.id}
              className={`flex gap-2 group relative ${isMe ? "flex-row-reverse" : ""}`}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => { setHoveredId(null); setShowReactFor(null); }}
            >
              {!isMe && (
                <UserAvatar src={msg.user?.profilePicture} name={msg.user?.displayName ?? "?"} size="sm"
                  className="mt-1 flex-shrink-0" />
              )}
              <div className={`max-w-[70%] min-w-0 ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {!isMe && !msg.deleted && (
                  <span className="text-[11px] text-muted-foreground px-1">{msg.user?.displayName}</span>
                )}

                {/* Reply preview */}
                {msg.replyTo && !msg.deleted && (
                  <div className={`text-xs px-3 py-1.5 rounded-xl mb-0.5 border-l-2 border-primary/40 bg-muted/50 ${isMe ? "self-end" : ""}`}>
                    <span className="font-medium text-primary/70">{msg.replyTo.user?.displayName ?? "Unknown"}</span>
                    <p className="text-muted-foreground truncate max-w-[200px]">{msg.replyTo.content}</p>
                  </div>
                )}

                {/* Message bubble */}
                {editingId === msg.id ? (
                  <div className="flex gap-1">
                    <Input value={editText} onChange={e => setEditText(e.target.value)} className="text-sm h-8"
                      onKeyDown={e => { if (e.key === "Enter") submitEdit(msg.id); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus />
                    <Button size="sm" onClick={() => submitEdit(msg.id)} className="h-8 px-2"><Send className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 px-2">✕</Button>
                  </div>
                ) : (
                  <div className={`relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.deleted ? "italic text-muted-foreground bg-muted/40 rounded-2xl" : isMe ? "message-out" : "message-in"}`}>
                    {msg.content}
                    {msg.editedAt && !msg.deleted && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">(edited)</span>
                    )}
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(reactions).length > 0 && (
                  <div className={`flex flex-wrap gap-0.5 ${isMe ? "justify-end" : ""}`}>
                    {Object.entries(reactions).map(([emoji, users]) => (
                      <button key={emoji} onClick={() => wsClient.reactLobbyMessage(msg.id, emoji)}
                        className={`text-xs px-1.5 py-0.5 rounded-full border transition-all ${(users as string[]).includes(user?.id ?? "") ? "bg-primary/15 border-primary/30" : "bg-muted/50 border-border/50"}`}>
                        {emoji} {(users as string[]).length}
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <span className={`text-[10px] text-muted-foreground px-1 ${isMe ? "self-end" : ""}`}>
                  {isToday(new Date(msg.createdAt))
                    ? format(new Date(msg.createdAt), "HH:mm")
                    : formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Action toolbar */}
              {!msg.deleted && hoveredId === msg.id && editingId !== msg.id && (
                <div className={`absolute top-0 ${isMe ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"} flex items-center gap-0.5 glass rounded-xl px-1.5 py-1 shadow-md border border-border/50 z-10`}>
                  <button onClick={() => setShowReactFor(showReactFor === msg.id ? null : msg.id)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50 text-sm">😊</button>
                  <button onClick={() => setReplyTo(msg)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50"><Reply className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => { navigator.clipboard.writeText(msg.content); toast({ title: "Copied!" }); }} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  {canEdit && <button onClick={() => handleEdit(msg)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                  {isMe && <button onClick={() => wsClient.deleteLobbyMessage(msg.id)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              )}

              {/* Reaction picker */}
              {showReactFor === msg.id && (
                <div className={`absolute top-8 ${isMe ? "right-0" : "left-10"} z-20`}>
                  <ReactionPicker onSelect={(e) => { wsClient.reactLobbyMessage(msg.id, e); setShowReactFor(null); }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs pl-2">
            <div className="flex gap-0.5">
              <div className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full" />
              <div className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full" />
              <div className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full" />
            </div>
            <span>{typingUsers.slice(0, 2).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-t border-border/50 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-primary text-xs font-medium">{replyTo.user?.displayName}</span>
              <p className="text-muted-foreground text-xs truncate">{replyTo.content}</p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50 flex items-center gap-2">
        <EmojiPicker onSelect={(e) => setText(p => p + e)} />
        <Input
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Say something nice…"
          className="flex-1 bg-muted/40 border-0 focus-visible:ring-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
