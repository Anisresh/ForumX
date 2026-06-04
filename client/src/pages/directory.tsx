import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { Search, UserPlus, MessageCircle, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/App";

export default function DirectoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/users", search],
    queryFn: async () => {
      const token = localStorage.getItem("forumx_token");
      const url = `/api/users${search ? `?q=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      return res.json();
    },
    staleTime: 30000,
  });

  const addFriendMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", "/api/friends/request", { userId }).then(r => r.json()),
    onSuccess: (_, userId) => {
      setSentRequests(prev => new Set([...prev, userId]));
      toast({ title: "Friend request sent!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startChat = async (userId: string) => {
    const res = await apiRequest("POST", "/api/conversations", { userId });
    const data = await res.json();
    window.location.href = `/messages/${data.conversation.id}`;
  };

  const users = data?.users ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">User Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Meet the people of ForumX</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or username…"
            className="pl-9 bg-muted/30 border-0 focus-visible:ring-1" />
        </div>

        {isLoading && <div className="text-center text-muted-foreground text-sm py-10">Loading…</div>}

        {!isLoading && users.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <p className="font-medium">No users found</p>
            {search && <p className="text-sm mt-1">Try a different search term.</p>}
          </div>
        )}

        <div className="space-y-2">
          {users.map((u: any) => {
            const requested = sentRequests.has(u.id);
            return (
              <div key={u.id} className="glass rounded-xl p-4 flex items-center gap-3">
                <Link href={`/profile/${u.id}`}>
                  <UserAvatar src={u.profilePicture} name={u.displayName ?? "?"} size="md"
                    status={u.onlineStatus === "online" ? "online" : "offline"} showStatus
                    className="cursor-pointer" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${u.id}`}>
                    <p className="font-medium text-sm cursor-pointer hover:underline">{u.displayName}</p>
                  </Link>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                  {u.bio && <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.bio}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  {u.isFriend ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Friends
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" disabled={requested || addFriendMutation.isPending}
                      onClick={() => addFriendMutation.mutate(u.id)}>
                      {requested ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => startChat(u.id)}>
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">Created by Anisresh A R</p>
      </div>
    </div>
  );
}
