
CREATE TABLE public.doubt_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL,
  author_name TEXT NOT NULL,
  text TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_doubt_followups_doubt_id ON public.doubt_followups(doubt_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doubt_followups TO anon, authenticated;
GRANT ALL ON public.doubt_followups TO service_role;
ALTER TABLE public.doubt_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read followups" ON public.doubt_followups FOR SELECT USING (true);
CREATE POLICY "Anyone can insert followups" ON public.doubt_followups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update followups" ON public.doubt_followups FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete followups" ON public.doubt_followups FOR DELETE USING (true);

CREATE TABLE public.doubt_seen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  student_reg_no TEXT NOT NULL,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doubt_id, student_reg_no)
);
CREATE INDEX idx_doubt_seen_student ON public.doubt_seen(student_reg_no);
GRANT SELECT, INSERT, DELETE ON public.doubt_seen TO anon, authenticated;
GRANT ALL ON public.doubt_seen TO service_role;
ALTER TABLE public.doubt_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read seen" ON public.doubt_seen FOR SELECT USING (true);
CREATE POLICY "Anyone can insert seen" ON public.doubt_seen FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete seen" ON public.doubt_seen FOR DELETE USING (true);
