import { History, Music, Trash2, Video } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { HistoryEntry } from "@/lib/download-types";
import { PlatformIcon } from "./PlatformBadge";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onReuse: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryPanel({ entries, onReuse, onClear }: HistoryPanelProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-label="Histórico desta sessão" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="size-4 text-primary" aria-hidden />
          Histórico local
        </h2>
        {entries.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-3.5" />
            Limpar
          </Button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Seus downloads aparecem aqui, salvos apenas neste navegador.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onReuse(entry)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/60"
              >
                <PlatformIcon platform={entry.platform} className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {entry.filename}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {entry.platform} · {new Date(entry.at).toLocaleString("pt-BR")}
                  </span>
                </span>
                {entry.kind === "audio" ? (
                  <Music className="size-4 shrink-0 text-muted-foreground" aria-label="Áudio" />
                ) : (
                  <Video className="size-4 shrink-0 text-muted-foreground" aria-label="Vídeo" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar o histórico local?</AlertDialogTitle>
            <AlertDialogDescription>
              Os {entries.length} registros salvos neste navegador serão removidos. Os arquivos já
              baixados no seu dispositivo não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClear();
                setConfirming(false);
              }}
            >
              Limpar histórico
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
