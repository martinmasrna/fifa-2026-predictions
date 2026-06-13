// Pure leaderboard ranking — no I/O. Shared by the Vue store (live board) and
// the GitHub Action (round snapshots) so the two can never disagree.
//
// Order: total points, then most correct results (W/D/L), then most exact
// scorelines. Players tied on all three share a rank.

/**
 * @param {Array<{ grand_total: number, correct_results: number, exact_scorelines: number }>} rows
 * @returns {Array} the same rows, sorted, each with a `rank` field added
 */
export function rankRows(rows) {
  const sorted = [...rows].sort((a, b) => {
    if (b.grand_total !== a.grand_total) return b.grand_total - a.grand_total
    if (b.correct_results !== a.correct_results) return b.correct_results - a.correct_results
    return b.exact_scorelines - a.exact_scorelines
  })

  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      const tied =
        prev.grand_total === cur.grand_total &&
        prev.correct_results === cur.correct_results &&
        prev.exact_scorelines === cur.exact_scorelines
      if (!tied) rank = i + 1
    }
    sorted[i] = { ...sorted[i], rank }
  }
  return sorted
}
