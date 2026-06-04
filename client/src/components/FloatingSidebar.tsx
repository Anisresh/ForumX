import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Home, MessageCircle, Users, Bell, Settings, Coffee, BookOpen, LogOut } from "lucide-react";
import { useAuth } from "@/App";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Coffee, label: "Lobby", path: "/lobby" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: Users, label: "Friends", path: "/friends" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: BookOpen, label: "Directory", path: "/directory" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function FloatingSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);

  const { data: notifData } = useQuery<any>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const unreadNotifs = notifData?.notifications?.filter((n: any) => !n.read).length ?? 0;

  const { data: convData } = useQuery<any>({
    queryKey: ["/api/conversations"],
    refetchInterval: 15000,
  });

  const unreadMessages = convData?.conversations?.reduce((acc: number, c: any) => acc + (c.unread || 0), 0) ?? 0;

  const initials = user?.displayName?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <aside
      className={`sidebar-float h-screen flex flex-col py-4 glass border-r border-border/50 z-50 flex-shrink-0 ${expanded ? "w-52" : "w-16"}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="px-4 mb-6 overflow-hidden whitespace-nowrap">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Coffee className="w-4 h-4 text-primary-foreground" />
          </div>
          {expanded && (
            <span className="font-bold text-sm tracking-wider text-primary">FORUMX</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {NAV.map(({ icon: Icon, label, path }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          const badge = label === "Notifications" ? unreadNotifs : label === "Messages" ? unreadMessages : 0;

          return (
            <Tooltip key={path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link href={path}>
                  <div className={`
                    flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer relative transition-all duration-150
                    ${active ? "bg-primary/12 text-primary" : "text-muted-foreground hover-elevate"}
                  `}>
                    <div className="relative flex-shrink-0">
                      <Icon className="w-5 h-5" />
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </div>
                    {expanded && (
                      <span className="text-sm font-medium overflow-hidden whitespace-nowrap">{label}</span>
                    )}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                  </div>
                </Link>
              </TooltipTrigger>
              {!expanded && <TooltipContent side="right">{label}</TooltipContent>}
            </Tooltip>
          );
        })}
      </nav>

      {/* User avatar + logout */}
      <div className="px-2 pt-2 border-t border-border/50 flex flex-col gap-1">
        <Link href={`/profile/${user?.id}`}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer hover-elevate transition-all">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={user?.profilePicture ?? undefined} />
              <AvatarFallback className="text-xs bg-accent text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
            {expanded && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium truncate">{user?.displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">@{user?.username}</p>
              </div>
            )}
          </div>
        </Link>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-2 py-2 rounded-xl w-full text-left text-muted-foreground hover-elevate transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {expanded && <span className="text-sm overflow-hidden whitespace-nowrap">Sign out</span>}
            </button>
          </TooltipTrigger>
          {!expanded && <TooltipContent side="right">Sign out</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
