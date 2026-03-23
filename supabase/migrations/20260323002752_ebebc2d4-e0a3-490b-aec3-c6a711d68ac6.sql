ALTER TABLE public.doubts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.doubts ADD COLUMN IF NOT EXISTS handling_teacher text;