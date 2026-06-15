
-- Subject-level complete notes (not attached to a video)
CREATE TABLE public.subject_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_notes TO authenticated;
GRANT SELECT ON public.subject_notes TO anon;
GRANT ALL ON public.subject_notes TO service_role;
ALTER TABLE public.subject_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subject_notes read all" ON public.subject_notes FOR SELECT USING (true);
CREATE POLICY "subject_notes write all" ON public.subject_notes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_subject_notes_subject ON public.subject_notes(subject_id);

-- Exam preparation videos (subject-scoped)
CREATE TABLE public.exam_prep_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_prep_videos TO authenticated;
GRANT SELECT ON public.exam_prep_videos TO anon;
GRANT ALL ON public.exam_prep_videos TO service_role;
ALTER TABLE public.exam_prep_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_prep_videos read all" ON public.exam_prep_videos FOR SELECT USING (true);
CREATE POLICY "exam_prep_videos write all" ON public.exam_prep_videos FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_exam_prep_videos_subject ON public.exam_prep_videos(subject_id);

-- Exam preparation files (subject-scoped)
CREATE TABLE public.exam_prep_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_prep_files TO authenticated;
GRANT SELECT ON public.exam_prep_files TO anon;
GRANT ALL ON public.exam_prep_files TO service_role;
ALTER TABLE public.exam_prep_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_prep_files read all" ON public.exam_prep_files FOR SELECT USING (true);
CREATE POLICY "exam_prep_files write all" ON public.exam_prep_files FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_exam_prep_files_subject ON public.exam_prep_files(subject_id);
