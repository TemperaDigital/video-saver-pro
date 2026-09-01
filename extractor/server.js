/**
 * Motor de extração — Node + yt-dlp + ffmpeg.
 * Sem dependências externas: usa apenas os módulos nativos do Node.
 *
 * Endpoints:
 *   POST /probe        { url }            -> metadados + formatos nativos
 *   GET  /fetch        ?url&format&ext&filename -> stream do arquivo
 *   GET  /health
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import { lookup } from "node:dns/promises";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT || 8080);
const YTDLP = process.env.YTDLP_PATH || "yt-dlp";
const COOKIES_DIR = process.env.COOKIES_DIR || "/cookies";
/** Arquivo gerenciado pela interface (tem prioridade sobre COOKIES_FILE). */
const MANAGED_COOKIES = path.join(COOKIES_DIR, "cookies.txt");
const COOKIES_FILE = process.env.COOKIES_FILE || "";
const MAX_COOKIES_BYTES = 4 * 1024 * 1024;
const MAX_TITLE = 200;

const FORMAT_SELECTOR = /^[A-Za-z0-9_+\-./[\]=<>*: ]{1,120}$/;
const EXT_SELECTOR = /^[a-z0-9]{2,5}$/;

/* ------------------------------ utilitários ------------------------------ */

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    ...corsHeaders(),
  });
  res.end(body);
}

function corsHeaders() {
  return {
    "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  };
}

function sanitizeFilename(input) {
  const cleaned = String(input || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 120)
    .trim();
  return cleaned || "video";
}

/** Bloqueia endereços privados/locais (proteção anti-SSRF). */
function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  const lower = address.toLowerCase();
  return (
    lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")
  );
}

async function assertPublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    throw new HttpError(400, "Link inválido.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Somente links http:// ou https:// são aceitos.");
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new HttpError(400, "Endereço não permitido.");
  }
  try {
    const results = await lookup(host, { all: true });
    if (results.some((entry) => isPrivateAddress(entry.address))) {
      throw new HttpError(400, "Endereço não permitido.");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Não foi possível resolver o endereço do link.");
  }
  return parsed.toString();
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Caminho do cookies.txt em uso, ou "" quando não há nenhum. */
function activeCookiesPath() {
  for (const candidate of [MANAGED_COOKIES, COOKIES_FILE]) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return "";
}

function baseArgs() {
  const args = ["--no-playlist", "--no-warnings", "--no-progress"];
  const cookies = activeCookiesPath();
  if (cookies) args.push("--cookies", cookies);
  return args;
}

/* -------------------------- cookies (links c/ login) --------------------- */

function parseCookieDomains(content) {
  const domains = new Set();
  for (const line of String(content).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const domain = trimmed.split(/\t|\s{2,}/)[0];
    if (domain) domains.add(domain.replace(/^\./, "").toLowerCase());
  }
  return [...domains].sort().slice(0, 60);
}

function cookiesStatus() {
  const file = activeCookiesPath();
  if (!file) return { present: false, domains: [], managed: false };
  let content = "";
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return { present: false, domains: [], managed: false };
  }
  const stat = fs.statSync(file);
  return {
    present: true,
    managed: file === MANAGED_COOKIES,
    updatedAt: stat.mtimeMs,
    size: stat.size,
    domains: parseCookieDomains(content),
  };
}

async function handleCookiesSave(req, res) {
  const body = await readBody(req, MAX_COOKIES_BYTES);
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    throw new HttpError(400, "Corpo da requisição inválido.");
  }
  const content = String(payload.content || "").trim();
  if (!content) throw new HttpError(400, "Envie o conteúdo do arquivo cookies.txt.");
  if (Buffer.byteLength(content) > MAX_COOKIES_BYTES) {
    throw new HttpError(413, "Arquivo de cookies grande demais.");
  }
  const looksValid =
    /^#\s*(Netscape|HTTP Cookie File)/im.test(content) ||
    content.split("\n").some((line) => line.split("\t").length >= 6);
  if (!looksValid) {
    throw new HttpError(
      400,
      "Formato inválido. Exporte os cookies no formato Netscape (cookies.txt).",
    );
  }
  try {
    fs.mkdirSync(COOKIES_DIR, { recursive: true });
    fs.writeFileSync(MANAGED_COOKIES, `${content}\n`, { mode: 0o600 });
  } catch {
    throw new HttpError(
      500,
      "Não foi possível gravar os cookies. Monte o volume ./cookies com permissão de escrita.",
    );
  }
  json(res, 200, cookiesStatus());
}

function handleCookiesDelete(res) {
  try {
    if (fs.existsSync(MANAGED_COOKIES)) fs.rmSync(MANAGED_COOKIES);
  } catch {
    throw new HttpError(500, "Não foi possível remover o arquivo de cookies.");
  }
  json(res, 200, cookiesStatus());
}

function runYtdlp(args, { timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new HttpError(504, "O motor demorou demais para responder."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(new HttpError(500, "yt-dlp não está disponível no container."));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new HttpError(422, cleanupError(err)));
    });
  });
}

function cleanupError(stderr) {
  const line = String(stderr)
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.startsWith("ERROR:"))
    .pop();
  if (!line) return "Não foi possível processar este link.";
  const message = line.replace(/^ERROR:\s*/, "");
  if (/login|cookies|private|sign in/i.test(message)) {
    return "Este conteúdo exige login. Monte um arquivo cookies.txt no container para acessá-lo.";
  }
  if (/unsupported url/i.test(message)) return "Esta fonte ainda não é suportada.";
  return message.slice(0, 300);
}

/* ------------------------------- formatos -------------------------------- */

function buildOptions(meta) {
  const formats = Array.isArray(meta.formats) ? meta.formats : [];
  const videoByHeight = new Map();
  const audio = [];

  for (const format of formats) {
    const hasVideo = format.vcodec && format.vcodec !== "none";
    const hasAudio = format.acodec && format.acodec !== "none";
    const size = format.filesize || format.filesize_approx || 0;

    if (hasVideo && format.height) {
      const height = Number(format.height);
      const previous = videoByHeight.get(height);
      const candidate = {
        id: hasAudio ? String(format.format_id) : `${format.format_id}+bestaudio/best`,
        kind: "video",
        ext: hasAudio ? String(format.ext || "mp4") : "mp4",
        height,
        fps: format.fps ? Number(format.fps) : undefined,
        filesize: size || undefined,
        vcodec: format.vcodec,
        acodec: hasAudio ? format.acodec : undefined,
        merged: !hasAudio,
        /** critério interno de preferência */
        _score: (hasAudio ? 2 : 1) + (String(format.ext) === "mp4" ? 1 : 0),
      };
      if (!previous || candidate._score > previous._score) videoByHeight.set(height, candidate);
    } else if (!hasVideo && hasAudio) {
      audio.push({
        id: String(format.format_id),
        kind: "audio",
        ext: String(format.ext || "m4a"),
        abr: format.abr ? Number(format.abr) : undefined,
        filesize: size || undefined,
        acodec: format.acodec,
      });
    }
  }

  const videos = [...videoByHeight.values()]
    .sort((a, b) => (b.height || 0) - (a.height || 0))
    .slice(0, 8)
    .map(({ _score, ...option }) => option);

  const audios = audio
    .sort((a, b) => (b.abr || 0) - (a.abr || 0))
    .filter(
      (item, index, list) => list.findIndex((other) => other.abr === item.abr) === index,
    )
    .slice(0, 6);

  if (audios.length === 0) {
    audios.push({ id: "bestaudio/best", kind: "audio", ext: "m4a" });
  }
  if (videos.length === 0) {
    videos.push({ id: "best", kind: "video", ext: "mp4", merged: true });
  }

  return [...videos, ...audios];
}

/* ------------------------------- endpoints ------------------------------- */

async function handleProbe(req, res) {
  const body = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    throw new HttpError(400, "Corpo da requisição inválido.");
  }
  const url = await assertPublicUrl(payload.url);
  const raw = await runYtdlp([...baseArgs(), "-J", url], { timeoutMs: 90_000 });
  const meta = JSON.parse(raw);
  const source = meta._type === "playlist" && meta.entries?.length ? meta.entries[0] : meta;

  json(res, 200, {
    title: String(source.title || "video").slice(0, MAX_TITLE),
    uploader: source.uploader || source.channel || undefined,
    thumbnail: source.thumbnail || undefined,
    duration: source.duration ? Number(source.duration) : undefined,
    extractor: source.extractor_key || source.extractor || undefined,
    webpageUrl: source.webpage_url || url,
    options: buildOptions(source),
  });
}

async function handleFetch(req, res, requestUrl) {
  const url = await assertPublicUrl(requestUrl.searchParams.get("url"));
  const format = requestUrl.searchParams.get("format") || "best";
  const ext = (requestUrl.searchParams.get("ext") || "mp4").toLowerCase();
  const filename = sanitizeFilename(requestUrl.searchParams.get("filename"));

  if (!FORMAT_SELECTOR.test(format)) throw new HttpError(400, "Formato solicitado inválido.");
  if (!EXT_SELECTOR.test(ext)) throw new HttpError(400, "Extensão inválida.");

  const args = [...baseArgs(), "-f", format, "-o", "-"];
  if (format.includes("+")) args.push("--merge-output-format", ext === "mp4" ? "mp4" : "mkv");

  const child = spawn(YTDLP, [...args, url], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  let headersSent = false;

  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.stdout.once("data", (chunk) => {
    headersSent = true;
    res.writeHead(200, {
      "content-type": contentTypeFor(ext),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${filename}.${ext}`)}`,
      "cache-control": "no-store",
      ...corsHeaders(),
    });
    res.write(chunk);
    child.stdout.pipe(res);
  });

  child.on("error", () => {
    if (!headersSent) json(res, 500, { error: "yt-dlp não está disponível no container." });
    else res.destroy();
  });

  child.on("close", (code) => {
    if (code === 0) {
      if (!headersSent) json(res, 422, { error: "A fonte não retornou nenhum dado." });
      else res.end();
    } else if (!headersSent) {
      json(res, 422, { error: cleanupError(stderr) });
    } else {
      res.destroy();
    }
  });

  req.on("close", () => {
    if (!res.writableEnded) child.kill("SIGKILL");
  });
}

function contentTypeFor(ext) {
  const map = {
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    opus: "audio/opus",
    ogg: "audio/ogg",
    wav: "audio/wav",
  };
  return map[ext] || "application/octet-stream";
}

function readBody(req, maxBytes = 10_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > maxBytes) {
        reject(new HttpError(413, "Requisição grande demais."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/* --------------------------------- server -------------------------------- */

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const route = requestUrl.pathname.replace(/^\/api\/dl/, "") || "/";

  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }
    if (route === "/health") {
      json(res, 200, { ok: true, cookies: cookiesStatus().present });
      return;
    }
    if (route === "/cookies" && req.method === "GET") {
      json(res, 200, cookiesStatus());
      return;
    }
    if (route === "/cookies" && (req.method === "POST" || req.method === "PUT")) {
      await handleCookiesSave(req, res);
      return;
    }
    if (route === "/cookies" && req.method === "DELETE") {
      handleCookiesDelete(res);
      return;
    }
    if (route === "/probe" && req.method === "POST") {
      await handleProbe(req, res);
      return;
    }
    if (route === "/fetch" && req.method === "GET") {
      await handleFetch(req, res, requestUrl);
      return;
    }
    json(res, 404, { error: "Rota não encontrada." });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof HttpError ? error.message : "Erro interno no motor de extração.";
    if (status >= 500) console.error(error);
    if (!res.headersSent) json(res, status, { error: message });
    else res.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`[extractor] ouvindo na porta ${PORT}`);
});
