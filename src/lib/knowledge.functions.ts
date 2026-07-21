import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KnowledgeSourceRow = {
  id: string;
  name: string;
  source_type: "website" | "file" | "text" | "social";
  url: string | null;
  storage_path: string | null;
  status: "pending" | "indexing" | "ready" | "error";
  error: string | null;
  doc_count: number;
  updated_at: string;
  created_at: string;
};

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";

async function embed(texts: string[]): Promise<number[][]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const vectors: number[][] = [];
  // Gemini embeddings: max 100 per batch
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
    });
    if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    vectors.push(...sorted.map((d) => d.embedding));
  }
  return vectors;
}

function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function getWorkspaceId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_default_workspace", { _user_id: userId });
  if (error) throw new Error(error.message);
  return data as string;
}

export const listKnowledgeSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KnowledgeSourceRow[]> => {
    const ws = await getWorkspaceId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("knowledge_sources")
      .select("id,name,source_type,url,storage_path,status,error,doc_count,updated_at,created_at")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as KnowledgeSourceRow[];
  });

export const deleteKnowledgeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: src } = await supabase
      .from("knowledge_sources")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (src?.storage_path) {
      await supabase.storage.from("knowledge-files").remove([src.storage_path]);
    }
    const { error } = await supabase.from("knowledge_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function ingest(
  supabase: any,
  workspaceId: string,
  sourceId: string,
  text: string,
): Promise<number> {
  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;
  const vectors = await embed(chunks);
  const rows = chunks.map((content, i) => ({
    source_id: sourceId,
    workspace_id: workspaceId,
    content,
    embedding: vectors[i] as any,
    token_count: Math.ceil(content.length / 4),
  }));
  // Insert in batches
  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const { error } = await supabase.from("knowledge_chunks").insert(batch);
    if (error) throw new Error(error.message);
  }
  return chunks.length;
}

export const scrapeWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string; name?: string }) => {
    if (!input?.url) throw new Error("url required");
    try {
      new URL(input.url);
    } catch {
      throw new Error("invalid url");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<KnowledgeSourceRow> => {
    const { supabase, userId } = context;
    const ws = await getWorkspaceId(supabase, userId);
    const name = data.name?.trim() || new URL(data.url).hostname;

    const { data: src, error: insErr } = await supabase
      .from("knowledge_sources")
      .insert({
        workspace_id: ws,
        created_by: userId,
        name,
        source_type: "website",
        url: data.url,
        status: "indexing",
      })
      .select("id,name,source_type,url,storage_path,status,error,doc_count,updated_at,created_at")
      .single();
    if (insErr || !src) throw new Error(insErr?.message ?? "insert failed");

    try {
      const { safeFetch } = await import("./ssrf-guard.server");
      const res = await safeFetch(data.url, {
        headers: { "User-Agent": "KC/1.0 (+https://kc.app)" },
      });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const html = await res.text();
      const text = stripHtml(html);
      if (!text || text.length < 40) throw new Error("no readable text found");
      // cap at ~200k chars to protect embeddings/costs
      const capped = text.slice(0, 200_000);
      const count = await ingest(supabase, ws, src.id, capped);
      const { data: updated, error: upErr } = await supabase
        .from("knowledge_sources")
        .update({ status: "ready", doc_count: count, error: null })
        .eq("id", src.id)
        .select("id,name,source_type,url,storage_path,status,error,doc_count,updated_at,created_at")
        .single();
      if (upErr) throw new Error(upErr.message);
      return updated as KnowledgeSourceRow;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("knowledge_sources").update({ status: "error", error: msg }).eq("id", src.id);
      throw new Error(msg);
    }
  });

export const ingestText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; content: string }) => {
    if (!input?.name?.trim() || !input?.content?.trim()) throw new Error("name and content required");
    return input;
  })
  .handler(async ({ data, context }): Promise<KnowledgeSourceRow> => {
    const { supabase, userId } = context;
    const ws = await getWorkspaceId(supabase, userId);
    const { data: src, error } = await supabase
      .from("knowledge_sources")
      .insert({
        workspace_id: ws,
        created_by: userId,
        name: data.name.trim(),
        source_type: "text",
        status: "indexing",
      })
      .select("id,name,source_type,url,storage_path,status,error,doc_count,updated_at,created_at")
      .single();
    if (error || !src) throw new Error(error?.message ?? "insert failed");
    try {
      const count = await ingest(supabase, ws, src.id, data.content.slice(0, 200_000));
      const { data: updated } = await supabase
        .from("knowledge_sources")
        .update({ status: "ready", doc_count: count, error: null })
        .eq("id", src.id)
        .select("id,name,source_type,url,storage_path,status,error,doc_count,updated_at,created_at")
        .single();
      return updated as KnowledgeSourceRow;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("knowledge_sources").update({ status: "error", error: msg }).eq("id", src.id);
      throw new Error(msg);
    }
  });

export const ingestUploadedFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; storage_path: string; text: string }) => {
    if (!input?.name?.trim() || !input?.storage_path || !input?.text?.trim()) {
      throw new Error("name, storage_path and text required");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<KnowledgeSourceRow> => {
    const { supabase, userId } = context;
    const ws = await getWorkspaceId(supabase, userId);
    const { data: src, error } = await supabase
      .from("knowledge_sources")
      .insert({
        workspace_id: ws,
        created_by: userId,
        name: data.name.trim(),
        source_type: "file",
        storage_path: data.storage_path,
        status: "indexing",
      })
      .select("id,name,source_type,url,storage_path,status,error,doc_count,updated_at,created_at")
      .single();
    if (error || !src) throw new Error(error?.message ?? "insert failed");
    try {
      const count = await ingest(supabase, ws, src.id, data.text.slice(0, 200_000));
      const { data: updated } = await supabase
        .from("knowledge_sources")
        .update({ status: "ready", doc_count: count, error: null })
        .eq("id", src.id)
        .select("id,name,source_type,url,storage_path,status,error,doc_count,updated_at,created_at")
        .single();
      return updated as KnowledgeSourceRow;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("knowledge_sources").update({ status: "error", error: msg }).eq("id", src.id);
      throw new Error(msg);
    }
  });

export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; limit?: number }) => {
    if (!input?.query?.trim()) throw new Error("query required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ws = await getWorkspaceId(supabase, userId);
    const [vec] = await embed([data.query.trim()]);
    const { data: rows, error } = await supabase.rpc("match_knowledge_chunks", {
      _workspace_id: ws,
      query_embedding: vec as any,
      match_count: data.limit ?? 5,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });