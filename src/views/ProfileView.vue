<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full grid place-items-center text-white font-display font-extrabold text-2xl shrink-0"
           :class="isSelf ? 'bg-pitch' : 'bg-ink/40'">{{ initial }}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <h1 class="font-display font-extrabold text-2xl sm:text-3xl truncate">{{ displayName }}</h1>
          <span v-if="isSelf" class="shrink-0 text-[10px] font-bold uppercase tracking-wide text-pitch bg-pitch-soft rounded-full px-1.5 py-0.5">you</span>
        </div>
        <div class="text-ink/50 text-sm flex items-center gap-2 flex-wrap">
          <span>{{ rank ? `${ordinal(rank)} of ${playerCount}` : 'Not ranked yet' }}</span>
          <span v-if="rankDelta" class="font-semibold" :class="rankDelta > 0 ? 'text-pitch' : 'text-rose-500'">
            {{ rankDelta > 0 ? `▲ ${rankDelta}` : `▼ ${-rankDelta}` }} since last round
          </span>
        </div>
      </div>
      <!-- Browse other players in ranking order -->
      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="go(-1)" :disabled="!canPrev"
          class="w-9 h-9 rounded-full border border-ink/15 grid place-items-center text-ink/60 hover:bg-pitch-soft hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink/60 transition-colors"
          aria-label="Previous player"
        >‹</button>
        <button
          @click="go(1)" :disabled="!canNext"
          class="w-9 h-9 rounded-full border border-ink/15 grid place-items-center text-ink/60 hover:bg-pitch-soft hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink/60 transition-colors"
          aria-label="Next player"
        >›</button>
      </div>
    </div>

    <!-- Headline stats — each count carries its rate/context as a subtitle, so
         nothing is repeated across tiles -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="card p-4">
        <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-1">Total points</div>
        <div class="font-display font-extrabold text-3xl text-pitch-dark tnum">{{ grandTotal }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-1">Points to #1</div>
        <div class="font-display font-extrabold text-3xl tnum" :class="rank === 1 ? 'text-gold-dark' : ''">{{ rank === 1 ? '🏆' : pointsToFirst }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-1">Result rate</div>
        <div class="font-display font-extrabold text-3xl text-pitch-dark tnum">{{ correctRate }}%</div>
        <div class="text-xs text-ink/45 mt-1 tnum">{{ correctResults }} of {{ playedCount }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-1">Exact rate 🎯</div>
        <div class="font-display font-extrabold text-3xl text-gold-dark tnum">{{ exactRate }}%</div>
        <div class="text-xs text-ink/45 mt-1 tnum">{{ exact }} of {{ playedCount }}</div>
      </div>
    </div>

    <!-- Pre-tournament picks -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display font-bold text-lg">Pre-tournament picks</h2>
        <RouterLink v-if="isSelf && !pretournamentLocked" to="/onboarding" class="text-xs text-pitch font-semibold hover:underline">{{ hasPicks ? 'Edit →' : 'Make picks →' }}</RouterLink>
        <span v-else-if="ptTotal != null" class="badge-points">{{ ptTotal }} pts</span>
      </div>
      <div v-if="!picksVisible" class="text-sm text-ink/45">
        {{ isSelf ? 'No pre-tournament picks yet.' : (pretournamentLocked ? 'No pre-tournament picks.' : 'Picks are hidden until the tournament starts.') }}
      </div>
      <div v-else class="space-y-4">
        <div>
          <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-2">Top 8</div>
          <div v-if="picks.top8?.length" class="flex flex-wrap gap-2.5">
            <Flag v-for="t in picks.top8" :key="t" :team="t" size="sm" shape="coin" :title="t" :dim="isEliminated(t)" :highlight="reachedQF(t)" />
          </div>
          <span v-else class="text-ink/30 text-sm">—</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-gold-soft/60 p-3 flex items-center gap-2.5">
            <Flag v-if="picks.winner" :team="picks.winner" size="md" shape="coin" :dim="isEliminated(picks.winner)" />
            <div class="min-w-0"><div class="text-[11px] font-bold uppercase tracking-wide text-gold-dark">Champion</div><div class="text-sm font-display font-bold truncate" :class="isEliminated(picks.winner) ? 'text-ink/60 line-through' : ''">{{ picks.winner ?? '—' }}</div></div>
          </div>
          <div class="rounded-xl bg-purple-50 p-3 flex items-center gap-2.5">
            <Flag v-if="picks.dark_horse" :team="picks.dark_horse" size="md" shape="coin" :dim="isEliminated(picks.dark_horse)" />
            <div class="min-w-0"><div class="text-[11px] font-bold uppercase tracking-wide text-purple-700">Dark horse</div><div class="text-sm font-display font-bold truncate" :class="isEliminated(picks.dark_horse) ? 'text-ink/60 line-through' : ''">{{ picks.dark_horse ?? '—' }}</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useMatchesStore } from '../stores/matches.js'
import { useLeaderboardStore } from '../stores/leaderboard.js'
import { nowMs } from '../lib/serverTime.js'
import { MATCH_1_KICKOFF } from '../config.js'
import Flag from '../components/Flag.vue'

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const lb = useLeaderboardStore()

const myId = auth.session?.user.id

// Whose stats we're viewing — defaults to me; the ‹ › pager walks the
// leaderboard in rank order so you can browse everyone's numbers.
const selectedUserId = ref(myId)
const rows = computed(() => lb.rankedRows)
const selectedIdx = computed(() => rows.value.findIndex(r => r.user_id === selectedUserId.value))
const selectedRow = computed(() => rows.value[selectedIdx.value] ?? null)
const isSelf = computed(() => selectedUserId.value === myId)
const canPrev = computed(() => selectedIdx.value > 0)
const canNext = computed(() => selectedIdx.value >= 0 && selectedIdx.value < rows.value.length - 1)
function go(delta) {
  const next = selectedIdx.value + delta
  if (next >= 0 && next < rows.value.length) selectedUserId.value = rows.value[next].user_id
}

const displayName = computed(() => selectedRow.value?.display_name ?? (isSelf.value ? auth.member?.display_name : '') ?? '')
const initial = computed(() => (displayName.value[0] ?? '?').toUpperCase())

const rankDelta = ref(null)

const rank = computed(() => selectedRow.value?.rank ?? null)
const playerCount = computed(() => rows.value.length)
const grandTotal = computed(() => selectedRow.value?.grand_total ?? 0)
const exact = computed(() => selectedRow.value?.exact_scorelines ?? 0)
const correctResults = computed(() => selectedRow.value?.correct_results ?? 0)

// Rate denominator = finals played so far (the same for everyone), so the rates
// are directly comparable between players; a skipped match counts against it.
// Exacts are a subset of correct results (scoreline_pts 7 ⊂ ≥3), so correctRate ≥ exactRate.
const playedCount = computed(() => matchesStore.matches.filter(m => m.status === 'final').length)
const exactRate = computed(() => playedCount.value ? Math.round((exact.value / playedCount.value) * 100) : 0)
const correctRate = computed(() => playedCount.value ? Math.round((correctResults.value / playedCount.value) * 100) : 0)

const leaderTotal = computed(() => rows.value.length ? Math.max(...rows.value.map(r => r.grand_total)) : 0)
const pointsToFirst = computed(() => Math.max(0, leaderTotal.value - grandTotal.value))

const pretournamentLocked = computed(() => nowMs.value >= new Date(MATCH_1_KICKOFF).getTime())

// My own full pick object lives in the matches store; everyone else's revealed
// picks come from the leaderboard store (populated once the tournament starts).
const picks = computed(() => {
  if (isSelf.value && matchesStore.pretournament) return matchesStore.pretournament
  return {
    top8: lb.top8ByUser[selectedUserId.value] ?? [],
    winner: lb.winnerByUser[selectedUserId.value] ?? null,
    dark_horse: lb.darkHorseByUser[selectedUserId.value] ?? null,
  }
})
const hasPicks = computed(() => !!(picks.value.top8?.length || picks.value.winner || picks.value.dark_horse))
const picksVisible = computed(() => hasPicks.value)
const ptTotal = computed(() => pretournamentLocked.value ? (selectedRow.value?.pretournament_pts ?? 0) : null)

// Status of a picked team: greyscale once eliminated, gold ring once it reaches
// the quarter-finals (Top-8 picks). Both derive from live match data.
const isEliminated = (team) => matchesStore.eliminatedTeams.has(team)
const reachedQF = (team) => matchesStore.quarterFinalTeams.has(team)

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

async function loadDelta(id) {
  rankDelta.value = null
  if (!id) return
  const rd = await lb.loadRankDelta(id)
  rankDelta.value = rd.delta
}

onMounted(async () => {
  if (!lb.rankedRows.length) await lb.load()
  loadDelta(selectedUserId.value)
})
watch(selectedUserId, (id) => loadDelta(id))
</script>
