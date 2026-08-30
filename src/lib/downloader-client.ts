import type { MediaInfo, MediaOption } from "./download-types";

/**
 * Base URL do motor de extração. Em produção (Docker) o Caddy expõe o serviço
 * na mesma origem sob /api/dl. Em outros ambientes, defina VITE_DOWNLOADER_URL.
 */
export const DOWNLOADER_BASE_URL: string =
  (import.meta.env["VITE_DOWNLOADER_URL"] as string | undefined)?.replace(/\/$/, "") || "/api/dl";

export class DownloaderError extends Error {}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload?.error) return payload.error;
  } catch {
    /* corpo não-JSON */
  }
  return `Falha na comunicação com o motor (HTTP ${response.status}).`;
}

export async function probeMedia(url: string, signal?: AbortSignal): Promise<MediaInfo> {
  let response: Response;
  try {
    response = await fetch(`${DOWNLOADER_BASE_URL}/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new DownloaderError(
      "Motor de extração indisponível. Verifique se o container está rodando na sua rede.",
    );
  }
  if (!response.ok) throw new DownloaderError(await readError(response));
  return (await response.json()) as MediaInfo;
}

export function buildFetchUrl(url: string, option: MediaOption, filename: string): string {
  const params = new URLSearchParams({
    url,
    format: option.id,
    ext: option.ext,
    filename,
  });
  return `${DOWNLOADER_BASE_URL}/fetch?${params.toString()}`;
}

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number | null;
}

/** Baixa o arquivo lendo o stream para reportar progresso e salvar com o nome escolhido. */
export async function downloadMedia(options: {
  url: string;
  option: MediaOption;
  filename: string;
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { url, option, filename, onProgress, signal } = options;
  const fullName = `${filename}.${option.ext}`;

  let response: Response;
  try {
    response = await fetch(buildFetchUrl(url, option, filename), { signal });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new DownloaderError(
      "Motor de extração indisponível. Verifique se o container está rodando na sua rede.",
    );
  }
  if (!response.ok) throw new DownloaderError(await readError(response));
  if (!response.body) throw new DownloaderError("Resposta sem conteúdo.");

  const header = response.headers.get("content-length");
  const totalBytes = header ? Number(header) : null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      receivedBytes += value.byteLength;
      onProgress?.({ receivedBytes, totalBytes });
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: response.headers.get("content-type") ?? "" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fullName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
