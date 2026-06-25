import { describe, it, expect } from 'vitest'
import {
  getResult,
  scoreGroupMatch,
  deriveAdvancer,
  scoreKnockoutMatch,
  scorePretournament,
  darkHorsePoints,
  buildPretournamentResults,
} from '../src/lib/scoring.js'

describe('buildPretournamentResults', () => {
  const m = (stage, team1, team2, extra = {}) => ({
    stage, team1, team2, team1_resolved: true, team2_resolved: true, status: 'scheduled', ...extra,
  })

  it('collects resolved participants per stage and the final result', () => {
    const matches = [
      m('Quarter-final', 'Brazil', 'France'),
      m('Quarter-final', 'Spain', 'Argentina'),
      m('Semi-final', 'Brazil', 'Spain'),
      m('Final', 'Brazil', 'Spain', { status: 'final', advancer: 'Brazil' }),
    ]
    const r = buildPretournamentResults(matches)
    expect(r.quarterFinalists.sort()).toEqual(['Argentina', 'Brazil', 'France', 'Spain'])
    expect(r.semiFinalists.sort()).toEqual(['Brazil', 'Spain'])
    expect(r.tournamentWinner).toBe('Brazil')
    expect(r.runnerUp).toBe('Spain')
  })

  it('ignores unresolved slots and an unfinished final', () => {
    const matches = [
      m('Quarter-final', 'Brazil', '1B', { team2_resolved: false }),
      m('Final', 'Brazil', 'Spain'), // not final yet
    ]
    const r = buildPretournamentResults(matches)
    expect(r.quarterFinalists).toEqual(['Brazil'])
    expect(r.tournamentWinner).toBe(null)
    expect(r.runnerUp).toBe(null)
  })
})

// ──────────────────────────────────────────────────────────────
// getResult
// ──────────────────────────────────────────────────────────────
describe('getResult', () => {
  it('returns W when g1 > g2', () => expect(getResult(2, 0)).toBe('W'))
  it('returns L when g1 < g2', () => expect(getResult(0, 3)).toBe('L'))
  it('returns D when equal', () => expect(getResult(1, 1)).toBe('D'))
})

// ──────────────────────────────────────────────────────────────
// scoreGroupMatch
// ──────────────────────────────────────────────────────────────
describe('scoreGroupMatch', () => {
  it('exact score → 7', () => {
    expect(scoreGroupMatch({ g1: 2, g2: 1 }, { g1: 2, g2: 1 })).toBe(7)
    expect(scoreGroupMatch({ g1: 0, g2: 0 }, { g1: 0, g2: 0 })).toBe(7)
    expect(scoreGroupMatch({ g1: 3, g2: 0 }, { g1: 3, g2: 0 })).toBe(7)
    expect(scoreGroupMatch({ g1: 2, g2: 2 }, { g1: 2, g2: 2 })).toBe(7)
  })

  it('correct result + correct GD → 5  (predict 2-1, actual 3-2)', () => {
    expect(scoreGroupMatch({ g1: 2, g2: 1 }, { g1: 3, g2: 2 })).toBe(5)
  })

  it('correct result + correct GD → 5  (predict 1-0, actual 2-1)', () => {
    expect(scoreGroupMatch({ g1: 1, g2: 0 }, { g1: 2, g2: 1 })).toBe(5)
  })

  it('correct result + one team right → 4  (predict 2-1, actual 2-0)', () => {
    expect(scoreGroupMatch({ g1: 2, g2: 1 }, { g1: 2, g2: 0 })).toBe(4)
  })

  it('correct result + one team right → 4  (predict 1-3, actual 0-3)', () => {
    expect(scoreGroupMatch({ g1: 1, g2: 3 }, { g1: 0, g2: 3 })).toBe(4)
  })

  it('correct result only → 3  (predict 3-0, actual 4-2)', () => {
    // GD: 3 vs 2 — different. Neither team's goals match (3≠4, 0≠2).
    expect(scoreGroupMatch({ g1: 3, g2: 0 }, { g1: 4, g2: 2 })).toBe(3)
  })

  it('correct result only → 3  (predict 2-0, actual 4-1)', () => {
    // GD: 2 vs 3 — different. Neither team's goals match (2≠4, 0≠1).
    expect(scoreGroupMatch({ g1: 2, g2: 0 }, { g1: 4, g2: 1 })).toBe(3)
  })

  it('wrong result + one team right → 1  (predict 2-1, actual 0-1)', () => {
    expect(scoreGroupMatch({ g1: 2, g2: 1 }, { g1: 0, g2: 1 })).toBe(1)
  })

  it('wrong result + one team right → 1  (predict 1-0, actual 1-2)', () => {
    expect(scoreGroupMatch({ g1: 1, g2: 0 }, { g1: 1, g2: 2 })).toBe(1)
  })

  it('completely wrong → 0', () => {
    expect(scoreGroupMatch({ g1: 2, g2: 1 }, { g1: 0, g2: 3 })).toBe(0)
    expect(scoreGroupMatch({ g1: 1, g2: 0 }, { g1: 0, g2: 2 })).toBe(0)
    expect(scoreGroupMatch({ g1: 1, g2: 1 }, { g1: 3, g2: 2 })).toBe(0)
  })

  it('missing prediction → 0', () => {
    expect(scoreGroupMatch(null, { g1: 2, g2: 1 })).toBe(0)
    expect(scoreGroupMatch({ g1: null, g2: 1 }, { g1: 2, g2: 1 })).toBe(0)
  })

  it('draw prediction catching draw → minimum 5 (correct result + correct GD always)', () => {
    // GD for any draw is always 0 = 0
    expect(scoreGroupMatch({ g1: 1, g2: 1 }, { g1: 2, g2: 2 })).toBe(5)
    expect(scoreGroupMatch({ g1: 0, g2: 0 }, { g1: 1, g2: 1 })).toBe(5)
    expect(scoreGroupMatch({ g1: 2, g2: 2 }, { g1: 3, g2: 3 })).toBe(5)
  })

  it('draw prediction + correct team goals but wrong result → 1', () => {
    expect(scoreGroupMatch({ g1: 1, g2: 1 }, { g1: 1, g2: 3 })).toBe(1)
    expect(scoreGroupMatch({ g1: 1, g2: 1 }, { g1: 1, g2: 2 })).toBe(1)
    expect(scoreGroupMatch({ g1: 0, g2: 0 }, { g1: 2, g2: 0 })).toBe(1) 
  })
})

// ──────────────────────────────────────────────────────────────
// deriveAdvancer
// ──────────────────────────────────────────────────────────────
describe('deriveAdvancer', () => {
  const t1 = 'France', t2 = 'Brazil'

  it('uses penalties when p present', () => {
    expect(deriveAdvancer({ ft1: 1, ft2: 1, et1: 0, et2: 0, p1: 4, p2: 3, team1: t1, team2: t2 })).toBe(t1)
    expect(deriveAdvancer({ ft1: 0, ft2: 0, et1: 0, et2: 0, p1: 2, p2: 4, team1: t1, team2: t2 })).toBe(t2)
  })

  it('uses ET aggregate when et present and no p', () => {
    // ft 1-1, et 1-0 (agg 2-1)
    expect(deriveAdvancer({ ft1: 1, ft2: 1, et1: 1, et2: 0, team1: t1, team2: t2 })).toBe(t1)
    // ft 0-0, et 0-1 (agg 0-1)
    expect(deriveAdvancer({ ft1: 0, ft2: 0, et1: 0, et2: 1, team1: t1, team2: t2 })).toBe(t2)
  })

  it('uses ft when no et or p', () => {
    expect(deriveAdvancer({ ft1: 2, ft2: 0, team1: t1, team2: t2 })).toBe(t1)
    expect(deriveAdvancer({ ft1: 0, ft2: 1, team1: t1, team2: t2 })).toBe(t2)
  })
})

// ──────────────────────────────────────────────────────────────
// scoreKnockoutMatch
// ──────────────────────────────────────────────────────────────
describe('scoreKnockoutMatch', () => {
  const t1 = 'Germany', t2 = 'Spain'
  const makeActual = (ft, et, p) => ({ ft, et, p, team1: t1, team2: t2 })

  it('exact ft score + correct advancer → 10', () => {
    const pred = { g1: 2, g2: 1 }
    const actual = makeActual({ g1: 2, g2: 1 })
    expect(scoreKnockoutMatch(pred, actual)).toEqual({ scoreline: 7, advance: 3, total: 10 })
  })

  it('correct ft result + advancer auto from decisive score → advance pts', () => {
    const pred = { g1: 1, g2: 0 }
    const actual = makeActual({ g1: 2, g2: 0 })
    // scoreline: correct result, one team right → 4; advancer auto = Germany = Germany → +3
    expect(scoreKnockoutMatch(pred, actual)).toEqual({ scoreline: 4, advance: 3, total: 7 })
  })

  it('draw prediction with correct explicit advancer → advance pts', () => {
    const pred = { g1: 1, g2: 1, pred_advancer: t2 }
    // actual: ft 1-1 → penalties, Spain wins
    const actual = makeActual({ g1: 1, g2: 1 }, { g1: 0, g2: 0 }, { g1: 3, g2: 5 })
    // scoreline: exact ft → 7; advance: pred t2, actual t2 → +3
    expect(scoreKnockoutMatch(pred, actual)).toEqual({ scoreline: 7, advance: 3, total: 10 })
  })

  it('draw prediction with wrong explicit advancer → 0 advance', () => {
    const pred = { g1: 1, g2: 1, pred_advancer: t1 }
    const actual = makeActual({ g1: 1, g2: 1 }, { g1: 0, g2: 0 }, { g1: 3, g2: 5 })
    expect(scoreKnockoutMatch(pred, actual)).toEqual({ scoreline: 7, advance: 0, total: 7 })
  })

  it('wrong ft result → wrong advancer (auto), scoreline 0, advance 0', () => {
    const pred = { g1: 2, g2: 0 }  // predicted Germany wins
    const actual = makeActual({ g1: 0, g2: 1 })  // Spain wins
    expect(scoreKnockoutMatch(pred, actual)).toEqual({ scoreline: 0, advance: 0, total: 0 })
  })

  it('no prediction → all zeros', () => {
    expect(scoreKnockoutMatch(null, makeActual({ g1: 1, g2: 0 }))).toEqual({ scoreline: 0, advance: 0, total: 0 })
  })

  it('correct result only + correct advancer (from decisive pred score) → 3 + 3 = 6', () => {
    const pred = { g1: 3, g2: 1 }
    const actual = makeActual({ g1: 1, g2: 0 })
    // scoreline: correct result only → 3; advancer: both Germany → +3
    expect(scoreKnockoutMatch(pred, actual)).toEqual({ scoreline: 3, advance: 3, total: 6 })
  })
})

// ──────────────────────────────────────────────────────────────
// scorePretournament
// ──────────────────────────────────────────────────────────────
describe('scorePretournament', () => {
  it('2 correct top8 → 30 pts', () => {
    const pred = { top8: ['France', 'Brazil', 'Germany', 'Spain', 'England', 'Portugal', 'Argentina', 'Netherlands'] }
    const results = {
      quarterFinalists: ['France', 'Brazil', 'Italy', 'Belgium', 'Croatia', 'Morocco', 'Sweden', 'Denmark'],
      roundOf16Teams: [],
    }
    const r = scorePretournament(pred, results)
    expect(r.top8_pts).toBe(30)  // France + Brazil
  })

  it('correct winner → 25 pts', () => {
    const pred = { winner: 'France' }
    const results = { tournamentWinner: 'France', roundOf16Teams: [] }
    expect(scorePretournament(pred, results).winner_pts).toBe(25)
  })

  it('wrong winner → 0', () => {
    const pred = { winner: 'Brazil' }
    const results = { tournamentWinner: 'France', roundOf16Teams: [] }
    expect(scorePretournament(pred, results).winner_pts).toBe(0)
  })

  // Dark horse: scored on the furthest stage the picked team reaches —
  // Round of 16: 5, Quarter-final: 10, Semi-final: 20, Runner-up: 30, Champion: 50
  it('dark horse becomes champion → 50 pts', () => {
    const pred = { dark_horse: 'Norway' }
    const results = {
      tournamentWinner: 'Norway', runnerUp: 'Brazil',
      semiFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      quarterFinalists: ['Norway', 'Brazil', 'France', 'Italy', 'Spain', 'Germany', 'Croatia', 'Japan'],
      roundOf16Teams: ['Norway', 'Brazil', 'France', 'Italy', 'Spain', 'Germany', 'Croatia', 'Japan'],
    }
    expect(scorePretournament(pred, results).dark_horse_pts).toBe(50)
  })

  it('dark horse becomes runner-up → 30 pts', () => {
    const pred = { dark_horse: 'Brazil' }
    const results = {
      tournamentWinner: 'Norway', runnerUp: 'Brazil',
      semiFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      quarterFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      roundOf16Teams: ['Norway', 'Brazil', 'France', 'Italy'],
    }
    expect(scorePretournament(pred, results).dark_horse_pts).toBe(30)
  })

  it('dark horse reaches semi-final (no further) → 20 pts', () => {
    const pred = { dark_horse: 'Italy' }
    const results = {
      tournamentWinner: 'Norway', runnerUp: 'Brazil',
      semiFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      quarterFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      roundOf16Teams: ['Norway', 'Brazil', 'France', 'Italy'],
    }
    expect(scorePretournament(pred, results).dark_horse_pts).toBe(20)
  })

  it('dark horse reaches quarter-final (no further) → 10 pts', () => {
    const pred = { dark_horse: 'Croatia' }
    const results = {
      tournamentWinner: 'Norway', runnerUp: 'Brazil',
      semiFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      quarterFinalists: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Japan', 'Spain', 'Germany'],
      roundOf16Teams: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Japan', 'Spain', 'Germany'],
    }
    expect(scorePretournament(pred, results).dark_horse_pts).toBe(10)
  })

  it('dark horse reaches round of 16 (no further) → 5 pts', () => {
    const pred = { dark_horse: 'Japan' }
    const results = {
      tournamentWinner: 'Norway', runnerUp: 'Brazil',
      semiFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      quarterFinalists: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Spain', 'Germany', 'Mexico'],
      roundOf16Teams: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Spain', 'Germany', 'Mexico', 'Japan', 'Egypt', 'USA', 'Uruguay', 'Morocco', 'Belgium', 'Portugal', 'Argentina'],
    }
    expect(scorePretournament(pred, results).dark_horse_pts).toBe(5)
  })

  it('dark horse eliminated in group stage → 0 pts', () => {
    const pred = { dark_horse: 'Mexico' }
    const results = {
      tournamentWinner: 'Norway', runnerUp: 'Brazil',
      semiFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
      quarterFinalists: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Spain', 'Germany', 'Japan'],
      roundOf16Teams: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Spain', 'Germany', 'Japan'],
    }
    expect(scorePretournament(pred, results).dark_horse_pts).toBe(0)
  })

  it('null pred → all zeros', () => {
    expect(scorePretournament(null, {})).toEqual({ top8_pts: 0, winner_pts: 0, dark_horse_pts: 0 })
  })
})

describe('darkHorsePoints', () => {
  const reality = {
    tournamentWinner: 'Norway', runnerUp: 'Brazil',
    semiFinalists: ['Norway', 'Brazil', 'France', 'Italy'],
    quarterFinalists: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Spain', 'Germany', 'Japan'],
    roundOf16Teams: ['Norway', 'Brazil', 'France', 'Italy', 'Croatia', 'Spain', 'Germany', 'Japan', 'Egypt'],
  }
  it('champion → 50', () => expect(darkHorsePoints('Norway', reality)).toBe(50))
  it('runner-up → 30', () => expect(darkHorsePoints('Brazil', reality)).toBe(30))
  it('semi-finalist (no further) → 20', () => expect(darkHorsePoints('Italy', reality)).toBe(20))
  it('quarter-finalist (no further) → 10', () => expect(darkHorsePoints('Croatia', reality)).toBe(10))
  it('round of 16 (no further) → 5', () => expect(darkHorsePoints('Egypt', reality)).toBe(5))
  it('not reached / eliminated early → 0', () => expect(darkHorsePoints('Mexico', reality)).toBe(0))
  it('no team → 0', () => expect(darkHorsePoints(null, reality)).toBe(0))
})
