import { Facebook, Globe, Instagram, Music2, Twitch, Twitter, Video, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  YouTube: Youtube,
  Instagram: Instagram,
  Facebook: Facebook,
  TikTok: Music2,
  Pinterest: Video,
  "X (Twitter)": Twitter,
  Twitch: Twitch,
};

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = ICONS[platform] ?? Globe;
  return <Icon className={className} aria-hidden />;
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground backdrop-blur">
      <PlatformIcon platform={platform} className="size-3.5 text-primary" />
      <span>Fonte: {platform}</span>
    </span>
  );
}
