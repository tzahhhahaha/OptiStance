-- Keep admin lock changes writable and available to authenticated Realtime clients.
-- Apply after 20260927003000_fix_admin_policy_recursion.sql, which defines is_admin().

DROP POLICY IF EXISTS "Admins can update stunts" ON public.stunts;
CREATE POLICY "Admins can update stunts"
  ON public.stunts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'stunts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stunts;
  END IF;
END
$$;
