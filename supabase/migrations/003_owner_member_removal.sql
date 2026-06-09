-- World Cup 2026 Prediction Pool — owner member removal
-- Run in the Supabase SQL editor AFTER 001 + 002.
--
-- Lets the pool owner remove a member and all of their pool data. NOTE: the
-- underlying auth.users row is NOT touched (deleting that requires the service
-- role) — do it from Supabase → Authentication → Users for a full wipe, and/or
-- rotate the join code so a removed member can't rejoin.

-- Owner check via SECURITY DEFINER so the inner SELECT on `members` bypasses
-- RLS and can't trip "infinite recursion in policy for relation members".
CREATE OR REPLACE FUNCTION public.is_pool_owner()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM members WHERE user_id = auth.uid() AND is_owner = true) $$;

REVOKE ALL ON FUNCTION public.is_pool_owner() FROM public;
GRANT EXECUTE ON FUNCTION public.is_pool_owner() TO authenticated;

-- Owner may delete a member and their data. predictions/scores reference
-- auth.users (not members), so they must be deleted explicitly — the app does
-- this before deleting the members row.
CREATE POLICY "members: owner delete"
  ON members FOR DELETE TO authenticated USING (public.is_pool_owner());

CREATE POLICY "predictions: owner delete"
  ON predictions FOR DELETE TO authenticated USING (public.is_pool_owner());

CREATE POLICY "prediction_scores: owner delete"
  ON prediction_scores FOR DELETE TO authenticated USING (public.is_pool_owner());

CREATE POLICY "pretournament_predictions: owner delete"
  ON pretournament_predictions FOR DELETE TO authenticated USING (public.is_pool_owner());

CREATE POLICY "pretournament_scores: owner delete"
  ON pretournament_scores FOR DELETE TO authenticated USING (public.is_pool_owner());
