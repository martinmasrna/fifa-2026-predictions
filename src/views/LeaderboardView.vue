<template>
  <div class="space-y-6">
    <!-- Welcome recap — auto once per round (scorecard), reopenable as the grid -->
    <WelcomeRecap v-if="showRecap && latestRound" :round-key="latestRound" :initial-view="recapView" @dismiss="showRecap = false" />

    <!-- ══ PRE-KICKOFF STATE ══════════════════════════════ -->
    <template v-if="!pretournamentLocked">
      <!-- Hero: countdown + featured opening match -->
      <section class="hero-grad rounded-3xl p-6 md:p-9 text-white shadow-card overflow-hidden">
        <div class="grid md:grid-cols-2 gap-8 items-center relative z-10">
          <div>
            <div class="flex items-center gap-3 mb-3">
              <span class="gold-rule"></span>
              <span class="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">Kickoff in</span>
            </div>
            <div class="flex items-end gap-2.5 sm:gap-3 font-display tnum">
              <div class="text-center"><div class="text-5xl sm:text-6xl font-extrabold leading-none">{{ cd.d }}</div><div class="text-[10px] text-white/55 mt-1.5 tracking-widest">DAYS</div></div>
              <div class="text-4xl sm:text-5xl text-white/30 pb-1.5">:</div>
              <div class="text-center"><div class="text-5xl sm:text-6xl font-extrabold leading-none">{{ cd.h }}</div><div class="text-[10px] text-white/55 mt-1.5 tracking-widest">HRS</div></div>
              <div class="text-4xl sm:text-5xl text-white/30 pb-1.5">:</div>
              <div class="text-center"><div class="text-5xl sm:text-6xl font-extrabold leading-none">{{ cd.m }}</div><div class="text-[10px] text-white/55 mt-1.5 tracking-widest">MIN</div></div>
              <div class="text-4xl sm:text-5xl text-white/30 pb-1.5">:</div>
              <div class="text-center"><div class="text-5xl sm:text-6xl font-extrabold leading-none">{{ cd.s }}</div><div class="text-[10px] text-white/55 mt-1.5 tracking-widest">SEC</div></div>
            </div>
            <p class="text-white/75 text-sm mt-5 max-w-sm">Your Top 8, champion and dark horse lock the moment the first whistle blows.</p>
          </div>

          <!-- featured opening match ticket -->
          <div v-if="featuredMatch" class="ticket bg-canvas text-ink rounded-2xl p-5 shadow-2xl">
            <div class="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink/45 mb-4 pb-3 border-b border-dashed border-ink/15">
              <span>Opening match</span><span class="text-ink/25">·</span><span>{{ featuredDate }}</span>
            </div>
            <div class="flex items-center justify-center gap-5">
              <div class="flex flex-col items-center gap-2 w-24">
                <Flag :team="featuredMatch.team1" size="xl" />
                <span class="font-bold text-sm text-center">{{ featuredMatch.team1 }}</span>
              </div>
              <span class="font-display font-extrabold text-xl text-ink/30">VS</span>
              <div class="flex flex-col items-center gap-2 w-24">
                <Flag :team="featuredMatch.team2" size="xl" />
                <span class="font-bold text-sm text-center">{{ featuredMatch.team2 }}</span>
              </div>
            </div>
            <RouterLink to="/matches" class="mt-5 btn-gold w-full">Predict matches →</RouterLink>
          </div>
        </div>
      </section>

      <!-- Your picks + players -->
      <div class="grid lg:grid-cols-3 gap-6">
        <!-- your picks -->
        <div class="lg:col-span-2 card p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-display font-bold text-lg">Your pre-tournament picks</h2>
            <RouterLink to="/onboarding" class="text-xs text-pitch font-semibold hover:underline">
              {{ picksDone === 3 ? 'Edit →' : 'Finish →' }}
            </RouterLink>
          </div>
          <div v-if="picksDone === 0" class="text-sm text-ink/50 py-4 text-center">
            You haven't made your picks yet.
            <RouterLink to="/onboarding" class="text-pitch font-semibold hover:underline">Start now →</RouterLink>
          </div>
          <div v-else class="grid sm:grid-cols-3 gap-3">
            <div class="rounded-xl bg-pitch-soft/50 p-3.5">
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs font-bold uppercase tracking-wide text-ink/45">Top 8</div>
                <span v-if="pt?.top8?.length" class="text-xs font-bold tnum" :class="myTop8Pts > 0 ? 'text-pitch-dark' : 'text-ink/40'">+{{ myTop8Pts }}</span>
              </div>
              <div v-if="pt?.top8?.length" class="flex -space-x-2">
                <img
                  v-for="t in pt.top8" :key="t"
                  :src="flagUrl(t, 80)" :alt="t" :title="coinTitle(t, { champion: t === pt.winner })"
                  class="w-8 h-8 flag-coin"
                  :class="coinClass(t)"
                />
              </div>
              <span v-else class="text-ink/30 text-sm">—</span>
            </div>
            <div class="rounded-xl bg-gold-soft/60 p-3.5">
              <div class="flex items-center justify-between mb-1.5">
                <div class="text-xs font-bold uppercase tracking-wide text-gold-dark">Champion</div>
                <span v-if="myChampionState" class="text-xs font-bold tnum" :class="myChampionState === 'hit' ? 'text-gold-dark' : 'text-ink/40'">
                  {{ myChampionState === 'hit' ? `+${POINTS.pretournament.champion}` : myChampionState === 'pending' ? 'pending' : '+0' }}
                </span>
              </div>
              <div class="flex items-center gap-2.5">
                <img v-if="pt?.winner" :src="flagUrl(pt.winner, 80)" :alt="pt.winner" :title="coinTitle(pt.winner, { champion: true })" class="w-9 h-9 flag-coin" :class="coinClass(pt.winner)" />
                <span class="font-display font-bold text-sm truncate">{{ pt?.winner ?? '—' }}</span>
              </div>
            </div>
            <div class="rounded-xl bg-purple-50 p-3.5">
              <div class="flex items-center justify-between mb-1.5">
                <div class="text-xs font-bold uppercase tracking-wide text-purple-700">Dark horse</div>
                <span
                  v-if="myDarkHorse?.show"
                  class="text-[11px] font-bold leading-none px-1.5 py-0.5 rounded-full tnum"
                  :class="myDarkHorse.climbing ? 'bg-gold-soft text-gold-dark' : 'bg-ink/5 text-ink/40'"
                  :title="myDarkHorse.title"
                >{{ myDarkHorse.text }}</span>
              </div>
              <div class="flex items-center gap-2.5">
                <img v-if="pt?.dark_horse" :src="flagUrl(pt.dark_horse, 80)" :alt="pt.dark_horse" :title="myDarkHorse?.title" class="w-9 h-9 flag-coin" :class="myDarkHorse?.coinClass" />
                <span class="font-display font-bold text-sm truncate">{{ pt?.dark_horse ?? '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- players joined -->
        <div class="card p-5">
          <h2 class="font-display font-bold text-lg mb-4">{{ playerCount }} {{ playerCount === 1 ? 'player' : 'players' }} in</h2>
          <div class="flex flex-wrap gap-2 mb-4">
            <div
              v-for="(p, i) in rankedRows.slice(0, 12)"
              :key="p.user_id"
              class="w-9 h-9 rounded-full grid place-items-center text-xs font-bold text-white uppercase ring-2 ring-white"
              :class="avatarColor(i)"
              :title="p.display_name"
            >{{ p.display_name?.[0] ?? '?' }}</div>
          </div>
          <button @click="copyInvite" class="btn-secondary btn-sm w-full mb-2">
            <Icon name="users" :size="15" /> {{ inviteCopied ? 'Link copied ✓' : 'Copy invite link' }}
          </button>
          <p class="text-xs text-ink/45">Share the link to get friends in — they'll need the join code from you too.</p>
        </div>
      </div>

      <UpcomingMatches />
    </template>

    <!-- ══ LIVE STATE — standings board ═══════════════════ -->
    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3"><span class="gold-rule"></span><h1 class="font-display font-extrabold text-2xl sm:text-3xl">Leaderboard</h1></div>
        <div class="flex items-center gap-3">
          <span v-if="lb.loading" class="flex items-center gap-1.5 text-xs text-pitch font-semibold"><span class="w-2 h-2 rounded-full bg-pitch animate-pulse"></span> updating</span>
          <button v-if="latestRound" @click="recapView = 'grid'; showRecap = true" class="btn-secondary btn-sm whitespace-nowrap">
            <Icon name="trophy" :size="14" /> Recap
          </button>
          <button @click="showScoring = true" class="btn-secondary btn-sm whitespace-nowrap">
            <Icon name="eye" :size="14" /> Scoring
          </button>
        </div>
      </div>

      <!-- Needs-your-attention bar: only when picks are actually owed. Warm
           orange (a deadline "heads-up", distinct from gold/green) with a live
           pulse. The fixture list lives on /matches. -->
      <RouterLink
        v-if="pendingPicks.length"
        to="/matches"
        class="card p-4 sm:p-5 flex items-center gap-4 border border-orange-200 bg-orange-100 hover:bg-orange-200/70 transition-colors"
      >
        <span class="relative shrink-0 w-10 h-10 rounded-xl bg-orange-200 text-orange-700 grid place-items-center">
          <Icon name="timer" :size="20" />
          <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white animate-pulse"></span>
        </span>

        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-ink">
            You've got {{ pendingPicks.length }} pick{{ pendingPicks.length === 1 ? '' : 's' }} to make
          </div>
          <div class="text-sm text-ink/55 truncate">
            Next locks in <span class="text-orange-700 font-semibold">{{ nextLockIn }}</span>
            · {{ pendingPicks[0].team1 }} v {{ pendingPicks[0].team2 }}
          </div>
        </div>

        <span class="btn btn-sm shrink-0 bg-orange-600 text-white hover:bg-orange-700 hidden sm:inline-flex">Make picks →</span>
        <span class="text-orange-500 text-xl shrink-0 sm:hidden">→</span>
      </RouterLink>

      <div v-if="lb.loading && rankedRows.length === 0" class="card p-4 space-y-3.5">
        <div v-for="n in 6" :key="n" class="flex items-center gap-3">
          <div class="skeleton w-6 h-6 rounded-full"></div>
          <div class="skeleton h-4 flex-1 max-w-[10rem]"></div>
          <div class="skeleton h-4 w-8 ml-auto"></div>
        </div>
      </div>

      <div v-else-if="rankedRows.length === 0" class="empty">
        <span class="empty-icon"><Icon name="trophy" :size="22" /></span>
        <p class="font-display font-bold text-ink/70">No scores yet</p>
        <p class="text-sm">Predictions start scoring the moment matches go final.</p>
      </div>

      <div v-else class="card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="text-[11px] uppercase tracking-wider text-ink/40 border-b border-ink/10">
            <tr>
              <th class="text-center py-3 w-12 pl-2 sm:pl-5">#</th>
              <th class="text-left py-3 px-1">Player</th>
              <th class="text-center py-3 px-1 font-medium whitespace-nowrap w-full">Pre-tournament</th>
              <th class="text-center py-3 pl-4 pr-2 sm:pr-6">Total</th>
            </tr>
          </thead>
          <tbody class="tnum">
            <tr
              v-for="row in rankedRows"
              :key="row.user_id"
              class="border-t border-ink/5 transition-colors"
              :class="isMe(row) ? 'bg-pitch-soft' : 'hover:bg-pitch-soft/30'"
            >
              <td class="text-center py-3.5 pl-2 sm:pl-5 relative">
                <span v-if="isMe(row)" class="absolute left-0 top-0 bottom-0 w-1 bg-pitch"></span>
                <span v-if="row.rank === 1" class="text-xl">🥇</span>
                <span v-else-if="row.rank === 2" class="text-xl">🥈</span>
                <span v-else-if="row.rank === 3" class="text-xl">🥉</span>
                <span v-else class="text-ink/40 font-semibold">{{ row.rank }}</span>
              </td>
              <td class="py-3.5 px-1 font-semibold whitespace-nowrap" :class="isMe(row) ? 'text-pitch-dark' : ''">
                {{ row.display_name }}
              </td>
              <td class="py-3.5 px-1 w-full">
                <div class="flex items-center justify-center">
                  <!-- Top 8 coins -->
                  <div v-if="top8For(row.user_id).length" class="flex -space-x-1.5 shrink-0">
                    <span
                      v-for="t in top8For(row.user_id)" :key="t"
                      class="relative inline-block"
                    >
                      <img
                        :src="flagUrl(t, 40)" :alt="t"
                        :title="coinTitle(t, { champion: t === winnerFor(row.user_id) })"
                        class="w-5 h-5 sm:w-6 sm:h-6 flag-coin"
                        :class="coinClass(t)"
                      />
                      <!-- Crown stays inside the champion's coin (no z-index) so it
                           keeps the row's natural overlap — coins to the right paint
                           over it, coins to the left sit behind. It shares the coin's
                           circle geometry (viewBox 0 0 24 24, r=12), so its base is an
                           arc of the flag; points rise via overflow-visible. -->
                      <svg
                        v-if="t === winnerFor(row.user_id)"
                        class="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                        viewBox="0 0 24 24" fill="#D99B27" stroke="#8A5E15"
                        stroke-width="0.9" stroke-linejoin="round"
                      >
                        <path d="M2,5.4 L3,-8 L7.5,-1.5 L12,-10 L16.5,-1.5 L21,-8 L22,5.4 A12,12 0 0 0 2,5.4 Z" />
                      </svg>
                    </span>
                  </div>
                  <!-- Dark horse, set off by a one-coin-wide gap with a faint divider -->
                  <span
                    v-if="darkHorseFor(row.user_id)"
                    class="self-stretch w-px bg-ink/10 mx-[5px] sm:mx-3 shrink-0"
                  ></span>
                  <span v-if="darkHorseFor(row.user_id)" class="inline-flex items-center gap-1 shrink-0">
                    <img
                      :src="flagUrl(darkHorseFor(row.user_id), 40)"
                      :alt="darkHorseFor(row.user_id)"
                      :title="dhInfo(row.user_id).title"
                      class="w-5 h-5 sm:w-6 sm:h-6 flag-coin"
                      :class="dhInfo(row.user_id).coinClass"
                    />
                    <span
                      v-if="dhInfo(row.user_id).show"
                      class="text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full tnum"
                      :class="dhInfo(row.user_id).climbing ? 'bg-gold-soft text-gold-dark' : 'bg-ink/5 text-ink/40'"
                      :title="dhInfo(row.user_id).title"
                    >{{ dhInfo(row.user_id).text }}</span>
                  </span>
                </div>
              </td>
              <td class="text-center py-3.5 pl-4 pr-2 sm:pr-6 font-display font-extrabold text-base"
                  :class="row.rank === 1 ? 'text-gold-dark' : isMe(row) ? 'text-pitch-dark' : 'text-ink'">
                {{ row.grand_total }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-xs text-ink/40 text-right">Updates live as results come in.</p>
    </template>

    <ScoringInfoModal :open="showScoring" @close="showScoring = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useLeaderboardStore } from '../stores/leaderboard.js'
import { useAuthStore } from '../stores/auth.js'
import { useMatchesStore } from '../stores/matches.js'
import { MATCH_1_KICKOFF, CONFIG } from '../config.js'
import { nowMs as now } from '../lib/serverTime.js'
import WelcomeRecap from '../components/WelcomeRecap.vue'
import UpcomingMatches from '../components/UpcomingMatches.vue'
import Flag from '../components/Flag.vue'
import Icon from '../components/Icon.vue'
import ScoringInfoModal from '../components/ScoringInfoModal.vue'
import { flagUrl } from '../lib/flags.js'
import { POINTS } from '../lib/scoring.js'

const lb = useLeaderboardStore()
const auth = useAuthStore()
const matchesStore = useMatchesStore()
const latestRound = ref(null) // latest completed round (drives the Recap button)
const showRecap = ref(false)  // whether the welcome recap modal is open
const recapView = ref('card') // 'card' for the auto welcome, 'grid' for the Recap button
const showScoring = ref(false)

// ── Copy invite link ───────────────────────────────────
const inviteCopied = ref(false)
async function copyInvite() {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}`
  const text = `Join the ${CONFIG.poolName} World Cup 2026 pool 🏆\n${url}`
  try {
    await navigator.clipboard.writeText(text)
    inviteCopied.value = true
    setTimeout(() => { inviteCopied.value = false }, 2500)
  } catch {
    // Clipboard blocked (rare on https) — fall back to a prompt the user can copy from
    window.prompt('Copy the invite link:', text)
  }
}

const rankedRows = computed(() => lb.rankedRows)
const playerCount = computed(() => lb.rankedRows.length)
const pt = computed(() => matchesStore.pretournament)
const picksDone = computed(() => {
  const p = pt.value
  if (!p) return 0
  return (p.top8?.length > 0 ? 1 : 0) + (p.winner ? 1 : 0) + (p.dark_horse ? 1 : 0)
})

const isMe = (row) => row.user_id === auth.session?.user.id
const top8For = (userId) => [...(lb.top8ByUser[userId] ?? [])].sort((a, b) => a.localeCompare(b))
const winnerFor = (userId) => lb.winnerByUser[userId] ?? null
const darkHorseFor = (userId) => lb.darkHorseByUser[userId] ?? null

// ── Pre-tournament coin states (shared by the row + the your-picks card) ──
// A Top-8 pick rings gold once its team reaches the QF (its +15 is locked in) and
// greys out if knocked out before getting there. Reached-QF wins over eliminated,
// since a QF team has already banked its points even if it later loses the tie.
const reachedQF = (team) => matchesStore.quarterFinalTeams.has(team)
const isEliminated = (team) => matchesStore.eliminatedTeams.has(team)

function coinClass(team) {
  if (reachedQF(team)) return 'ring-2 ring-gold ring-offset-1 ring-offset-canvas'
  if (isEliminated(team)) return 'opacity-80 grayscale'
  return ''
}
function coinTitle(team, { champion = false } = {}) {
  const base = champion ? `${team} — predicted champion` : team
  if (reachedQF(team)) return `${base} · reached the quarter-finals (+${POINTS.pretournament.quarterFinalist})`
  if (isEliminated(team)) return `${base} · eliminated`
  return base
}

// Dark-horse pill: banked points + whether the tally can still grow. The coin
// greys out once the run is over; the pill is gold while it can still climb.
const DH_STAGE = {
  [POINTS.darkHorse.champion]: 'won the tournament',
  [POINTS.darkHorse.runnerUp]: 'reached the final',
  [POINTS.darkHorse.semiFinal]: 'reached the semi-final',
  [POINTS.darkHorse.quarterFinal]: 'reached the quarter-final',
  [POINTS.darkHorse.roundOf16]: 'reached the round of 16',
  [POINTS.darkHorse.roundOf32]: 'reached the round of 32',
}
function dhDisplay(team) {
  if (!team) return null
  const pts = matchesStore.darkHorsePoints(team)
  const out = isEliminated(team)
  const title = pts > 0 ? `${team} — ${DH_STAGE[pts]} (+${pts})`
    : out ? `${team} — eliminated`
    : `${team} — dark horse`
  return {
    show: pts > 0 || out,                       // something to say: banked, or done
    climbing: !out && pts < POINTS.darkHorse.champion, // still alive, not maxed
    text: pts > 0 ? `+${pts}` : '–',
    title,
    coinClass: out ? 'opacity-80 grayscale' : '',
  }
}
const dhInfo = (userId) => dhDisplay(darkHorseFor(userId))

// ── Your own banked pre-tournament points (the your-picks card breakdown) ──
const myTop8Pts = computed(() =>
  (pt.value?.top8 ?? []).filter(reachedQF).length * POINTS.pretournament.quarterFinalist
)
const championWinner = computed(() => matchesStore.pretournamentResults.tournamentWinner)
const myChampionState = computed(() => {
  if (!pt.value?.winner) return null
  if (!championWinner.value) return 'pending'
  return pt.value.winner === championWinner.value ? 'hit' : 'miss'
})
const myDarkHorse = computed(() => dhDisplay(pt.value?.dark_horse))

const AVATAR_COLORS = ['bg-pitch', 'bg-emerald-600', 'bg-rose-500', 'bg-gold', 'bg-amber-600', 'bg-sky-600', 'bg-indigo-500', 'bg-teal-600']
const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length]

// ── Countdown ──────────────────────────────────────────
// `now` is the shared reactive server clock (imported as nowMs).
const target = new Date(MATCH_1_KICKOFF).getTime()
const pretournamentLocked = computed(() => now.value >= target)
const cd = computed(() => {
  let diff = Math.max(0, target - now.value)
  const d = Math.floor(diff / 86400000); diff -= d * 86400000
  const h = Math.floor(diff / 3600000); diff -= h * 3600000
  const m = Math.floor(diff / 60000); diff -= m * 60000
  const s = Math.floor(diff / 1000)
  const p = (n) => String(n).padStart(2, '0')
  return { d: p(d), h: p(h), m: p(m), s: p(s) }
})

// ── Needs-your-attention hero ──────────────────────────
// Unpicked matches locking within the window (shared definition with the
// "Locking soon" card via the store). `now` already ticks every second below.
const pendingPicks = computed(() => matchesStore.upcomingPickable(now.value, { onlyUnpicked: true }))
const nextLockMs = computed(() =>
  pendingPicks.value.length ? new Date(pendingPicks.value[0].kickoff_utc).getTime() : null,
)
const nextLockIn = computed(() => {
  if (nextLockMs.value == null) return ''
  let d = nextLockMs.value - now.value
  if (d <= 0) return 'moments'
  const days = Math.floor(d / 86400000); d -= days * 86400000
  const h = Math.floor(d / 3600000); d -= h * 3600000
  const m = Math.floor(d / 60000)
  if (days > 0) return `${days}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
})

const featuredMatch = computed(() =>
  matchesStore.matchMap.get(1) ?? matchesStore.matches[0] ?? null
)
const featuredDate = computed(() => {
  if (!featuredMatch.value) return ''
  return new Date(featuredMatch.value.kickoff_utc).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague',
  })
})

// Show a round recap only the first time you land here after that round
// completed — afterwards it stays out of the way so the actionable surfaces own
// the top. "Seen" is remembered per round in localStorage.
const RECAP_SEEN_KEY = 'fifa.seenRoundRecap'
function readSeenRecap() { try { return localStorage.getItem(RECAP_SEEN_KEY) } catch { return null } }
function markRecapSeen(round) { try { localStorage.setItem(RECAP_SEEN_KEY, round) } catch { /* ignore */ } }

onMounted(async () => {
  await lb.load()
  lb.subscribeRealtime()

  latestRound.value = await lb.loadLatestCompletedRound()
  // Auto-open once per round on the personal scorecard; the Recap button reopens
  // straight to the everyone's-picks grid any time after.
  if (latestRound.value && readSeenRecap() !== latestRound.value) {
    recapView.value = 'card'
    showRecap.value = true
    markRecapSeen(latestRound.value)
  }
})
onUnmounted(() => {
  lb.unsubscribeRealtime()
})
</script>
