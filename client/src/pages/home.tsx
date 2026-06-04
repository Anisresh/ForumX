import { useAuth } from "@/App";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Coffee, MessageCircle, Users, Bell, ArrowRight, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";

export default function HomePage() {
  const { user } = useAuth();

  const { data: onlineData } = useQuery<any>({ queryKey: ["/api/online-count"], refetchInterval: 15000 });
  const { data: convData } = useQuery<any>({ queryKey: ["/api/conversations"], refetchInterval: 30000 });
  const { data: notifData } = useQuery<any>({ queryKey: ["/api/notifications"] });

  const onlineCount = onlineData?.count ?? 1;
  const recentConvs = convData?.conversations?.slice(0, 3) ?? [];
  const unreadNotifs = notifData?.notifications?.filter((n: any) => !n.read).length ?? 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Good {getGreeting()}, <span className="text-primary">{user?.displayName?.split(" ")[0]}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Welcome back to your calm space.</p>
          </div>
          <UserAvatar src={user?.profilePicture} name={user?.displayName ?? ""} size="md"
            status="online" showStatus />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Wifi} label="Online now" value={String(onlineCount)} color="text-green-500" />
          <StatCard icon={MessageCircle} label="Conversations" value={String(recentConvs.length)} color="text-primary" />
          <StatCard icon={Bell} label="Notifications" value={String(unreadNotifs)} color="text-amber-500" />
        </div>

        {/* Welcome card */}
        <div className="glass rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Welcome to ForumX</h2>
              <p className="text-xs text-muted-foreground">Your calm digital café</p>
            </div>
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>☕ Connect with friends and meet new people.</p>
            <p>💬 Share ideas in a peaceful community.</p>
            <p>🌿 A place for meaningful conversations.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button asChild size="sm">
              <Link href="/lobby">Join the Lobby</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/directory">Explore Users</Link>
            </Button>
          </div>
        </div>

        {/* Recent conversations */}
        {recentConvs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Messages</h3>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/messages">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
            <div className="space-y-1.5">
              {recentConvs.map((conv: any) => (
                <Link key={conv.id} href={`/messages/${conv.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover-elevate cursor-pointer">
                    <UserAvatar src={conv.other?.profilePicture} name={conv.other?.displayName ?? "?"}
                      status={conv.other?.onlineStatus === "online" ? "online" : "offline"} showStatus size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{conv.other?.displayName}</p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage?.deleted ? "Message deleted" : conv.lastMessage?.content ?? "No messages yet"}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction icon={Coffee} label="Public Lobby" desc="Chat with everyone" href="/lobby" />
            <QuickAction icon={Users} label="Find Friends" desc="Meet new people" href="/directory" />
            <QuickAction icon={MessageCircle} label="Private Chats" desc="Your conversations" href="/messages" />
            <QuickAction icon={Bell} label="Notifications" desc={`${unreadNotifs} unread`} href="/notifications" />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">Created by Anisresh A R</p>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="glass rounded-xl p-3 text-center space-y-1">
      <Icon className={`w-4 h-4 mx-auto ${color}`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, href }: any) {
  return (
    <Link href={href}>
      <div className="glass rounded-xl p-4 flex items-center gap-3 cursor-pointer hover-elevate active-elevate-2 transition-all">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
