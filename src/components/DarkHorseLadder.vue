<template>
  <!-- Horizontal pill chain (wide layouts, e.g. onboarding) -->
  <div v-if="orientation === 'horizontal'" class="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto pb-1">
    <span v-for="(t, i) in ladder" :key="t.short" class="flex items-center gap-1.5 shrink-0">
      <span class="px-2.5 py-1 rounded-full" :class="i === ladder.length - 1 ? 'bg-gold text-ink' : 'bg-pitch-soft text-pitch-dark'">{{ t.short }} · {{ t.pts }}</span>
      <span v-if="i < ladder.length - 1" class="text-ink/25">→</span>
    </span>
  </div>

  <!-- Vertical list (narrow layouts, e.g. the scoring modal) -->
  <ul v-else class="space-y-2">
    <li v-for="(t, i) in ladder" :key="t.short" class="flex items-center justify-between gap-3 text-sm">
      <span class="text-ink/80" :class="i === ladder.length - 1 ? 'font-semibold' : ''">{{ t.long }}</span>
      <span class="badge shrink-0 font-bold" :class="i === ladder.length - 1 ? 'bg-gold text-ink' : 'bg-gold-soft text-gold-dark'">+{{ t.pts }} pts</span>
    </li>
  </ul>
</template>

<script setup>
// Dark-horse points ladder, shared by onboarding and the scoring modal.
import { POINTS } from '../lib/scoring.js'

defineProps({
  orientation: { type: String, default: 'horizontal' }, // 'horizontal' | 'vertical'
})

const ladder = [
  { short: 'R32', long: 'Reaches the round of 32', pts: POINTS.darkHorse.roundOf32 },
  { short: 'R16', long: 'Reaches the round of 16', pts: POINTS.darkHorse.roundOf16 },
  { short: 'QF', long: 'Reaches the quarter-finals', pts: POINTS.darkHorse.quarterFinal },
  { short: 'SF', long: 'Reaches the semi-finals', pts: POINTS.darkHorse.semiFinal },
  { short: 'Final', long: 'Reaches the final', pts: POINTS.darkHorse.runnerUp },
  { short: 'Champion', long: 'Wins the tournament', pts: POINTS.darkHorse.champion },
]
</script>
