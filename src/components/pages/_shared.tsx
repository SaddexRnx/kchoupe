import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

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
    <div className="animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          <span className="aurora-gradient-text animate-gradient">{title}</span>
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

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const w = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-up" onClick={onClose} />
      <div className={"glass-panel animate-scale-in relative w-full " + w + " rounded-2xl p-6"}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 pr-8">
          <div className="font-display text-lg font-semibold">{title}</div>
          {description && <div className="mt-1 text-xs text-muted-foreground">{description}</div>}
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/5 pt-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */

type ToastKind = "success" | "info" | "warn" | "error";
type Toast = { id: string; kind: ToastKind; title: string; body?: string };

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, ...t }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3800);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-sm flex-col gap-2">
        {items.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "warn" ? AlertTriangle : t.kind === "error" ? XCircle : Info;
          const tone =
            t.kind === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" :
            t.kind === "warn"    ? "border-amber-400/30 bg-amber-500/10 text-amber-100" :
            t.kind === "error"   ? "border-rose-400/30 bg-rose-500/10 text-rose-100" :
                                   "border-white/10 bg-white/5 text-foreground";
          const iconTone =
            t.kind === "success" ? "text-emerald-300" :
            t.kind === "warn"    ? "text-amber-300" :
            t.kind === "error"   ? "text-rose-300" : "text-primary";
          return (
            <div key={t.id} className={"pointer-events-auto animate-fade-up glass-panel flex items-start gap-3 rounded-xl border p-3 shadow-xl " + tone}>
              <Icon className={"h-4 w-4 shrink-0 mt-0.5 " + iconTone} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.body && <div className="mt-0.5 text-xs opacity-80">{t.body}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  return c ?? { push: (_: Omit<Toast, "id">) => {} };
}

/* ---------- Confirm dialog (imperative) ---------- */

export function useConfirm() {
  const [state, setState] = useState<{ title: string; body?: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  const ask = (opts: { title: string; body?: string; danger?: boolean }) =>
    new Promise<boolean>((resolve) => setState({ ...opts, resolve }));
  const node = state ? (
    <Modal
      open
      onClose={() => { state.resolve(false); setState(null); }}
      title={state.title}
      description={state.body}
      size="sm"
      footer={
        <>
          <button onClick={() => { state.resolve(false); setState(null); }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">Cancel</button>
          <button onClick={() => { state.resolve(true); setState(null); }}
            className={"rounded-lg px-3 py-1.5 text-sm font-semibold " + (state.danger
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-gradient-to-r from-primary to-accent text-primary-foreground")}>
            {state.danger ? "Delete" : "Confirm"}
          </button>
        </>
      }
    >
      <div className="text-sm text-muted-foreground">This action cannot be undone from the mock UI.</div>
    </Modal>
  ) : null;
  return { ask, node };
}

/* ---------- Buttons ---------- */

export function PrimaryButton({ children, onClick, type = "button", disabled }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
      {children}
    </button>
  );
}
export function GhostButton({ children, onClick, tone = "default" }: { children: ReactNode; onClick?: () => void; tone?: "default" | "danger" }) {
  return (
    <button onClick={onClick}
      className={"inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 active:scale-[0.98] " +
        (tone === "danger" ? "text-rose-300 hover:border-rose-400/40 hover:bg-rose-500/10" : "")}>
      {children}
    </button>
  );
}

export function TextField({ label, value, onChange, placeholder, type = "text", help }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; help?: string }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10" />
      {help && <div className="mt-1 text-[11px] text-muted-foreground/70">{help}</div>}
    </label>
  );
}