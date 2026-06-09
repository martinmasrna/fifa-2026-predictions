<template>
  <div>
    <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <div class="flex items-center gap-3"><span class="gold-rule"></span><h1 class="font-display font-extrabold text-2xl sm:text-3xl">Matches</h1></div>
      <div class="flex gap-1.5">
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
    <div class="mb-6 grid items-center gap-x-3 gap-y-2.5" style="grid-template-columns: max-content 1fr">
      <span class="text-xs font-semibold text-ink/40">Group</span>
      <div class="flex overflow-x-auto pb-0.5">
        <button
          @click="activeGroup = null"
          class="seg-chip first:rounded-l-lg"
          :class="activeGroup === null ? 'seg-chip-on' : 'seg-chip-off'"
        >All</button>
        <button
          v-for="g in groups" :key="g"
          @click="activeGroup = g"
          class="seg-chip"
          :class="activeGroup === g ? 'seg-chip-on' : 'seg-chip-off'"
        >{{ g }}</button>
        <button
          @click="activeGroup = 'knockout'"
          class="seg-chip last:rounded-r-lg"
          :class="activeGroup === 'knockout' ? 'seg-chip-on' : 'seg-chip-off'"
        >KO</button>
      </div>

      <span class="text-xs font-semibold text-ink/40">Matchday</span>
      <div class="flex overflow-x-auto pb-0.5">
        <button
          @click="activeMatchday = null"
          class="seg-chip first:rounded-l-lg"
          :class="activeMatchday === null ? 'seg-chip-on' : 'seg-chip-off'"
        >All</button>
        <button
          v-for="md in matchdays" :key="md"
          @click="activeMatchday = md"
          class="seg-chip"
          :class="activeMatchday === md ? 'seg-chip-on' : 'seg-chip-off'"
        >{{ abbreviate(md) }}</button>
      </div>
    </div>

    <!-- Match list -->
    <div v-if="!loaded" class="grid md:grid-cols-2 gap-3">
      <MatchCardSkeleton v-for="n in 6" :key="n" />
    </div>

    <div v-else-if="visibleMatches.length === 0" class="empty">
      <span class="empty-icon"><Icon name="timer" :size="22" /></span>
      <p class="font-display font-bold text-ink/70">No matches match these filters</p>
      <button class="btn-secondary btn-sm" @click="resetFilters">Clear filters</button>
    </div>

    <template v-else>
      <div v-for="group in groupedByRound" :key="group.round" class="mb-8">
        <h2 class="text-xs font-bold text-ink/45 uppercase tracking-wider mb-3">
          {{ group.round }} <span class="text-ink/30">· {{ group.date }}</span>
        </h2>
        <div class="grid md:grid-cols-2 gap-3">
          <MatchCard
            v-for="match in group.matches"
            :key="match.match_no"
            :match="match"
            :prediction="matchesStore.predMap.get(match.match_no)"
            :score="matchesStore.scoreMap.get(match.match_no) ?? null"
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
import MatchCardSkeleton from '../components/MatchCardSkeleton.vue'
import Icon from '../components/Icon.vue'

const matchesStore = useMatchesStore()
const loaded = computed(() => matchesStore.matches.length > 0)

const filters = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
]
const activeFilter = ref('all')
const activeGroup = ref(null)
const activeMatchday = ref(null)

function resetFilters() {
  activeFilter.value = 'all'
  activeGroup.value = null
  activeMatchday.value = null
}

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
  if (activeGroup.value === 'knockout') ms = ms.filter(m => m.stage !== 'group')
  else if (activeGroup.value) ms = ms.filter(m => m.group === activeGroup.value)
  if (activeMatchday.value) ms = ms.filter(m => m.round_label === activeMatchday.value)

  const n = now.value
  if (activeFilter.value === 'open') ms = ms.filter(m => new Date(m.kickoff_utc) > n && m.status !== 'final')
  else if (activeFilter.value === 'upcoming') ms = ms.filter(m => new Date(m.kickoff_utc) > n)
  else if (activeFilter.value === 'results') ms = ms.filter(m => m.status === 'final')
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

let nowTimer = null
onMounted(() => { nowTimer = setInterval(() => { now.value = new Date() }, 30_000) })
onUnmounted(() => { clearInterval(nowTimer) })
</script>
