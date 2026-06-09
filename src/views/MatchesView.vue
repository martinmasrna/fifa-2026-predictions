<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Matches</h1>
      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.id"
          @click="activeFilter = f.id"
          class="btn btn-sm"
          :class="activeFilter === f.id ? 'btn-primary' : 'btn-secondary'"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- Group + Matchday filters -->
    <div class="mb-6 grid items-center" style="grid-template-columns: max-content 1fr; column-gap: 0.75rem; row-gap: 0.5rem">

      <!-- Group row -->
      <span class="text-xs font-medium text-gray-400">Group</span>
      <div class="flex overflow-x-auto pb-0.5">
          <button
            @click="activeGroup = null"
            class="px-2 py-1 text-xs font-medium border border-gray-300 -ml-px first:ml-0 shrink-0 transition-colors whitespace-nowrap"
            :class="activeGroup === null ? 'bg-brand-600 text-white border-brand-600 relative z-10' : 'bg-white text-gray-600 hover:bg-gray-50'"
          >All</button>
          <button
            v-for="g in groups" :key="g"
            @click="activeGroup = g"
            class="px-2 py-1 text-xs font-medium border border-gray-300 -ml-px shrink-0 transition-colors whitespace-nowrap"
            :class="activeGroup === g ? 'bg-brand-600 text-white border-brand-600 relative z-10' : 'bg-white text-gray-600 hover:bg-gray-50'"
          >{{ g }}</button>
          <button
            @click="activeGroup = 'knockout'"
            class="px-2 py-1 text-xs font-medium border border-gray-300 -ml-px shrink-0 transition-colors whitespace-nowrap"
            :class="activeGroup === 'knockout' ? 'bg-brand-600 text-white border-brand-600 relative z-10' : 'bg-white text-gray-600 hover:bg-gray-50'"
          >KO</button>
        </div>

      <!-- Matchday row -->
      <span class="text-xs font-medium text-gray-400">Matchday</span>
      <div class="flex overflow-x-auto pb-0.5">
          <button
            @click="activeMatchday = null"
            class="px-2 py-1 text-xs font-medium border border-gray-300 -ml-px first:ml-0 shrink-0 transition-colors whitespace-nowrap"
            :class="activeMatchday === null ? 'bg-brand-600 text-white border-brand-600 relative z-10' : 'bg-white text-gray-600 hover:bg-gray-50'"
          >All</button>
          <button
            v-for="md in matchdays" :key="md"
            @click="activeMatchday = md"
            class="px-2 py-1 text-xs font-medium border border-gray-300 -ml-px shrink-0 transition-colors whitespace-nowrap"
            :class="activeMatchday === md ? 'bg-brand-600 text-white border-brand-600 relative z-10' : 'bg-white text-gray-600 hover:bg-gray-50'"
          >{{ abbreviate(md) }}</button>
        </div>

    </div>

    <!-- Match list -->
    <div v-if="visibleMatches.length === 0" class="text-center text-gray-400 py-12">
      No matches to show
    </div>

    <template v-else>
      <!-- Group by round_label -->
      <div v-for="group in groupedByRound" :key="group.round" class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {{ group.round }} ({{ group.date }})
        </h2>
        <div class="space-y-3">
          <MatchCard
            v-for="match in group.matches"
            :key="match.match_no"
            :match="match"
            :prediction="matchesStore.predMap.get(match.match_no)"
            :score="matchesStore.scoreMap.get(match.match_no) ?? null"
            @save="savePrediction"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMatchesStore } from '../stores/matches.js'
import MatchCard from '../components/MatchCard.vue'

const matchesStore = useMatchesStore()

const filters = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
]
const activeFilter = ref('all')
const activeGroup = ref(null)
const activeMatchday = ref(null)

function abbreviate(label) {
  const md = label.match(/matchday\s+(\d+)/i)
  if (md) return md[1]
  if (/round of 32/i.test(label)) return 'R32'
  if (/round of 16/i.test(label)) return 'R16'
  if (/quarter/i.test(label)) return 'QF'
  if (/semi/i.test(label)) return 'SF'
  if (/third/i.test(label)) return '3rd'
  if (/final/i.test(label)) return 'Final'
  return label
}

const groups = computed(() => {
  const gs = new Set(matchesStore.matches.filter(m => m.stage === 'group').map(m => m.group))
  return [...gs].sort()
})

// Round labels in chronological order (matches are pre-sorted by kickoff)
const matchdays = computed(() => {
  const seen = new Set()
  const labels = []
  for (const m of matchesStore.matches) {
    if (!seen.has(m.round_label)) {
      seen.add(m.round_label)
      labels.push(m.round_label)
    }
  }
  return labels
})

const now = ref(new Date())

const visibleMatches = computed(() => {
  let ms = matchesStore.matches

  if (activeGroup.value === 'knockout') {
    ms = ms.filter(m => m.stage !== 'group')
  } else if (activeGroup.value) {
    ms = ms.filter(m => m.group === activeGroup.value)
  }

  if (activeMatchday.value) {
    ms = ms.filter(m => m.round_label === activeMatchday.value)
  }

  const n = now.value
  if (activeFilter.value === 'open') {
    ms = ms.filter(m => new Date(m.kickoff_utc) > n && m.status !== 'final')
  } else if (activeFilter.value === 'upcoming') {
    ms = ms.filter(m => new Date(m.kickoff_utc) > n)
  } else if (activeFilter.value === 'results') {
    ms = ms.filter(m => m.status === 'final')
  }

  return ms
})

const groupedByRound = computed(() => {
  const map = new Map()
  for (const m of visibleMatches.value) {
    if (!map.has(m.round_label)) map.set(m.round_label, [])
    map.get(m.round_label).push(m)
  }
  return [...map.entries()].map(([round, matches]) => {
    const date = new Date(matches[0].kickoff_utc).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'Europe/Prague',
    })
    return { round, matches, date }
  })
})

async function savePrediction({ matchNo, pred1, pred2, predAdvancer }) {
  await matchesStore.savePrediction(matchNo, pred1, pred2, predAdvancer)
}

let nowTimer = null
onMounted(() => { nowTimer = setInterval(() => { now.value = new Date() }, 30_000) })
onUnmounted(() => { clearInterval(nowTimer) })
</script>
