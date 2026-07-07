ALTER TABLE public.doubts ADD COLUMN IF NOT EXISTS parent_doubt_id uuid REFERENCES public.doubts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_doubts_parent ON public.doubts(parent_doubt_id);