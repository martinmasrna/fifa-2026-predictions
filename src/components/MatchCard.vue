<template>
  <div
    class="card p-4"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span v-if="match.group" class="font-semibold text-gray-700">Group {{ match.group }}</span>
        <span>{{ kickoffLabel }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="match.status === 'final'"
          class="badge bg-green-100 text-green-700"
        >{{ statusLabel }}</span>
        <span
          v-else-if="locked"
          class="badge bg-gray-100 text-gray-500"
        >Locked</span>
        <span
          v-else
          class="badge bg-blue-100 text-blue-700"
        >Open</span>
        <RouterLink
          v-if="match.status === 'final' || locked"
          :to="`/matches/${match.match_no}`"
          class="text-xs text-brand-600 underline"
        >Details</RouterLink>
      </div>
    </div>

    <!-- Teams + prediction -->
    <div class="flex items-center gap-4">
      <!-- Team 1 -->
      <div class="flex-1 flex flex-col items-center gap-1.5">
        <img
          v-if="flagUrl(match.team1)"
          :src="flagUrl(match.team1)"
          :alt="match.team1"
          class="h-10 w-auto rounded border border-gray-200 shadow-sm object-cover"
        />
        <span class="font-semibold text-sm text-center" :class="winnerClass(1)">{{ match.team1 }}</span>
      </div>

      <!-- Scores -->
      <div class="flex items-center gap-3 shrink-0">
        <!-- Actual result (if final) -->
        <template v-if="match.status === 'final'">
          <div class="text-center">
            <div class="text-lg font-mono font-bold">
              {{ match.ft1 }} – {{ match.ft2 }}
            </div>
            <div class="text-xs text-gray-400">FT</div>
          </div>
          <div v-if="match.et1 != null" class="text-center">
            <div class="text-sm font-mono text-gray-500">
              ({{ match.ft1 + match.et1 }}–{{ match.ft2 + match.et2 }})
            </div>
            <div class="text-xs text-gray-400">AET</div>
          </div>
          <div v-if="match.p1 != null" class="text-center">
            <div class="text-sm font-mono text-gray-500">
              {{ match.p1 }}–{{ match.p2 }} pen
            </div>
          </div>
        </template>

        <!-- Editable prediction (not locked, not final) -->
        <template v-else-if="!locked">
          <GoalStepper v-model="local1" />
          <span class="text-gray-300 text-2xl font-bold">:</span>
          <GoalStepper v-model="local2" />
        </template>

        <!-- Locked with prediction -->
        <template v-else-if="prediction">
          <div class="text-center">
            <div class="text-lg font-mono text-gray-500">
              {{ prediction.pred1 }} – {{ prediction.pred2 }}
            </div>
            <div class="text-xs text-gray-400">My pick</div>
          </div>
        </template>

        <!-- Locked, no prediction -->
        <template v-else>
          <div class="text-gray-300 text-sm">— no pick —</div>
        </template>
      </div>

      <!-- Team 2 -->
      <div class="flex-1 flex flex-col items-center gap-1.5">
        <img
          v-if="flagUrl(match.team2)"
          :src="flagUrl(match.team2)"
          :alt="match.team2"
          class="h-10 w-auto rounded border border-gray-200 shadow-sm object-cover"
        />
        <span class="font-semibold text-sm text-center" :class="winnerClass(2)">{{ match.team2 }}</span>
      </div>
    </div>

    <!-- Advancer toggle (knockout draw only) -->
    <div v-if="isKnockout && !locked && local1 != null && local2 != null" class="mt-3 flex justify-center">
      <AdvancerToggle
        v-model="localAdvancer"
        :pred1="local1"
        :pred2="local2"
        :team1="match.team1"
        :team2="match.team2"
      />
    </div>

    <!-- Prediction points (if scored) -->
    <div v-if="score != null" class="mt-3 text-center">
      <span class="badge bg-brand-100 text-brand-700 font-bold">+{{ score }} pts</span>
    </div>


    <p v-if="saveError" class="text-xs text-red-500 text-center mt-2">{{ saveError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import GoalStepper from './GoalStepper.vue'
import AdvancerToggle from './AdvancerToggle.vue'
import { useMatchesStore } from '../stores/matches.js'
import { flagUrl } from '../lib/flags.js'

const props = defineProps({
  match: { type: Object, required: true },
  prediction: { type: Object, default: null },
  score: { type: Number, default: null },
})
const emit = defineEmits(['save'])

const matchesStore = useMatchesStore()
const saving = ref(false)
const saveError = ref('')

const locked = computed(() => now.value >= new Date(props.match.kickoff_utc))
const isKnockout = computed(() => props.match.stage !== 'group')

const statusLabel = computed(() => {
  if (props.match.p1 != null) return 'After Penalties'
  if (props.match.et1 != null) return 'After Extra Time'
  return 'Full Time'
})

const local1 = ref(props.prediction?.pred1 ?? null)
const local2 = ref(props.prediction?.pred2 ?? null)
const localAdvancer = ref(props.prediction?.pred_advancer ?? null)

const now = ref(new Date())
let clockTimer = null
let saveTimer = null

// Reset local state when prediction changes externally
watch(() => props.prediction, (p) => {
  local1.value = p?.pred1 ?? null
  local2.value = p?.pred2 ?? null
  localAdvancer.value = p?.pred_advancer ?? null
})

// Cross-initialize: first tap on one side sets the other to 0
watch(local1, (v) => { if (v !== null && local2.value === null) local2.value = 0 })
watch(local2, (v) => { if (v !== null && local1.value === null) local1.value = 0 })

// Auto-clear advancer when prediction becomes decisive
watch([local1, local2], ([g1, g2]) => {
  if (g1 != null && g2 != null && g1 !== g2) localAdvancer.value = null
})

// Auto-save with debounce
watch([local1, local2, localAdvancer], () => {
  if (locked.value) return
  if (local1.value === null || local2.value === null) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 300)
})

onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 60_000) })
onUnmounted(() => { clearTimeout(saveTimer); clearInterval(clockTimer) })

async function save() {
  saveError.value = ''
  saving.value = true
  try {
    await matchesStore.savePrediction(props.match.match_no, local1.value, local2.value, localAdvancer.value)
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

function winnerClass(side) {
  if (props.match.status !== 'final') return ''
  const ft1 = props.match.ft1, ft2 = props.match.ft2
  const advancer = props.match.advancer
  if (advancer) {
    const winner = side === 1 ? props.match.team1 : props.match.team2
    return advancer === winner ? 'text-green-700' : 'text-gray-400'
  }
  if (side === 1 && ft1 > ft2) return 'text-green-700'
  if (side === 2 && ft2 > ft1) return 'text-green-700'
  if (ft1 === ft2) return 'text-gray-700'
  return 'text-gray-400'
}

const kickoffLabel = computed(() => {
  const kickoff = new Date(props.match.kickoff_utc)
  const diffMs = kickoff - now.value
  const time = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })

  if (diffMs <= 0) return time  // past or live — just show time

  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 60) return `in ${diffMins}m`

  const diffHours = Math.floor(diffMs / 3_600_000)
  if (diffHours < 24) return `in ${diffHours}h · ${time}`

  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 1) return `Tomorrow · ${time}`

  return time
})
</script>
