import { useRef, useState } from "react";
import { BookOpen, FileText, Globe, Upload, Search, FolderOpen, Trash2, RefreshCw, Plus } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast, useConfirm } from "./_shared";
import { useT } from "@/lib/i18n";

type Source = { id: string; name: string; type: string; icon: typeof Globe; count: number; updated: string; tone: "muted" | "emerald" | "violet" | "amber" | "rose" };

const seed: Source[] = [
  { id: "s1", name: "Product Docs",   type: "Website", icon: Globe,      count: 128, updated: "2h ago", tone: "emerald" },
  { id: "s2", name: "Help Center",    type: "Zendesk", icon: BookOpen,   count: 342, updated: "1d ago", tone: "violet"  },
  { id: "s3", name: "Sales Playbook", type: "PDF",     icon: FileText,   count: 24,  updated: "3d ago", tone: "amber"   },
  { id: "s4", name: "Q4 Roadmap",     type: "Notion",  icon: FolderOpen, count: 56,  updated: "5h ago", tone: "violet"  },
  { id: "s5", name: "Pricing Sheet",  type: "Sheets",  icon: FileText,   count: 3,   updated: "1w ago", tone: "muted"   },
  { id: "s6", name: "Legal & Terms",  type: "PDF",     icon: FileText,   count: 12,  updated: "2w ago", tone: "muted"   },
];

const TYPE_ICON: Record<string, typeof Globe> = { Website: Globe, PDF: FileText, Zendesk: BookOpen, Notion: FolderOpen, Sheets: FileText, File: FileText };

export function Knowledge() {
  const t = useT();
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Source[]>(seed);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", type: "Website", url: "" });

  const add = () => {
    if (!draft.name.trim()) { toast.push({ kind: "warn", title: "Name required" }); return; }
    const s: Source = {
      id: Math.random().toString(36).slice(2),
      name: draft.name.trim(),
      type: draft.type,
      icon: TYPE_ICON[draft.type] ?? Globe,
      count: 0,
      updated: "syncing…",
      tone: "amber",
    };
    setItems((x) => [s, ...x]);
    setAddOpen(false);
    setDraft({ name: "", type: "Website", url: "" });
    toast.push({ kind: "info", title: "Syncing source…" });
    setTimeout(() => {
      setItems((list) => list.map((x) => x.id === s.id ? { ...x, count: Math.floor(20 + Math.random() * 200), updated: "just now", tone: "emerald" } : x));
      toast.push({ kind: "success", title: `${s.name} indexed`, body: "Ready for retrieval." });
    }, 1800);
  };

  const resync = (s: Source) => {
    setItems((list) => list.map((x) => x.id === s.id ? { ...x, updated: "syncing…", tone: "amber" } : x));
    toast.push({ kind: "info", title: `Resyncing ${s.name}…` });
    setTimeout(() => {
      setItems((list) => list.map((x) => x.id === s.id ? { ...x, updated: "just now", tone: "emerald" } : x));
      toast.push({ kind: "success", title: `${s.name} up to date` });
    }, 1400);
  };

  const remove = async (s: Source) => {
    const ok = await ask({ title: `Remove ${s.name}?`, body: "Documents will no longer be searchable.", danger: true });
    if (!ok) return;
    setItems((list) => list.filter((x) => x.id !== s.id));
    toast.push({ kind: "success", title: "Source removed" });
  };

  const onFiles = (files: FileList) => {
    const arr = Array.from(files);
    arr.forEach((f) => {
      const s: Source = { id: Math.random().toString(36).slice(2), name: f.name, type: "File", icon: FileText, count: 1, updated: "just now", tone: "emerald" };
      setItems((x) => [s, ...x]);
    });
    toast.push({ kind: "success", title: `${arr.length} file${arr.length > 1 ? "s" : ""} uploaded` });
  };

  const filtered = items.filter((s) => q === "" || s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        eyebrow={t("kn.eyebrow")}
        title={t("kn.title")}
        description={t("kn.desc")}
        actions={
          <div className="flex gap-2">
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }} />
            <GhostButton onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload files</GhostButton>
            <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> {t("kn.add_source")}</PrimaryButton>
          </div>
        }
      />

      <Panel className="mb-4">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("kn.search")} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <Chip tone="violet">{t("kn.semantic")}</Chip>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <Panel key={s.id} className="group transition hover:border-primary/30">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-semibold">{s.name}</div>
                  <Chip tone={s.tone}>{s.type}</Chip>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{s.count} {t("kn.docs")} · {t("kn.updated")} {s.updated}</div>
                <div className="mt-3 h-1.5 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${40 + (s.count % 60)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground/70">{t("kn.indexed")}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => resync(s)} className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10"><RefreshCw className="h-3 w-3" /> Resync</button>
                  <button onClick={() => remove(s)} className="ml-auto rounded-md p-1 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add knowledge source"
        footer={<><GhostButton onClick={() => setAddOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={add}><Plus className="h-4 w-4" /> Add & sync</PrimaryButton></>}>
        <div className="grid gap-4">
          <TextField label="Display name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Help center" />
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Type</div>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
              {["Website", "PDF", "Zendesk", "Notion", "Sheets"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <TextField label="URL or path" value={draft.url} onChange={(v) => setDraft({ ...draft, url: v })} placeholder="https://docs.example.com" />
        </div>
      </Modal>
      {confirmNode}
    </div>
  );
}