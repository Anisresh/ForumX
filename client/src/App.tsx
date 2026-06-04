import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AmbientProvider } from "@/components/AmbientPlayer";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getToken, setToken, clearToken } from "@/lib/auth";
import { wsClient } from "@/lib/websocket";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/landing";
import HomePage from "@/pages/home";
import LobbyPage from "@/pages/lobby";
import MessagesPage from "@/pages/messages";
import ConversationPage from "@/pages/conversation";
import FriendsPage from "@/pages/friends";
import NotificationsPage from "@/pages/notifications";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import DirectoryPage from "@/pages/directory";
import FloatingSidebar from "@/components/FloatingSidebar";

export type AppUser = {
  id: string; username: string; email: string; displayName: string;
  bio?: string | null; profilePicture?: string | null; onlineStatus: string;
  lastSeen: string; createdAt: string; theme: string;
  quietHoursStart?: string | null; quietHoursEnd?: string | null;
};

type AuthCtx = {
  user: AppUser | null;
  loading: boolean;
  login: (token: string, user: AppUser) => void;
  logout: () => void;
  updateUser: (u: Partial<AppUser>) => void;
};

export const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  login: () => {}, logout: () => {}, updateUser: () => {},
});
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          wsClient.connect();
          if (data.user.theme === "dark") document.documentElement.classList.add("dark");
          else document.documentElement.classList.remove("dark");
        } else {
          clearToken();
        }
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, u: AppUser) => {
    setToken(token);
    setUser(u);
    wsClient.connect();
    if (u.theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      try { await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch {}
    }
    clearToken();
    wsClient.disconnect();
    setUser(null);
    document.documentElement.classList.remove("dark");
    queryClient.clear();
  }, []);

  const updateUser = useCallback((data: Partial<AppUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : prev);
    if (data.theme) {
      if (data.theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (user && (location === "/auth" || location.startsWith("/auth?"))) {
      navigate("/");
    }
  }, [user, location]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center pastel-gradient">
        <div className="text-center space-y-3">
          <div className="text-3xl font-bold text-primary tracking-tight">FORUMX</div>
          <div className="text-muted-foreground text-sm">Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FloatingSidebar />
      <main className="flex-1 overflow-hidden page-enter">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/lobby" component={LobbyPage} />
          <Route path="/messages" component={MessagesPage} />
          <Route path="/messages/:id" component={ConversationPage} />
          <Route path="/friends" component={FriendsPage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/profile/:id" component={ProfilePage} />
          <Route path="/directory" component={DirectoryPage} />
          <Route>
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-muted-foreground/30">404</div>
                <div className="text-muted-foreground">Page not found</div>
              </div>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AmbientProvider>
          <AuthProvider>
            <AppShell />
            <Toaster />
          </AuthProvider>
        </AmbientProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
