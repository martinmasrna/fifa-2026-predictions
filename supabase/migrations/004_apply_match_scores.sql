-- Lets the pool owner persist freshly-computed per-match scores immediately
-- after a manual result override, instead of waiting for the next Action run.
-- The scoring itself is computed client-side with the shared scoring.js; this
-- function only persists the result, so there's no scoring logic duplicated in
-- SQL. SECURITY DEFINER + an is_pool_owner() gate is what lets the owner write
-- *other* members' prediction_scores rows (normal RLS forbids it).
--
-- p_scores: jsonb array of
--   { user_id, match_no, points, scoreline_pts, advance_pts }

CREATE OR REPLACE FUNCTION public.apply_match_scores(p_scores jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_pool_owner() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO prediction_scores (user_id, match_no, points, scoreline_pts, advance_pts)
  SELECT (e->>'user_id')::uuid,
         (e->>'match_no')::int,
         (e->>'points')::int,
         (e->>'scoreline_pts')::int,
         (e->>'advance_pts')::int
  FROM jsonb_array_elements(p_scores) AS e
  ON CONFLICT (user_id, match_no) DO UPDATE
    SET points        = EXCLUDED.points,
        scoreline_pts = EXCLUDED.scoreline_pts,
        advance_pts   = EXCLUDED.advance_pts;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_match_scores(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_match_scores(jsonb) TO authenticated;
