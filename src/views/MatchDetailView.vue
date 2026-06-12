<template>
  <div v-if="match" class="max-w-2xl mx-auto">
    <RouterLink to="/matches" class="text-sm text-pitch font-semibold hover:underline mb-4 inline-block">
      ← Back to matches
    </RouterLink>

    <div class="card p-6 mb-6">
      <div class="text-xs text-ink/45 text-center mb-4">
        {{ match.round_label }} · {{ formatDate(match.kickoff_utc) }}<template v-if="match.ground"> · {{ match.ground }}</template>
      </div>

      <div class="flex items-center justify-center gap-6 sm:gap-10">
        <div class="text-center flex-1">
          <Flag :team="match.team1" size="xl" class="mx-auto mb-2" :dim="match.status === 'final' && match.advancer && match.advancer !== match.team1" />
          <div class="font-display font-bold text-lg" :class="winnerName(1)">{{ match.team1 }}</div>
        </div>

        <div class="text-center shrink-0">
          <div v-if="match.status === 'final'" class="font-display tnum text-4xl font-extrabold">{{ match.ft1 }}<span class="text-ink/25 mx-1">–</span>{{ match.ft2 }}</div>
          <div v-else class="text-ink/30 text-lg font-display font-bold">VS</div>
          <div v-if="match.et1 != null" class="text-xs text-ink/50 mt-1">{{ match.ft1 + match.et1 }}–{{ match.ft2 + match.et2 }} a.e.t</div>
          <div v-if="match.p1 != null" class="text-xs text-ink/50">{{ match.p1 }}–{{ match.p2 }} pens</div>
          <div v-if="match.advancer" class="mt-1.5 badge-open">{{ match.advancer }} advances</div>
        </div>

        <div class="text-center flex-1">
          <Flag :team="match.team2" size="xl" class="mx-auto mb-2" :dim="match.status === 'final' && match.advancer && match.advancer !== match.team2" />
          <div class="font-display font-bold text-lg" :class="winnerName(2)">{{ match.team2 }}</div>
        </div>
      </div>
    </div>

    <!-- Reveal (after kickoff) -->
    <div v-if="isAfterKickoff">
      <div class="flex items-center gap-3 mb-4"><span class="gold-rule"></span><h2 class="font-display font-bold text-xl">Everyone's predictions</h2></div>

      <div v-if="loading" class="card p-4 space-y-3">
        <div v-for="n in 4" :key="n" class="flex items-center gap-4">
          <div class="skeleton h-4 w-28"></div>
          <div class="skeleton h-4 w-12 ml-auto"></div>
          <div class="skeleton h-5 w-10 rounded-full"></div>
        </div>
      </div>
      <div v-else-if="loadError" class="empty">
        <span class="empty-icon"><Icon name="eye-off" :size="22" /></span>
        <p class="font-display font-bold text-ink/70">Couldn't load predictions</p>
        <p class="text-sm">Something went wrong. Please refresh to try again.</p>
      </div>
      <div v-else-if="rows.length === 0" class="empty">
        <span class="empty-icon"><Icon name="eye-off" :size="22" /></span>
        <p class="font-display font-bold text-ink/70">No predictions submitted</p>
        <p class="text-sm">Nobody picked this match before kickoff.</p>
      </div>

      <div v-else class="card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="text-ink/40 text-xs uppercase tracking-wide border-b border-ink/10">
            <tr>
              <th class="text-left px-4 py-3 font-medium">Player</th>
              <th class="text-center px-4 py-3 font-medium">Prediction</th>
              <th v-if="match.stage !== 'group'" class="text-center px-4 py-3 font-medium">Advance</th>
              <th class="text-right px-4 py-3 font-medium">Points</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/5">
            <tr
              v-for="row in sortedRows"
              :key="row.user_id"
              :class="isMe(row) ? 'bg-pitch-soft' : 'hover:bg-pitch-soft/30'"
            >
              <td class="px-4 py-3 font-semibold" :class="isMe(row) ? 'text-pitch-dark' : ''">
                {{ row.members?.display_name }}
                <span v-if="isMe(row)" class="ml-1 text-[11px] font-medium text-pitch">(you)</span>
              </td>
              <td class="px-4 py-3 text-center font-display tnum font-bold">{{ row.pred1 }}–{{ row.pred2 }}</td>
              <td v-if="match.stage !== 'group'" class="px-4 py-3 text-center text-xs text-ink/60">
                {{ row.pred_advancer ?? (row.pred1 > row.pred2 ? match.team1 : row.pred1 < row.pred2 ? match.team2 : '—') }}
              </td>
              <td class="px-4 py-3 text-right">
                <span v-if="scoreMap.get(row.user_id) != null" class="badge-points">+{{ scoreMap.get(row.user_id) }}</span>
                <span v-else class="text-ink/25">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Before kickoff: own prediction only -->
    <div v-else>
      <div class="flex items-center gap-3 mb-3"><span class="gold-rule"></span><h2 class="font-display font-bold text-xl">Your prediction</h2></div>
      <div v-if="myPred" class="card p-4 flex items-center gap-4">
        <span class="font-display tnum text-2xl font-extrabold">{{ myPred.pred1 }}–{{ myPred.pred2 }}</span>
        <span v-if="myPred.pred_advancer" class="badge-open">{{ myPred.pred_advancer }} advances</span>
      </div>
      <div v-else class="text-ink/45 text-sm card p-4">
        You haven't predicted this match yet.
        <RouterLink to="/matches" class="text-pitch font-semibold hover:underline ml-1">Go predict →</RouterLink>
      </div>
    </div>
  </div>

  <div v-else class="text-ink/40 text-center py-16">Match not found.</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useMatchesStore } from '../stores/matches.js'
import { useAuthStore } from '../stores/auth.js'
import { serverNow, syncServerTime } from '../lib/serverTime.js'
import Flag from '../components/Flag.vue'
import Icon from '../components/Icon.vue'

const route = useRoute()
const matchesStore = useMatchesStore()
const auth = useAuthStore()

const matchNo = computed(() => Number(route.params.matchNo))
const match = computed(() => matchesStore.matchMap.get(matchNo.value))
const myPred = computed(() => matchesStore.predMap.get(matchNo.value))
// Anchor to the server clock (serverNow) — never the browser's, which can be
// skewed/spoofed. offsetMs is reactive, so this recomputes once time syncs.
const isAfterKickoff = computed(() => match.value && serverNow() >= new Date(match.value.kickoff_utc).getTime())

const loading = ref(false)
const loadError = ref(false)
const rows = ref([])
const scoreMap = ref(new Map())

const isMe = (row) => row.user_id === auth.session?.user.id
const sortedRows = computed(() =>
  [...rows.value].sort((a, b) => (scoreMap.value.get(b.user_id) ?? -1) - (scoreMap.value.get(a.user_id) ?? -1))
)

function winnerName(side) {
  if (match.value.status !== 'final') return ''
  const { ft1, ft2, advancer, team1, team2 } = match.value
  if (advancer) return advancer === (side === 1 ? team1 : team2) ? 'text-pitch-dark' : 'text-ink/40'
  if (ft1 === ft2) return 'text-ink/70'
  if (side === 1) return ft1 > ft2 ? 'text-pitch-dark' : 'text-ink/40'
  return ft2 > ft1 ? 'text-pitch-dark' : 'text-ink/40'
}

onMounted(async () => {
  await syncServerTime() // ensure the clock offset is known before gating
  if (!isAfterKickoff.value) return
  loading.value = true
  loadError.value = false
  try {
    const [preds, scores] = await Promise.all([
      matchesStore.loadMatchPredictions(matchNo.value),
      matchesStore.loadMatchScores(matchNo.value),
    ])
    rows.value = preds
    scoreMap.value = new Map(scores.map(s => [s.user_id, s.points]))
  } catch (e) {
    console.error('Failed to load match predictions', e)
    loadError.value = true
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
