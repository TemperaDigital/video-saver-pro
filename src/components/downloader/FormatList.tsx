import { Check, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MediaOption } from "@/lib/download-types";
import { formatBytes, qualityLabel, shortCodec } from "@/lib/media-format";

interface FormatListProps {
  options: MediaOption[];
  selectedId: string | null;
  emptyLabel: string;
  onSelect: (option: MediaOption) => void;
}

export function FormatList({ options, selectedId, emptyLabel, onSelect }: FormatListProps) {
  if (options.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = option.id === selectedId;
        const codec = shortCodec(option.kind === "audio" ? option.acodec : option.vcodec);
        return (
          <button
            key={`${option.kind}-${option.id}`}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={selected}
            className={cn(
              "group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              selected
                ? "border-primary/70 bg-primary/10"
                : "border-border/60 bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70",
            )}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {qualityLabel(option)}
                {option.fps && option.fps >= 50 ? (
                  <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {Math.round(option.fps)}fps
                  </span>
                ) : null}
                {option.merged ? (
                  <Layers className="size-3.5 text-muted-foreground" aria-label="Vídeo + áudio" />
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {[option.ext.toUpperCase(), codec, formatBytes(option.filesize)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 text-transparent",
              )}
            >
              <Check className="size-3.5" aria-hidden />
            </span>
          </button>
        );
      })}
    </div>
  );
}
