<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">My Predictions</h1>

    <!-- Pre-tournament section -->
    <div class="card p-5 mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Pre-tournament picks</h2>
        <div v-if="!pretournamentLocked">
          <RouterLink to="/onboarding" class="btn-secondary btn-sm">Edit</RouterLink>
        </div>
        <span v-else class="badge bg-gray-100 text-gray-500">Locked</span>
      </div>

      <div v-if="!pt" class="text-gray-400 text-sm">
        No pre-tournament picks yet.
        <RouterLink v-if="!pretournamentLocked" to="/onboarding" class="text-brand-600 underline ml-1">
          Make your picks →
        </RouterLink>
      </div>

      <div v-else class="space-y-6">
        <!-- Top 8 -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-600">Top 8 · quarter-finalists</span>
            <span v-if="ptScore" class="text-sm font-bold text-brand-700">{{ ptScore.top8_pts }} pts</span>
          </div>
          <div v-if="pt.top8?.length" class="grid grid-cols-4 gap-2">
            <div
              v-for="team in pt.top8"
              :key="team"
              class="flex flex-col items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg py-3 px-2"
            >
              <img v-if="flagUrl(team)" :src="flagUrl(team)" :alt="team" class="h-8 w-auto rounded border border-blue-200 shadow-sm object-cover" />
              <span class="text-xs font-medium text-blue-800 text-center leading-tight">{{ team }}</span>
            </div>
          </div>
          <span v-else class="text-gray-300 text-sm">—</span>
        </div>

        <!-- Winner + Dark horse side by side -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Winner -->
          <div class="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-amber-700 uppercase tracking-wide">Winner</span>
              <span v-if="ptScore" class="text-xs font-bold text-amber-700">{{ ptScore.winner_pts }} pts</span>
            </div>
            <div v-if="pt.winner" class="flex flex-col items-center gap-2">
              <img v-if="flagUrl(pt.winner)" :src="flagUrl(pt.winner)" :alt="pt.winner" class="h-12 w-auto rounded-md border border-amber-200 shadow-sm object-cover" />
              <span class="text-sm font-semibold text-amber-900 text-center">{{ pt.winner }}</span>
            </div>
            <span v-else class="text-gray-300 text-sm">—</span>
          </div>

          <!-- Dark horse -->
          <div class="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-purple-700 uppercase tracking-wide">Dark horse</span>
              <span v-if="ptScore" class="text-xs font-bold text-purple-700">{{ ptScore.dark_horse_pts }} pts</span>
            </div>
            <div v-if="pt.dark_horse" class="flex flex-col items-center gap-2">
              <img v-if="flagUrl(pt.dark_horse)" :src="flagUrl(pt.dark_horse)" :alt="pt.dark_horse" class="h-12 w-auto rounded-md border border-purple-200 shadow-sm object-cover" />
              <span class="text-sm font-semibold text-purple-900 text-center">{{ pt.dark_horse }}</span>
            </div>
            <span v-else class="text-gray-300 text-sm">—</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Match predictions -->
    <h2 class="text-lg font-semibold mb-4">Match predictions</h2>

    <div class="flex gap-2 mb-5">
      <button
        v-for="f in filters"
        :key="f.id"
        @click="filter = f.id"
        class="btn btn-sm"
        :class="filter === f.id ? 'btn-primary' : 'btn-secondary'"
      >{{ f.label }}</button>
    </div>

    <div v-if="filteredMatches.length === 0" class="text-gray-400 text-center py-8">
      Nothing here yet.
    </div>

    <template v-else>
      <div v-for="group in groupedMatches" :key="group.round" class="mb-8">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {{ group.round }} ({{ group.date }})
        </h2>
        <div class="space-y-3">
          <div
            v-for="match in group.matches"
            :key="match.match_no"
            class="card p-4"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-gray-400">Match {{ match.match_no }}</span>
              <span
                v-if="match.status === 'final'"
                class="badge bg-green-100 text-green-700"
              >FT</span>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex-1 flex items-center justify-end gap-2">
                <span class="text-sm font-medium">{{ match.team1 }}</span>
                <img v-if="flagUrl(match.team1)" :src="flagUrl(match.team1)" :alt="match.team1" class="h-5 w-auto rounded border border-gray-200 object-cover shrink-0" />
              </div>
              <div class="text-center shrink-0">
                <!-- Actual score -->
                <div v-if="match.status === 'final'" class="text-xs text-gray-400 font-mono">
                  {{ match.ft1 }}–{{ match.ft2 }}
                </div>
                <!-- Prediction -->
                <div v-if="predMap.get(match.match_no)" class="font-mono font-bold text-brand-700">
                  {{ predMap.get(match.match_no).pred1 }}–{{ predMap.get(match.match_no).pred2 }}
                </div>
                <div v-else class="text-gray-300 text-sm">—</div>
              </div>
              <div class="flex-1 flex items-center gap-2">
                <img v-if="flagUrl(match.team2)" :src="flagUrl(match.team2)" :alt="match.team2" class="h-5 w-auto rounded border border-gray-200 object-cover shrink-0" />
                <span class="text-sm font-medium">{{ match.team2 }}</span>
              </div>
              <div class="text-right">
                <span v-if="scoreMap.get(match.match_no) != null" class="badge bg-brand-100 text-brand-700 font-bold">
                  +{{ scoreMap.get(match.match_no) }}
                </span>
              </div>
            </div>
          </div>
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
import { flagUrl } from '../lib/flags.js'

const matchesStore = useMatchesStore()
const auth = useAuthStore()

const pretournamentLocked = computed(() => new Date() >= new Date(MATCH_1_KICKOFF))
const pt = computed(() => matchesStore.pretournament)
const predMap = computed(() => matchesStore.predMap)

const filter = ref('all')
const filters = [
  { id: 'all', label: 'All' },
  { id: 'scored', label: 'Scored' },
  { id: 'pending', label: 'Upcoming' },
]

const ptScore = ref(null)
const scoreMap = ref(new Map())

const filteredMatches = computed(() => {
  const ms = matchesStore.matches
  if (filter.value === 'scored') return ms.filter(m => scoreMap.value.has(m.match_no))
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

  const [scoresRes, ptScoreRes] = await Promise.all([
    supabase.from('prediction_scores').select('match_no, points').eq('user_id', uid),
    supabase.from('pretournament_scores').select('*').eq('user_id', uid).single(),
  ])

  scoreMap.value = new Map((scoresRes.data ?? []).map(s => [s.match_no, s.points]))
  ptScore.value = ptScoreRes.data ?? null
})
</script>
