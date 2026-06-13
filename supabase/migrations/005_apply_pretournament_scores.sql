-- Companion to apply_match_scores: lets the pool owner persist freshly-computed
-- pre-tournament scores immediately after a knockout result override changes the
-- bracket (who reached the QF/SF/final). Scoring is computed client-side with
-- the shared scoring.js; this only persists it. SECURITY DEFINER + is_pool_owner()
-- is what allows writing other members' rows.
--
-- p_scores: jsonb array of { user_id, top8_pts, winner_pts, dark_horse_pts }

CREATE OR REPLACE FUNCTION public.apply_pretournament_scores(p_scores jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_pool_owner() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO pretournament_scores (user_id, top8_pts, winner_pts, dark_horse_pts)
  SELECT (e->>'user_id')::uuid,
         (e->>'top8_pts')::int,
         (e->>'winner_pts')::int,
         (e->>'dark_horse_pts')::int
  FROM jsonb_array_elements(p_scores) AS e
  ON CONFLICT (user_id) DO UPDATE
    SET top8_pts       = EXCLUDED.top8_pts,
        winner_pts     = EXCLUDED.winner_pts,
        dark_horse_pts = EXCLUDED.dark_horse_pts;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_pretournament_scores(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_pretournament_scores(jsonb) TO authenticated;
