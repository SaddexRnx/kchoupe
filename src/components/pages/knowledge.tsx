import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, FileText, Globe, Upload, Search, Trash2, Plus, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast, useConfirm, HelpNote } from "./_shared";
import { useT } from "@/lib/i18n";
import {
  listKnowledgeSources,
  deleteKnowledgeSource,
  scrapeWebsite,
  ingestText,
  ingestUploadedFile,
  searchKnowledge,
  type KnowledgeSourceRow,
} from "@/lib/knowledge.functions";
import { supabase } from "@/integrations/supabase/client";

const TYPE_ICON = { website: Globe, file: FileText, text: BookOpen, social: Globe } as const;
const TYPE_LABEL = { website: "Website", file: "File", text: "Text", social: "Social" } as const;

function toneFor(status: KnowledgeSourceRow["status"]): "muted" | "emerald" | "amber" | "rose" {
  if (status === "ready") return "emerald";
  if (status === "indexing" || status === "pending") return "amber";
  if (status === "error") return "rose";
  return "muted";
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Knowledge() {
  const t = useT();
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useServerFn(listKnowledgeSources);
  const scrape = useServerFn(scrapeWebsite);
  const ingestTxt = useServerFn(ingestText);
  const ingestFile = useServerFn(ingestUploadedFile);
  const removeFn = useServerFn(deleteKnowledgeSource);
  const searchFn = useServerFn(searchKnowledge);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["knowledge_sources"],
    queryFn: () => list(),
    refetchInterval: (q) => {
      const rows = (q.state.data ?? []) as KnowledgeSourceRow[];
      return rows.some((r) => r.status === "indexing" || r.status === "pending") ? 2500 : false;
    },
  });

  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<"website" | "text">("website");
  const [draft, setDraft] = useState({ name: "", url: "", content: "" });
  const [busy, setBusy] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; content: string; similarity: number }>>([]);
  const [searching, setSearching] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["knowledge_sources"] });

  const addSource = async () => {
    setBusy(true);
    try {
      if (tab === "website") {
        if (!draft.url.trim()) { toast.push({ kind: "warn", title: "URL required" }); return; }
        toast.push({ kind: "info", title: "Scraping & indexing…", body: "This may take a moment." });
        await scrape({ data: { url: draft.url.trim(), name: draft.name.trim() || undefined } });
        toast.push({ kind: "success", title: "Source indexed" });
      } else {
        if (!draft.name.trim() || !draft.content.trim()) { toast.push({ kind: "warn", title: "Name & content required" }); return; }
        await ingestTxt({ data: { name: draft.name.trim(), content: draft.content } });
        toast.push({ kind: "success", title: "Text indexed" });
      }
      setAddOpen(false);
      setDraft({ name: "", url: "", content: "" });
      invalidate();
    } catch (e) {
      toast.push({ kind: "error", title: "Failed to index", body: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: KnowledgeSourceRow) => {
    const ok = await ask({ title: `Remove ${s.name}?`, body: "Documents will no longer be searchable.", danger: true });
    if (!ok) return;
    try {
      await removeFn({ data: { id: s.id } });
      toast.push({ kind: "success", title: "Source removed" });
      invalidate();
    } catch (e) {
      toast.push({ kind: "error", title: "Failed", body: e instanceof Error ? e.message : String(e) });
    }
  };

  const onFiles = async (files: FileList) => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { toast.push({ kind: "error", title: "Not signed in" }); return; }
    const userId = sess.session.user.id;
    // Get workspace via a lightweight query
    const { data: wm } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
    if (!wm) { toast.push({ kind: "error", title: "No workspace" }); return; }
    for (const f of Array.from(files)) {
      if (!/\.(txt|md|csv|json|html?)$/i.test(f.name)) {
        toast.push({ kind: "warn", title: `${f.name}: unsupported`, body: "Text-based files only for now (txt, md, csv, json, html)." });
        continue;
      }
      try {
        const path = `${wm.workspace_id}/${Date.now()}-${f.name}`;
        const up = await supabase.storage.from("knowledge-files").upload(path, f, { upsert: false });
        if (up.error) throw up.error;
        const text = await f.text();
        await ingestFile({ data: { name: f.name, storage_path: path, text } });
        toast.push({ kind: "success", title: `${f.name} indexed` });
      } catch (e) {
        toast.push({ kind: "error", title: `${f.name} failed`, body: e instanceof Error ? e.message : String(e) });
      }
    }
    invalidate();
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const rows = await searchFn({ data: { query: searchQuery.trim(), limit: 5 } });
      setSearchResults(rows as any);
    } catch (e) {
      toast.push({ kind: "error", title: "Search failed", body: e instanceof Error ? e.message : String(e) });
    } finally {
      setSearching(false);
    }
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
            <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json,.html,.htm" className="hidden" onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }} />
            <GhostButton onClick={() => setSearchOpen(true)}><Sparkles className="h-4 w-4" /> Test search</GhostButton>
            <GhostButton onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload files</GhostButton>
            <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> {t("kn.add_source")}</PrimaryButton>
          </div>
        }
      />

      <HelpNote>
        The <b>knowledge base</b> is what your AI employees read before replying. Add your website, help docs, FAQs, shipping
        policy, or a plain-text snippet. Atlas splits it into chunks, indexes them semantically, and pulls the most relevant
        pieces into every answer. Use <b>Test search</b> to preview what the AI will find for a given customer question.
      </HelpNote>

      <Panel className="mb-4">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("kn.search")} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <Chip tone="violet">{t("kn.semantic")}</Chip>
        </div>
      </Panel>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Panel className="text-center text-sm text-muted-foreground">No sources yet. Add a website or upload a text file to get started.</Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const Icon = TYPE_ICON[s.source_type] ?? Globe;
            return (
              <Panel key={s.id} className="group transition hover:border-primary/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate font-display font-semibold" title={s.name}>{s.name}</div>
                      <Chip tone={toneFor(s.status)}>
                        {s.status === "indexing" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {s.status === "error" && <AlertCircle className="h-3 w-3" />}
                        {s.status}
                      </Chip>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {TYPE_LABEL[s.source_type]} · {s.doc_count} chunks · {timeAgo(s.updated_at)}
                    </div>
                    {s.url && <div className="mt-1 truncate text-[11px] text-muted-foreground/70">{s.url}</div>}
                    {s.error && <div className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/5 p-2 text-[11px] text-rose-300">{s.error}</div>}
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => remove(s)} className="ml-auto rounded-md p-1 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add knowledge source"
        footer={<><GhostButton onClick={() => setAddOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={addSource} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add & index</PrimaryButton></>}>
        <div className="grid gap-4">
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-xs">
            <button onClick={() => setTab("website")} className={`flex-1 rounded-md px-3 py-1.5 ${tab === "website" ? "bg-white/10" : ""}`}>Website URL</button>
            <button onClick={() => setTab("text")} className={`flex-1 rounded-md px-3 py-1.5 ${tab === "text" ? "bg-white/10" : ""}`}>Paste text</button>
          </div>
          {tab === "website" ? (
            <>
              <TextField label="URL" value={draft.url} onChange={(v) => setDraft({ ...draft, url: v })} placeholder="https://docs.example.com" />
              <TextField label="Display name (optional)" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Help center" />
            </>
          ) : (
            <>
              <TextField label="Display name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Product FAQ" />
              <label className="block">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">Content</div>
                <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={8} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" placeholder="Paste any text your AI employees should know…" />
              </label>
            </>
          )}
        </div>
      </Modal>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Semantic search" size="lg"
        footer={<><GhostButton onClick={() => setSearchOpen(false)}>Close</GhostButton><PrimaryButton onClick={runSearch} disabled={searching}>{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search</PrimaryButton></>}>
        <div className="grid gap-3">
          <TextField label="Query" value={searchQuery} onChange={setSearchQuery} placeholder="Ask something your knowledge should answer…" />
          <div className="grid gap-2">
            {searchResults.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <div className="mb-1 text-[11px] text-muted-foreground">match: {(r.similarity * 100).toFixed(1)}%</div>
                <div className="whitespace-pre-wrap text-muted-foreground">{r.content}</div>
              </div>
            ))}
            {!searching && searchQuery && searchResults.length === 0 && <div className="text-xs text-muted-foreground">No results yet — run search.</div>}
          </div>
        </div>
      </Modal>
      {confirmNode}
    </div>
  );
}