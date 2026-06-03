CREATE POLICY "Anyone can update colleges" ON public.colleges FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can update years" ON public.years FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can update departments" ON public.departments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can update subjects" ON public.subjects FOR UPDATE USING (true) WITH CHECK (true);