import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Megaphone, AlertTriangle, Info, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { listNotifications, markNotificationsRead, type NotificationRow } from "@/lib/notifications.functions";

const PREVIEW_CHARS = 220;
const DISMISS_KEY = "atlas.dismissedAlerts.v1";

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]")); }
  catch { return new Set(); }
}
function writeDismissed(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(ids).slice(-200))); } catch {}
}

function kindStyle(kind: string) {
  const k = (kind || "").toLowerCase();
  if (k === "warn" || k === "warning") return { Icon: AlertTriangle, tone: "text-amber-400", ring: "ring-amber-400/30", chip: "bg-amber-400/10 text-amber-300", label: "Alert" };
  if (k === "error" || k === "critical") return { Icon: AlertTriangle, tone: "text-red-400", ring: "ring-red-400/30", chip: "bg-red-500/10 text-red-300", label: "Critical" };
  if (k === "success") return { Icon: CheckCircle2, tone: "text-emerald-400", ring: "ring-emerald-400/30", chip: "bg-emerald-500/10 text-emerald-300", label: "Update" };
  if (k === "admin" || k === "broadcast") return { Icon: Megaphone, tone: "text-primary", ring: "ring-primary/30", chip: "bg-primary/10 text-primary", label: "Announcement" };
  return { Icon: Info, tone: "text-primary", ring: "ring-primary/30", chip: "bg-primary/10 text-primary", label: "Announcement" };
}

export function AdminAlertPopup() {
  const qc = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationsRead);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listFn(),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const POPUP_KINDS = new Set(["admin", "broadcast", "announcement", "warn", "warning", "error", "critical", "success"]);
  const queue: NotificationRow[] = useMemo(() => {
    const items = (data?.items ?? []).filter((n) => !n.read_at && !dismissed.has(n.id) && POPUP_KINDS.has((n.kind || "").toLowerCase()));
    return items.slice().reverse(); // oldest first so newest are shown last, feels natural
  }, [data, dismissed]);

  useEffect(() => { setIndex(0); setExpanded(false); }, [queue.length]);

  if (queue.length === 0) return null;
  const current = queue[Math.min(index, queue.length - 1)];
  if (!current) return null;
  const { Icon, tone, ring, chip, label } = kindStyle(current.kind);
  const body = current.body ?? "";
  const isLong = body.length > PREVIEW_CHARS;
  const shown = expanded || !isLong ? body : body.slice(0, PREVIEW_CHARS).trimEnd() + "…";

  function close(markRead = true) {
    const next = new Set(dismissed);
    next.add(current.id);
    setDismissed(next);
    writeDismissed(next);
    if (markRead) mark.mutate(current.id);
    setExpanded(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-3 pb-6 sm:items-center sm:pb-0 pointer-events-none">
      <div
        className="pointer-events-none absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={() => close(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-alert-title"
        className={`pointer-events-auto relative w-full max-w-md animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-2xl border border-border bg-card/95 p-5 shadow-2xl ring-1 ${ring} backdrop-blur-xl`}
      >
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => close(true)}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chip}`}>{label}</span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(current.created_at).toLocaleString()}
              </span>
            </div>
            <h3 id="admin-alert-title" className="mt-1.5 font-display text-base font-semibold leading-snug text-foreground">
              {current.title}
            </h3>
            {body && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {shown}
              </p>
            )}
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-xs font-medium text-primary transition hover:underline"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
            {current.link && (
              <a
                href={current.link}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
              >
                Open link
              </a>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">
            {queue.length > 1 ? `${index + 1} of ${queue.length}` : " "}
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => { setExpanded(false); setIndex((i) => Math.max(0, i - 1)); }}
                  disabled={index === 0}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setExpanded(false); setIndex((i) => Math.min(queue.length - 1, i + 1)); }}
                  disabled={index >= queue.length - 1}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => close(true)}
              className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
