
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('website','file','text','social')),
  url TEXT,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','indexing','ready','error')),
  error TEXT,
  doc_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_sources TO authenticated;
GRANT ALL ON public.knowledge_sources TO service_role;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read sources" ON public.knowledge_sources FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members insert sources" ON public.knowledge_sources FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "members update sources" ON public.knowledge_sources FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members delete sources" ON public.knowledge_sources FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE TRIGGER trg_knowledge_sources_updated_at BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_knowledge_sources_workspace ON public.knowledge_sources(workspace_id);

CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(3072) NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_chunks TO authenticated;
GRANT ALL ON public.knowledge_chunks TO service_role;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read chunks" ON public.knowledge_chunks FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members insert chunks" ON public.knowledge_chunks FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members delete chunks" ON public.knowledge_chunks FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE INDEX idx_knowledge_chunks_source ON public.knowledge_chunks(source_id);
CREATE INDEX idx_knowledge_chunks_workspace ON public.knowledge_chunks(workspace_id);
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_chunks
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  _workspace_id UUID,
  query_embedding vector(3072),
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  similarity FLOAT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.source_id, c.content,
    1 - (c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM public.knowledge_chunks c
  WHERE c.workspace_id = _workspace_id
    AND public.is_workspace_member(auth.uid(), _workspace_id)
  ORDER BY c.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

-- Storage RLS: workspace-scoped by first path segment
CREATE POLICY "members read knowledge files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'knowledge-files' AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.workspace_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "members upload knowledge files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-files' AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.workspace_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "members delete knowledge files" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'knowledge-files' AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.workspace_id::text = (storage.foldername(name))[1]
    )
  );
