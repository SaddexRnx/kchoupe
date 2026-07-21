DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inbox_conversations','inbox_messages','orders','ai_employees',
    'products','customers','workspace_learnings','integrations',
    'knowledge_sources','notifications','workspaces','custom_models'
  ] LOOP
    BEGIN EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL; END;
  END LOOP;
END $$;