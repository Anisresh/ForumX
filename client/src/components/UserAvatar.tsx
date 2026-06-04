import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "away";
  showStatus?: boolean;
  className?: string;
}

const sizeMap = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-14 h-14" };
const statusColors = { online: "bg-green-400", away: "bg-amber-400", offline: "bg-gray-300 dark:bg-gray-600" };
const statusSizes = { sm: "w-2 h-2", md: "w-2.5 h-2.5", lg: "w-3.5 h-3.5" };

export default function UserAvatar({ src, name, size = "md", status, showStatus, className }: UserAvatarProps) {
  const initials = (name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <Avatar className={sizeMap[size]}>
        <AvatarImage src={src ?? undefined} alt={name} className="object-cover" />
        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      {showStatus && status && (
        <span className={`absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} rounded-full border-2 border-background`} />
      )}
    </div>
  );
}
