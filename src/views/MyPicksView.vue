<template>
  <div>
    <div class="flex items-center gap-3 mb-6"><span class="gold-rule"></span><h1 class="font-display font-extrabold text-2xl sm:text-3xl">My Picks</h1></div>

    <!-- Pre-tournament section -->
    <div class="card p-5 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display font-bold text-lg">Pre-tournament picks</h2>
        <RouterLink v-if="!pretournamentLocked" to="/onboarding" class="btn-secondary btn-sm">Edit</RouterLink>
        <span v-else class="badge-locked">Locked</span>
      </div>

      <div v-if="!pt" class="text-ink/45 text-sm">
        No pre-tournament picks yet.
        <RouterLink v-if="!pretournamentLocked" to="/onboarding" class="text-pitch font-semibold hover:underline ml-1">Make your picks →</RouterLink>
      </div>

      <div v-else class="space-y-6">
        <!-- Top 8 -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold uppercase tracking-wide text-ink/45">Top 8 · quarter-finalists</span>
            <span v-if="ptScore" class="text-sm font-display font-bold text-pitch-dark">{{ ptScore.top8_pts }} pts</span>
          </div>
          <div v-if="pt.top8?.length" class="grid grid-cols-4 sm:grid-cols-8 gap-3">
            <div v-for="team in pt.top8" :key="team" class="flex flex-col items-center gap-1.5">
              <Flag :team="team" size="md" shape="coin" />
              <span class="text-[11px] font-medium text-center leading-tight">{{ team }}</span>
            </div>
          </div>
          <span v-else class="text-ink/30 text-sm">—</span>
        </div>

        <!-- Winner + Dark horse -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gold-soft/60 border border-gold/20 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wide text-gold-dark">Champion</span>
              <span v-if="ptScore" class="text-xs font-bold text-gold-dark">{{ ptScore.winner_pts }} pts</span>
            </div>
            <div v-if="pt.winner" class="flex flex-col items-center gap-2">
              <Flag :team="pt.winner" size="lg" shape="coin" />
              <span class="text-sm font-display font-bold text-center">{{ pt.winner }}</span>
            </div>
            <span v-else class="text-ink/30 text-sm">—</span>
          </div>

          <div class="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wide text-purple-700">Dark horse</span>
              <span v-if="ptScore" class="text-xs font-bold text-purple-700">{{ ptScore.dark_horse_pts }} pts</span>
            </div>
            <div v-if="pt.dark_horse" class="flex flex-col items-center gap-2">
              <Flag :team="pt.dark_horse" size="lg" shape="coin" />
              <span class="text-sm font-display font-bold text-center">{{ pt.dark_horse }}</span>
            </div>
            <span v-else class="text-ink/30 text-sm">—</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Match predictions -->
    <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <h2 class="font-display font-bold text-lg">Match predictions</h2>
      <div class="flex gap-1.5">
        <button
          v-for="f in filters" :key="f.id"
          @click="filter = f.id"
          class="btn btn-sm"
          :class="filter === f.id ? 'btn-primary' : 'btn-secondary'"
        >{{ f.label }}</button>
      </div>
    </div>

    <div v-if="!loaded" class="grid md:grid-cols-2 gap-3">
      <MatchCardSkeleton v-for="n in 4" :key="n" />
    </div>

    <div v-else-if="filteredMatches.length === 0" class="empty">
      <span class="empty-icon"><Icon name="check" :size="22" /></span>
      <p class="font-display font-bold text-ink/70">
        {{ filter === 'scored' ? 'No scored matches yet' : 'Nothing here yet' }}
      </p>
      <p class="text-sm">{{ filter === 'scored' ? 'Points show up here once results come in.' : 'Your predictions will appear here.' }}</p>
    </div>

    <template v-else>
      <div v-for="group in groupedMatches" :key="group.round" class="mb-8">
        <h3 class="text-xs font-bold text-ink/45 uppercase tracking-wider mb-3">
          {{ group.round }} <span class="text-ink/30">· {{ group.date }}</span>
        </h3>
        <div class="grid md:grid-cols-2 gap-3">
          <MatchCard
            v-for="match in group.matches"
            :key="match.match_no"
            :match="match"
            :prediction="predMap.get(match.match_no)"
            :score="matchesStore.scoreMap.get(match.match_no) ?? null"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useMatchesStore } from '../stores/matches.js'
import { useAuthStore } from '../stores/auth.js'
import { supabase } from '../lib/supabase.js'
import { MATCH_1_KICKOFF } from '../config.js'
import { serverNow } from '../lib/serverTime.js'
import MatchCard from '../components/MatchCard.vue'
import MatchCardSkeleton from '../components/MatchCardSkeleton.vue'
import Icon from '../components/Icon.vue'
import Flag from '../components/Flag.vue'

const matchesStore = useMatchesStore()
const auth = useAuthStore()
const loaded = computed(() => matchesStore.matches.length > 0)

const pretournamentLocked = computed(() => serverNow() >= new Date(MATCH_1_KICKOFF).getTime())
const pt = computed(() => matchesStore.pretournament)
const predMap = computed(() => matchesStore.predMap)

const filter = ref('all')
const filters = [
  { id: 'all', label: 'All' },
  { id: 'scored', label: 'Scored' },
  { id: 'pending', label: 'Upcoming' },
]

const ptScore = ref(null)

const filteredMatches = computed(() => {
  const ms = matchesStore.matches
  if (filter.value === 'scored') return ms.filter(m => matchesStore.scoreMap.has(m.match_no))
  if (filter.value === 'pending') return ms.filter(m => m.status !== 'final' && predMap.value.has(m.match_no))
  return ms
})

const groupedMatches = computed(() => {
  const map = new Map()
  for (const m of filteredMatches.value) {
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

onMounted(async () => {
  const uid = auth.session?.user.id
  if (!uid) return
  const { data } = await supabase.from('pretournament_scores').select('*').eq('user_id', uid).single()
  ptScore.value = data ?? null
})
</script>
