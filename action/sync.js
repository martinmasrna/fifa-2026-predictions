#!/usr/bin/env node
// GitHub Action sync script.
// Fetches openfootball 2026 results, upserts to Supabase, rescores all members.
// Fully idempotent — safe to run on every cron tick.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { scoreGroupMatch, scoreKnockoutMatch, scorePretournament, deriveAdvancer } from '../src/lib/scoring.js'
import { rankRows } from '../src/lib/ranking.js'

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

// Team name normalization: openfootball name → our teams.json name
const TEAM_NAME_MAP = {
  "Côte d'Ivoire": 'Ivory Coast',
  "Cote d'Ivoire": 'Ivory Coast',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Cabo Verde': 'Cape Verde',
  'Congo DR': 'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'DR Congo': 'DR Congo',
  'Curacao': 'Curaçao',
  'United States': 'USA',
  'United States of America': 'USA',
  'IR Iran': 'Iran',
}

function normalizeTeamName(name) {
  return TEAM_NAME_MAP[name] ?? name
}

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
// Parse openfootball matches into a flat list
// ──────────────────────────────────────────────────────────────
function parseOpenfootballMatches(data) {
  if (!data) return []

  // The openfootball feed is flat: { name, matches: [...] }. Older/alternate
  // shapes nest matches under rounds[] or groups[]; support both defensively.
  let rawMatches
  if (Array.isArray(data.matches)) {
    rawMatches = data.matches
  } else {
    rawMatches = []
    for (const round of (data.rounds ?? data.groups ?? [])) {
      for (const m of (round.matches ?? [])) rawMatches.push(m)
    }
  }

  const matches = []
  for (const m of rawMatches) {
    const team1 = normalizeTeamName(
      typeof m.team1 === 'string' ? m.team1 : (m.team1?.name ?? '')
    )
    const team2 = normalizeTeamName(
      typeof m.team2 === 'string' ? m.team2 : (m.team2?.name ?? '')
    )

    // Parse scores — openfootball uses score.ft, score.et, score.p arrays
    // or flat score1/score2 fields
    let ft1 = null, ft2 = null
    let et1 = null, et2 = null
    let p1 = null, p2 = null

    if (m.score) {
      if (Array.isArray(m.score.ft)) [ft1, ft2] = m.score.ft
      if (Array.isArray(m.score.et)) [et1, et2] = m.score.et
      if (Array.isArray(m.score.p))  [p1, p2] = m.score.p
    } else {
      if (m.score1 != null) { ft1 = m.score1; ft2 = m.score2 }
      if (m.score1et != null) { et1 = m.score1et; et2 = m.score2et }
      if (m.score1p != null) { p1 = m.score1p; p2 = m.score2p }
    }

    // openfootball's score.et is the CUMULATIVE score at the end of extra time
    // (it includes the 90-minute goals). Our scoring model expects ET-only
    // increments (deriveAdvancer does ft + et), so subtract the ft component.
    if (et1 != null && ft1 != null) et1 = et1 - ft1
    if (et2 != null && ft2 != null) et2 = et2 - ft2

    matches.push({ team1, team2, ft1, ft2, et1, et2, p1, p2 })
  }
  return matches
}

// ──────────────────────────────────────────────────────────────
// Match openfootball entry to our schedule by team names + approx date
// ──────────────────────────────────────────────────────────────
function buildMatchLookup(schedule) {
  // key: "TeamA|TeamB" (sorted) → match_no
  const byTeams = new Map()
  for (const m of schedule) {
    if (m.stage === 'group') {
      const key = [m.team1, m.team2].sort().join('|')
      byTeams.set(key, m.match_no)
    }
  }
  return byTeams
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

    // Fetch openfootball
    const ofData = await fetchOpenfootball()
    const ofMatches = parseOpenfootballMatches(ofData)
    console.log(`Parsed ${ofMatches.length} openfootball matches`)

    // Fetch current matches from Supabase (to check result_source)
    const { data: dbMatches, error: matchErr } = await supabase
      .from('matches')
      .select('match_no, result_source, ft1, ft2, status, team1, team2, stage, kickoff_utc')
    if (matchErr) throw matchErr

    const dbMatchMap = new Map(dbMatches.map(m => [m.match_no, m]))
    const teamLookup = buildMatchLookup(schedule)

    // Step 1: Upsert schedule from our local schedule.json (initial load / knockout slot updates)
    // For group matches we know the teams upfront. For knockout we update as feed resolves them.
    const scheduleUpserts = schedule.map(m => ({
      match_no: m.match_no,
      stage: m.stage,
      group: m.group ?? null,
      round_label: m.round_label,
      team1: m.team1,
      team2: m.team2,
      kickoff_utc: m.kickoff_utc,
      ground: m.ground,
    }))

    // Upsert static schedule data (do not overwrite result/status fields here)
    const { error: schErr } = await supabase.from('matches').upsert(scheduleUpserts, {
      onConflict: 'match_no',
      ignoreDuplicates: false,
    })
    if (schErr) throw schErr

    // Step 2: Apply openfootball results
    const resultUpdates = []
    for (const of_m of ofMatches) {
      const key = [of_m.team1, of_m.team2].sort().join('|')
      const matchNo = teamLookup.get(key)
      if (!matchNo) continue  // knockout or unmatched — skip for now

      const db = dbMatchMap.get(matchNo)
      if (!db) continue

      // Skip if manually overridden
      if (db.result_source === 'manual') continue

      // Only update if scores are present
      if (of_m.ft1 == null) continue

      const isGroupMatch = db.stage === 'group'
      const isKnockout = !isGroupMatch

      // Determine status and advancer
      let status = 'scheduled'
      let advancer = null

      if (of_m.ft1 != null) {
        const ftDecisive = of_m.ft1 !== of_m.ft2
        if (isGroupMatch) {
          status = 'final'
        } else if (isKnockout) {
          if (ftDecisive) {
            status = 'final'
            advancer = of_m.ft1 > of_m.ft2 ? db.team1 : db.team2
          } else if (of_m.et1 != null) {
            const agg1 = of_m.ft1 + of_m.et1
            const agg2 = of_m.ft2 + of_m.et2
            if (agg1 !== agg2) {
              status = 'final'
              advancer = agg1 > agg2 ? db.team1 : db.team2
            } else if (of_m.p1 != null) {
              status = 'final'
              advancer = of_m.p1 > of_m.p2 ? db.team1 : db.team2
            }
          } else if (of_m.p1 != null) {
            status = 'final'
            advancer = of_m.p1 > of_m.p2 ? db.team1 : db.team2
          }
        }
      }

      if (status !== 'final') continue  // not yet complete

      resultUpdates.push({
        match_no: matchNo,
        ft1: of_m.ft1,
        ft2: of_m.ft2,
        et1: of_m.et1 ?? null,
        et2: of_m.et2 ?? null,
        p1: of_m.p1 ?? null,
        p2: of_m.p2 ?? null,
        advancer,
        status,
        updated_at: new Date().toISOString(),
      })
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
