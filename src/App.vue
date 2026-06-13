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
import { syncServerTime, serverNow } from './lib/serverTime.js'
import { MATCH_1_KICKOFF } from './config.js'

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const route = useRoute()
const router = useRouter()

// A password-reset link signs the user in with a recovery session; send them
// straight to the set-new-password screen.
watch(() => auth.recovering, (v) => { if (v) router.push('/reset-password') })

const pretournamentLocked = computed(() => serverNow() >= new Date(MATCH_1_KICKOFF).getTime())

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

function tickRefresh() {
  if (document.visibilityState === 'visible') matchesStore.refreshLive()
}
function onVisibilityChange() {
  if (document.visibilityState === 'visible') matchesStore.refreshLive()
}

onMounted(async () => {
  syncServerTime() // fire-and-forget; anchors countdown/locks to the server clock
  await auth.init()
  if (auth.session) {
    await matchesStore.loadReferenceData()
    await matchesStore.loadMatches()
    await matchesStore.loadMyPredictions()

    liveTimer = setInterval(tickRefresh, LIVE_REFRESH_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
})

onUnmounted(() => {
  if (liveTimer) clearInterval(liveTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
