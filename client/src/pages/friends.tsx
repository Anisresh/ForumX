import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { Users, Check, X, MessageCircle, UserMinus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FriendsPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/friends"],
    staleTime: 0,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiRequest("PATCH", `/api/friends/request/${id}`, { action }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/friends/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/friends"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startChat = async (userId: string) => {
    const res = await apiRequest("POST", "/api/conversations", { userId });
    const data = await res.json();
    window.location.href = `/messages/${data.conversation.id}`;
  };

  const friends = data?.friends ?? [];
  const requests = data?.requests ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        <h1 className="text-xl font-bold">Friends</h1>

        {/* Pending requests */}
        {requests.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Friend Requests ({requests.length})
            </h2>
            <div className="space-y-2">
              {requests.map((req: any) => (
                <div key={req.id} className="glass rounded-xl p-4 flex items-center gap-3">
                  <UserAvatar src={req.from?.profilePicture} name={req.from?.displayName ?? "?"} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{req.from?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{req.from?.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondMutation.mutate({ id: req.id, action: "accept" })}
                      disabled={respondMutation.isPending}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respondMutation.mutate({ id: req.id, action: "decline" })}
                      disabled={respondMutation.isPending}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Friends ({friends.length})
          </h2>

          {isLoading && <div className="text-center text-muted-foreground text-sm py-8">Loading…</div>}

          {!isLoading && friends.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
              <Users className="w-12 h-12 opacity-20" />
              <div className="text-center">
                <p className="font-medium">No friends yet</p>
                <p className="text-sm mt-1">Browse the directory to meet people.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/directory">Find People</Link>
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {friends.map((friend: any) => (
              <div key={friend.id} className="glass rounded-xl p-4 flex items-center gap-3">
                <UserAvatar src={friend.profilePicture} name={friend.displayName ?? "?"} size="md"
                  status={friend.onlineStatus === "online" ? "online" : "offline"} showStatus />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{friend.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{friend.username} · {friend.onlineStatus === "online" ? "Online" : "Offline"}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => startChat(friend.id)}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Message
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(friend.id)}>
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">Created by Anisresh A R</p>
      </div>
    </div>
  );
}
