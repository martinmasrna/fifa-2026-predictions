<template>
  <div v-if="recap" class="hero-grad text-white rounded-2xl p-5 md:p-6 shadow-card animate-fade-in">
    <div class="flex items-center gap-2.5 mb-4">
      <span class="gold-rule"></span>
      <span class="text-xs font-bold uppercase tracking-[0.16em] text-white/75">
        Round complete · {{ roundKey }}
      </span>
    </div>
    <div class="flex gap-10 flex-wrap">
      <div v-if="topScorer" class="flex items-center gap-3">
        <span class="text-2xl">🔥</span>
        <div>
          <div class="text-white/65 text-[11px] uppercase tracking-wide mb-0.5">Top scorer</div>
          <div class="font-display font-bold text-lg leading-tight">{{ topScorer.display_name }}</div>
          <div class="text-gold text-sm font-semibold tnum">+{{ topScorer.roundPts }} pts</div>
        </div>
      </div>
      <div v-if="biggestMover" class="flex items-center gap-3">
        <span class="text-2xl">{{ biggestMover.delta > 0 ? '🚀' : '📉' }}</span>
        <div>
          <div class="text-white/65 text-[11px] uppercase tracking-wide mb-0.5">Biggest mover</div>
          <div class="font-display font-bold text-lg leading-tight">{{ biggestMover.display_name }}</div>
          <div class="text-white/80 text-sm font-semibold tnum">
            {{ biggestMover.delta > 0 ? '▲' : '▼' }} {{ Math.abs(biggestMover.delta) }} {{ Math.abs(biggestMover.delta) === 1 ? 'place' : 'places' }}
          </div>
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
