<template>
  <div class="card overflow-hidden">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 bg-pitch-soft/50 border-b border-ink/10">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-ink/50">Say you predict</span>
      <span class="font-display tnum font-extrabold text-pitch-dark text-base">{{ predDisplay }}</span>
      <span class="text-xs text-ink/45">— here's what each final score would earn:</span>
    </div>
    <table class="w-full text-sm">
      <thead class="text-ink/45 text-[11px] uppercase tracking-wider">
        <tr>
          <th class="text-left px-4 py-2 font-semibold">Final score</th>
          <th class="text-left px-4 py-2 font-semibold">What you got right</th>
          <th class="text-right px-4 py-2 font-semibold">Points</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-ink/5">
        <tr v-for="row in rows" :key="row.label" :class="row.exact ? 'bg-gold-soft/30' : row.pts === 0 ? 'text-ink/40' : ''">
          <td class="px-4 py-2.5 font-display tnum font-bold">{{ row.display }}</td>
          <td class="px-4 py-2.5" :class="row.pts === 0 ? '' : 'text-ink/70'">{{ row.label }}</td>
          <td class="px-4 py-2.5 text-right font-display font-extrabold text-base"
              :class="row.exact ? 'text-gold-dark' : row.pts === 0 ? 'text-ink/30' : ''">{{ row.pts }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
// Worked example for match scoring, shared by the onboarding "How to play"
// step and the leaderboard's "How scoring works" modal. Points are computed by
// the real scoreGroupMatch — the example can never contradict actual scoring.
import { scoreGroupMatch, POINTS } from '../lib/scoring.js'

const PRED = { g1: 2, g2: 1 }
const predDisplay = `${PRED.g1}–${PRED.g2}`

// Each illustrative final score, ordered high → low points. The labels describe
// what the prediction got right; the points are derived, not written.
const examples = [
  { score: [2, 1], label: 'Exact score' },
  { score: [1, 0], label: 'Right result + goal difference' },
  { score: [3, 1], label: 'Right result + one score' },
  { score: [4, 2], label: 'Right result' },
  { score: [2, 3], label: 'One score, wrong result' },
  { score: [0, 3], label: 'Nothing right' },
]

const rows = examples.map((e) => {
  const pts = scoreGroupMatch(PRED, { g1: e.score[0], g2: e.score[1] })
  return { display: `${e.score[0]}–${e.score[1]}`, label: e.label, pts, exact: pts === POINTS.scoreline.exact }
})
</script>
