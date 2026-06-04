import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Coffee, MessageCircle, Users, Sparkles, Volume2, VolumeX, ArrowRight, Zap, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Ambient sound via Web Audio API ── */
function createAmbientAudio(): { gain: GainNode; stop: () => void } | null {
  try {
    const ctx = new AudioContext();
    const bufferSize = 2 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    filter.Q.value = 0.8;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    return { gain, stop: () => { try { src.stop(); ctx.close(); } catch {} } };
  } catch { return null; }
}

/* ── Particle data ── */
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 37 + 5) % 100}%`,
  size: 2 + (i % 4),
  dur: `${10 + (i * 3) % 14}s`,
  delay: `${(i * 1.3) % 10}s`,
  drift: `${((i % 2 === 0 ? 1 : -1) * (15 + (i * 7) % 40))}px`,
  color: ["rgba(196,140,80,0.4)", "rgba(220,180,130,0.35)", "rgba(200,160,100,0.3)", "rgba(240,200,150,0.35)"][i % 4],
}));

/* ── Features ── */
const FEATURES = [
  {
    icon: Coffee,
    title: "Public Lobby",
    desc: "A warm open space where everyone gathers. Share thoughts, join conversations, and feel at home.",
    color: "from-amber-100 to-orange-100",
    iconColor: "text-amber-600",
    delay: "fade-up-5",
  },
  {
    icon: MessageCircle,
    title: "Private Chats",
    desc: "Have deeper conversations in your own space. With reactions, voice messages, and read receipts.",
    color: "from-rose-100 to-pink-100",
    iconColor: "text-rose-500",
    delay: "fade-up-6",
  },
  {
    icon: Users,
    title: "Find Your People",
    desc: "Browse the community, send friend requests, and build meaningful connections at your own pace.",
    color: "from-sky-100 to-indigo-100",
    iconColor: "text-sky-500",
    delay: "fade-up-7",
  },
];

const PILLS = [
  { label: "Real-time Chat", icon: Zap },
  { label: "Voice Messages", icon: Volume2 },
  { label: "Friend System", icon: Users },
  { label: "Private & Safe", icon: Shield },
  { label: "Open Lobby", icon: Globe },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<ReturnType<typeof createAmbientAudio>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const toggleSound = () => {
    if (soundOn) {
      audioRef.current?.stop();
      (audioRef as any).current = null;
      setSoundOn(false);
    } else {
      (audioRef as any).current = createAmbientAudio();
      setSoundOn(true);
    }
  };

  useEffect(() => () => { audioRef.current?.stop(); }, []);

  return (
    <div className="relative min-h-screen overflow-hidden select-none" style={{ background: "linear-gradient(145deg, #fdf6ed 0%, #faeee0 25%, #fdf0e8 50%, #f8ece3 75%, #fdf6ed 100%)" }}>

      {/* ── Animated blobs ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="blob-1 absolute w-[520px] h-[520px] opacity-40"
          style={{ top: "-10%", left: "-8%", background: "radial-gradient(circle, #f5c5a0 0%, #f0b080 50%, transparent 80%)" }} />
        <div className="blob-2 absolute w-[600px] h-[600px] opacity-35"
          style={{ top: "30%", right: "-15%", background: "radial-gradient(circle, #f2d5b0 0%, #e8c090 50%, transparent 80%)" }} />
        <div className="blob-3 absolute w-[450px] h-[450px] opacity-30"
          style={{ bottom: "-5%", left: "20%", background: "radial-gradient(circle, #f8ddc0 0%, #f0c8a0 50%, transparent 80%)" }} />
        <div className="blob-4 absolute w-[380px] h-[380px] opacity-25"
          style={{ top: "10%", left: "40%", background: "radial-gradient(circle, #fce8cc 0%, #f8d8b0 50%, transparent 80%)" }} />
        <div className="blob-5 absolute w-[280px] h-[280px] opacity-20"
          style={{ bottom: "20%", right: "10%", background: "radial-gradient(circle, #f0c8a8 0%, #e8b898 50%, transparent 80%)" }} />
      </div>

      {/* ── Floating particles ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="particle absolute rounded-full"
            style={{
              left: p.left,
              bottom: "-10px",
              width: p.size,
              height: p.size,
              background: p.color,
              "--dur": p.dur,
              "--delay": p.delay,
              "--drift": p.drift,
            } as any}
          />
        ))}
      </div>

      {/* ── Nav bar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
            <Coffee className="w-4 h-4 text-primary" />
          </div>
          <span className="font-black text-lg tracking-widest text-primary">FORUMX</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleSound} className="gap-2 text-xs rounded-full">
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundOn ? "Sound on" : "Sound off"}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
        </div>
      </nav>

      {/* ── Hero section ── */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-3xl mx-auto text-center space-y-8">

          {/* Logo icon with pulse rings */}
          <div className={`inline-flex items-center justify-center relative ${mounted ? "fade-up-0" : "opacity-0"}`}>
            <div className="pulse-ring absolute w-24 h-24 rounded-full border-2 border-primary/20" />
            <div className="pulse-ring-2 absolute w-24 h-24 rounded-full border border-primary/10" />
            <div className="logo-float relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: "linear-gradient(135deg, rgba(255,248,240,0.95) 0%, rgba(252,235,210,0.95) 100%)", border: "1px solid rgba(180,130,80,0.25)" }}>
              <Coffee className="w-9 h-9 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          {/* Title */}
          <div className={mounted ? "fade-up-1" : "opacity-0"}>
            <h1 className="text-shimmer text-6xl sm:text-8xl font-black tracking-tighter leading-none mb-3">
              FORUMX
            </h1>
            <p className="text-xl sm:text-2xl font-light text-[#8B6840]/80 tracking-wide">
              A calm digital café for meaningful conversations.
            </p>
          </div>

          {/* Sound wave visual (shows when sound is on) */}
          {soundOn && (
            <div className="flex items-center justify-center gap-1 h-6">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="sound-bar w-1 rounded-full bg-primary/50"
                  style={{ height: "18px", transformOrigin: "bottom", animationDelay: `${(i - 1) * 0.12}s` }} />
              ))}
            </div>
          )}

          {/* Feature pills */}
          <div className={`flex flex-wrap justify-center gap-2 ${mounted ? "fade-up-2" : "opacity-0"}`}>
            {PILLS.map(({ label, icon: Icon }) => (
              <div key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#7a5230]"
                style={{ background: "rgba(255,248,238,0.75)", border: "1px solid rgba(180,130,80,0.2)", backdropFilter: "blur(8px)" }}>
                <Icon className="w-3 h-3 opacity-70" />
                {label}
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className={`flex flex-col sm:flex-row gap-3 justify-center ${mounted ? "fade-up-3" : "opacity-0"}`}>
            <button
              onClick={() => navigate("/auth?mode=signup")}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.04] active:scale-[0.98] shadow-lg hover:shadow-xl"
              style={{ background: "linear-gradient(135deg, #b87333 0%, #c8883a 50%, #b07030 100%)", color: "#fff3e8" }}>
              <span className="relative z-10 flex items-center gap-2">
                Get started — it's free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, #c88040 0%, #d09040 100%)" }} />
            </button>

            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium rounded-2xl transition-all duration-300 hover:scale-[1.04] active:scale-[0.98]"
              style={{ background: "rgba(255,248,238,0.75)", border: "1px solid rgba(180,130,80,0.28)", backdropFilter: "blur(12px)", color: "#8B5E2A" }}>
              Sign in
            </button>
          </div>

          {/* Subtle stat */}
          <p className={`text-xs text-[#b08a60]/60 ${mounted ? "fade-up-4" : "opacity-0"}`}>
            Cozy, real-time, and always open. ☕
          </p>
        </div>

        {/* ── Feature cards ── */}
        <div className="w-full max-w-4xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, iconColor, delay }) => (
            <div key={title} className={`feature-card rounded-2xl p-6 space-y-3 ${mounted ? delay : "opacity-0"}`}
              style={{ background: "rgba(255,250,244,0.78)", border: "1px solid rgba(180,140,100,0.18)", backdropFilter: "blur(16px)" }}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <h3 className="font-semibold text-[#5a3a1a] text-sm">{title}</h3>
              <p className="text-xs text-[#8a6a4a]/80 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Sparkle quote ── */}
        <div className={`mt-16 max-w-md mx-auto text-center ${mounted ? "fade-up-7" : "opacity-0"}`}>
          <div className="rounded-2xl px-8 py-6 space-y-2"
            style={{ background: "rgba(255,248,238,0.65)", border: "1px solid rgba(180,140,100,0.15)", backdropFilter: "blur(12px)" }}>
            <Sparkles className="w-5 h-5 text-amber-500/70 mx-auto" />
            <p className="text-sm text-[#8a6040]/80 italic font-light leading-relaxed">
              "The best conversations happen over coffee. <br />ForumX is your café."
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center py-6 text-xs text-[#b08a60]/50">
        Created by Anisresh A R
      </footer>
    </div>
  );
}
