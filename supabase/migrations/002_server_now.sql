-- World Cup 2026 Prediction Pool — server clock helper
-- Run this in the Supabase SQL editor AFTER 001_initial.sql.
--
-- Exposes the database's authoritative clock to clients so the countdown
-- and lock *display* can be anchored to server time instead of the user's
-- (spoofable) local clock.
--
-- NOTE: This is display-only. The real prediction lock is already enforced
-- by the RLS policies in 001_initial.sql, which compare kickoff_utc against
-- the server's now() and cannot be bypassed from the client.

CREATE OR REPLACE FUNCTION public.server_now()
  RETURNS timestamptz
  LANGUAGE sql
  STABLE
AS $$ SELECT now(); $$;

GRANT EXECUTE ON FUNCTION public.server_now() TO anon, authenticated;
