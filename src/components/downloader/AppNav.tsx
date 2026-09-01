import { Link } from "@tanstack/react-router";
import { Download, History, KeyRound } from "lucide-react";

const LINKS = [
  { to: "/", label: "Baixar", icon: Download },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/acessos", label: "Acessos", icon: KeyRound },
] as const;

/** Navegação principal, compartilhada por todas as páginas. */
export function AppNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="mx-auto flex w-fit items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 backdrop-blur-xl"
    >
      {LINKS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
