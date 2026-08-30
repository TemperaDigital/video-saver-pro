import { Download, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/media-format";

interface DownloadBarProps {
  filename: string;
  extension: string;
  disabled: boolean;
  isDownloading: boolean;
  receivedBytes: number;
  totalBytes: number | null;
  onFilenameChange: (value: string) => void;
  onDownload: () => void;
  onCancel: () => void;
}

export function DownloadBar({
  filename,
  extension,
  disabled,
  isDownloading,
  receivedBytes,
  totalBytes,
  onFilenameChange,
  onDownload,
  onCancel,
}: DownloadBarProps) {
  const percent = totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="filename" className="text-xs uppercase tracking-wide text-muted-foreground">
          Nome do arquivo
        </Label>
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-input/40 pr-3 focus-within:border-primary/60">
          <Input
            id="filename"
            value={filename}
            onChange={(event) => onFilenameChange(event.target.value)}
            placeholder="meu-video"
            className="h-12 border-0 bg-transparent text-base focus-visible:ring-0"
          />
          <span className="shrink-0 rounded-lg bg-secondary/70 px-2 py-1 text-xs font-medium text-muted-foreground">
            .{extension}
          </span>
        </div>
      </div>

      {isDownloading ? (
        <div className="flex flex-col gap-2">
          <Progress value={percent ?? undefined} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {percent !== null
              ? `${percent}% · ${formatBytes(receivedBytes)} de ${formatBytes(totalBytes ?? 0)}`
              : `Baixando… ${formatBytes(receivedBytes)}`}
          </p>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          onClick={onDownload}
          disabled={disabled || isDownloading}
          className="h-13 flex-1 gap-2 rounded-2xl text-base font-semibold"
        >
          {isDownloading ? (
            <Loader2 className="size-4.5 animate-spin" />
          ) : (
            <Download className="size-4.5" />
          )}
          {isDownloading ? "Baixando…" : "Baixar para o dispositivo"}
        </Button>
        {isDownloading ? (
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-13 rounded-2xl"
            aria-label="Cancelar download"
          >
            <X className="size-4.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
