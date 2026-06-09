<template>
  <div class="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden text-xs">
    <!-- Team 1 -->
    <div
      class="flex items-center gap-1.5 px-2 py-1.5"
      :class="winnerClass(1)"
    >
      <img v-if="flag1" :src="flag1" :alt="team1" class="h-3.5 w-auto rounded-sm border border-gray-200 shrink-0 object-cover" />
      <span class="flex-1 truncate font-medium">{{ team1 }}</span>
      <span v-if="match.status === 'final'" class="font-mono font-bold ml-1">{{ match.ft1 }}</span>
    </div>
    <div class="border-t border-gray-100"></div>
    <!-- Team 2 -->
    <div
      class="flex items-center gap-1.5 px-2 py-1.5"
      :class="winnerClass(2)"
    >
      <img v-if="flag2" :src="flag2" :alt="team2" class="h-3.5 w-auto rounded-sm border border-gray-200 shrink-0 object-cover" />
      <span class="flex-1 truncate font-medium">{{ team2 }}</span>
      <span v-if="match.status === 'final'" class="font-mono font-bold ml-1">{{ match.ft2 }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { flagUrl } from '../lib/flags.js'

const props = defineProps({
  match: { type: Object, required: true },
})

const team1 = computed(() => props.match.team1_resolved ? props.match.team1 : 'TBD')
const team2 = computed(() => props.match.team2_resolved ? props.match.team2 : 'TBD')
const flag1 = computed(() => props.match.team1_resolved ? flagUrl(props.match.team1) : null)
const flag2 = computed(() => props.match.team2_resolved ? flagUrl(props.match.team2) : null)

function winnerClass(side) {
  if (props.match.status !== 'final') return 'text-gray-700'
  const winner = props.match.advancer ?? (props.match.ft1 > props.match.ft2 ? props.match.team1 : props.match.ft2 > props.match.ft1 ? props.match.team2 : null)
  const team = side === 1 ? props.match.team1 : props.match.team2
  if (!winner) return 'text-gray-700'
  return winner === team ? 'text-gray-900 font-semibold bg-green-50' : 'text-gray-400'
}
</script>
