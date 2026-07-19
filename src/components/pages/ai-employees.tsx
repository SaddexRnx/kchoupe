import { Bot, Plus, Sparkles, MessageSquare, TrendingUp, Zap } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";
import { useT } from "@/lib/i18n";

const employees = [
  { name: "Nova", role: "Sales Lead", model: "Claude Sonnet 4.5", status: "active", convos: 1284, csat: 97, tone: "violet" as const, emoji: "🚀" },
  { name: "Atlas", role: "Support Concierge", model: "GPT-5", status: "active", convos: 892, csat: 94, tone: "emerald" as const, emoji: "🛎️" },
  { name: "Sage", role: "Onboarding Coach", model: "Gemini 2.5 Pro", status: "training", convos: 341, csat: 91, tone: "amber" as const, emoji: "🌿" },
  { name: "Echo", role: "Marketing Analyst", model: "Claude Opus", status: "active", convos: 512, csat: 96, tone: "violet" as const, emoji: "📡" },
  { name: "Orbit", role: "Product Advisor", model: "GPT-5 Mini", status: "paused", convos: 128, csat: 89, tone: "muted" as const, emoji: "🪐" },
  { name: "Lumen", role: "Retention Specialist", model: "Claude Sonnet 4.5", status: "active", convos: 678, csat: 98, tone: "emerald" as const, emoji: "💡" },
];

export function AiEmployees() {
  const t = useT();
  return (
    <div>
      <PageHeader
        eyebrow={t("emp.eyebrow")}
        title={t("emp.title")}
        description={t("emp.desc")}
        actions={
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110">
            <Plus className="h-4 w-4" /> {t("emp.new")}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{t("emp.recommend_title")}</div>
              <div className="text-xs text-muted-foreground">{t("emp.recommend_desc")}</div>
            </div>
            <button className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/5">{t("common.apply")}</button>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("emp.team_csat")}</div>
              <div className="mt-1 font-display text-3xl font-bold">94.2</div>
            </div>
            <Chip tone="emerald"><TrendingUp className="h-3 w-3" /> +2.1</Chip>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {employees.map((e) => (
          <Panel key={e.name} className="group transition hover:border-primary/30">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-2xl">
                {e.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-lg font-semibold">{e.name}</div>
                  <Chip tone={e.status === "active" ? "emerald" : e.status === "training" ? "amber" : "muted"}>
                    {t("common." + e.status, e.status)}
                  </Chip>
                </div>
                <div className="text-xs text-muted-foreground">{e.role}</div>
                <div className="mt-1 text-[11px] text-muted-foreground/70">{e.model}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" /> {t("emp.convos")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{e.convos}</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> {t("emp.csat")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{e.csat}</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Bot className="h-3 w-3" /> {t("emp.skills")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">7</div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}