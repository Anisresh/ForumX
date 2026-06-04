import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { MessageCircle, Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { wsClient } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";

export default function MessagesPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/conversations"],
    staleTime: 0,
  });

  useEffect(() => {
    const unsub = wsClient.on("private_message", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    });
    return () => unsub();
  }, []);

  const convs = data?.conversations ?? [];
  const filtered = convs.filter((c: any) =>
    !search || c.other?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.other?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewMessage = async () => {
    navigate("/directory");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border/50 glass flex items-center justify-between gap-3">
        <h1 className="font-semibold text-lg">Messages</h1>
        <Button size="icon" variant="outline" onClick={handleNewMessage}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-4 py-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…" className="pl-9 bg-muted/30 border-0 focus-visible:ring-1" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 p-8">
            <MessageCircle className="w-12 h-12 opacity-20" />
            <div className="text-center">
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Find friends in the directory to start chatting.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/directory">Browse Users</Link>
            </Button>
          </div>
        )}
        {filtered.map((conv: any) => (
          <Link key={conv.id} href={`/messages/${conv.id}`}>
            <div className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer border-b border-border/30">
              <UserAvatar
                src={conv.other?.profilePicture}
                name={conv.other?.displayName ?? "?"}
                status={conv.other?.onlineStatus === "online" ? "online" : "offline"}
                showStatus
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{conv.other?.displayName}</p>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                      {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {conv.lastMessage?.deleted ? "Message deleted" :
                   conv.lastMessage?.type === "voice" ? "🎤 Voice message" :
                   conv.lastMessage?.content ?? "Start a conversation"}
                </p>
              </div>
              {conv.unread > 0 && (
                <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                  {conv.unread > 9 ? "9+" : conv.unread}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
