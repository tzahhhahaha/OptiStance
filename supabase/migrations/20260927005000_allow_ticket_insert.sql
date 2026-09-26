-- ============================================================================
-- Let athletes actually file support tickets.
--
-- The problem this solves
--   The "Contact Support Desk" form in HelpSupportScreen displayed a success
--   confirmation, but it was never wired to the database: the handler set a
--   boolean for two seconds and discarded whatever was typed. Nothing was ever
--   written to support_tickets.
--
--   The table is RLS-protected with only two SELECT policies ("Admins view all
--   tickets", "Athletes view own tickets"). With no INSERT policy, even a
--   correctly wired insert is rejected with 42501, so the missing policy is the
--   reason a real implementation would have failed too.
--
-- Why the policy is scoped to the caller's own id
--   user_id is caller-supplied, so without the auth.uid() = user_id check any
--   athlete could file tickets in another athlete's name. Comparing against
--   auth.uid() rather than trusting the payload is what closes that hole.
--
-- Why there is still no UPDATE or DELETE policy
--   A ticket is an append-only record. Allowing an athlete to edit or remove
--   their own ticket would let them erase evidence of what they reported.
--   Admins may still act on tickets through the existing SELECT policy.
-- ============================================================================

DROP POLICY IF EXISTS "Athletes can create own tickets" ON public.support_tickets;

CREATE POLICY "Athletes can create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);
