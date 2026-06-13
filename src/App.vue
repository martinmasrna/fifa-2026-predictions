<template>
  <div class="min-h-screen">
    <NavBar v-if="auth.member" />

    <!-- Pre-tournament nudge (hidden while actually in the onboarding flow) -->
    <div
      v-if="auth.member && showNudge"
      class="bg-gold-soft border-b border-gold/20 text-sm text-gold-dark"
    >
      <div class="max-w-6xl mx-auto px-5 py-2.5 flex items-center justify-between gap-4">
        <span class="flex items-center gap-2 font-medium">
          <Icon name="timer" :size="16" />{{ nudgeCopy }}
        </span>
        <RouterLink to="/onboarding" class="font-semibold underline whitespace-nowrap hover:text-ink">
          Finish picks →
        </RouterLink>
      </div>
    </div>

    <main class="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-7">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import NavBar from './components/NavBar.vue'
import Icon from './components/Icon.vue'
import { useAuthStore } from './stores/auth.js'
import { useMatchesStore } from './stores/matches.js'
import { startClock, nowMs } from './lib/serverTime.js'
import { MATCH_1_KICKOFF } from './config.js'

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const route = useRoute()
const router = useRouter()

// A password-reset link signs the user in with a recovery session; send them
// straight to the set-new-password screen.
watch(() => auth.recovering, (v) => { if (v) router.push('/reset-password') })

const pretournamentLocked = computed(() => nowMs.value >= new Date(MATCH_1_KICKOFF).getTime())

const nudgePicksDone = computed(() => {
  const pt = matchesStore.pretournament
  if (!pt) return 0
  return (pt.top8?.length > 0 ? 1 : 0) + (pt.winner ? 1 : 0) + (pt.dark_horse ? 1 : 0)
})

const showNudge = computed(() => {
  if (route.name === 'onboarding') return false
  if (pretournamentLocked.value) return false
  if (!auth.member) return false
  return nudgePicksDone.value < 3
})

const nudgeCopy = computed(() =>
  nudgePicksDone.value === 0
    ? 'Make your pre-tournament picks before the first kickoff!'
    : `Almost there — finish your pre-tournament picks (${nudgePicksDone.value}/3 done).`
)

// ── Live refresh ───────────────────────────────────────
// Match results and per-match points are written by the sync Action while the
// app is open. Re-pull them periodically (only while the tab is visible) and
// immediately whenever the user returns to the tab, so finished matches and
// fresh points appear without a manual reload.
const LIVE_REFRESH_MS = 45_000
let liveTimer = null

function startLiveRefresh() {
  if (liveTimer) return
  liveTimer = setInterval(() => {
    if (document.visibilityState === 'visible') matchesStore.refreshLive()
  }, LIVE_REFRESH_MS)
}
function stopLiveRefresh() {
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null }
}
function onVisibilityChange() {
  if (auth.session && document.visibilityState === 'visible') matchesStore.refreshLive()
}

// ── Session-driven data loading ─────────────────────────
// One place owns "what happens when the signed-in user changes". Keyed on the
// user id (not the session object) so hourly token refreshes — which reassign
// session with the same user — don't re-trigger a full reload. immediate:true
// covers the case where auth.init() (called from the router guard) already
// established the session before this watcher was created.
let loadGen = 0
watch(
  () => auth.session?.user?.id ?? null,
  async (userId) => {
    const gen = ++loadGen
    stopLiveRefresh()
    if (!userId) {
      matchesStore.reset()
      return
    }
    await matchesStore.loadAppData()
    if (gen !== loadGen) {
      // A newer sign-in/out superseded this load. If we've since signed out,
      // make sure this just-loaded data doesn't linger.
      if (!auth.session) matchesStore.reset()
      return
    }
    startLiveRefresh()
  },
  { immediate: true },
)

onMounted(async () => {
  startClock() // shared server-anchored clock: ticks, and re-syncs on tab focus
  document.addEventListener('visibilitychange', onVisibilityChange)
  await auth.init() // sets the session → the watcher above loads the data
})

onUnmounted(() => {
  stopLiveRefresh()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
