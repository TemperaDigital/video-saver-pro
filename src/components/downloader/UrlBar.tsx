import { ClipboardPaste, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformIcon } from "./PlatformBadge";

interface UrlBarProps {
  value: string;
  platform: string | null;
  isLoading: boolean;
  canSubmit: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPaste: () => void;
}

export function UrlBar({
  value,
  platform,
  isLoading,
  canSubmit,
  onChange,
  onSubmit,
  onPaste,
}: UrlBarProps) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
          <PlatformIcon
            platform={platform ?? "Desconhecida"}
            className="size-4.5 text-muted-foreground"
          />
        </span>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="Cole aqui o link do vídeo…"
          aria-label="URL do vídeo"
          className="h-13 rounded-2xl border-border/60 bg-input/40 pl-11 pr-24 text-base backdrop-blur placeholder:text-muted-foreground/70"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onPaste}
          className="absolute right-2 top-1/2 h-9 -translate-y-1/2 gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
        >
          <ClipboardPaste className="size-4" />
          Colar
        </Button>
      </div>
      <Button
        type="submit"
        disabled={!canSubmit || isLoading}
        className="h-13 gap-2 rounded-2xl px-6 text-base font-semibold"
      >
        {isLoading ? <Loader2 className="size-4.5 animate-spin" /> : <Search className="size-4.5" />}
        {isLoading ? "Analisando" : "Analisar"}
      </Button>
    </form>
  );
}
