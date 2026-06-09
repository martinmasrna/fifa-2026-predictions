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
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import Icon from './components/Icon.vue'
import { useAuthStore } from './stores/auth.js'
import { useMatchesStore } from './stores/matches.js'
import { MATCH_1_KICKOFF } from './config.js'

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const route = useRoute()

const pretournamentLocked = computed(() => new Date() >= new Date(MATCH_1_KICKOFF))

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

onMounted(async () => {
  await auth.init()
  if (auth.session) {
    await matchesStore.loadReferenceData()
    await matchesStore.loadMatches()
    await matchesStore.loadMyPredictions()
  }
})
</script>
