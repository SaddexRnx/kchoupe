
ALTER TABLE public.ai_employees
  ADD COLUMN IF NOT EXISTS temperature numeric NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS top_p numeric NOT NULL DEFAULT 0.9,
  ADD COLUMN IF NOT EXISTS max_tokens integer NOT NULL DEFAULT 1024,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS greeting text,
  ADD COLUMN IF NOT EXISTS escalate_to_human boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_knowledge boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_products boolean NOT NULL DEFAULT true;
