import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppNav } from "@/components/downloader/AppNav";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { deleteCookies, fetchCookiesStatus, saveCookies } from "@/lib/cookies-client";
import type { CookiesStatus } from "@/lib/download-types";
import { DownloaderError } from "@/lib/downloader-client";
import { formatBytes } from "@/lib/media-format";

const TITLE = "Acessos e login — Baixador de Vídeos";
const DESCRIPTION =
  "Envie seu arquivo cookies.txt para baixar vídeos privados ou restritos do Instagram, Facebook, YouTube e outras fontes que exigem login.";

export const Route = createFileRoute("/acessos")({
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
  component: AcessosPage,
});

function AcessosPage() {
  const [status, setStatus] = useState<CookiesStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetchCookiesStatus()
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(
            error instanceof DownloaderError ? error.message : "Não foi possível falar com o motor.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleFile(file: File) {
    const text = await file.text();
    setContent(text);
    toast.success(`Arquivo “${file.name}” carregado. Confira e salve.`);
  }

  async function handleSave() {
    if (!content.trim()) {
      toast.error("Cole o conteúdo do cookies.txt ou selecione o arquivo.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await saveCookies(content);
      setStatus(result);
      setContent("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Cookies salvos. Links com login já podem ser baixados.");
    } catch (error) {
      toast.error(
        error instanceof DownloaderError ? error.message : "Não foi possível salvar os cookies.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const result = await deleteCookies();
      setStatus(result);
      toast.success("Cookies removidos do servidor.");
    } catch (error) {
      toast.error(
        error instanceof DownloaderError ? error.message : "Não foi possível remover os cookies.",
      );
    } finally {
      setConfirmingDelete(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:py-16">
        <AppNav />

        <header className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            <KeyRound className="size-6 text-primary" aria-hidden />
            Acessos e login
          </h1>
          <p className="text-sm text-muted-foreground">
            Alguns links só abrem para quem está logado — perfis privados do Instagram, grupos do
            Facebook, vídeos restritos do YouTube. Envie um arquivo{" "}
            <code className="rounded bg-secondary/60 px-1 py-0.5 text-xs">cookies.txt</code> e o
            motor passa a usar sua sessão nesses casos.
          </p>
        </header>

        <section
          aria-label="Situação atual"
          className="rounded-3xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl sm:p-6"
        >
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : status?.present ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="size-4 text-primary" aria-hidden />
                Sessão ativa no motor
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(status.size)}
                {status.updatedAt
                  ? ` · atualizado em ${new Date(status.updatedAt).toLocaleString("pt-BR")}`
                  : ""}
                {status.managed ? "" : " · arquivo montado manualmente no container"}
              </p>
              {status.domains.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {status.domains.slice(0, 24).map((domain) => (
                    <li
                      key={domain}
                      className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {domain}
                    </li>
                  ))}
                </ul>
              ) : null}
              {status.managed ? (
                <div>
                  <Button
                    variant="outline"
                    className="gap-2 rounded-2xl"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remover cookies
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum cookie salvo. Links públicos funcionam normalmente; os que exigem login vão
              falhar até você enviar o arquivo abaixo.
            </p>
          )}
        </section>

        <section
          aria-label="Enviar cookies"
          className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/50 p-4 backdrop-blur-xl sm:p-6"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">Enviar cookies.txt</h2>
            <p className="text-xs text-muted-foreground">
              Exporte no formato Netscape com uma extensão como “Get cookies.txt LOCALLY”, estando
              logado na fonte desejada. O arquivo fica só no seu servidor.
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-2xl"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" aria-hidden />
              Selecionar arquivo
            </Button>
          </div>

          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            spellCheck={false}
            aria-label="Conteúdo do cookies.txt"
            placeholder={"# Netscape HTTP Cookie File\n.instagram.com\tTRUE\t/\tTRUE\t..."}
            className="rounded-2xl font-mono text-xs"
          />

          <div className="flex justify-end">
            <Button
              className="gap-2 rounded-2xl"
              disabled={isSaving || content.trim().length === 0}
              onClick={() => void handleSave()}
            >
              <CheckCircle2 className="size-4" aria-hidden />
              {isSaving ? "Salvando…" : "Salvar cookies"}
            </Button>
          </div>
        </section>
      </div>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o arquivo cookies.txt?</AlertDialogTitle>
            <AlertDialogDescription>
              O motor voltará a acessar apenas conteúdo público. Você pode enviar um novo arquivo a
              qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
