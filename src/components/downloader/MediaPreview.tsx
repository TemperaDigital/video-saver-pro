import { Clock, User } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { MediaInfo } from "@/lib/download-types";
import { formatDuration } from "@/lib/media-format";
import { PlatformBadge } from "./PlatformBadge";

export function MediaPreviewSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Skeleton className="aspect-video w-full rounded-2xl sm:w-64" />
      <div className="flex flex-1 flex-col gap-3 py-1">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <Skeleton className="h-4 w-1/3 rounded-lg" />
      </div>
    </div>
  );
}

export function MediaPreview({ info, platform }: { info: MediaInfo; platform: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-secondary/40 sm:w-64">
        {info.thumbnail ? (
          <img
            src={info.thumbnail}
            alt={`Miniatura de ${info.title}`}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Sem miniatura
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <PlatformBadge platform={platform} />
        <h2 className="text-balance text-lg font-semibold leading-snug text-foreground">
          {info.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {info.uploader ? (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5" aria-hidden />
              {info.uploader}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {formatDuration(info.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
