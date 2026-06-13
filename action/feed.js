// Pure openfootball-feed mapping — no I/O. Imported by sync.js and covered by
// tests/feed.test.js.
//
// Matching strategy:
//  - Group matches: the feed has no match number, so we match on the (sorted)
//    team-name pair.
//  - Knockout matches: the feed carries `num`, which equals our match_no, and
//    uses the same slot codes ("2A", "1E", "3A/B/C/D/F") until the bracket
//    resolves to real team names. So we match knockout games by number and
//    fill in real teams as the feed reveals them.

import { deriveAdvancer } from '../src/lib/scoring.js'

// Team name normalization: openfootball name → our teams.json name.
export const TEAM_NAME_MAP = {
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

export function normalizeTeamName(name) {
  return TEAM_NAME_MAP[name] ?? name
}

// Parse the openfootball feed into a flat list of match records.
export function parseOpenfootballMatches(data) {
  if (!data) return []

  // The feed is flat: { name, matches: [...] }. Older/alternate shapes nest
  // matches under rounds[] or groups[]; support both defensively.
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
    const team1 = normalizeTeamName(typeof m.team1 === 'string' ? m.team1 : (m.team1?.name ?? ''))
    const team2 = normalizeTeamName(typeof m.team2 === 'string' ? m.team2 : (m.team2?.name ?? ''))

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
    // (it includes the 90-minute goals). Our model expects ET-only increments
    // (deriveAdvancer does ft + et), so subtract the ft component.
    if (et1 != null && ft1 != null) et1 = et1 - ft1
    if (et2 != null && ft2 != null) et2 = et2 - ft2

    matches.push({ num: m.num ?? null, team1, team2, ft1, ft2, et1, et2, p1, p2 })
  }
  return matches
}

// Group-stage lookup: "TeamA|TeamB" (sorted) → match_no.
export function buildMatchLookup(schedule) {
  const byTeams = new Map()
  for (const m of schedule) {
    if (m.stage === 'group') byTeams.set([m.team1, m.team2].sort().join('|'), m.match_no)
  }
  return byTeams
}

// Resolve a feed match to one of our match_no values.
export function matchNoFor(of_m, teamLookup) {
  if (of_m.num != null) return of_m.num // knockout — feed num == match_no
  return teamLookup.get([of_m.team1, of_m.team2].sort().join('|')) ?? null
}

// Fill in real team names for knockout slots ("2A" → "Mexico") as the feed
// reveals them. Only touches slots that aren't already resolved, so manual
// Admin resolution always wins. Returns an array of partial match rows.
export function resolveKnockoutSlots(ofMatches, dbByNo, knownTeams) {
  const updates = []
  for (const of_m of ofMatches) {
    if (of_m.num == null) continue // knockout only
    const db = dbByNo.get(of_m.num)
    if (!db) continue

    const upd = { match_no: of_m.num }
    let changed = false
    if (!db.team1_resolved && knownTeams.has(of_m.team1)) { upd.team1 = of_m.team1; upd.team1_resolved = true; changed = true }
    if (!db.team2_resolved && knownTeams.has(of_m.team2)) { upd.team2 = of_m.team2; upd.team2_resolved = true; changed = true }
    if (changed) updates.push(upd)
  }
  return updates
}

// Decide the result row for a feed match, or null if it shouldn't be written
// (no scores yet, manually overridden, knockout teams not resolved, or a
// knockout still without a decided advancer). Pure — the caller adds updated_at.
export function buildResultUpdate(of_m, db, knownTeams) {
  if (!db) return null
  if (db.result_source === 'manual') return null // manual override wins
  if (of_m.ft1 == null) return null              // no result yet

  let status = 'scheduled'
  let advancer = null

  if (db.stage === 'group') {
    status = 'final'
  } else {
    // Knockout: only record a result once both real teams are known, and only
    // once the tie has actually been decided (ft → ET aggregate → penalties).
    if (!knownTeams.has(of_m.team1) || !knownTeams.has(of_m.team2)) return null
    advancer = deriveAdvancer({
      ft1: of_m.ft1, ft2: of_m.ft2,
      et1: of_m.et1, et2: of_m.et2,
      p1: of_m.p1, p2: of_m.p2,
      team1: of_m.team1, team2: of_m.team2,
    })
    if (advancer) status = 'final'
  }

  if (status !== 'final') return null

  return {
    match_no: db.match_no,
    ft1: of_m.ft1, ft2: of_m.ft2,
    et1: of_m.et1 ?? null, et2: of_m.et2 ?? null,
    p1: of_m.p1 ?? null, p2: of_m.p2 ?? null,
    advancer, status,
  }
}
