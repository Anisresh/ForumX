import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  "Smileys": ["😊", "😂", "🥰", "😍", "🤔", "😢", "😡", "😎", "🥳", "😴", "🤗", "😏", "😒", "😌", "🫡"],
  "Gestures": ["👍", "👎", "❤️", "🙏", "👏", "🎉", "🔥", "✨", "💯", "👀", "🫶", "🤝", "👋", "✌️", "🤞"],
  "Nature": ["🌸", "🌻", "🌿", "🍀", "🌈", "⭐", "🌙", "☀️", "🌊", "🍃", "🌺", "🦋", "🐝", "🌷", "🍁"],
  "Food": ["☕", "🍵", "🧋", "🍰", "🎂", "🍩", "🍪", "🍫", "🍭", "🍓", "🫐", "🍑", "🥐", "🧇", "🥞"],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  triggerClassName?: string;
}

export default function EmojiPicker({ onSelect, triggerClassName }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Smileys");
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<"top" | "bottom">("top");

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPosition(rect.top > 300 ? "top" : "bottom");
    }
    setOpen(v => !v);
  };

  return (
    <div className="relative">
      <Button ref={btnRef} type="button" size="icon" variant="ghost" onClick={handleToggle} className={triggerClassName}>
        <Smile className="w-5 h-5" />
      </Button>

      {open && (
        <div
          ref={ref}
          className={`absolute ${position === "top" ? "bottom-12" : "top-12"} right-0 z-[200] glass rounded-2xl shadow-xl border border-border/50 overflow-hidden w-72`}
        >
          {/* Category tabs */}
          <div className="flex border-b border-border/50 px-1 pt-1 gap-0.5 overflow-x-auto">
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-[10px] px-2 py-1.5 rounded-t-lg whitespace-nowrap transition-colors ${
                  category === cat ? "bg-background text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Emojis grid */}
          <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
            {EMOJI_CATEGORIES[category as keyof typeof EMOJI_CATEGORIES].map(emoji => (
              <button
                key={emoji}
                onClick={() => { onSelect(emoji); setOpen(false); }}
                className="text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent/50 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline reaction picker (compact, for message reactions)
export function ReactionPicker({ onSelect, className }: { onSelect: (e: string) => void; className?: string }) {
  const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "✨"];
  return (
    <div className={`flex items-center gap-0.5 glass rounded-full px-2 py-1 shadow-lg border border-border/50 ${className}`}>
      {QUICK.map(e => (
        <button key={e} onClick={() => onSelect(e)}
          className="text-base w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent/50 transition-transform hover:scale-110">
          {e}
        </button>
      ))}
    </div>
  );
}
