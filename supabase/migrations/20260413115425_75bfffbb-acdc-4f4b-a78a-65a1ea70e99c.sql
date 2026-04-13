
-- Teacher online/busy status
CREATE TABLE public.teacher_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id text NOT NULL UNIQUE,
  teacher_name text NOT NULL,
  college_name text NOT NULL,
  subject_name text NOT NULL,
  is_online boolean NOT NULL DEFAULT false,
  is_busy boolean NOT NULL DEFAULT false,
  current_session_id uuid,
  last_seen_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.teacher_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read teacher_status" ON public.teacher_status FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teacher_status" ON public.teacher_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update teacher_status" ON public.teacher_status FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete teacher_status" ON public.teacher_status FOR DELETE USING (true);

-- Call requests from students
CREATE TABLE public.call_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_reg_no text NOT NULL,
  student_name text NOT NULL,
  student_college text NOT NULL,
  student_department text NOT NULL,
  student_year integer NOT NULL,
  subject_name text NOT NULL,
  mode text NOT NULL DEFAULT 'whiteboard',
  doubt_text text,
  status text NOT NULL DEFAULT 'pending',
  accepted_by_staff_id text,
  accepted_by_name text,
  session_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.call_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read call_requests" ON public.call_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert call_requests" ON public.call_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update call_requests" ON public.call_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete call_requests" ON public.call_requests FOR DELETE USING (true);

-- Digital board sessions
CREATE TABLE public.digital_board_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_reg_no text NOT NULL,
  student_name text NOT NULL,
  teacher_staff_id text NOT NULL,
  teacher_name text NOT NULL,
  subject_name text NOT NULL,
  mode text NOT NULL DEFAULT 'whiteboard',
  doubt_text text,
  canvas_data jsonb DEFAULT '[]'::jsonb,
  code_content text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  college_name text NOT NULL,
  department text NOT NULL,
  student_year integer NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone
);

ALTER TABLE public.digital_board_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read digital_board_sessions" ON public.digital_board_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert digital_board_sessions" ON public.digital_board_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update digital_board_sessions" ON public.digital_board_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete digital_board_sessions" ON public.digital_board_sessions FOR DELETE USING (true);

-- Enable realtime for call requests and teacher status
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_board_sessions;
