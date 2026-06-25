import { describe, it, expect } from 'vitest'
import {
  parseOpenfootballMatches,
  buildMatchLookup,
  matchNoFor,
  resolveKnockoutSlots,
  propagateBracket,
  buildResultUpdate,
} from '../action/feed.js'

const knownTeams = new Set(['Mexico', 'Brazil', 'Spain', 'Croatia', 'South Africa'])

describe('parseOpenfootballMatches', () => {
  it('keeps the feed num for knockout matches and null for group matches', () => {
    const out = parseOpenfootballMatches({
      matches: [
        { team1: 'Mexico', team2: 'South Africa', group: 'Group A', score: { ft: [2, 0] } },
        { num: 73, team1: '2A', team2: '2B' },
      ],
    })
    expect(out[0].num).toBe(null)
    expect(out[0].ft1).toBe(2)
    expect(out[1].num).toBe(73)
  })

  it('converts cumulative score.et into ET-only increments', () => {
    // Real openfootball convention: ft 1-1, et 2-1 means one ET goal for team1.
    const [m] = parseOpenfootballMatches({
      matches: [{ num: 90, team1: 'Brazil', team2: 'Croatia', score: { ft: [1, 1], et: [2, 1] } }],
    })
    expect(m.et1).toBe(1) // 2 - 1
    expect(m.et2).toBe(0) // 1 - 1
  })
})

describe('matchNoFor', () => {
  const lookup = buildMatchLookup([
    { stage: 'group', team1: 'Mexico', team2: 'South Africa', match_no: 1 },
  ])

  it('matches group games by team pair (order-independent)', () => {
    expect(matchNoFor({ num: null, team1: 'South Africa', team2: 'Mexico' }, lookup)).toBe(1)
  })

  it('matches knockout games by feed num', () => {
    expect(matchNoFor({ num: 73, team1: '2A', team2: '2B' }, lookup)).toBe(73)
  })

  it('returns null when nothing matches', () => {
    expect(matchNoFor({ num: null, team1: 'Spain', team2: 'Brazil' }, lookup)).toBe(null)
  })
})

describe('resolveKnockoutSlots', () => {
  it('fills unresolved slots once the feed has real team names', () => {
    const dbByNo = new Map([[73, { match_no: 73, team1: '2A', team2: '2B', team1_resolved: false, team2_resolved: false }]])
    const updates = resolveKnockoutSlots([{ num: 73, team1: 'Mexico', team2: 'Brazil' }], dbByNo, knownTeams)
    expect(updates).toEqual([{ match_no: 73, team1: 'Mexico', team1_resolved: true, team2: 'Brazil', team2_resolved: true }])
  })

  it('ignores slot codes that are not yet real teams', () => {
    const dbByNo = new Map([[74, { match_no: 74, team1: '1E', team2: '3A/B/C/D/F', team1_resolved: false, team2_resolved: false }]])
    expect(resolveKnockoutSlots([{ num: 74, team1: '1E', team2: '3A/B/C/D/F' }], dbByNo, knownTeams)).toEqual([])
  })

  it('never overwrites an already-resolved (e.g. Admin-set) slot', () => {
    const dbByNo = new Map([[73, { match_no: 73, team1: 'Spain', team2: '2B', team1_resolved: true, team2_resolved: false }]])
    const updates = resolveKnockoutSlots([{ num: 73, team1: 'Mexico', team2: 'Brazil' }], dbByNo, knownTeams)
    expect(updates).toEqual([{ match_no: 73, team2: 'Brazil', team2_resolved: true }])
  })

  it('skips group matches (no num)', () => {
    expect(resolveKnockoutSlots([{ num: null, team1: 'Mexico', team2: 'Brazil' }], new Map(), knownTeams)).toEqual([])
  })
})

describe('propagateBracket', () => {
  // R16 match 89 references the winners of R32 matches 74 and 77.
  const r16Schedule = [{ match_no: 89, stage: 'Round of 16', team1: 'W74', team2: 'W77' }]

  it('fills a winner slot once the source match is final', () => {
    const dbByNo = new Map([
      [74, { match_no: 74, status: 'final', advancer: 'Mexico', team1: 'Mexico', team2: 'Brazil', team1_resolved: true, team2_resolved: true }],
      [77, { match_no: 77, status: 'final', advancer: 'Spain', team1: 'Spain', team2: 'Croatia', team1_resolved: true, team2_resolved: true }],
      [89, { match_no: 89, status: 'scheduled', team1: 'W74', team2: 'W77', team1_resolved: false, team2_resolved: false }],
    ])
    expect(propagateBracket(r16Schedule, dbByNo)).toEqual([
      { match_no: 89, team1: 'Mexico', team1_resolved: true, team2: 'Spain', team2_resolved: true },
    ])
  })

  it('leaves a slot unresolved while the source match is not yet final', () => {
    const dbByNo = new Map([
      [74, { match_no: 74, status: 'final', advancer: 'Mexico', team1: 'Mexico', team2: 'Brazil', team1_resolved: true, team2_resolved: true }],
      [77, { match_no: 77, status: 'scheduled', advancer: null, team1: 'W?', team2: 'W?', team1_resolved: false, team2_resolved: false }],
      [89, { match_no: 89, status: 'scheduled', team1: 'W74', team2: 'W77', team1_resolved: false, team2_resolved: false }],
    ])
    // Only team1 (from the decided match 74) resolves.
    expect(propagateBracket(r16Schedule, dbByNo)).toEqual([
      { match_no: 89, team1: 'Mexico', team1_resolved: true },
    ])
  })

  it('never overwrites an already-resolved (feed or Admin) slot', () => {
    const dbByNo = new Map([
      [74, { match_no: 74, status: 'final', advancer: 'Mexico', team1: 'Mexico', team2: 'Brazil', team1_resolved: true, team2_resolved: true }],
      [77, { match_no: 77, status: 'final', advancer: 'Spain', team1: 'Spain', team2: 'Croatia', team1_resolved: true, team2_resolved: true }],
      [89, { match_no: 89, status: 'scheduled', team1: 'Portugal', team2: 'W77', team1_resolved: true, team2_resolved: false }],
    ])
    expect(propagateBracket(r16Schedule, dbByNo)).toEqual([
      { match_no: 89, team2: 'Spain', team2_resolved: true },
    ])
  })

  it('derives the loser for the third-place match (L101/L102)', () => {
    const tpSchedule = [{ match_no: 103, stage: 'Third place', team1: 'L101', team2: 'L102' }]
    const dbByNo = new Map([
      [101, { match_no: 101, status: 'final', advancer: 'Mexico', team1: 'Mexico', team2: 'Brazil', team1_resolved: true, team2_resolved: true }],
      [102, { match_no: 102, status: 'final', advancer: 'Spain', team1: 'Croatia', team2: 'Spain', team1_resolved: true, team2_resolved: true }],
      [103, { match_no: 103, status: 'scheduled', team1: 'L101', team2: 'L102', team1_resolved: false, team2_resolved: false }],
    ])
    expect(propagateBracket(tpSchedule, dbByNo)).toEqual([
      { match_no: 103, team1: 'Brazil', team1_resolved: true, team2: 'Croatia', team2_resolved: true },
    ])
  })

  it('ignores R32 group-placement codes (not derivable from advancers)', () => {
    const r32Schedule = [{ match_no: 74, stage: 'Round of 32', team1: '1E', team2: '3A/B/C/D/F' }]
    const dbByNo = new Map([[74, { match_no: 74, status: 'scheduled', team1: '1E', team2: '3A/B/C/D/F', team1_resolved: false, team2_resolved: false }]])
    expect(propagateBracket(r32Schedule, dbByNo)).toEqual([])
  })
})

describe('buildResultUpdate', () => {
  const group = { match_no: 1, stage: 'group', team1: 'Mexico', team2: 'South Africa', result_source: null }
  const ko = { match_no: 73, stage: 'Round of 32', team1: 'Mexico', team2: 'Brazil', result_source: null }

  it('marks a group match final', () => {
    const r = buildResultUpdate({ team1: 'Mexico', team2: 'South Africa', ft1: 2, ft2: 0, et1: null, et2: null, p1: null, p2: null }, group, knownTeams)
    expect(r).toMatchObject({ match_no: 1, ft1: 2, ft2: 0, status: 'final', advancer: null })
  })

  it('returns null when there is no result yet', () => {
    expect(buildResultUpdate({ team1: 'Mexico', team2: 'South Africa', ft1: null }, group, knownTeams)).toBe(null)
  })

  it('respects a manual override', () => {
    expect(buildResultUpdate({ team1: 'Mexico', team2: 'South Africa', ft1: 2, ft2: 0 }, { ...group, result_source: 'manual' }, knownTeams)).toBe(null)
  })

  it('decides a knockout on full time', () => {
    const r = buildResultUpdate({ num: 73, team1: 'Mexico', team2: 'Brazil', ft1: 2, ft2: 1, et1: null, et2: null, p1: null, p2: null }, ko, knownTeams)
    expect(r).toMatchObject({ match_no: 73, status: 'final', advancer: 'Mexico' })
  })

  it('decides a knockout on the extra-time aggregate (increment semantics)', () => {
    // ft 1-1, ET increment 1-0 → aggregate 2-1 → team1 through.
    const r = buildResultUpdate({ num: 73, team1: 'Mexico', team2: 'Brazil', ft1: 1, ft2: 1, et1: 1, et2: 0, p1: null, p2: null }, ko, knownTeams)
    expect(r).toMatchObject({ status: 'final', advancer: 'Mexico' })
  })

  it('decides a knockout on penalties', () => {
    const r = buildResultUpdate({ num: 73, team1: 'Mexico', team2: 'Brazil', ft1: 0, ft2: 0, et1: 0, et2: 0, p1: 2, p2: 4 }, ko, knownTeams)
    expect(r).toMatchObject({ status: 'final', advancer: 'Brazil' })
  })

  it('does not finalize a knockout still level with no shootout yet', () => {
    expect(buildResultUpdate({ num: 73, team1: 'Mexico', team2: 'Brazil', ft1: 1, ft2: 1, et1: null, et2: null, p1: null, p2: null }, ko, knownTeams)).toBe(null)
  })

  it('does not record a knockout result until both teams are resolved', () => {
    const r = buildResultUpdate({ num: 73, team1: '2A', team2: 'Brazil', ft1: 2, ft2: 1 }, { ...ko, team1: '2A' }, knownTeams)
    expect(r).toBe(null)
  })
})
