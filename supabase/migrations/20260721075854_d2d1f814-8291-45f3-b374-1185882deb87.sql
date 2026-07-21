CREATE OR REPLACE FUNCTION public.ensure_default_workspace(_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _workspace_id uuid;
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT workspace_id INTO _workspace_id
  FROM public.workspace_members
  WHERE user_id = _caller
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF _workspace_id IS NOT NULL THEN
    RETURN _workspace_id;
  END IF;

  SELECT id INTO _workspace_id
  FROM public.workspaces
  WHERE owner_id = _caller
  ORDER BY created_at ASC
  LIMIT 1;

  IF _workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (_workspace_id, _caller, 'owner')
    ON CONFLICT DO NOTHING;
    RETURN _workspace_id;
  END IF;

  INSERT INTO public.workspaces (name, owner_id)
  VALUES ('My Workspace', _caller)
  RETURNING id INTO _workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_workspace_id, _caller, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN _workspace_id;
END;
$function$;