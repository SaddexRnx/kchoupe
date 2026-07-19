import { MessageSquare, Search, Filter, ChevronRight } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";
import { useT } from "@/lib/i18n";

const convos = [
  { user: "sarah@northwind.io", employee: "Nova", last: "Perfect, I'll upgrade to the team plan.", time: "2m", status: "won", unread: 2 },
  { user: "mike@acme.co", employee: "Atlas", last: "Can you send the invoice to billing@?", time: "8m", status: "open", unread: 0 },
  { user: "lea@figment.dev", employee: "Sage", last: "How do I add teammates?", time: "14m", status: "open", unread: 1 },
  { user: "jon@paperclip.ai", employee: "Nova", last: "Thanks — booked for Thursday.", time: "22m", status: "won", unread: 0 },
  { user: "amy@vertex.io", employee: "Lumen", last: "Not sure this fits us tbh.", time: "38m", status: "risk", unread: 0 },
  { user: "kai@bloom.co", employee: "Echo", last: "Loved the demo — sending to CTO.", time: "1h", status: "open", unread: 0 },
  { user: "raj@lumen.dev", employee: "Atlas", last: "Refund processed, thanks.", time: "2h", status: "resolved", unread: 0 },
];

const tones = { won: "emerald", open: "violet", risk: "rose", resolved: "muted" } as const;
const statusKey = { won: "common.won", open: "common.open", risk: "common.risk", resolved: "common.resolved" } as const;

export function Conversations() {
  const t = useT();
  return (
    <div>
      <PageHeader
        eyebrow={t("conv.eyebrow")}
        title={t("conv.title")}
        description={t("conv.desc")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Panel className="p-0">
          <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder={t("conv.search")} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs hover:bg-white/5">
              <Filter className="h-3 w-3" /> {t("common.filter")}
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {convos.map((c) => (
              <div key={c.user} className="group flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-white/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-sm font-bold text-primary">
                  {c.user[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{c.user}</div>
                    <Chip tone={tones[c.status as keyof typeof tones]}>{t(statusKey[c.status as keyof typeof statusKey])}</Chip>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    <span className="text-primary/80">{c.employee}</span> · {c.last}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{c.unread}</span>}
                  <span>{c.time}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-primary" /> {t("common.today")}</div>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[[t("common.active"), 24], [t("common.won"), 8], [t("common.risk"), 2], [t("common.resolved"), 41]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="font-display text-2xl font-bold">{v}</div>
                  <div className="text-[11px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="mb-3 text-sm font-semibold">{t("conv.top_performing")}</div>
            <div className="space-y-3 text-sm">
              {[["Nova", 47], ["Lumen", 32], ["Atlas", 28]].map(([n, v]) => (
                <div key={n as string}>
                  <div className="mb-1 flex justify-between"><span>{n}</span><span className="text-muted-foreground">{v}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(v as number) * 2}%` }} /></div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}