
ALTER TABLE public.doubts ADD COLUMN IF NOT EXISTS question_image_url_2 text;
ALTER TABLE public.teacher_status ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'out';
