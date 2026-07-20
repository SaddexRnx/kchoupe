
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days');

ALTER TABLE public.workspaces ALTER COLUMN plan SET DEFAULT 'trial';

UPDATE public.workspaces SET plan = 'trial' WHERE plan IS NULL OR plan = '' OR plan = 'free';
