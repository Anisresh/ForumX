import { useState } from "react";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Coffee, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup" | "reset";

export default function AuthPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        login(data.token, data.user);
      } else if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        login(data.token, data.user);
      } else {
        toast({ title: "Password reset", description: "If that email exists, a reset link was sent." });
        setMode("login");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pastel-gradient">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">FORUMX</h1>
            <p className="text-sm text-muted-foreground mt-1">A calm digital café for meaningful conversations.</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-lg font-semibold text-center">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input id="username" placeholder="cooluser123" value={form.username}
                  onChange={e => set("username", e.target.value)} required minLength={3} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => set("email", e.target.value)} required />
            </div>
            {mode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={e => set("password", e.target.value)} required minLength={6} className="pr-10" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>

          <div className="flex flex-col gap-2 text-center text-sm">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                  Don't have an account? Sign up
                </button>
                <button onClick={() => setMode("reset")} className="text-muted-foreground hover:underline text-xs">
                  Forgot password?
                </button>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => setMode("login")} className="text-primary hover:underline">
                Already have an account? Sign in
              </button>
            )}
            {mode === "reset" && (
              <button onClick={() => setMode("login")} className="text-muted-foreground hover:underline">
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">Created by Anisresh A R</p>
      </div>
    </div>
  );
}
