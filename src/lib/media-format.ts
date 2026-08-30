import type { MediaOption } from "./download-types";

const PLATFORMS: Array<{ match: RegExp; label: string }> = [
  { match: /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/, label: "YouTube" },
  { match: /(^|\.)instagram\.com$/, label: "Instagram" },
  { match: /(^|\.)facebook\.com$|(^|\.)fb\.watch$/, label: "Facebook" },
  { match: /(^|\.)tiktok\.com$/, label: "TikTok" },
  { match: /(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/, label: "Pinterest" },
  { match: /(^|\.)twitter\.com$|(^|\.)x\.com$/, label: "X (Twitter)" },
  { match: /(^|\.)reddit\.com$/, label: "Reddit" },
  { match: /(^|\.)vimeo\.com$/, label: "Vimeo" },
  { match: /(^|\.)twitch\.tv$/, label: "Twitch" },
  { match: /(^|\.)kwai\.com$/, label: "Kwai" },
];

export function detectPlatform(rawUrl: string): string {
  const host = parseHostname(rawUrl);
  if (!host) return "Desconhecida";
  const found = PLATFORMS.find((p) => p.match.test(host));
  return found ? found.label : host.replace(/^www\./, "");
}

export function parseHostname(rawUrl: string): string | null {
  try {
    return new URL(rawUrl.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isSupportedUrl(rawUrl: string): boolean {
  const value = rawUrl.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Remove caracteres inválidos para nome de arquivo e limita o tamanho. */
export function sanitizeFilename(input: string): string {
  const cleaned = input
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 120)
    .trim();
  return cleaned || "video";
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const decimals = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(decimals).replace(".", ",")} ${units[unit] ?? "B"}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function qualityLabel(option: MediaOption): string {
  if (option.kind === "audio") {
    return option.abr ? `${Math.round(option.abr)} kbps` : "Áudio";
  }
  if (!option.height) return "Vídeo";
  const tag =
    option.height >= 2160
      ? "4K"
      : option.height >= 1440
        ? "2K"
        : option.height >= 1080
          ? "Full HD"
          : option.height >= 720
            ? "HD"
            : "SD";
  return `${option.height}p · ${tag}`;
}

export function shortCodec(codec?: string): string | null {
  if (!codec || codec === "none") return null;
  return codec.split(".")[0].toUpperCase();
}
