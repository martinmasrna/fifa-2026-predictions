-- World Cup 2026 Prediction Pool — initial schema
-- Run this in the Supabase SQL editor for your project.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE members (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email     TEXT NOT NULL,
  is_owner  BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  match_no        INTEGER PRIMARY KEY,
  stage           TEXT NOT NULL,
  "group"         TEXT,
  round_label     TEXT NOT NULL,
  team1           TEXT NOT NULL,
  team2           TEXT NOT NULL,
  team1_resolved  BOOLEAN NOT NULL DEFAULT false,
  team2_resolved  BOOLEAN NOT NULL DEFAULT false,
  kickoff_utc     TIMESTAMPTZ NOT NULL,
  ground          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'live', 'final')),
  ft1             INTEGER,
  ft2             INTEGER,
  et1             INTEGER,
  et2             INTEGER,
  p1              INTEGER,
  p2              INTEGER,
  advancer        TEXT,
  result_source   TEXT NOT NULL DEFAULT 'feed'
                    CHECK (result_source IN ('feed', 'manual')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE predictions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_no       INTEGER NOT NULL REFERENCES matches(match_no) ON DELETE CASCADE,
  pred1          INTEGER NOT NULL,
  pred2          INTEGER NOT NULL,
  pred_advancer  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_no)
);

CREATE TABLE pretournament_predictions (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top8        TEXT[] NOT NULL DEFAULT '{}',
  winner      TEXT,
  dark_horse  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prediction_scores (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_no      INTEGER NOT NULL REFERENCES matches(match_no) ON DELETE CASCADE,
  points        INTEGER NOT NULL DEFAULT 0,
  scoreline_pts INTEGER NOT NULL DEFAULT 0,
  advance_pts   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, match_no)
);

CREATE TABLE pretournament_scores (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top8_pts      INTEGER NOT NULL DEFAULT 0,
  winner_pts    INTEGER NOT NULL DEFAULT 0,
  dark_horse_pts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sync_status (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sync_at TIMESTAMPTZ,
  last_error  TEXT
);

INSERT INTO sync_status (id) VALUES (1);

CREATE TABLE standings_snapshots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_key    TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank         INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Leaderboard view
-- ============================================================

CREATE VIEW leaderboard AS
SELECT
  m.user_id,
  m.display_name,
  COALESCE(SUM(ps.points), 0)
    + COALESCE(pts.top8_pts, 0)
    + COALESCE(pts.winner_pts, 0)
    + COALESCE(pts.dark_horse_pts, 0)                        AS grand_total,
  COALESCE(SUM(ps.points), 0)                                AS match_pts,
  COALESCE(SUM(ps.points) FILTER (WHERE ma.stage = 'group'), 0) AS group_pts,
  COALESCE(SUM(ps.points) FILTER (WHERE ma.stage <> 'group'), 0) AS knockout_pts,
  COALESCE(pts.top8_pts, 0)
    + COALESCE(pts.winner_pts, 0)
    + COALESCE(pts.dark_horse_pts, 0)                        AS pretournament_pts,
  COUNT(ps.user_id) FILTER (WHERE ps.scoreline_pts = 7)      AS exact_scorelines,
  COUNT(ps.user_id) FILTER (WHERE ps.scoreline_pts >= 3)     AS correct_results
FROM members m
LEFT JOIN prediction_scores ps  ON ps.user_id  = m.user_id
LEFT JOIN matches ma             ON ma.match_no = ps.match_no
LEFT JOIN pretournament_scores pts ON pts.user_id = m.user_id
GROUP BY
  m.user_id, m.display_name,
  pts.top8_pts, pts.winner_pts, pts.dark_horse_pts;

-- ============================================================
-- Grants (Supabase sets these for tables automatically, but
-- explicit grants on the view are required)
-- ============================================================

GRANT SELECT ON leaderboard TO authenticated;
GRANT SELECT ON leaderboard TO anon;

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE members                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pretournament_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pretournament_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status              ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings_snapshots      ENABLE ROW LEVEL SECURITY;

-- ---- members ----

CREATE POLICY "members: authenticated read all"
  ON members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "members: insert own row"
  ON members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members: update own row"
  ON members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- matches ----

CREATE POLICY "matches: authenticated read all"
  ON matches FOR SELECT TO authenticated
  USING (true);

-- Owner may update matches (result override + slot resolution)
CREATE POLICY "matches: owner update"
  ON matches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND is_owner = true
    )
  );

-- ---- predictions ----

-- Own predictions readable at all times
CREATE POLICY "predictions: read own"
  ON predictions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Other members' predictions only after that match has kicked off
CREATE POLICY "predictions: read others after kickoff"
  ON predictions FOR SELECT TO authenticated
  USING (
    user_id <> auth.uid()
    AND (
      SELECT kickoff_utc FROM matches WHERE match_no = predictions.match_no
    ) <= now()
  );

-- Insert own prediction only before kickoff (server clock — INVARIANT)
CREATE POLICY "predictions: insert before kickoff"
  ON predictions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      SELECT kickoff_utc FROM matches WHERE match_no = predictions.match_no
    ) > now()
  );

-- Update own prediction only before kickoff (server clock — INVARIANT)
CREATE POLICY "predictions: update before kickoff"
  ON predictions FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      SELECT kickoff_utc FROM matches WHERE match_no = predictions.match_no
    ) > now()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      SELECT kickoff_utc FROM matches WHERE match_no = predictions.match_no
    ) > now()
  );

-- ---- pretournament_predictions ----

CREATE POLICY "pretournament: read own always"
  ON pretournament_predictions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pretournament: read others after match 1 kickoff"
  ON pretournament_predictions FOR SELECT TO authenticated
  USING (
    user_id <> auth.uid()
    AND (SELECT kickoff_utc FROM matches WHERE match_no = 1) <= now()
  );

CREATE POLICY "pretournament: insert before match 1 kickoff"
  ON pretournament_predictions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT kickoff_utc FROM matches WHERE match_no = 1) > now()
  );

CREATE POLICY "pretournament: update before match 1 kickoff"
  ON pretournament_predictions FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT kickoff_utc FROM matches WHERE match_no = 1) > now()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT kickoff_utc FROM matches WHERE match_no = 1) > now()
  );

-- ---- prediction_scores (read-only for members; service role bypasses RLS) ----

CREATE POLICY "prediction_scores: authenticated read all"
  ON prediction_scores FOR SELECT TO authenticated
  USING (true);

-- ---- pretournament_scores ----

CREATE POLICY "pretournament_scores: authenticated read all"
  ON pretournament_scores FOR SELECT TO authenticated
  USING (true);

-- ---- sync_status ----

CREATE POLICY "sync_status: authenticated read all"
  ON sync_status FOR SELECT TO authenticated
  USING (true);

-- ---- standings_snapshots ----

CREATE POLICY "standings_snapshots: authenticated read all"
  ON standings_snapshots FOR SELECT TO authenticated
  USING (true);
