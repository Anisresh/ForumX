import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { wsClient } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/UserAvatar";
import EmojiPicker, { ReactionPicker } from "@/components/EmojiPicker";
import { Send, Reply, Edit2, Trash2, Copy, ArrowLeft, Mic, MicOff, Play, Pause } from "lucide-react";
import { formatDistanceToNow, format, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Msg = {
  id: string; conversationId: string; senderId: string; content: string;
  type: string; voiceDuration?: number | null; read: boolean;
  replyToId?: string | null; reactions: string; createdAt: string;
  editedAt?: string | null; deleted: boolean;
  user?: { id: string; displayName: string; profilePicture?: string | null };
};

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showReactFor, setShowReactFor] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recorderDuration, setRecorderDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recorderTimer = useRef<ReturnType<typeof setInterval>>();
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const { data: convData } = useQuery<any>({ queryKey: ["/api/conversations"], staleTime: 0 });
  const conv = convData?.conversations?.find((c: any) => c.id === id);
  const other = conv?.other;

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/conversations", id, "messages"],
    enabled: !!id,
    staleTime: 0,
  });

  useEffect(() => {
    if (data?.messages) {
      setMessages(data.messages);
      wsClient.markRead(id!);
    }
  }, [data, id]);

  useEffect(() => {
    const unsubs = [
      wsClient.on("private_message", (msg) => {
        if (msg.conversationId !== id) return;
        setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
        wsClient.markRead(id!);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }),
      wsClient.on("private_edit", (msg) => {
        if (msg.conversationId !== id) return;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
      }),
      wsClient.on("private_delete", ({ id: mid, conversationId }) => {
        if (conversationId !== id) return;
        setMessages(prev => prev.map(m => m.id === mid ? { ...m, deleted: true, content: "This message was deleted" } : m));
      }),
      wsClient.on("private_react", (msg) => {
        if (msg.conversationId !== id) return;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: msg.reactions } : m));
      }),
      wsClient.on("private_typing", ({ userId: uid, conversationId, isTyping: it }) => {
        if (conversationId !== id || uid === user?.id) return;
        setIsTyping(it);
        if (it) {
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setIsTyping(false), 4000);
        }
      }),
      wsClient.on("messages_read", ({ conversationId }) => {
        if (conversationId !== id) return;
        setMessages(prev => prev.map(m => ({ ...m, read: true })));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTextChange = (v: string) => {
    setText(v);
    if (!typingRef.current) {
      wsClient.sendPrivateTyping(id!, true);
      typingRef.current = true;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      wsClient.sendPrivateTyping(id!, false);
      typingRef.current = false;
    }, 2500);
  };

  const handleSend = () => {
    const content = text.trim();
    if (!content || !id) return;
    wsClient.sendPrivateMessage(id, content, replyTo?.id);
    setText("");
    setReplyTo(null);
    wsClient.sendPrivateTyping(id, false);
    typingRef.current = false;
  };

  const submitEdit = (msgId: string) => {
    const content = editText.trim();
    if (!content || !id) return;
    wsClient.editPrivateMessage(id, msgId, content);
    setEditingId(null);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorder.current = mr;
      audioChunks.current = [];
      mr.ondataavailable = e => audioChunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const duration = recorderDuration;
        stream.getTracks().forEach(t => t.stop());
        // Convert to base64 and send
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          wsClient.sendPrivateMessage(id!, base64, undefined, "voice", duration);
        };
        reader.readAsDataURL(blob);
        setRecorderDuration(0);
      };
      mr.start();
      setRecording(true);
      setRecorderDuration(0);
      recorderTimer.current = setInterval(() => setRecorderDuration(d => d + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === "recording") mediaRecorder.current.stop();
    clearInterval(recorderTimer.current);
    setRecording(false);
  };

  const togglePlayVoice = (msgId: string, src: string) => {
    if (playingId === msgId) {
      audioRefs.current.get(msgId)?.pause();
      setPlayingId(null);
    } else {
      // Pause others
      for (const [, audio] of audioRefs.current) audio.pause();
      let audio = audioRefs.current.get(msgId);
      if (!audio) {
        audio = new Audio(src);
        audio.onended = () => setPlayingId(null);
        audioRefs.current.set(msgId, audio);
      }
      audio.playbackRate = playbackSpeed;
      audio.play();
      setPlayingId(msgId);
    }
  };

  const parsedReactions = useCallback((r: string) => {
    try { return JSON.parse(r || "{}") as Record<string, string[]>; } catch { return {}; }
  }, []);

  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!id) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 glass">
        <Button size="icon" variant="ghost" onClick={() => navigate("/messages")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {other && (
          <>
            <UserAvatar src={other.profilePicture} name={other.displayName ?? "?"} size="sm"
              status={other.onlineStatus === "online" ? "online" : "offline"} showStatus />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{other.displayName}</p>
              <p className="text-[11px] text-muted-foreground">
                {isTyping ? (
                  <span className="text-primary">typing…</span>
                ) : other.onlineStatus === "online" ? "Online" : (
                  other.lastSeen ? `Last seen ${formatDistanceToNow(new Date(other.lastSeen), { addSuffix: true })}` : "Offline"
                )}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading && <div className="text-center text-muted-foreground text-sm py-10">Loading messages…</div>}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
            <div className="text-4xl">👋</div>
            <p className="text-sm">Say hello to {other?.displayName}!</p>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.senderId === user?.id;
          const reactions = parsedReactions(msg.reactions);

          return (
            <div key={msg.id}
              className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => { setHoveredId(null); setShowReactFor(null); }}
            >
              {!isMe && (
                <UserAvatar src={msg.user?.profilePicture} name={msg.user?.displayName ?? "?"} size="sm" className="mt-1" />
              )}
              <div className={`max-w-[65%] min-w-0 flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                {/* Reply preview */}
                {msg.replyToId && !msg.deleted && (
                  <div className="text-xs px-3 py-1.5 rounded-xl mb-0.5 border-l-2 border-primary/40 bg-muted/50">
                    <p className="text-muted-foreground truncate max-w-[200px] italic">
                      {messages.find(m => m.id === msg.replyToId)?.content ?? "Message"}
                    </p>
                  </div>
                )}

                {/* Bubble */}
                {editingId === msg.id ? (
                  <div className="flex gap-1">
                    <Input value={editText} onChange={e => setEditText(e.target.value)} className="text-sm h-8"
                      onKeyDown={e => { if (e.key === "Enter") submitEdit(msg.id); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus />
                    <Button size="sm" onClick={() => submitEdit(msg.id)} className="h-8 px-2"><Send className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 px-2">✕</Button>
                  </div>
                ) : msg.type === "voice" && !msg.deleted ? (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${isMe ? "message-out" : "message-in"}`}>
                    <button onClick={() => togglePlayVoice(msg.id, msg.content)} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20">
                      {playingId === msg.id ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="h-1 bg-primary/20 rounded-full w-20">
                        <div className="h-1 bg-primary rounded-full w-1/3" />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmtDur(msg.voiceDuration ?? 0)}</span>
                    <button onClick={() => {
                      const speeds = [1, 1.5, 2];
                      const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                      setPlaybackSpeed(next);
                      const audio = audioRefs.current.get(msg.id);
                      if (audio) audio.playbackRate = next;
                    }} className="text-[10px] text-primary font-bold">{playbackSpeed}x</button>
                  </div>
                ) : (
                  <div className={`relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.deleted ? "italic text-muted-foreground bg-muted/40" : isMe ? "message-out" : "message-in"}`}>
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
                      <button key={emoji} onClick={() => wsClient.reactPrivateMessage(id!, msg.id, emoji)}
                        className={`text-xs px-1.5 py-0.5 rounded-full border transition-all ${(users as string[]).includes(user?.id ?? "") ? "bg-primary/15 border-primary/30" : "bg-muted/50 border-border/50"}`}>
                        {emoji} {(users as string[]).length}
                      </button>
                    ))}
                  </div>
                )}

                {/* Time + read receipt */}
                <div className={`flex items-center gap-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {isToday(new Date(msg.createdAt)) ? format(new Date(msg.createdAt), "HH:mm") : formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                  {isMe && !msg.deleted && (
                    <span className={`text-[10px] ${msg.read ? "text-primary" : "text-muted-foreground"}`}>
                      {msg.read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!msg.deleted && hoveredId === msg.id && editingId !== msg.id && (
                <div className={`absolute ${isMe ? "left-0" : "right-0"} flex items-center gap-0.5 glass rounded-xl px-1.5 py-1 shadow-md border border-border/50 z-10 mt-1`}
                  style={{ position: "relative", height: "fit-content", alignSelf: "center" }}>
                  <button onClick={() => setShowReactFor(showReactFor === msg.id ? null : msg.id)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50 text-sm">😊</button>
                  <button onClick={() => setReplyTo(msg)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50"><Reply className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  {msg.type !== "voice" && <button onClick={() => { navigator.clipboard.writeText(msg.content); toast({ title: "Copied!" }); }} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                  {isMe && msg.type !== "voice" && <button onClick={() => { setEditingId(msg.id); setEditText(msg.content); }} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-accent/50"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                  {isMe && <button onClick={() => wsClient.deletePrivateMessage(id!, msg.id)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              )}

              {showReactFor === msg.id && (
                <div className={`absolute z-20 mt-8 ${isMe ? "right-12" : "left-12"}`} style={{ position: "relative", alignSelf: "center" }}>
                  <ReactionPicker onSelect={(e) => { wsClient.reactPrivateMessage(id!, msg.id, e); setShowReactFor(null); }} />
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs pl-2">
            <div className="flex gap-0.5">
              <div className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full" />
              <div className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full" />
              <div className="typing-dot w-1.5 h-1.5 bg-muted-foreground rounded-full" />
            </div>
            <span>{other?.displayName} is typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-t border-border/50 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-muted-foreground text-xs truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-muted-foreground ml-2">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50 flex items-center gap-2">
        <EmojiPicker onSelect={(e) => setText(p => p + e)} />
        {recording ? (
          <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-destructive font-medium">{fmtDur(recorderDuration)}</span>
            <span className="text-xs text-muted-foreground">Recording…</span>
          </div>
        ) : (
          <Input
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message…"
            className="flex-1 bg-muted/40 border-0 focus-visible:ring-1"
          />
        )}
        {!text.trim() && (
          <Button size="icon" variant={recording ? "destructive" : "outline"}
            onClick={recording ? stopRecording : startRecording}>
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        )}
        {text.trim() && (
          <Button size="icon" onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
