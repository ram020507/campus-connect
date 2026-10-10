CREATE TABLE public.campus_job_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL CHECK (char_length(btrim(company_name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campus_job_companies TO anon, authenticated;
GRANT ALL ON public.campus_job_companies TO service_role;
ALTER TABLE public.campus_job_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campus Jobs companies are publicly readable" ON public.campus_job_companies FOR SELECT TO anon, authenticated USING (true);
CREATE UNIQUE INDEX campus_job_companies_name_unique ON public.campus_job_companies (lower(btrim(company_name)));

CREATE TABLE public.campus_job_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.campus_job_companies(id) ON DELETE CASCADE,
  criteria text NOT NULL CHECK (char_length(btrim(criteria)) BETWEEN 1 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campus_job_eligibility TO anon, authenticated;
GRANT ALL ON public.campus_job_eligibility TO service_role;
ALTER TABLE public.campus_job_eligibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campus Jobs eligibility is publicly readable" ON public.campus_job_eligibility FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.campus_job_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.campus_job_companies(id) ON DELETE CASCADE,
  role_name text NOT NULL CHECK (char_length(btrim(role_name)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id)
);
GRANT SELECT ON public.campus_job_roles TO anon, authenticated;
GRANT ALL ON public.campus_job_roles TO service_role;
ALTER TABLE public.campus_job_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campus Jobs roles are publicly readable" ON public.campus_job_roles FOR SELECT TO anon, authenticated USING (true);
CREATE UNIQUE INDEX campus_job_roles_company_name_unique ON public.campus_job_roles (company_id, lower(btrim(role_name)));

CREATE TABLE public.campus_job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.campus_job_roles(id) ON DELETE CASCADE,
  skill_name text NOT NULL CHECK (char_length(btrim(skill_name)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campus_job_skills TO anon, authenticated;
GRANT ALL ON public.campus_job_skills TO service_role;
ALTER TABLE public.campus_job_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campus Jobs skills are publicly readable" ON public.campus_job_skills FOR SELECT TO anon, authenticated USING (true);
CREATE UNIQUE INDEX campus_job_skills_role_name_unique ON public.campus_job_skills (role_id, lower(btrim(skill_name)));

CREATE TABLE public.campus_job_selected_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.campus_job_companies(id) ON DELETE CASCADE,
  job_role_id uuid,
  student_name text NOT NULL CHECK (char_length(btrim(student_name)) BETWEEN 1 AND 160),
  academic_batch text NOT NULL CHECK (char_length(btrim(academic_batch)) BETWEEN 1 AND 80),
  department text NOT NULL CHECK (char_length(btrim(department)) BETWEEN 1 AND 160),
  linkedin_url text CHECK (linkedin_url IS NULL OR char_length(linkedin_url) <= 2048),
  linkedin_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (job_role_id, company_id) REFERENCES public.campus_job_roles(id, company_id) ON DELETE SET NULL (job_role_id)
);
GRANT SELECT ON public.campus_job_selected_students TO anon, authenticated;
GRANT ALL ON public.campus_job_selected_students TO service_role;
ALTER TABLE public.campus_job_selected_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campus Jobs selected students are publicly readable" ON public.campus_job_selected_students FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_job_companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_job_eligibility;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_job_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_job_skills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_job_selected_students;