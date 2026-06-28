<template>
  <!-- Compact, inline "everyone's picks" grid for one round — sits under the chart
       so the graph stays visible while you scrub across matchdays. Players are
       rows, matches are columns; scrolls horizontally when a round is wide. -->
  <div class="rounded-xl bg-white border border-ink/10 overflow-hidden min-h-[132px]">
    <div v-if="!roundKey" class="grid place-items-center text-sm text-ink/40 py-12">
      {{ canHover ? 'Hover' : 'Tap' }} a round to see everyone's picks
    </div>
    <template v-else>
      <div class="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div class="font-display font-bold text-sm">{{ roundKey }}</div>
        <div class="text-xs text-ink/45">everyone's picks · sorted by round score</div>
      </div>

      <div v-if="loading" class="space-y-2 px-3 pb-3">
        <div v-for="n in 4" :key="n" class="skeleton h-4 w-full rounded"></div>
      </div>

      <div v-else-if="matches.length" class="overflow-x-auto">
        <table class="text-xs w-full" :style="{ minWidth: 132 + matches.length * 58 + 'px' }">
          <thead>
            <tr class="text-[10px] uppercase tracking-wide text-ink/45">
              <th class="text-left py-1.5 pr-2 pl-3 sticky left-0 bg-white z-10">Player</th>
              <th v-for="m in matches" :key="m.match_no" class="px-1 py-1.5 text-center font-semibold">
                <div>{{ code(m.team1) }}–{{ code(m.team2) }}</div>
                <div class="font-display font-bold text-ink tnum">{{ m.ft1 }}–{{ m.ft2 }}</div>
              </th>
              <th class="pl-1.5 pr-3 py-1.5 text-center">Tot</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/5">
            <tr v-for="row in grid" :key="row.userId" :class="row.userId === selectedUserId ? 'bg-pitch-soft' : ''">
              <td class="py-1.5 pr-2 pl-3 font-semibold whitespace-nowrap sticky left-0 z-10"
                  :class="row.userId === selectedUserId ? 'bg-pitch-soft text-pitch-dark' : 'bg-white'">
                <span class="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" :style="{ background: row.color }"></span>
                <span v-if="row.total === maxTotal && maxTotal > 0">🏆 </span>{{ row.name }}
              </td>
              <td v-for="(c, i) in row.cells" :key="i" class="px-1 py-1.5 text-center tnum" :class="cellClass(c)">
                {{ c.pred }}
              </td>
              <td class="pl-1.5 pr-3 py-1.5 text-center font-display font-extrabold tnum">{{ row.total }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-sm text-ink/40 py-8 text-center">No finished matches in this round.</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useMatchesStore } from '../stores/matches.js'

const props = defineProps({
  roundKey: { type: String, default: null },
  selectedUserId: { type: String, default: null },
  // [{ userId, name, color }] in display order — supplied by the chart so the
  // table's rows, names and colours stay in sync with the lines/legend.
  players: { type: Array, default: () => [] },
})

const matchesStore = useMatchesStore()
const loading = ref(true)
// Touch devices have no hover, so the recap is opened by tapping a round — reflect
// that in the prompt. `(hover: hover)` is true on mouse/trackpad, false on touch.
const canHover = ref(typeof window !== 'undefined' ? window.matchMedia?.('(hover: hover)').matches ?? true : true)
const predByKey = ref(new Map()) // `${uid}:${no}` -> { pred1, pred2 }
const ptsByKey = ref(new Map())  // `${uid}:${no}` -> points
const key = (uid, no) => `${uid}:${no}`

// Load everyone's predictions + per-match points once; each round's grid is then
// an instant client-side lookup, so scrubbing across rounds never refetches.
// Predictions become readable to all once match 1 kicks off (RLS).
onMounted(async () => {
  try {
    const [p, s] = await Promise.all([
      supabase.from('predictions').select('user_id, match_no, pred1, pred2'),
      supabase.from('prediction_scores').select('user_id, match_no, points'),
    ])
    const pred = new Map(); for (const r of p.data ?? []) pred.set(key(r.user_id, r.match_no), r)
    const pts = new Map(); for (const r of s.data ?? []) pts.set(key(r.user_id, r.match_no), r.points)
    predByKey.value = pred
    ptsByKey.value = pts
  } finally {
    loading.value = false
  }
})

const matches = computed(() => {
  if (!props.roundKey) return []
  return matchesStore.matches
    .filter(m => m.round_label === props.roundKey && m.status === 'final')
    .sort((a, b) => a.match_no - b.match_no)
})

const grid = computed(() =>
  props.players.map(p => {
    const cells = matches.value.map(m => {
      const pr = predByKey.value.get(key(p.userId, m.match_no))
      const pts = ptsByKey.value.get(key(p.userId, m.match_no)) ?? 0
      const exact = !!pr && pr.pred1 === m.ft1 && pr.pred2 === m.ft2
      return { pred: pr ? `${pr.pred1}–${pr.pred2}` : '—', pts, exact }
    })
    return { ...p, cells, total: cells.reduce((s, c) => s + c.pts, 0) }
  // Order by how each player did *this round*, not their overall standing
  // (stable sort keeps rank order among equal round totals).
  }).sort((a, b) => b.total - a.total)
)
const maxTotal = computed(() => grid.value.reduce((m, r) => Math.max(m, r.total), 0))

// Point-strength encoded in the text (cell backgrounds are reserved for the
// selected-row highlight). Mirrors WelcomeRecap's grid.
function cellClass(c) {
  if (c.exact) return 'font-extrabold text-gold-dark'
  if (c.pts >= 4) return 'font-semibold text-ink'
  if (c.pts > 0) return 'text-ink/70'
  return 'text-ink/30'
}
const code = (n) => n.slice(0, 3).toUpperCase()
</script>
