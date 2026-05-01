
-- Board events table for stroke persistence and session recovery
CREATE TABLE public.board_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'stroke',
  stroke_id text,
  points jsonb,
  color text,
  size real,
  sender text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_board_events_session ON public.board_events(session_id, created_at);

ALTER TABLE public.board_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read board_events" ON public.board_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert board_events" ON public.board_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete board_events" ON public.board_events FOR DELETE USING (true);

-- Add question_image_url to call_requests for image uploads
ALTER TABLE public.call_requests ADD COLUMN IF NOT EXISTS question_image_url text;

-- Add teacher_locked column to digital_board_sessions
ALTER TABLE public.digital_board_sessions ADD COLUMN IF NOT EXISTS teacher_locked boolean DEFAULT false;

-- Enable realtime for board_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_events;
