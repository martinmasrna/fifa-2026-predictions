// Pure scoring module — no I/O, no side effects.
// Used by both the Vue frontend (via import) and the GitHub Action.

// Single source of truth for every point value. The scoring functions below
// and the "How scoring works" modal (ScoringInfoModal.vue) both read from here,
// so the rules and the explanation can never drift apart.
export const POINTS = {
  // Match scoreline (group stage, and the 90-min component of a knockout).
  scoreline: {
    exact: 7,            // exact scoreline
    resultAndGD: 5,      // right result + right goal difference
    resultAndOneTeam: 4, // right result + one team's goals exact
    result: 3,           // right result only (W/D/L)
    oneTeam: 1,          // one team's goals exact, wrong result
  },
  // Knockout bonus for correctly picking who advances.
  knockoutAdvance: 3,
  // Pre-tournament picks.
  pretournament: {
    quarterFinalist: 15, // per Top-8 pick that reaches the quarter-finals
    champion: 25,        // correct tournament winner
  },
  // Dark horse — scored on how far the picked team runs.
  darkHorse: {
    champion: 50,
    runnerUp: 30,
    semiFinal: 20,
    quarterFinal: 10,
    roundOf16: 5,
  },
}

/**
 * @param {number} g1
 * @param {number} g2
 * @returns {'W'|'D'|'L'}
 */
export function getResult(g1, g2) {
  if (g1 > g2) return 'W'
  if (g1 < g2) return 'L'
  return 'D'
}

/**
 * Score a group-stage match (or the 90-minute component of a knockout match).
 * @param {{ g1: number, g2: number } | null} prediction
 * @param {{ g1: number, g2: number } | null} reality  ft scores only
 * @returns {number} 0–7
 */
export function scoreGroupMatch(prediction, reality) {
  if (!prediction || prediction.g1 == null || prediction.g2 == null) return 0
  if (!reality || reality.g1 == null || reality.g2 == null) return 0

  const pg1 = prediction.g1, pg2 = prediction.g2
  const ag1 = reality.g1, ag2 = reality.g2

  if (pg1 === ag1 && pg2 === ag2) return POINTS.scoreline.exact

  const correctResult = getResult(pg1, pg2) === getResult(ag1, ag2)
  const correctGD = (pg1 - pg2) === (ag1 - ag2)
  const oneTeamRight = pg1 === ag1 || pg2 === ag2

  if (correctResult) {
    if (correctGD) return POINTS.scoreline.resultAndGD  // also covers draws catching draws
    if (oneTeamRight) return POINTS.scoreline.resultAndOneTeam
    return POINTS.scoreline.result
  }

  if (oneTeamRight) return POINTS.scoreline.oneTeam
  return 0
}

/**
 * Derive the actual advancer from a completed knockout result.
 * Priority: penalties → extra-time aggregate → 90-min result.
 *
 * et1/et2 are ADDITIONAL goals scored in ET only (not including ft goals).
 *
 * @param {{ ft1: number, ft2: number, et1?: number, et2?: number, p1?: number, p2?: number, team1: string, team2: string }} result
 * @returns {string|null}  team name, or null if indeterminate
 */
export function deriveAdvancer({ ft1, ft2, et1, et2, p1, p2, team1, team2 }) {
  if (p1 != null && p2 != null && p1 !== p2) {
    return p1 > p2 ? team1 : team2
  }
  if (et1 != null && et2 != null) {
    const agg1 = ft1 + et1
    const agg2 = ft2 + et2
    if (agg1 !== agg2) return agg1 > agg2 ? team1 : team2
  }
  if (ft1 !== ft2) return ft1 > ft2 ? team1 : team2
  return null
}

/**
 * Score a knockout match (scoreline component + advancer component).
 *
 * @param {{ g1: number, g2: number, pred_advancer?: string } | null} prediction
 * @param {{ ft: { g1: number, g2: number }, et?: { g1: number, g2: number }, p?: { g1: number, g2: number }, team1: string, team2: string }} reality
 * @returns {{ scoreline: number, advance: number, total: number }}
 */
export function scoreKnockoutMatch(prediction, reality) {
  if (!prediction || prediction.g1 == null || prediction.g2 == null) {
    return { scoreline: 0, advance: 0, total: 0 }
  }

  const scoreline = scoreGroupMatch(prediction, { g1: reality.ft.g1, g2: reality.ft.g2 })

  // Determine predicted advancer
  let predictedAdvancer
  if (prediction.g1 > prediction.g2) {
    predictedAdvancer = reality.team1
  } else if (prediction.g1 < prediction.g2) {
    predictedAdvancer = reality.team2
  } else {
    predictedAdvancer = prediction.pred_advancer ?? null
  }

  const actualAdvancer = deriveAdvancer({
    ft1: reality.ft.g1,
    ft2: reality.ft.g2,
    et1: reality.et?.g1,
    et2: reality.et?.g2,
    p1: reality.p?.g1,
    p2: reality.p?.g2,
    team1: reality.team1,
    team2: reality.team2,
  })

  const advance = (predictedAdvancer && actualAdvancer && predictedAdvancer === actualAdvancer) ? POINTS.knockoutAdvance : 0
  return { scoreline, advance, total: scoreline + advance }
}

/**
 * Score the three pre-tournament predictions.
 *
 * The dark horse pick is scored purely on how far that team advances —
 * not on which team was picked — rewarding a genuine Cinderella run
 * (Round of 16: 5, Quarter-final: 10, Semi-final: 20, Runner-up: 30, Champion: 50).
 *
 * @param {{ top8: string[], winner: string, dark_horse: string } | null} prediction
 * @param {{
 *   quarterFinalists: string[],
 *   semiFinalists: string[],
 *   tournamentWinner: string | null,
 *   runnerUp: string | null,
 *   roundOf16Teams: string[],
 * }} reality
 * @returns {{ top8_pts: number, winner_pts: number, dark_horse_pts: number }}
 */
export function scorePretournament(prediction, reality) {
  if (!prediction) return { top8_pts: 0, winner_pts: 0, dark_horse_pts: 0 }

  let top8_pts = 0
  let winner_pts = 0
  let dark_horse_pts = 0

  if (prediction.top8?.length && reality.quarterFinalists?.length) {
    const predicted = new Set(prediction.top8)
    for (const team of reality.quarterFinalists) {
      if (predicted.has(team)) top8_pts += POINTS.pretournament.quarterFinalist
    }
  }

  if (prediction.winner && reality.tournamentWinner) {
    if (prediction.winner === reality.tournamentWinner) winner_pts = POINTS.pretournament.champion
  }

  const dh = prediction.dark_horse
  if (dh) {
    if (reality.tournamentWinner === dh) dark_horse_pts = POINTS.darkHorse.champion
    else if (reality.runnerUp === dh) dark_horse_pts = POINTS.darkHorse.runnerUp
    else if (reality.semiFinalists?.includes(dh)) dark_horse_pts = POINTS.darkHorse.semiFinal
    else if (reality.quarterFinalists?.includes(dh)) dark_horse_pts = POINTS.darkHorse.quarterFinal
    else if (reality.roundOf16Teams?.includes(dh)) dark_horse_pts = POINTS.darkHorse.roundOf16
  }

  return { top8_pts, winner_pts, dark_horse_pts }
}
