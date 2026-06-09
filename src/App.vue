<template>
  <div class="min-h-screen">
    <NavBar v-if="auth.member" />

    <!-- Pre-tournament nudge -->
    <div
      v-if="auth.member && showNudge"
      class="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between"
    >
      <span>⚽ {{ nudgeCopy }}</span>
      <RouterLink to="/onboarding" class="underline font-medium ml-4 whitespace-nowrap">
        Finish picks →
      </RouterLink>
    </div>

    <main class="max-w-4xl mx-auto px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { RouterView, RouterLink } from 'vue-router'
import NavBar from './components/NavBar.vue'
import { useAuthStore } from './stores/auth.js'
import { useMatchesStore } from './stores/matches.js'
import { MATCH_1_KICKOFF } from './config.js'

const auth = useAuthStore()
const matchesStore = useMatchesStore()

const pretournamentLocked = computed(() => new Date() >= new Date(MATCH_1_KICKOFF))

const nudgePicksDone = computed(() => {
  const pt = matchesStore.pretournament
  if (!pt) return 0
  return (pt.top8?.length > 0 ? 1 : 0) + (pt.winner ? 1 : 0) + (pt.dark_horse ? 1 : 0)
})

const showNudge = computed(() => {
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
