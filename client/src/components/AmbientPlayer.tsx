import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

type AmbientCtx = {
  sound: string | null;
  volume: number;
  setSound: (s: string | null) => void;
  setVolume: (v: number) => void;
};

const AmbientContext = createContext<AmbientCtx>({
  sound: null, volume: 40, setSound: () => {}, setVolume: () => {},
});

export function useAmbient() { return useContext(AmbientContext); }

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function createAmbientNode(ctx: AudioContext, type: string, gainNode: GainNode) {
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (type !== "forest") {
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    } else {
      data[i] = white * 0.3;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  switch (type) {
    case "rain":   filter.type = "bandpass"; filter.frequency.value = 1200; filter.Q.value = 0.5; break;
    case "ocean":  filter.type = "lowpass";  filter.frequency.value = 400;  filter.Q.value = 1;   break;
    case "forest": filter.type = "bandpass"; filter.frequency.value = 800;  filter.Q.value = 0.3; break;
    case "coffee": filter.type = "lowpass";  filter.frequency.value = 600;  filter.Q.value = 0.7; break;
    case "fire":   filter.type = "lowpass";  filter.frequency.value = 300;  filter.Q.value = 1.5; break;
    case "night":  filter.type = "lowpass";  filter.frequency.value = 200;  filter.Q.value = 2;   break;
    default:       filter.type = "lowpass";  filter.frequency.value = 500;                        break;
  }
  source.connect(filter);
  filter.connect(gainNode);
  source.start();
  return source;
}

export function AmbientProvider({ children }: { children: React.ReactNode }) {
  const [sound, setSound] = useState<string | null>(() => safeGet("fx_ambient"));
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = safeGet("fx_ambient_vol");
    return saved ? Number(saved) : 40;
  });
  const audioCtx = useRef<AudioContext | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = useCallback(() => {
    try { sourceNode.current?.stop(); } catch {}
    sourceNode.current = null;
  }, []);

  const startAudio = useCallback((type: string, vol: number) => {
    stopAudio();
    try {
      if (!audioCtx.current || audioCtx.current.state === "closed") {
        audioCtx.current = new AudioContext();
      }
      if (audioCtx.current.state === "suspended") audioCtx.current.resume();
      gainNode.current = audioCtx.current.createGain();
      gainNode.current.gain.value = vol / 100;
      gainNode.current.connect(audioCtx.current.destination);
      sourceNode.current = createAmbientNode(audioCtx.current, type, gainNode.current);
    } catch (e) {
      console.warn("Ambient audio unavailable:", e);
    }
  }, [stopAudio]);

  useEffect(() => {
    if (sound) {
      startAudio(sound, volume);
      safeSet("fx_ambient", sound);
    } else {
      stopAudio();
      safeRemove("fx_ambient");
    }
    return () => stopAudio();
  }, [sound]);

  useEffect(() => {
    if (gainNode.current) gainNode.current.gain.value = volume / 100;
    safeSet("fx_ambient_vol", String(volume));
  }, [volume]);

  const setVolume = useCallback((v: number) => setVolumeState(v), []);
  const handleSetSound = useCallback((s: string | null) => setSound(s), []);

  return (
    <AmbientContext.Provider value={{ sound, volume, setSound: handleSetSound, setVolume }}>
      {children}
    </AmbientContext.Provider>
  );
}
