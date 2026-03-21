-- Add image columns to doubts table
ALTER TABLE public.doubts ADD COLUMN question_image_url text;
ALTER TABLE public.doubts ADD COLUMN answer_image_url text;

-- Add email columns to students and teachers
ALTER TABLE public.students ADD COLUMN email text;
ALTER TABLE public.teachers ADD COLUMN email text;

-- Create storage bucket for doubt images
INSERT INTO storage.buckets (id, name, public) VALUES ('doubt-images', 'doubt-images', true);

-- Create storage bucket for video files (PDF/PPT)
INSERT INTO storage.buckets (id, name, public) VALUES ('video-files', 'video-files', true);

-- RLS policies for doubt-images bucket
CREATE POLICY "Anyone can upload doubt images" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'doubt-images');
CREATE POLICY "Anyone can read doubt images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'doubt-images');
CREATE POLICY "Anyone can delete doubt images" ON storage.objects FOR DELETE TO public USING (bucket_id = 'doubt-images');

-- RLS policies for video-files bucket
CREATE POLICY "Anyone can upload video files" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'video-files');
CREATE POLICY "Anyone can read video files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'video-files');
CREATE POLICY "Anyone can delete video files" ON storage.objects FOR DELETE TO public USING (bucket_id = 'video-files');

-- Create video_files table for tracking files per video
CREATE TABLE public.video_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read video_files" ON public.video_files FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert video_files" ON public.video_files FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete video_files" ON public.video_files FOR DELETE TO public USING (true);

-- Enable realtime for doubts (for duplicate doubt handling)
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubts;