<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-pitch grid place-items-center text-white font-display font-extrabold text-2xl shrink-0">{{ initial }}</div>
      <div class="min-w-0">
        <h1 class="font-display font-extrabold text-2xl sm:text-3xl truncate">{{ name }}</h1>
        <div class="text-ink/50 text-sm flex items-center gap-2 flex-wrap">
          <span>{{ rank ? `${ordinal(rank)} of ${playerCount}` : 'Not ranked yet' }}</span>
          <span v-if="rankDelta" class="font-semibold" :class="rankDelta > 0 ? 'text-pitch' : 'text-rose-500'">
            {{ rankDelta > 0 ? `▲ ${rankDelta}` : `▼ ${-rankDelta}` }} since last round
          </span>
        </div>
      </div>
    </div>

    <!-- Headline stats -->
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
        <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-1">Exact 🎯</div>
        <div class="font-display font-extrabold text-3xl text-gold-dark tnum">{{ exact }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-1">Correct results</div>
        <div class="font-display font-extrabold text-3xl tnum">{{ correctResults }}</div>
      </div>
    </div>

    <!-- Accuracy + vs group -->
    <div class="grid sm:grid-cols-2 gap-3">
      <div class="card p-5">
        <h2 class="font-display font-bold text-lg mb-4">Accuracy</h2>
        <dl class="space-y-2.5 text-sm">
          <div class="flex items-center justify-between"><dt class="text-ink/60">Matches played</dt><dd class="font-semibold tnum">{{ scoredCount }}</dd></div>
          <div class="flex items-center justify-between"><dt class="text-ink/60">Avg points / match</dt><dd class="font-semibold tnum">{{ avgPerMatch }}</dd></div>
          <div class="flex items-center justify-between"><dt class="text-ink/60">Exact-score rate</dt><dd class="font-semibold tnum">{{ exactRate }}%</dd></div>
        </dl>
      </div>

      <div class="card p-5 flex flex-col">
        <h2 class="font-display font-bold text-lg mb-4">Vs the group</h2>
        <div v-if="rank" class="flex-1 flex flex-col justify-center">
          <div class="font-display font-extrabold text-2xl" :class="vsGroup >= 0 ? 'text-pitch-dark' : 'text-ink/70'">
            {{ vsGroup >= 0 ? '+' : '' }}{{ vsGroup }} pts
          </div>
          <div class="text-sm text-ink/50 mt-0.5">{{ vsGroup >= 0 ? 'above' : 'below' }} the group average ({{ groupAvg }})</div>
        </div>
        <div v-else class="text-sm text-ink/45">No standings yet.</div>
      </div>
    </div>

    <!-- Pre-tournament picks -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display font-bold text-lg">Pre-tournament picks</h2>
        <RouterLink v-if="!pretournamentLocked" to="/onboarding" class="text-xs text-pitch font-semibold hover:underline">{{ pt ? 'Edit →' : 'Make picks →' }}</RouterLink>
        <span v-else-if="ptTotal != null" class="badge-points">{{ ptTotal }} pts</span>
      </div>
      <div v-if="!pt" class="text-sm text-ink/45">No pre-tournament picks yet.</div>
      <div v-else class="space-y-4">
        <div>
          <div class="text-xs font-bold uppercase tracking-wide text-ink/45 mb-2">Top 8</div>
          <div v-if="pt.top8?.length" class="flex flex-wrap gap-2.5">
            <Flag v-for="t in pt.top8" :key="t" :team="t" size="sm" shape="coin" :title="t" :dim="isEliminated(t)" :highlight="reachedQF(t)" />
          </div>
          <span v-else class="text-ink/30 text-sm">—</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-gold-soft/60 p-3 flex items-center gap-2.5">
            <Flag v-if="pt.winner" :team="pt.winner" size="md" shape="coin" :dim="isEliminated(pt.winner)" />
            <div class="min-w-0"><div class="text-[11px] font-bold uppercase tracking-wide text-gold-dark">Champion</div><div class="text-sm font-display font-bold truncate" :class="isEliminated(pt.winner) ? 'text-ink/40 line-through' : ''">{{ pt.winner ?? '—' }}</div></div>
          </div>
          <div class="rounded-xl bg-purple-50 p-3 flex items-center gap-2.5">
            <Flag v-if="pt.dark_horse" :team="pt.dark_horse" size="md" shape="coin" :dim="isEliminated(pt.dark_horse)" />
            <div class="min-w-0"><div class="text-[11px] font-bold uppercase tracking-wide text-purple-700">Dark horse</div><div class="text-sm font-display font-bold truncate" :class="isEliminated(pt.dark_horse) ? 'text-ink/40 line-through' : ''">{{ pt.dark_horse ?? '—' }}</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase.js'
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
const name = computed(() => auth.member?.display_name ?? '')
const initial = computed(() => (name.value[0] ?? '?').toUpperCase())

const ptScore = ref(null)
const rankDelta = ref(null)

const myRow = computed(() => lb.rankedRows.find(r => r.user_id === myId) ?? null)
const rank = computed(() => myRow.value?.rank ?? null)
const playerCount = computed(() => lb.rankedRows.length)
const grandTotal = computed(() => myRow.value?.grand_total ?? 0)
const exact = computed(() => myRow.value?.exact_scorelines ?? 0)
const correctResults = computed(() => myRow.value?.correct_results ?? 0)

// Per-match scoring (matchesStore.scores = this user's prediction_scores rows,
// one per final match — so its length is "matches played", the right denominator
// for the accuracy rates below).
const scoredCount = computed(() => matchesStore.scores.length)
const matchPoints = computed(() => matchesStore.scores.reduce((s, r) => s + (r.points ?? 0), 0))
const avgPerMatch = computed(() => scoredCount.value ? (matchPoints.value / scoredCount.value).toFixed(1) : '0.0')
const exactRate = computed(() => scoredCount.value ? Math.round((exact.value / scoredCount.value) * 100) : 0)

const leaderTotal = computed(() => lb.rankedRows.length ? Math.max(...lb.rankedRows.map(r => r.grand_total)) : 0)
const pointsToFirst = computed(() => Math.max(0, leaderTotal.value - grandTotal.value))

const groupAvg = computed(() => {
  const rows = lb.rankedRows
  if (!rows.length) return 0
  return Math.round(rows.reduce((s, r) => s + r.grand_total, 0) / rows.length)
})
const vsGroup = computed(() => grandTotal.value - groupAvg.value)

const pretournamentLocked = computed(() => nowMs.value >= new Date(MATCH_1_KICKOFF).getTime())
const pt = computed(() => matchesStore.pretournament)

// Status of a picked team: greyscale once eliminated, gold ring once it reaches
// the quarter-finals (Top-8 picks). Both derive from live match data.
const isEliminated = (team) => matchesStore.eliminatedTeams.has(team)
const reachedQF = (team) => matchesStore.quarterFinalTeams.has(team)
const ptTotal = computed(() => {
  if (!ptScore.value) return null
  return (ptScore.value.top8_pts ?? 0) + (ptScore.value.winner_pts ?? 0) + (ptScore.value.dark_horse_pts ?? 0)
})

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

onMounted(async () => {
  if (!lb.rankedRows.length) await lb.load()
  if (!myId) return
  const [ptRes, rd] = await Promise.all([
    supabase.from('pretournament_scores').select('*').eq('user_id', myId).single(),
    lb.loadRankDelta(myId),
  ])
  ptScore.value = ptRes.data ?? null
  rankDelta.value = rd.delta
})
</script>
