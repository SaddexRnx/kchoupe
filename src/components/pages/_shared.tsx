import { type ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          <span className="aurora-gradient-text">{title}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={"glass-panel rounded-2xl p-5 " + className}>{children}</div>
  );
}

export function Chip({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "emerald" | "violet" | "amber" | "rose";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    muted: "bg-white/5 text-muted-foreground border-white/10",
    emerald: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
    violet: "bg-violet-400/10 text-violet-300 border-violet-400/20",
    amber: "bg-amber-400/10 text-amber-300 border-amber-400/20",
    rose: "bg-rose-400/10 text-rose-300 border-rose-400/20",
  };
  return (
    <span className={"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium " + tones[tone]}>
      {children}
    </span>
  );
}