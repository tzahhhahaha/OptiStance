-- Keep the active pose syllabus in sync for guests and signed-in athletes.
-- Guest access is read-only and excludes archived rows; admin writes remain
-- restricted to the existing authenticated admin policies.
REVOKE ALL ON TABLE public.stunts FROM anon;
GRANT SELECT ON TABLE public.stunts TO anon;

DROP POLICY IF EXISTS "Guests can view active stunts" ON public.stunts;
CREATE POLICY "Guests can view active stunts"
  ON public.stunts FOR SELECT
  TO anon
  USING (is_archived = false);
