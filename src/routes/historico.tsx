import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, History, Music, Search, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppNav } from "@/components/downloader/AppNav";
import { PlatformIcon } from "@/components/downloader/PlatformBadge";
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
import { Input } from "@/components/ui/input";
import { clearHistory, readHistory, removeHistoryEntry } from "@/lib/download-history";
import type { HistoryEntry } from "@/lib/download-types";
import { buildAbsoluteFetchUrl } from "@/lib/downloader-client";
import { formatBytes } from "@/lib/media-format";

const TITLE = "Histórico de downloads — Baixador de Vídeos";
const DESCRIPTION =
  "Consulte tudo o que você já baixou, refaça um download com um clique ou copie o link direto do arquivo.";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoricoPage,
});

function entryLink(entry: HistoryEntry): string | null {
  if (!entry.formatId || !entry.ext) return null;
  const base = entry.filename.replace(/\.[^.]+$/, "");
  return buildAbsoluteFetchUrl(
    entry.url,
    { id: entry.formatId, ext: entry.ext, kind: entry.kind },
    base,
  );
}

function HistoricoPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [removing, setRemoving] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    setEntries(readHistory());
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) =>
      `${entry.title} ${entry.filename} ${entry.platform} ${entry.url}`
        .toLowerCase()
        .includes(term),
    );
  }, [entries, query]);

  async function copyLink(entry: HistoryEntry) {
    const link = entryLink(entry);
    if (!link) {
      toast.error("Este registro é antigo e não guardou o formato usado. Analise o link de novo.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link de download copiado");
    } catch {
      toast.error("O navegador bloqueou a cópia. Selecione o link manualmente.");
    }
  }

  return (
    <main className="relative min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:py-16">
        <AppNav />

        <header className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <History className="size-6 text-primary" aria-hidden />
            Histórico de downloads
          </h1>
          <p className="text-sm text-muted-foreground">
            Guardado apenas neste navegador. Refaça o download ou copie o link direto do arquivo
            para usar em outro aparelho da sua rede.
          </p>
        </header>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, fonte ou link"
              aria-label="Buscar no histórico"
              className="rounded-2xl pl-9"
            />
          </div>
          {entries.length > 0 ? (
            <Button
              variant="outline"
              className="gap-2 rounded-2xl"
              onClick={() => setConfirmingClear(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Limpar tudo
            </Button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "Nenhum download registrado ainda."
              : "Nenhum registro corresponde à sua busca."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((entry) => {
              const link = entryLink(entry);
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center"
                >
                  <PlatformIcon
                    platform={entry.platform}
                    className="size-5 shrink-0 text-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.filename}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.platform}
                      {entry.quality ? ` · ${entry.quality}` : ""}
                      {entry.bytes ? ` · ${formatBytes(entry.bytes)}` : ""} ·{" "}
                      {new Date(entry.at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="flex items-center gap-1">
                    {entry.kind === "audio" ? (
                      <Music className="size-4 text-muted-foreground" aria-label="Áudio" />
                    ) : (
                      <Video className="size-4 text-muted-foreground" aria-label="Vídeo" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      aria-label={`Copiar link de download de ${entry.filename}`}
                      onClick={() => void copyLink(entry)}
                    >
                      <Copy className="size-4" aria-hidden />
                    </Button>
                    {link ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        aria-label={`Baixar novamente ${entry.filename}`}
                        asChild
                      >
                        <a href={link} download>
                          <Download className="size-4" aria-hidden />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-muted-foreground"
                      aria-label={`Remover ${entry.filename} do histórico`}
                      onClick={() => setRemoving(entry)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog open={confirmingClear} onOpenChange={setConfirmingClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Os {entries.length} registros salvos neste navegador serão removidos. Os arquivos já
              baixados no seu dispositivo não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEntries(clearHistory());
                setConfirmingClear(false);
                toast.success("Histórico limpo");
              }}
            >
              Limpar histórico
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removing?.filename}” sairá do histórico deste navegador. O arquivo baixado no seu
              dispositivo continua intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing) setEntries(removeHistoryEntry(removing.id));
                setRemoving(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
