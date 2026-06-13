import { describe, it, expect } from 'vitest'
import { rankRows } from '../src/lib/ranking.js'

const row = (display_name, grand_total, correct_results, exact_scorelines) =>
  ({ display_name, grand_total, correct_results, exact_scorelines })

describe('rankRows', () => {
  it('orders by total points first', () => {
    const out = rankRows([row('A', 10, 0, 0), row('B', 20, 0, 0)])
    expect(out.map(r => r.display_name)).toEqual(['B', 'A'])
    expect(out.map(r => r.rank)).toEqual([1, 2])
  })

  it('breaks total ties by correct results before exact scorelines', () => {
    // Mirrors the real case: equal totals, fewer exact but more correct results wins.
    const martin = row('Martin', 19, 3, 2)
    const michal = row('Michal', 19, 4, 1)
    const out = rankRows([martin, michal])
    expect(out.map(r => r.display_name)).toEqual(['Michal', 'Martin'])
    expect(out.map(r => r.rank)).toEqual([1, 2])
  })

  it('uses exact scorelines only when total and correct results are equal', () => {
    const more = row('More', 12, 2, 3)
    const less = row('Less', 12, 2, 1)
    const out = rankRows([less, more])
    expect(out.map(r => r.display_name)).toEqual(['More', 'Less'])
  })

  it('gives players tied on all three the same rank, and skips the next rank', () => {
    const out = rankRows([
      row('Top', 20, 5, 2),
      row('Tie1', 13, 2, 1),
      row('Tie2', 13, 2, 1),
      row('Below', 9, 1, 0),
    ])
    expect(out.map(r => r.rank)).toEqual([1, 2, 2, 4])
  })

  it('does not mutate the input array', () => {
    const input = [row('A', 10, 0, 0), row('B', 20, 0, 0)]
    const snapshot = [...input]
    rankRows(input)
    expect(input).toEqual(snapshot)
  })
})
