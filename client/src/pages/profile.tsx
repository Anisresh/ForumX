import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, UserPlus, UserMinus, UserCheck, ShieldOff, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMe = id === me?.id;

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/users", id],
    queryFn: async () => {
      const token = localStorage.getItem("forumx_token");
      const res = await fetch(`/api/users/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      return res.json();
    },
    enabled: !!id,
  });

  const { data: friendsData } = useQuery<any>({ queryKey: ["/api/friends"] });

  const addFriendMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/friends/request", { userId: id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users", id] }); toast({ title: "Friend request sent!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const respondMutation = useMutation({
    mutationFn: ({ reqId, action }: { reqId: string; action: string }) =>
      apiRequest("PATCH", `/api/friends/request/${reqId}`, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", id] }),
  });

  const removeFriendMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/friends/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", id] }),
  });

  const blockMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/blocked", { userId: id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users", id] }); toast({ title: "User blocked." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/blocked/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/users", id] }),
  });

  const startChat = async () => {
    const res = await apiRequest("POST", "/api/conversations", { userId: id });
    const d = await res.json();
    navigate(`/messages/${d.conversation.id}`);
  };

  if (isMe) {
    navigate("/settings");
    return null;
  }

  const profile = data?.user;
  const isFriend = data?.isFriend;
  const pendingReq = data?.pendingRequest;
  const incomingReq = data?.incomingRequest;
  const isBlocked = data?.isBlocked;

  const friendIds = friendsData?.friends?.length ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {isLoading && (
          <div className="text-center text-muted-foreground py-20">Loading…</div>
        )}

        {!isLoading && !profile && (
          <div className="text-center text-muted-foreground py-20">User not found.</div>
        )}

        {profile && (
          <>
            {/* Profile card */}
            <div className="glass rounded-2xl p-6 text-center space-y-4">
              <div className="flex justify-center">
                <UserAvatar src={profile.profilePicture} name={profile.displayName ?? "?"} size="lg"
                  status={profile.onlineStatus === "online" ? "online" : "offline"} showStatus />
              </div>
              <div>
                <h1 className="text-xl font-bold">{profile.displayName}</h1>
                <p className="text-muted-foreground text-sm">@{profile.username}</p>
              </div>
              {profile.bio && <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>}

              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {format(new Date(profile.createdAt), "MMM yyyy")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${profile.onlineStatus === "online" ? "bg-green-400" : "bg-gray-300"}`} />
                  <span>{profile.onlineStatus === "online" ? "Online" : "Offline"}</span>
                </div>
              </div>

              {/* Actions */}
              {!isBlocked && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {isFriend ? (
                    <>
                      <Button onClick={startChat} size="sm">
                        <MessageCircle className="w-4 h-4 mr-1.5" /> Message
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeFriendMutation.mutate()}
                        disabled={removeFriendMutation.isPending}>
                        <UserMinus className="w-4 h-4 mr-1.5" /> Remove Friend
                      </Button>
                    </>
                  ) : incomingReq ? (
                    <>
                      <Button size="sm" onClick={() => respondMutation.mutate({ reqId: incomingReq, action: "accept" })}>
                        <UserCheck className="w-4 h-4 mr-1.5" /> Accept Request
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => respondMutation.mutate({ reqId: incomingReq, action: "decline" })}>
                        Decline
                      </Button>
                    </>
                  ) : pendingReq ? (
                    <Button variant="outline" size="sm" disabled>
                      <UserCheck className="w-4 h-4 mr-1.5" /> Request Sent
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => addFriendMutation.mutate()} disabled={addFriendMutation.isPending}>
                        <UserPlus className="w-4 h-4 mr-1.5" /> Add Friend
                      </Button>
                      <Button variant="outline" size="sm" onClick={startChat}>
                        <MessageCircle className="w-4 h-4 mr-1.5" /> Message
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Block/unblock */}
              <div className="pt-1">
                {isBlocked ? (
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs"
                    onClick={() => unblockMutation.mutate()} disabled={unblockMutation.isPending}>
                    Unblock user
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="text-destructive/70 text-xs"
                    onClick={() => blockMutation.mutate()} disabled={blockMutation.isPending}>
                    <ShieldOff className="w-3 h-3 mr-1" /> Block user
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">Created by Anisresh A R</p>
      </div>
    </div>
  );
}
