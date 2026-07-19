import { BookOpen, FileText, Globe, Upload, Search, FolderOpen } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";

const sources = [
  { name: "Product Docs", type: "Website", icon: Globe, count: 128, updated: "2h ago", tone: "emerald" as const },
  { name: "Help Center", type: "Zendesk", icon: BookOpen, count: 342, updated: "1d ago", tone: "violet" as const },
  { name: "Sales Playbook", type: "PDF", icon: FileText, count: 24, updated: "3d ago", tone: "amber" as const },
  { name: "Q4 Roadmap", type: "Notion", icon: FolderOpen, count: 56, updated: "5h ago", tone: "violet" as const },
  { name: "Pricing Sheet", type: "Sheets", icon: FileText, count: 3, updated: "1w ago", tone: "muted" as const },
  { name: "Legal & Terms", type: "PDF", icon: FileText, count: 12, updated: "2w ago", tone: "muted" as const },
];

export function Knowledge() {
  return (
    <div>
      <PageHeader
        eyebrow="Memory"
        title="Knowledge Base"
        description="Sync docs, sites and files. Your AI employees will retrieve the right snippet at the right moment."
        actions={
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110">
            <Upload className="h-4 w-4" /> Add source
          </button>
        }
      />

      <Panel className="mb-4">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search 565 documents…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <Chip tone="violet">semantic</Chip>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((s) => (
          <Panel key={s.name} className="group transition hover:border-primary/30">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-semibold">{s.name}</div>
                  <Chip tone={s.tone}>{s.type}</Chip>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.count} documents · updated {s.updated}</div>
                <div className="mt-3 h-1.5 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${40 + (s.count % 60)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground/70">Indexed</div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}