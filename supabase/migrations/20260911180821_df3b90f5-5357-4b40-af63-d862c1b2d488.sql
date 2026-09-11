ALTER TABLE public.doubts
  ADD COLUMN IF NOT EXISTS assigned_teacher_id text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE INDEX IF NOT EXISTS doubts_assigned_teacher_idx ON public.doubts (assigned_teacher_id);

CREATE OR REPLACE FUNCTION public.assign_doubts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  best record;
  cur_solved int;
BEGIN
  -- 1. Release offers the teacher ignored for more than 10 seconds
  UPDATE doubts
     SET declined_by = coalesce(declined_by, '[]'::jsonb) || to_jsonb(assigned_teacher_id),
         assigned_teacher_id = NULL,
         assigned_at = NULL,
         status = 'pending'
   WHERE status = 'assigned'
     AND assigned_at IS NOT NULL
     AND assigned_at < now() - interval '10 seconds';

  -- 2. Offer pending doubts and rebalance claimed-but-not-started doubts
  FOR d IN
    SELECT * FROM doubts
     WHERE answer IS NULL
       AND status IN ('pending', 'claimed')
       AND handling_teacher IS NULL
     ORDER BY created_at
  LOOP
    SELECT t.staff_id, t.name,
           (SELECT count(*) FROM doubts s WHERE s.answered_by = t.name) AS solved,
           (SELECT count(*) FROM doubts o WHERE o.answer IS NULL
              AND (o.assigned_teacher_id = t.staff_id OR o.claimed_by = t.staff_id)) AS openload
      INTO best
      FROM teachers t
      JOIN teacher_status ts ON ts.staff_id = t.staff_id
     WHERE ts.availability = 'in'
       AND lower(t.college_name) = lower(d.student_college)
       AND EXISTS (
         SELECT 1 FROM unnest(string_to_array(t.subject_name, ',')) sn
          WHERE lower(btrim(sn)) = lower(btrim(d.subject_name))
       )
       AND NOT (coalesce(d.declined_by, '[]'::jsonb) ? t.staff_id)
     ORDER BY solved ASC, openload ASC, t.staff_id
     LIMIT 1;

    -- everyone already passed: clear the pass list and try again
    IF best.staff_id IS NULL AND coalesce(d.declined_by, '[]'::jsonb) <> '[]'::jsonb THEN
      UPDATE doubts SET declined_by = '[]'::jsonb WHERE id = d.id;
      SELECT t.staff_id, t.name,
             (SELECT count(*) FROM doubts s WHERE s.answered_by = t.name) AS solved,
             (SELECT count(*) FROM doubts o WHERE o.answer IS NULL
                AND (o.assigned_teacher_id = t.staff_id OR o.claimed_by = t.staff_id)) AS openload
        INTO best
        FROM teachers t
        JOIN teacher_status ts ON ts.staff_id = t.staff_id
       WHERE ts.availability = 'in'
         AND lower(t.college_name) = lower(d.student_college)
         AND EXISTS (
           SELECT 1 FROM unnest(string_to_array(t.subject_name, ',')) sn
            WHERE lower(btrim(sn)) = lower(btrim(d.subject_name))
         )
       ORDER BY solved ASC, openload ASC, t.staff_id
       LIMIT 1;
    END IF;

    IF best.staff_id IS NULL THEN
      CONTINUE;
    END IF;

    IF d.status = 'pending' THEN
      UPDATE doubts
         SET assigned_teacher_id = best.staff_id,
             assigned_at = now(),
             status = 'assigned'
       WHERE id = d.id;
    ELSIF d.status = 'claimed' AND d.started_at IS NULL
          AND d.claimed_by IS DISTINCT FROM best.staff_id THEN
      SELECT count(*) INTO cur_solved
        FROM doubts s
        JOIN teachers t2 ON t2.staff_id = d.claimed_by AND s.answered_by = t2.name;
      IF best.solved < cur_solved THEN
        UPDATE doubts
           SET claimed_by = NULL,
               handling_teacher = NULL,
               assigned_teacher_id = best.staff_id,
               assigned_at = now(),
               status = 'assigned'
         WHERE id = d.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_doubts() TO anon, authenticated, service_role;