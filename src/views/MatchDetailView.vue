<template>
  <div v-if="match" class="max-w-2xl mx-auto">
    <!-- Header -->
    <RouterLink to="/matches" class="text-sm text-brand-600 hover:underline mb-4 inline-block">
      ← Back to matches
    </RouterLink>

    <div class="card p-6 mb-6">
      <div class="text-sm text-gray-500 mb-3">
        {{ match.round_label }} · {{ formatDate(match.kickoff_utc) }} · {{ match.ground }}
      </div>

      <div class="flex items-center justify-center gap-8">
        <div class="text-center flex-1">
          <img v-if="flagUrl(match.team1)" :src="flagUrl(match.team1)" :alt="match.team1"
            class="h-10 w-auto rounded border border-gray-200 shadow-sm object-cover mx-auto mb-2" />
          <div class="text-xl font-bold" :class="match.advancer === match.team1 ? 'text-green-700' : ''">
            {{ match.team1 }}
          </div>
        </div>

        <div class="text-center shrink-0">
          <div v-if="match.status === 'final'" class="text-3xl font-mono font-bold">
            {{ match.ft1 }}–{{ match.ft2 }}
          </div>
          <div v-else class="text-gray-400 text-lg">vs</div>
          <div v-if="match.et1 != null" class="text-sm text-gray-500">
            ({{ match.ft1 + match.et1 }}–{{ match.ft2 + match.et2 }} AET)
          </div>
          <div v-if="match.p1 != null" class="text-sm text-gray-500">
            Pen: {{ match.p1 }}–{{ match.p2 }}
          </div>
          <div v-if="match.advancer" class="mt-1 text-xs text-green-600 font-medium">
            Advances: {{ match.advancer }}
          </div>
        </div>

        <div class="text-center flex-1">
          <img v-if="flagUrl(match.team2)" :src="flagUrl(match.team2)" :alt="match.team2"
            class="h-10 w-auto rounded border border-gray-200 shadow-sm object-cover mx-auto mb-2" />
          <div class="text-xl font-bold" :class="match.advancer === match.team2 ? 'text-green-700' : ''">
            {{ match.team2 }}
          </div>
        </div>
      </div>
    </div>

    <!-- Predictions reveal (after kickoff) -->
    <div v-if="isAfterKickoff">
      <h2 class="text-lg font-bold mb-4">Predictions</h2>

      <div v-if="loading" class="text-gray-400 text-sm">Loading…</div>

      <div v-else-if="rows.length === 0" class="text-gray-400 text-sm">
        No predictions were submitted for this match.
      </div>

      <div v-else class="card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 text-gray-500 font-medium">Player</th>
              <th class="text-center px-4 py-3 text-gray-500 font-medium">Prediction</th>
              <th v-if="match.stage !== 'group'" class="text-center px-4 py-3 text-gray-500 font-medium">Advance</th>
              <th class="text-center px-4 py-3 text-gray-500 font-medium">Points</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="row in rows"
              :key="row.user_id"
              :class="row.user_id === auth.session?.user.id ? 'bg-brand-50' : 'hover:bg-gray-50'"
            >
              <td class="px-4 py-3 font-medium">
                {{ row.members?.display_name }}
                <span v-if="row.user_id === auth.session?.user.id" class="ml-1 text-xs text-brand-600">(you)</span>
              </td>
              <td class="px-4 py-3 text-center font-mono">
                {{ row.pred1 }}–{{ row.pred2 }}
              </td>
              <td v-if="match.stage !== 'group'" class="px-4 py-3 text-center text-xs">
                {{ row.pred_advancer ?? (row.pred1 > row.pred2 ? match.team1 : row.pred1 < row.pred2 ? match.team2 : '—') }}
              </td>
              <td class="px-4 py-3 text-center">
                <span v-if="scoreMap.get(row.user_id) != null" class="font-bold text-brand-700">
                  +{{ scoreMap.get(row.user_id) }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Before kickoff: own prediction only -->
    <div v-else>
      <h2 class="text-lg font-bold mb-3">Your prediction</h2>
      <div v-if="myPred" class="card p-4 flex items-center gap-4">
        <span class="font-mono text-xl font-bold">{{ myPred.pred1 }}–{{ myPred.pred2 }}</span>
        <span v-if="myPred.pred_advancer" class="text-sm text-gray-500">
          Advances: {{ myPred.pred_advancer }}
        </span>
      </div>
      <div v-else class="text-gray-400 text-sm card p-4">
        You haven't predicted this match yet.
        <RouterLink to="/matches" class="text-brand-600 underline ml-1">Go predict →</RouterLink>
      </div>
    </div>
  </div>

  <div v-else class="text-gray-400 text-center py-12">Match not found.</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useMatchesStore } from '../stores/matches.js'
import { useAuthStore } from '../stores/auth.js'
import { flagUrl } from '../lib/flags.js'

const route = useRoute()
const matchesStore = useMatchesStore()
const auth = useAuthStore()

const matchNo = computed(() => Number(route.params.matchNo))
const match = computed(() => matchesStore.matchMap.get(matchNo.value))
const myPred = computed(() => matchesStore.predMap.get(matchNo.value))
const isAfterKickoff = computed(() =>
  match.value && new Date() >= new Date(match.value.kickoff_utc)
)

const loading = ref(false)
const rows = ref([])
const scoreMap = ref(new Map())

onMounted(async () => {
  if (!isAfterKickoff.value) return
  loading.value = true
  try {
    const [preds, scores] = await Promise.all([
      matchesStore.loadMatchPredictions(matchNo.value),
      matchesStore.loadMatchScores(matchNo.value),
    ])
    rows.value = preds
    scoreMap.value = new Map(scores.map(s => [s.user_id, s.points]))
  } finally {
    loading.value = false
  }
})

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Prague', timeZoneName: 'short',
  })
}
</script>
