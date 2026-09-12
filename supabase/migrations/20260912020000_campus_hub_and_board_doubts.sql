-- Link digital board sessions / call requests to a doubt
ALTER TABLE public.call_requests ADD COLUMN IF NOT EXISTS doubt_id uuid;
ALTER TABLE public.call_requests ADD COLUMN IF NOT EXISTS initiator text NOT NULL DEFAULT 'student';
ALTER TABLE public.digital_board_sessions ADD COLUMN IF NOT EXISTS doubt_id uuid;
ALTER TABLE public.digital_board_sessions ADD COLUMN IF NOT EXISTS question_image_url text;

-- Campus Hub posts
CREATE TABLE IF NOT EXISTS public.campus_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_role text NOT NULL,             -- 'student' | 'teacher' | 'college'
  author_id text,                        -- reg no / staff id / null for college
  author_name text NOT NULL,
  college_name text NOT NULL,
  department text,
  student_year integer,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  file_url text,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campus_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.campus_posts(id) ON DELETE CASCADE,
  user_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_key)
);

CREATE TABLE IF NOT EXISTS public.campus_post_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.campus_posts(id) ON DELETE CASCADE,
  user_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_key)
);

CREATE TABLE IF NOT EXISTS public.campus_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.campus_posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.campus_post_comments(id) ON DELETE CASCADE,
  author_role text NOT NULL,
  author_key text NOT NULL,
  author_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_posts TO anon, authenticated;
GRANT ALL ON public.campus_posts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_post_likes TO anon, authenticated;
GRANT ALL ON public.campus_post_likes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_post_saves TO anon, authenticated;
GRANT ALL ON public.campus_post_saves TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_post_comments TO anon, authenticated;
GRANT ALL ON public.campus_post_comments TO service_role;

ALTER TABLE public.campus_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_post_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read campus_posts" ON public.campus_posts FOR SELECT USING (true);
  CREATE POLICY "Anyone can insert campus_posts" ON public.campus_posts FOR INSERT WITH CHECK (true);
  CREATE POLICY "Anyone can update campus_posts" ON public.campus_posts FOR UPDATE USING (true);
  CREATE POLICY "Anyone can delete campus_posts" ON public.campus_posts FOR DELETE USING (true);
  CREATE POLICY "Anyone can read campus_post_likes" ON public.campus_post_likes FOR SELECT USING (true);
  CREATE POLICY "Anyone can insert campus_post_likes" ON public.campus_post_likes FOR INSERT WITH CHECK (true);
  CREATE POLICY "Anyone can delete campus_post_likes" ON public.campus_post_likes FOR DELETE USING (true);
  CREATE POLICY "Anyone can read campus_post_saves" ON public.campus_post_saves FOR SELECT USING (true);
  CREATE POLICY "Anyone can insert campus_post_saves" ON public.campus_post_saves FOR INSERT WITH CHECK (true);
  CREATE POLICY "Anyone can delete campus_post_saves" ON public.campus_post_saves FOR DELETE USING (true);
  CREATE POLICY "Anyone can read campus_post_comments" ON public.campus_post_comments FOR SELECT USING (true);
  CREATE POLICY "Anyone can insert campus_post_comments" ON public.campus_post_comments FOR INSERT WITH CHECK (true);
  CREATE POLICY "Anyone can delete campus_post_comments" ON public.campus_post_comments FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
