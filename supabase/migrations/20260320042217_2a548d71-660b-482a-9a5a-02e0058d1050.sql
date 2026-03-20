
CREATE POLICY "Anyone can update students" ON public.students FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can update teachers" ON public.teachers FOR UPDATE TO public USING (true) WITH CHECK (true);
