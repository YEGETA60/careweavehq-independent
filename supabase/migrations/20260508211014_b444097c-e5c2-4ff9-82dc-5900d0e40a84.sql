
ALTER TABLE public.claim_submissions
  ADD COLUMN IF NOT EXISTS parent_submission_id uuid REFERENCES public.claim_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS regeneration_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_ack jsonb,
  ADD COLUMN IF NOT EXISTS parity_status text,
  ADD COLUMN IF NOT EXISTS parity_diff jsonb,
  ADD COLUMN IF NOT EXISTS parity_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_claim_subs_parent ON public.claim_submissions(parent_submission_id);
