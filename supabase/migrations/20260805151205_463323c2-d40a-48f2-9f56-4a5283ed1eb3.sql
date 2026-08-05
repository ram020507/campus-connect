-- Restore table-level write access (RLS policies remain the authorization layer)
GRANT INSERT, UPDATE, DELETE ON public.teachers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.students TO anon, authenticated;
GRANT ALL ON public.teachers TO service_role;
GRANT ALL ON public.students TO service_role;

-- Read access per-column, excluding login credentials (dob) and contact info (email)
GRANT SELECT (id, staff_id, name, college_name, subject_name, department, created_at) ON public.teachers TO anon, authenticated;
GRANT SELECT (id, registration_number, name, college_name, department, year, created_at) ON public.students TO anon, authenticated;