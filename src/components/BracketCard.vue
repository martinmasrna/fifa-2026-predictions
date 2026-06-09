<template>
  <div class="bg-white border border-ink/10 rounded-lg shadow-sm overflow-hidden text-xs">
    <div class="flex items-center gap-1.5 px-2 py-1.5" :class="rowClass(1)">
      <Flag :team="team1Resolved ? match.team1 : null" size="xs" class="!w-4" />
      <span class="flex-1 truncate font-medium">{{ team1 }}</span>
      <span v-if="match.status === 'final'" class="font-display tnum font-bold ml-1">{{ match.ft1 }}</span>
    </div>
    <div class="border-t border-ink/5"></div>
    <div class="flex items-center gap-1.5 px-2 py-1.5" :class="rowClass(2)">
      <Flag :team="team2Resolved ? match.team2 : null" size="xs" class="!w-4" />
      <span class="flex-1 truncate font-medium">{{ team2 }}</span>
      <span v-if="match.status === 'final'" class="font-display tnum font-bold ml-1">{{ match.ft2 }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Flag from './Flag.vue'

const props = defineProps({
  match: { type: Object, required: true },
})

const team1Resolved = computed(() => props.match.team1_resolved)
const team2Resolved = computed(() => props.match.team2_resolved)
const team1 = computed(() => team1Resolved.value ? props.match.team1 : 'TBD')
const team2 = computed(() => team2Resolved.value ? props.match.team2 : 'TBD')

function rowClass(side) {
  if (props.match.status !== 'final') return 'text-ink/70'
  const winner = props.match.advancer ?? (props.match.ft1 > props.match.ft2 ? props.match.team1 : props.match.ft2 > props.match.ft1 ? props.match.team2 : null)
  const team = side === 1 ? props.match.team1 : props.match.team2
  if (!winner) return 'text-ink/70'
  return winner === team ? 'text-pitch-dark font-semibold bg-pitch-soft' : 'text-ink/35'
}
</script>
