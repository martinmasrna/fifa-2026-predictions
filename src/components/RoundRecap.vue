<template>
  <div v-if="recap" class="bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-xl p-5">
    <div class="text-xs font-semibold uppercase tracking-wider text-brand-200 mb-1">
      Round complete — {{ roundKey }}
    </div>
    <div class="flex gap-8 flex-wrap">
      <div v-if="topScorer">
        <div class="text-brand-300 text-xs mb-0.5">Top scorer this round</div>
        <div class="font-bold text-lg">{{ topScorer.display_name }}</div>
        <div class="text-brand-200 text-sm">+{{ topScorer.roundPts }} pts</div>
      </div>
      <div v-if="biggestMover">
        <div class="text-brand-300 text-xs mb-0.5">Biggest mover</div>
        <div class="font-bold text-lg">{{ biggestMover.display_name }}</div>
        <div class="text-brand-200 text-sm">
          {{ biggestMover.delta > 0 ? '▲' : '▼' }} {{ Math.abs(biggestMover.delta) }} places
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLeaderboardStore } from '../stores/leaderboard.js'
import { supabase } from '../lib/supabase.js'

const props = defineProps({
  roundKey: { type: String, required: true },
})

const lb = useLeaderboardStore()
const recap = ref(null)
const topScorer = ref(null)
const biggestMover = ref(null)

onMounted(async () => {
  const snapshots = await lb.loadRoundRecap(props.roundKey)
  if (!snapshots.length) return
  recap.value = snapshots

  // Find previous round snapshot for rank deltas
  const { data: allSnaps } = await supabase
    .from('standings_snapshots')
    .select('round_key, captured_at')
    .order('captured_at', { ascending: false })
    .limit(20)

  const rounds = [...new Set((allSnaps ?? []).map(s => s.round_key))]
  const prevRoundKey = rounds[1] ?? null

  let prevSnaps = []
  if (prevRoundKey) {
    prevSnaps = await lb.loadRoundRecap(prevRoundKey)
  }
  const prevMap = new Map(prevSnaps.map(s => [s.user_id, s]))
  const curMap = new Map(snapshots.map(s => [s.user_id, s]))

  // Top scorer: highest total_points in current snapshot vs previous
  // (approximation: highest total increase)
  let best = null
  let bestDelta = -Infinity
  for (const s of snapshots) {
    const prev = prevMap.get(s.user_id)
    const delta = prev ? s.total_points - prev.total_points : s.total_points
    if (delta > bestDelta) {
      bestDelta = delta
      best = s
    }
  }
  if (best) {
    const { data: m } = await supabase
      .from('members')
      .select('display_name')
      .eq('user_id', best.user_id)
      .single()
    topScorer.value = { ...best, display_name: m?.display_name, roundPts: bestDelta }
  }

  // Biggest rank mover (largest positive rank improvement = rank went down in number = moved up)
  let moverDelta = 0
  let mover = null
  for (const s of snapshots) {
    const prev = prevMap.get(s.user_id)
    if (!prev) continue
    const delta = prev.rank - s.rank  // positive = improved rank
    if (Math.abs(delta) > Math.abs(moverDelta)) {
      moverDelta = delta
      mover = s
    }
  }
  if (mover && moverDelta !== 0) {
    const { data: m } = await supabase
      .from('members')
      .select('display_name')
      .eq('user_id', mover.user_id)
      .single()
    biggestMover.value = { ...mover, display_name: m?.display_name, delta: moverDelta }
  }
})
</script>
