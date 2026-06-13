#!/usr/bin/env node
// GitHub Action sync script.
// Fetches openfootball 2026 results, upserts to Supabase, rescores all members.
// Fully idempotent — safe to run on every cron tick.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { scoreGroupMatch, scoreKnockoutMatch, scorePretournament } from '../src/lib/scoring.js'
import { rankRows } from '../src/lib/ranking.js'
import {
  normalizeTeamName,
  parseOpenfootballMatches,
  buildMatchLookup,
  matchNoFor,
  resolveKnockoutSlots,
  buildResultUpdate,
} from './feed.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dir, '../public/data')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// openfootball 2026 raw JSON URL (try multiple mirrors)
const OPENFOOTBALL_URLS = [
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json',
  'https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json',
]

// ──────────────────────────────────────────────────────────────
// Fetch openfootball data
// ──────────────────────────────────────────────────────────────
async function fetchOpenfootball() {
  for (const url of OPENFOOTBALL_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      if (res.ok) {
        const data = await res.json()
        console.log(`Fetched openfootball from ${url}`)
        return data
      }
    } catch (e) {
      console.warn(`Failed to fetch ${url}: ${e.message}`)
    }
  }
  return null
}

// ──────────────────────────────────────────────────────────────
// Main sync loop
// ──────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Sync start', new Date().toISOString())
  let lastError = null

  try {
    // Load reference data
    const schedule = JSON.parse(readFileSync(join(dataDir, 'schedule.json'), 'utf8'))
    const teams = JSON.parse(readFileSync(join(dataDir, 'teams.json'), 'utf8'))
    // Real, known team names — used to tell a resolved knockout slot ("Mexico")
    // from an unresolved one ("2A", "3A/B/C/D/F") in the feed.
    const knownTeams = new Set(teams.map(t => normalizeTeamName(t.name)))

    // Fetch openfootball
    const ofData = await fetchOpenfootball()
    const ofMatches = parseOpenfootballMatches(ofData)
    console.log(`Parsed ${ofMatches.length} openfootball matches`)

    // Fetch current matches from Supabase (to check result_source + resolution)
    const { data: dbMatches, error: matchErr } = await supabase
      .from('matches')
      .select('match_no, result_source, ft1, ft2, status, team1, team2, team1_resolved, team2_resolved, stage, kickoff_utc')
    if (matchErr) throw matchErr

    const dbMatchMap = new Map(dbMatches.map(m => [m.match_no, m]))
    const teamLookup = buildMatchLookup(schedule)

    // Step 1: Upsert static schedule metadata. Crucially, preserve any knockout
    // team that's already resolved (by the feed or by an Admin) — otherwise this
    // would reset it back to the slot code (e.g. "2A") on every run.
    const scheduleUpserts = schedule.map(m => {
      const db = dbMatchMap.get(m.match_no)
      return {
        match_no: m.match_no,
        stage: m.stage,
        group: m.group ?? null,
        round_label: m.round_label,
        team1: db?.team1_resolved ? db.team1 : m.team1,
        team2: db?.team2_resolved ? db.team2 : m.team2,
        kickoff_utc: m.kickoff_utc,
        ground: m.ground,
      }
    })

    // Upsert static schedule data (do not overwrite result/status fields here)
    const { error: schErr } = await supabase.from('matches').upsert(scheduleUpserts, {
      onConflict: 'match_no',
      ignoreDuplicates: false,
    })
    if (schErr) throw schErr

    // Step 1.5: Resolve knockout team slots as the feed reveals real names
    // ("2A" → "Mexico"). Manual Admin resolution is never overwritten.
    const slotUpdates = resolveKnockoutSlots(ofMatches, dbMatchMap, knownTeams)
    if (slotUpdates.length > 0) {
      const { error: slotErr } = await supabase.from('matches').upsert(slotUpdates, {
        onConflict: 'match_no',
      })
      if (slotErr) throw slotErr
      console.log(`Resolved ${slotUpdates.length} knockout slot(s)`)
      // Reflect resolutions locally so the result step sees the real teams.
      for (const u of slotUpdates) Object.assign(dbMatchMap.get(u.match_no), u)
    }

    // Step 2: Apply openfootball results. Group matches match on team-pair;
    // knockout matches match on the feed's match number (== our match_no).
    const now = new Date().toISOString()
    const resultUpdates = []
    for (const of_m of ofMatches) {
      const matchNo = matchNoFor(of_m, teamLookup)
      if (matchNo == null) continue

      const update = buildResultUpdate(of_m, dbMatchMap.get(matchNo), knownTeams)
      if (update) resultUpdates.push({ ...update, updated_at: now })
    }

    if (resultUpdates.length > 0) {
      const { error: resErr } = await supabase.from('matches').upsert(resultUpdates, {
        onConflict: 'match_no',
      })
      if (resErr) throw resErr
      console.log(`Updated ${resultUpdates.length} match results`)
    }

    // Refresh db match map after updates
    const { data: updatedMatches } = await supabase
      .from('matches')
      .select('*')
    const matchMap = new Map(updatedMatches.map(m => [m.match_no, m]))

    // Step 3: Rescore all members for all final matches
    const finalMatches = updatedMatches.filter(m => m.status === 'final')
    if (finalMatches.length > 0) {
      await rescoreAllMembers(finalMatches, matchMap)
    }

    // Step 4: Snapshot standings at round boundaries
    await maybeSnapshotStandings(updatedMatches)

  } catch (err) {
    console.error('Sync error:', err)
    lastError = err.message ?? String(err)
  }

  // Step 5: Write sync_status
  await supabase.from('sync_status').upsert({
    id: 1,
    last_sync_at: new Date().toISOString(),
    last_error: lastError,
  })

  console.log('=== Sync end', new Date().toISOString())
}

// ──────────────────────────────────────────────────────────────
// Rescore all members for all final matches (idempotent)
// ──────────────────────────────────────────────────────────────
async function rescoreAllMembers(finalMatches, matchMap) {
  const { data: members } = await supabase.from('members').select('user_id')
  if (!members?.length) return

  // Fetch all predictions for final matches
  const finalMatchNos = finalMatches.map(m => m.match_no)
  const { data: preds } = await supabase
    .from('predictions')
    .select('user_id, match_no, pred1, pred2, pred_advancer')
    .in('match_no', finalMatchNos)

  const predMap = new Map()
  for (const p of (preds ?? [])) {
    predMap.set(`${p.user_id}:${p.match_no}`, p)
  }

  // Fetch pretournament predictions
  const { data: ptPreds } = await supabase
    .from('pretournament_predictions')
    .select('user_id, top8, winner, dark_horse')

  const ptPredMap = new Map((ptPreds ?? []).map(p => [p.user_id, p]))

  const scoreUpserts = []
  const ptScoreUpserts = []

  for (const member of members) {
    const uid = member.user_id

    // Per-match scores
    for (const match of finalMatches) {
      const pred = predMap.get(`${uid}:${match.match_no}`)
      let scoreline = 0, advance = 0

      if (pred) {
        if (match.stage === 'group') {
          scoreline = scoreGroupMatch(
            { g1: pred.pred1, g2: pred.pred2 },
            { g1: match.ft1, g2: match.ft2 }
          )
        } else {
          const result = scoreKnockoutMatch(
            { g1: pred.pred1, g2: pred.pred2, pred_advancer: pred.pred_advancer },
            {
              ft: { g1: match.ft1, g2: match.ft2 },
              et: match.et1 != null ? { g1: match.et1, g2: match.et2 } : undefined,
              p: match.p1 != null ? { g1: match.p1, g2: match.p2 } : undefined,
              team1: match.team1,
              team2: match.team2,
            }
          )
          scoreline = result.scoreline
          advance = result.advance
        }
      }

      scoreUpserts.push({
        user_id: uid,
        match_no: match.match_no,
        points: scoreline + advance,
        scoreline_pts: scoreline,
        advance_pts: advance,
      })
    }

    // Pre-tournament scores
    const pt = ptPredMap.get(uid)
    const ptResults = buildPretournamentResults(matchMap)
    const { top8_pts, winner_pts, dark_horse_pts } = scorePretournament(pt ?? null, ptResults)
    ptScoreUpserts.push({ user_id: uid, top8_pts, winner_pts, dark_horse_pts })
  }

  if (scoreUpserts.length) {
    const { error } = await supabase.from('prediction_scores').upsert(scoreUpserts, {
      onConflict: 'user_id,match_no',
    })
    if (error) throw error
    console.log(`Upserted ${scoreUpserts.length} prediction scores`)
  }

  if (ptScoreUpserts.length) {
    const { error } = await supabase.from('pretournament_scores').upsert(ptScoreUpserts, {
      onConflict: 'user_id',
    })
    if (error) throw error
    console.log(`Upserted ${ptScoreUpserts.length} pretournament scores`)
  }
}

// ──────────────────────────────────────────────────────────────
// Build pre-tournament results from match data
// ──────────────────────────────────────────────────────────────
function buildPretournamentResults(matchMap) {
  const allMatches = [...matchMap.values()]

  // Quarter-finalists: teams playing QF matches (if both teams are resolved)
  const qfMatches = allMatches.filter(m => m.stage === 'Quarter-final')
  const quarterFinalists = []
  for (const m of qfMatches) {
    if (m.team1_resolved && m.team1) quarterFinalists.push(m.team1)
    if (m.team2_resolved && m.team2) quarterFinalists.push(m.team2)
  }

  // Semi-finalists: teams playing SF matches (if both teams are resolved)
  const sfMatches = allMatches.filter(m => m.stage === 'Semi-final')
  const semiFinalists = []
  for (const m of sfMatches) {
    if (m.team1_resolved && m.team1) semiFinalists.push(m.team1)
    if (m.team2_resolved && m.team2) semiFinalists.push(m.team2)
  }

  // Tournament winner + runner-up: from the Final (match 104)
  const finalMatch = matchMap.get(104)
  let tournamentWinner = null
  let runnerUp = null
  if (finalMatch?.status === 'final' && finalMatch.advancer) {
    tournamentWinner = finalMatch.advancer
    runnerUp = finalMatch.advancer === finalMatch.team1 ? finalMatch.team2 : finalMatch.team1
  }

  // Round of 16+ teams: teams in matches from R16 onward that are resolved
  const r16Stages = new Set(['Round of 16', 'Quarter-final', 'Semi-final', 'Third place', 'Final'])
  const roundOf16Teams = []
  for (const m of allMatches) {
    if (r16Stages.has(m.stage)) {
      if (m.team1_resolved && m.team1) roundOf16Teams.push(m.team1)
      if (m.team2_resolved && m.team2) roundOf16Teams.push(m.team2)
    }
  }

  return { quarterFinalists, semiFinalists, tournamentWinner, runnerUp, roundOf16Teams }
}

// ──────────────────────────────────────────────────────────────
// Snapshot standings at round boundaries
// ──────────────────────────────────────────────────────────────
async function maybeSnapshotStandings(allMatches) {
  // Define round boundaries — snapshot after every matchday/knockout round completes
  const rounds = new Map()
  for (const m of allMatches) {
    if (!rounds.has(m.round_label)) rounds.set(m.round_label, [])
    rounds.get(m.round_label).push(m)
  }

  for (const [roundKey, matches] of rounds) {
    const allFinal = matches.every(m => m.status === 'final')
    if (!allFinal) continue

    // Check if we already have a snapshot for this round
    const { data: existing } = await supabase
      .from('standings_snapshots')
      .select('id')
      .eq('round_key', roundKey)
      .limit(1)

    if (existing?.length) continue  // already snapshotted

    // Take snapshot — rank with the same logic as the live board (lib/ranking.js),
    // including tiebreakers and shared ranks for true ties.
    const { data: leaderboard } = await supabase
      .from('leaderboard')
      .select('user_id, grand_total, correct_results, exact_scorelines')
    if (!leaderboard?.length) continue

    const snapshots = rankRows(leaderboard).map((row) => ({
      round_key: roundKey,
      user_id: row.user_id,
      rank: row.rank,
      total_points: row.grand_total,
    }))

    await supabase.from('standings_snapshots').insert(snapshots)
    console.log(`Snapshotted standings for round: ${roundKey}`)
  }
}

main()
