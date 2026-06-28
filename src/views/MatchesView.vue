<template>
  <div>
    <!-- Sticky filter bar: negative margin absorbs main's py-6/7 so it looks identical at rest -->
    <div ref="filterBar" class="sticky z-20 bg-canvas -mt-6 sm:-mt-7 pt-6 sm:pt-7 pb-5 -mx-4 sm:-mx-5 px-4 sm:px-5" :style="{ top: 'var(--nav-h, 4rem)' }">
      <div class="flex items-center justify-between gap-4 mb-5 flex-wrap">
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
      <div class="grid items-center gap-x-3 gap-y-2.5" style="grid-template-columns: max-content 1fr">
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

        <span class="text-xs font-semibold text-ink/40">Team</span>
        <button
          @click="teamPickerOpen = true"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-ink/15 bg-white text-sm hover:border-pitch/40 hover:bg-pitch-soft/40 transition-colors w-full max-w-[14rem]"
        >
          <template v-if="activeTeam">
            <Flag :team="activeTeam" size="xs" shape="coin" />
            <span class="font-semibold truncate">{{ activeTeam }}</span>
            <span
              role="button"
              class="ml-auto text-ink/40 hover:text-ink shrink-0"
              aria-label="Clear team filter"
              @click.stop="activeTeam = null"
            >✕</span>
          </template>
          <template v-else>
            <Icon name="search" :size="15" class="text-ink/40" />
            <span class="text-ink/55">Pick a team</span>
            <span class="ml-auto text-ink/30 shrink-0">▾</span>
          </template>
        </button>
      </div>
    </div>

    <TeamFilterPopup
      v-if="teamPickerOpen"
      v-model="activeTeam"
      :teams="matchesStore.teams"
      @close="teamPickerOpen = false"
    />

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
            :ref="el => setCardRef(el, match.match_no)"
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
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useMatchesStore } from '../stores/matches.js'
import { nowMs } from '../lib/serverTime.js'
import MatchCard from '../components/MatchCard.vue'
import MatchCardSkeleton from '../components/MatchCardSkeleton.vue'
import Icon from '../components/Icon.vue'
import Flag from '../components/Flag.vue'
import TeamFilterPopup from '../components/TeamFilterPopup.vue'

const matchesStore = useMatchesStore()
const loaded = computed(() => matchesStore.matches.length > 0)

const filters = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'live', label: 'Live' },
  { id: 'results', label: 'Results' },
]
const activeFilter = ref('all')
const activeGroup = ref(null)
const activeMatchday = ref(null)
const activeTeam = ref(null)
const teamPickerOpen = ref(false)

function resetFilters() {
  activeFilter.value = 'all'
  activeGroup.value = null
  activeMatchday.value = null
  activeTeam.value = null
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

const visibleMatches = computed(() => {
  let ms = matchesStore.matches
  if (activeGroup.value === 'knockout') ms = ms.filter(m => m.stage !== 'group')
  else if (activeGroup.value) ms = ms.filter(m => m.group === activeGroup.value)
  if (activeMatchday.value) ms = ms.filter(m => m.round_label === activeMatchday.value)
  // Team filter: matches the side actually holds this team. Knockout slots carry
  // placeholder codes (e.g. "W74", "1C") until resolved, so an exact name match
  // naturally excludes ties the team hasn't reached yet.
  if (activeTeam.value) ms = ms.filter(m => m.team1 === activeTeam.value || m.team2 === activeTeam.value)

  const n = nowMs.value
  // open = predictions still open (kickoff in the future)
  // live = kicked off but no final result yet
  // results = finished
  if (activeFilter.value === 'open') ms = ms.filter(m => new Date(m.kickoff_utc).getTime() > n)
  else if (activeFilter.value === 'live') ms = ms.filter(m => new Date(m.kickoff_utc).getTime() <= n && m.status !== 'final')
  else if (activeFilter.value === 'results') ms = ms.filter(m => m.status === 'final')
  return ms
})

const targetMatchNo = computed(() => {
  const n = nowMs.value
  const ms = matchesStore.matches
  const live = ms.find(m => new Date(m.kickoff_utc).getTime() <= n && m.status !== 'final')
  if (live) return live.match_no
  const upcoming = ms.find(m => new Date(m.kickoff_utc).getTime() > n)
  return upcoming?.match_no ?? null
})

const filterBar = ref(null)
const cardRefs = ref({})
function setCardRef(el, matchNo) {
  if (el) cardRefs.value[matchNo] = el
}

const hasScrolled = ref(false)

async function scrollToTarget() {
  if (hasScrolled.value) return
  hasScrolled.value = true
  await nextTick()
  const no = targetMatchNo.value
  const el = no != null ? cardRefs.value[no] : null
  if (!el) return
  const node = el.$el ?? el
  // scroll to the round-group section (includes the h2 header above the card)
  const section = node.parentElement?.parentElement ?? node
  // Inset = the same nav height the sticky bar pins to (via --nav-h) + the bar's
  // own height + a little breathing room. Driving the landing off scroll-margin
  // lets the browser place the section under the sticky chrome, so the two never
  // disagree the way a hand-rolled offset did across breakpoints.
  const navHeight = document.querySelector('nav')?.offsetHeight ?? 0
  const barHeight = filterBar.value?.offsetHeight ?? 0
  section.style.scrollMarginTop = `${navHeight + barHeight + 10}px`
  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => { if (loaded.value) scrollToTarget() })
watch(loaded, (val) => { if (val) scrollToTarget() })

// A deliberate filter change supersedes the one-time "jump to the live match"
// autoscroll: the user is now exploring a subset, so show it from the top. Also
// marks the autoscroll as done so it can't re-fire if it hadn't yet.
watch([activeFilter, activeGroup, activeMatchday, activeTeam], () => {
  hasScrolled.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
</script>
