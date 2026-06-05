-- Restrict public access to student and teacher login credentials (dob).
-- The auth-login edge function uses the service role and is unaffected.

-- Students: revoke broad SELECT, grant only non-credential columns
REVOKE SELECT ON public.students FROM anon, authenticated;
GRANT SELECT (id, registration_number, name, email, college_name, department, year, created_at)
  ON public.students TO anon, authenticated;

-- Teachers: revoke broad SELECT, grant only non-credential columns
REVOKE SELECT ON public.teachers FROM anon, authenticated;
GRANT SELECT (id, staff_id, name, email, college_name, subject_name, created_at)
  ON public.teachers TO anon, authenticated;