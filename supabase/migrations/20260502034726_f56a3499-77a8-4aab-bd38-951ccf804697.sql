
-- Add helpful_count to doubts
ALTER TABLE public.doubts ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;

-- Saved doubts table
CREATE TABLE public.saved_doubts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_reg_no text NOT NULL,
  doubt_id uuid NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_reg_no, doubt_id)
);
ALTER TABLE public.saved_doubts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read saved_doubts" ON public.saved_doubts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert saved_doubts" ON public.saved_doubts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete saved_doubts" ON public.saved_doubts FOR DELETE USING (true);

-- Helpful reactions table
CREATE TABLE public.doubt_helpful (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_reg_no text NOT NULL,
  doubt_id uuid NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_reg_no, doubt_id)
);
ALTER TABLE public.doubt_helpful ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read doubt_helpful" ON public.doubt_helpful FOR SELECT USING (true);
CREATE POLICY "Anyone can insert doubt_helpful" ON public.doubt_helpful FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete doubt_helpful" ON public.doubt_helpful FOR DELETE USING (true);
