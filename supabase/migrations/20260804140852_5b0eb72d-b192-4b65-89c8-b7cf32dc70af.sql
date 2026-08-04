CREATE TABLE public.feed_hidden (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_reg_no text NOT NULL,
  doubt_id uuid NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.feed_hidden TO anon;
GRANT SELECT, INSERT, DELETE ON public.feed_hidden TO authenticated;
GRANT ALL ON public.feed_hidden TO service_role;
ALTER TABLE public.feed_hidden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read feed_hidden" ON public.feed_hidden FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert feed_hidden" ON public.feed_hidden FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete feed_hidden" ON public.feed_hidden FOR DELETE TO public USING (true);