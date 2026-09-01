import { DOWNLOADER_BASE_URL, DownloaderError } from "./downloader-client";
import type { CookiesStatus } from "./download-types";

async function request(init: RequestInit & { method: string }): Promise<CookiesStatus> {
  let response: Response;
  try {
    response = await fetch(`${DOWNLOADER_BASE_URL}/cookies`, init);
  } catch {
    throw new DownloaderError(
      "Motor de extração indisponível. Verifique se o container está rodando na sua rede.",
    );
  }
  if (!response.ok) {
    let message = `Falha na comunicação com o motor (HTTP ${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      /* corpo não-JSON */
    }
    if (response.status === 404) {
      message =
        "Motor de extração não encontrado nesta origem. Rode o stack Docker (porta 3005) ou defina VITE_DOWNLOADER_URL.";
    }
    throw new DownloaderError(message);
  }
  return (await response.json()) as CookiesStatus;
}

export function fetchCookiesStatus(): Promise<CookiesStatus> {
  return request({ method: "GET" });
}

export function saveCookies(content: string): Promise<CookiesStatus> {
  return request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function deleteCookies(): Promise<CookiesStatus> {
  return request({ method: "DELETE" });
}
