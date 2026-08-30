import type { HistoryEntry } from "./download-types";

const STORAGE_KEY = "baixador:historico";
const MAX_ENTRIES = 20;

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is HistoryEntry => {
      const entry = item as Partial<HistoryEntry>;
      return typeof entry?.id === "string" && typeof entry?.filename === "string";
    });
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...readHistory().filter((item) => item.id !== entry.id)].slice(
    0,
    MAX_ENTRIES,
  );
  persist(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  persist([]);
  return [];
}

function persist(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* armazenamento indisponível */
  }
}
