export type MediaKind = "video" | "audio";

export interface MediaOption {
  /** Seletor de formato aceito pelo motor (ex.: "137+140" ou "18"). */
  id: string;
  kind: MediaKind;
  /** Container final do arquivo, sem ponto (ex.: "mp4", "m4a"). */
  ext: string;
  /** Altura em pixels, apenas para vídeo. */
  height?: number;
  fps?: number;
  /** Bitrate de áudio em kbps. */
  abr?: number;
  /** Tamanho em bytes, quando o motor consegue estimar. */
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  /** Indica que vídeo e áudio serão unidos pelo motor. */
  merged?: boolean;
  note?: string;
}

export interface MediaInfo {
  title: string;
  uploader?: string;
  thumbnail?: string;
  /** Duração em segundos. */
  duration?: number;
  extractor?: string;
  webpageUrl?: string;
  options: MediaOption[];
}

export interface HistoryEntry {
  id: string;
  title: string;
  filename: string;
  kind: MediaKind;
  platform: string;
  url: string;
  at: number;
}
