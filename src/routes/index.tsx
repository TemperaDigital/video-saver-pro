import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Download, Music4, ShieldCheck, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DownloadBar } from "@/components/downloader/DownloadBar";
import { FormatList } from "@/components/downloader/FormatList";
import { MediaPreview, MediaPreviewSkeleton } from "@/components/downloader/MediaPreview";
import { HistoryPanel } from "@/components/downloader/HistoryPanel";
import { UrlBar } from "@/components/downloader/UrlBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appendHistory, clearHistory, readHistory } from "@/lib/download-history";
import type { HistoryEntry, MediaInfo, MediaOption } from "@/lib/download-types";
import { DownloaderError, downloadMedia, probeMedia } from "@/lib/downloader-client";
import { detectPlatform, isSupportedUrl, sanitizeFilename } from "@/lib/media-format";

const TITLE = "Baixador de Vídeos — Instagram, YouTube, TikTok e mais";
const DESCRIPTION =
  "Cole o link de um vídeo do Instagram, Facebook, YouTube, TikTok ou Pinterest, escolha formato, qualidade e nome do arquivo, e baixe direto para o seu dispositivo.";

export const Route = createFileRoute("/")({
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
  component: Index,
});

function Index() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isProbing, setIsProbing] = useState(false);
  const [tab, setTab] = useState<"video" | "audio">("video");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [receivedBytes, setReceivedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const platform = useMemo(() => (url.trim() ? detectPlatform(url) : null), [url]);
  const resolvedPlatform = useMemo(
    () => (sourceUrl ? detectPlatform(sourceUrl) : "Desconhecida"),
    [sourceUrl],
  );

  const videoOptions = useMemo(
    () => info?.options.filter((option) => option.kind === "video") ?? [],
    [info],
  );
  const audioOptions = useMemo(
    () => info?.options.filter((option) => option.kind === "audio") ?? [],
    [info],
  );
  const currentOptions = tab === "video" ? videoOptions : audioOptions;
  const selectedOption = useMemo(
    () => currentOptions.find((option) => option.id === selectedId) ?? null,
    [currentOptions, selectedId],
  );

  useEffect(() => {
    if (!selectedOption && currentOptions.length > 0) {
      setSelectedId(currentOptions[0]?.id ?? null);
    }
  }, [currentOptions, selectedOption]);

  async function handleProbe() {
    const value = url.trim();
    if (!isSupportedUrl(value)) {
      toast.error("Informe um link válido começando com http:// ou https://");
      return;
    }
    setIsProbing(true);
    setInfo(null);
    setSelectedId(null);
    try {
      const result = await probeMedia(value);
      setInfo(result);
      setSourceUrl(value);
      setFilename(sanitizeFilename(result.title));
      setTab(result.options.some((option) => option.kind === "video") ? "video" : "audio");
      toast.success(`Vídeo encontrado em ${detectPlatform(value)}`);
    } catch (error) {
      toast.error(
        error instanceof DownloaderError
          ? error.message
          : "Não foi possível analisar este link. Tente novamente.",
      );
    } finally {
      setIsProbing(false);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        toast.success("Link colado da área de transferência");
      }
    } catch {
      toast.error("O navegador bloqueou o acesso à área de transferência. Cole manualmente.");
    }
  }

  async function handleDownload() {
    if (!selectedOption || !sourceUrl) return;
    const safeName = sanitizeFilename(filename);
    setFilename(safeName);
    setIsDownloading(true);
    setReceivedBytes(0);
    setTotalBytes(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await downloadMedia({
        url: sourceUrl,
        option: selectedOption,
        filename: safeName,
        signal: controller.signal,
        onProgress: ({ receivedBytes: received, totalBytes: total }) => {
          setReceivedBytes(received);
          setTotalBytes(total);
        },
      });
      setHistory(
        appendHistory({
          id: `${sourceUrl}-${selectedOption.id}-${Date.now()}`,
          title: info?.title ?? safeName,
          filename: `${safeName}.${selectedOption.ext}`,
          kind: selectedOption.kind,
          platform: resolvedPlatform,
          url: sourceUrl,
          at: Date.now(),
        }),
      );
      toast.success("Download concluído");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        toast.info("Download cancelado");
      } else {
        toast.error(
          error instanceof DownloaderError ? error.message : "Falha ao baixar o arquivo.",
        );
      }
    } finally {
      abortRef.current = null;
      setIsDownloading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-[radial-gradient(60%_60%_at_50%_50%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent)] blur-2xl"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:py-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden />
            Roda no seu servidor, sem intermediários
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Baixe vídeos de qualquer fonte
          </h1>
          <p className="max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Instagram, Facebook, YouTube, TikTok, Pinterest e muitas outras. Escolha o formato, a
            qualidade e o nome do arquivo — ou extraia somente o áudio.
          </p>
        </header>

        <section className="rounded-3xl border border-border/60 bg-card/60 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <UrlBar
            value={url}
            platform={platform}
            isLoading={isProbing}
            canSubmit={isSupportedUrl(url)}
            onChange={setUrl}
            onSubmit={handleProbe}
            onPaste={handlePaste}
          />
          {platform && !isSupportedUrl(url) ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" aria-hidden />
              O link precisa começar com http:// ou https://
            </p>
          ) : null}
        </section>

        {isProbing ? (
          <section className="rounded-3xl border border-border/60 bg-card/50 p-4 backdrop-blur-xl sm:p-6">
            <MediaPreviewSkeleton />
          </section>
        ) : null}

        {info && !isProbing ? (
          <section className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card/50 p-4 backdrop-blur-xl sm:p-6">
            <MediaPreview info={info} platform={resolvedPlatform} />

            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value as "video" | "audio");
                setSelectedId(null);
              }}
            >
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="video" className="gap-2 rounded-xl">
                  <Video className="size-4" aria-hidden />
                  Vídeo
                </TabsTrigger>
                <TabsTrigger value="audio" className="gap-2 rounded-xl">
                  <Music4 className="size-4" aria-hidden />
                  Somente áudio
                </TabsTrigger>
              </TabsList>
              <TabsContent value="video" className="mt-4">
                <FormatList
                  options={videoOptions}
                  selectedId={selectedId}
                  emptyLabel="Nenhuma faixa de vídeo disponível nesta fonte."
                  onSelect={(option) => setSelectedId(option.id)}
                />
              </TabsContent>
              <TabsContent value="audio" className="mt-4">
                <FormatList
                  options={audioOptions}
                  selectedId={selectedId}
                  emptyLabel="Nenhuma faixa de áudio separada disponível nesta fonte."
                  onSelect={(option) => setSelectedId(option.id)}
                />
              </TabsContent>
            </Tabs>

            <DownloadBar
              filename={filename}
              extension={selectedOption?.ext ?? "mp4"}
              disabled={!selectedOption || filename.trim().length === 0}
              isDownloading={isDownloading}
              receivedBytes={receivedBytes}
              totalBytes={totalBytes}
              onFilenameChange={setFilename}
              onDownload={handleDownload}
              onCancel={() => abortRef.current?.abort()}
            />
          </section>
        ) : null}

        {!info && !isProbing ? (
          <section className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border/60 px-6 py-12 text-center">
            <Download className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Cole um link acima para ver as qualidades disponíveis.
            </p>
          </section>
        ) : null}

        <HistoryPanel
          entries={history}
          onReuse={(entry) => setUrl(entry.url)}
          onClear={() => setHistory(clearHistory())}
        />
      </div>
    </main>
  );
}
