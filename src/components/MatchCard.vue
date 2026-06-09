<template>
  <div class="card p-4 sm:p-5 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3.5">
      <div class="flex items-center gap-2 text-xs text-ink/45">
        <span v-if="match.group" class="font-semibold text-ink/70">Group {{ match.group }}</span>
        <span v-else class="font-semibold text-ink/70">{{ match.round_label }}</span>
        <span class="text-ink/25">·</span>
        <span>{{ kickoffLabel }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="match.status === 'final'" class="badge-final">{{ statusLabel }}</span>
        <span v-else-if="locked" class="badge-locked">Locked</span>
        <span v-else class="badge-open">Open</span>
        <RouterLink
          v-if="match.status === 'final' || locked"
          :to="`/matches/${match.match_no}`"
          class="text-xs text-pitch font-semibold hover:underline"
        >Details</RouterLink>
      </div>
    </div>

    <!-- Teams + center -->
    <div class="flex items-center gap-3">
      <!-- Team 1 -->
      <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <Flag :team="match.team1" size="lg" :dim="dimSide(1)" />
        <span class="font-semibold text-sm text-center leading-tight" :class="nameClass(1)">{{ match.team1 || 'TBD' }}</span>
      </div>

      <!-- Center -->
      <div class="shrink-0 px-1">
        <!-- Final result -->
        <template v-if="match.status === 'final'">
          <div class="flex items-baseline gap-2 font-display tnum">
            <span class="text-2xl font-extrabold" :class="nameClass(1)">{{ match.ft1 }}</span>
            <span class="text-ink/25 text-lg">–</span>
            <span class="text-2xl font-extrabold" :class="nameClass(2)">{{ match.ft2 }}</span>
          </div>
          <div v-if="extraLabel" class="text-[10px] text-ink/40 text-center mt-0.5">{{ extraLabel }}</div>
        </template>

        <!-- Editable prediction -->
        <template v-else-if="!locked">
          <div class="flex items-center gap-2.5">
            <GoalStepper v-model="local1" />
            <span class="text-ink/25 text-xl font-bold">:</span>
            <GoalStepper v-model="local2" />
          </div>
        </template>

        <!-- Locked with prediction -->
        <template v-else-if="prediction">
          <div class="font-display tnum text-xl font-bold text-ink/50">
            {{ prediction.pred1 }} <span class="text-ink/25">:</span> {{ prediction.pred2 }}
          </div>
        </template>

        <!-- Locked, no prediction -->
        <template v-else>
          <span class="text-ink/30 text-sm">no pick</span>
        </template>
      </div>

      <!-- Team 2 -->
      <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <Flag :team="match.team2" size="lg" :dim="dimSide(2)" />
        <span class="font-semibold text-sm text-center leading-tight" :class="nameClass(2)">{{ match.team2 || 'TBD' }}</span>
      </div>
    </div>

    <!-- Advancer toggle (knockout draw only) -->
    <div v-if="isKnockout && !locked && local1 != null && local2 != null && local1 === local2" class="mt-3.5">
      <AdvancerToggle
        v-model="localAdvancer"
        :pred1="local1"
        :pred2="local2"
        :team1="match.team1"
        :team2="match.team2"
      />
    </div>

    <!-- Footer: points / saved / pick recap -->
    <div class="mt-3.5 flex items-center justify-center gap-2 min-h-[1.25rem]">
      <span v-if="score != null" class="badge-points">+{{ score }} pts</span>
      <span v-if="score != null && prediction" class="text-[11px] text-ink/40">
        you picked {{ prediction.pred1 }}–{{ prediction.pred2 }}{{ exactHint }}
      </span>
      <span v-else-if="!locked && justSaved" class="text-[11px] text-pitch font-semibold">Saved ✓</span>
    </div>

    <p v-if="lockedByServer" class="text-xs text-gold-dark text-center mt-1">
      This match has already kicked off — predictions are locked.
    </p>
    <p v-else-if="saveError" class="text-xs text-red-500 text-center mt-1">{{ saveError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import GoalStepper from './GoalStepper.vue'
import AdvancerToggle from './AdvancerToggle.vue'
import Flag from './Flag.vue'
import { useMatchesStore } from '../stores/matches.js'
import { serverNow } from '../lib/serverTime.js'

const props = defineProps({
  match: { type: Object, required: true },
  prediction: { type: Object, default: null },
  score: { type: Number, default: null },
})

const matchesStore = useMatchesStore()
const saveError = ref('')
const justSaved = ref(false)
const lockedByServer = ref(false) // set if a save is rejected because kickoff has passed

const now = ref(new Date(serverNow()))
const locked = computed(() => lockedByServer.value || now.value >= new Date(props.match.kickoff_utc))
const isKnockout = computed(() => props.match.stage !== 'group')

const statusLabel = computed(() => {
  if (props.match.p1 != null) return 'Penalties'
  if (props.match.et1 != null) return 'AET'
  return 'Full time'
})
const extraLabel = computed(() => {
  if (props.match.p1 != null) return `${props.match.ft1 + (props.match.et1 ?? 0)}–${props.match.ft2 + (props.match.et2 ?? 0)} a.e.t · ${props.match.p1}–${props.match.p2} pens`
  if (props.match.et1 != null) return `${props.match.ft1 + props.match.et1}–${props.match.ft2 + props.match.et2} after extra time`
  return ''
})
const exactHint = computed(() => {
  if (props.score == null || !props.prediction) return ''
  if (props.prediction.pred1 === props.match.ft1 && props.prediction.pred2 === props.match.ft2) return ' · exact 🎯'
  return ''
})

const local1 = ref(props.prediction?.pred1 ?? null)
const local2 = ref(props.prediction?.pred2 ?? null)
const localAdvancer = ref(props.prediction?.pred_advancer ?? null)

let clockTimer = null
let saveTimer = null
let savedTimer = null

watch(() => props.prediction, (p) => {
  local1.value = p?.pred1 ?? null
  local2.value = p?.pred2 ?? null
  localAdvancer.value = p?.pred_advancer ?? null
})

// First tap on one side seeds the other with 0
watch(local1, (v) => { if (v !== null && local2.value === null) local2.value = 0 })
watch(local2, (v) => { if (v !== null && local1.value === null) local1.value = 0 })

// Clear advancer once the prediction becomes decisive
watch([local1, local2], ([g1, g2]) => {
  if (g1 != null && g2 != null && g1 !== g2) localAdvancer.value = null
})

// Debounced auto-save
watch([local1, local2, localAdvancer], () => {
  if (locked.value) return
  if (local1.value === null || local2.value === null) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 350)
})

onMounted(() => { clockTimer = setInterval(() => { now.value = new Date(serverNow()) }, 60_000) })
onUnmounted(() => { clearTimeout(saveTimer); clearTimeout(savedTimer); clearInterval(clockTimer) })

async function save() {
  saveError.value = ''
  try {
    await matchesStore.savePrediction(props.match.match_no, local1.value, local2.value, localAdvancer.value)
    justSaved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => { justSaved.value = false }, 2000)
  } catch (e) {
    // RLS rejects writes once kickoff has passed (server clock). Treat that
    // as a lock rather than an error and re-lock the card.
    if (isLockError(e)) lockedByServer.value = true
    else saveError.value = e.message
  }
}

// 42501 = RLS WITH CHECK violation (insert after kickoff);
// PGRST116 = update matched 0 rows because RLS USING hid the row.
function isLockError(e) {
  return e?.code === '42501' || e?.code === 'PGRST116' ||
    /row-level security|violates/i.test(e?.message ?? '')
}

// Visual emphasis: winner green, loser dimmed (only after final)
function nameClass(side) {
  if (props.match.status !== 'final') return 'text-ink'
  const { ft1, ft2, advancer, team1, team2 } = props.match
  if (advancer) {
    const team = side === 1 ? team1 : team2
    return advancer === team ? 'text-pitch-dark' : 'text-ink/40'
  }
  if (ft1 === ft2) return 'text-ink/70'
  if (side === 1) return ft1 > ft2 ? 'text-pitch-dark' : 'text-ink/40'
  return ft2 > ft1 ? 'text-pitch-dark' : 'text-ink/40'
}
function dimSide(side) {
  if (props.match.status !== 'final') return false
  const { ft1, ft2, advancer, team1, team2 } = props.match
  if (advancer) return advancer !== (side === 1 ? team1 : team2)
  if (ft1 === ft2) return false
  return side === 1 ? ft1 < ft2 : ft2 < ft1
}

const kickoffLabel = computed(() => {
  const kickoff = new Date(props.match.kickoff_utc)
  const diffMs = kickoff - now.value
  const time = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })
  if (diffMs <= 0) return time
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 60) return `in ${diffMins}m`
  const diffHours = Math.floor(diffMs / 3_600_000)
  if (diffHours < 24) return `in ${diffHours}h · ${time}`
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 1) return `tomorrow · ${time}`
  return kickoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Europe/Prague' }) + ` · ${time}`
})
</script>
