import { useState, useRef } from "react";
import { useAuth } from "@/App";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import UserAvatar from "@/components/UserAvatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Camera, Moon, Sun, Volume2, VolumeX, Shield, LogOut, Play, Square } from "lucide-react";
import { useAmbient } from "@/components/AmbientPlayer";

const SOUNDS = [
  { id: "rain", label: "Rain", emoji: "🌧️" },
  { id: "forest", label: "Forest", emoji: "🌲" },
  { id: "ocean", label: "Ocean Waves", emoji: "🌊" },
  { id: "coffee", label: "Coffee Shop", emoji: "☕" },
  { id: "fire", label: "Fireplace", emoji: "🔥" },
  { id: "night", label: "Night", emoji: "🌙" },
];

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const { sound, volume, setSound, setVolume } = useAmbient();
  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    bio: user?.bio ?? "",
    quietHoursStart: user?.quietHoursStart ?? "",
    quietHoursEnd: user?.quietHoursEnd ?? "",
  });
  const isDark = document.documentElement.classList.contains("dark");

  const { data: blockedData, refetch: refetchBlocked } = useQuery<any>({
    queryKey: ["/api/blocked"],
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/users/me", data).then(r => r.json()),
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Settings saved!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/blocked/${userId}`),
    onSuccess: () => refetchBlocked(),
  });

  const handleSaveProfile = () => {
    updateMutation.mutate(form);
  };

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    updateMutation.mutate({ theme: newTheme });
    updateUser({ theme: newTheme });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateMutation.mutate({ profilePicture: base64 });
      updateUser({ profilePicture: base64 });
    };
    reader.readAsDataURL(file);
  };

  const blocked = blockedData?.blocked ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        <h1 className="text-xl font-bold">Settings</h1>

        {/* Profile */}
        <Section title="Profile">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar src={user?.profilePicture} name={user?.displayName ?? ""} size="lg" />
              <label className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow">
                <Camera className="w-3 h-3 text-primary-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">@{user?.username}</p>
              <p>{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Bio <span className="text-muted-foreground text-xs">({form.bio.length}/100)</span></Label>
              <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value.slice(0, 100) }))}
                placeholder="Tell people a bit about yourself…" className="resize-none" rows={3} />
            </div>
            <Button onClick={handleSaveProfile} disabled={updateMutation.isPending} size="sm">
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <div>
                <p className="text-sm font-medium">{isDark ? "Dark Mode" : "Light Mode"}</p>
                <p className="text-xs text-muted-foreground">Toggle between warm light and dark theme</p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </Section>

        {/* Ambient Sounds */}
        <Section title="Ambient Sounds">
          <p className="text-xs text-muted-foreground mb-3">Set the mood with gentle background sounds.</p>
          <div className="grid grid-cols-3 gap-2">
            {SOUNDS.map(s => (
              <button key={s.id}
                onClick={() => setSound(sound === s.id ? null : s.id)}
                className={`p-3 rounded-xl text-center transition-all border ${sound === s.id ? "bg-primary/10 border-primary/30 text-primary" : "border-border/50 hover-elevate"}`}>
                <div className="text-xl mb-1">{s.emoji}</div>
                <div className="text-xs font-medium">{s.label}</div>
              </button>
            ))}
          </div>
          {sound && (
            <div className="mt-3 flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={100} step={1} className="flex-1" />
              <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-8 text-right">{volume}%</span>
            </div>
          )}
        </Section>

        {/* Quiet Hours */}
        <Section title="Quiet Hours">
          <p className="text-xs text-muted-foreground mb-3">Mute notifications during these hours.</p>
          <div className="flex items-center gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">From</Label>
              <Input type="time" value={form.quietHoursStart}
                onChange={e => setForm(p => ({ ...p, quietHoursStart: e.target.value }))} />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">To</Label>
              <Input type="time" value={form.quietHoursEnd}
                onChange={e => setForm(p => ({ ...p, quietHoursEnd: e.target.value }))} />
            </div>
          </div>
          <Button size="sm" className="mt-3" onClick={() => updateMutation.mutate({
            quietHoursStart: form.quietHoursStart,
            quietHoursEnd: form.quietHoursEnd
          })}>Save quiet hours</Button>
        </Section>

        {/* Blocked Users */}
        <Section title="Blocked Users">
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>
          ) : (
            <div className="space-y-2">
              {blocked.map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 py-1.5">
                  <UserAvatar src={b.user?.profilePicture} name={b.user?.displayName ?? "?"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{b.user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{b.user?.username}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => unblockMutation.mutate(b.blockedId)}>
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Sign out */}
        <Section title="Account">
          <Button variant="destructive" onClick={logout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </Section>

        <p className="text-center text-xs text-muted-foreground pb-4">Created by Anisresh A R</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}
