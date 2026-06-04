import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bell, UserPlus, MessageCircle, UserCheck, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { wsClient } from "@/lib/websocket";

const TYPE_ICONS: Record<string, any> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  new_message: MessageCircle,
  mention: AtSign,
};

const TYPE_LABELS: Record<string, string> = {
  friend_request: "Friend request",
  friend_accepted: "Friend accepted",
  new_message: "New message",
  mention: "Mention",
};

export default function NotificationsPage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/notifications"],
    staleTime: 0,
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  useEffect(() => {
    markReadMutation.mutate();

    const unsub = wsClient.on("notification", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    });
    return () => unsub();
  }, []);

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unread > 0 && (
            <span className="text-xs text-muted-foreground">{unread} unread</span>
          )}
        </div>

        {isLoading && (
          <div className="text-center text-muted-foreground text-sm py-10">Loading…</div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
            <Bell className="w-12 h-12 opacity-20" />
            <div className="text-center">
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm mt-1">Activity from friends will appear here.</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map((notif: any) => {
            const Icon = TYPE_ICONS[notif.type] ?? Bell;
            const href = notif.type === "new_message" && notif.relatedId
              ? `/messages/${notif.relatedId}`
              : notif.type === "friend_request" ? "/friends"
              : notif.fromUserId ? `/profile/${notif.fromUserId}` : "#";

            return (
              <Link key={notif.id} href={href}>
                <div className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all hover-elevate
                  ${!notif.read ? "glass border border-primary/15" : "bg-muted/20"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    ${!notif.read ? "bg-primary/15" : "bg-muted"}`}>
                    <Icon className={`w-4.5 h-4.5 ${!notif.read ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.read ? "font-medium" : ""}`}>
                      {notif.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">Created by Anisresh A R</p>
      </div>
    </div>
  );
}
