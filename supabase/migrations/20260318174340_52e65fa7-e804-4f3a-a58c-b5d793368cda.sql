
-- Create colleges table
CREATE TABLE public.colleges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create years table
CREATE TABLE public.years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  year_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('odd', 'even')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dob TEXT NOT NULL,
  college_name TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dob TEXT NOT NULL,
  college_name TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doubts table
CREATE TABLE public.doubts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_reg_no TEXT NOT NULL,
  student_year INTEGER NOT NULL,
  student_department TEXT NOT NULL,
  student_college TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by TEXT,
  claimed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answered_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;

-- Public access policies (app uses custom auth, not Supabase auth)
CREATE POLICY "Anyone can read colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert colleges" ON public.colleges FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete colleges" ON public.colleges FOR DELETE USING (true);

CREATE POLICY "Anyone can read years" ON public.years FOR SELECT USING (true);
CREATE POLICY "Anyone can insert years" ON public.years FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete years" ON public.years FOR DELETE USING (true);

CREATE POLICY "Anyone can read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert departments" ON public.departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete departments" ON public.departments FOR DELETE USING (true);

CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert subjects" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete subjects" ON public.subjects FOR DELETE USING (true);

CREATE POLICY "Anyone can read videos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert videos" ON public.videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete videos" ON public.videos FOR DELETE USING (true);

CREATE POLICY "Anyone can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Anyone can insert students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete students" ON public.students FOR DELETE USING (true);

CREATE POLICY "Anyone can read teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teachers" ON public.teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete teachers" ON public.teachers FOR DELETE USING (true);

CREATE POLICY "Anyone can read doubts" ON public.doubts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert doubts" ON public.doubts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update doubts" ON public.doubts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete doubts" ON public.doubts FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_years_college_id ON public.years(college_id);
CREATE INDEX idx_departments_year_id ON public.departments(year_id);
CREATE INDEX idx_subjects_department_id ON public.subjects(department_id);
CREATE INDEX idx_videos_subject_id ON public.videos(subject_id);
CREATE INDEX idx_doubts_subject_name ON public.doubts(subject_name);
CREATE INDEX idx_doubts_student_year_dept ON public.doubts(student_year, student_department);
