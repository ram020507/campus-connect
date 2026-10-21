-- Scope Campus Jobs companies to a college
ALTER TABLE public.campus_job_companies
  ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;

CREATE INDEX campus_job_companies_college_id_idx ON public.campus_job_companies (college_id);

-- Backfill existing companies to the (single) college that created them
UPDATE public.campus_job_companies
SET college_id = (SELECT id FROM public.colleges ORDER BY created_at LIMIT 1)
WHERE college_id IS NULL;

COMMENT ON COLUMN public.campus_job_companies.college_id IS 'College this recruitment record belongs to; companies are managed and visible per college';