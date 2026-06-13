<template>
  <div v-if="upcoming.length" class="card p-5">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3"><span class="gold-rule"></span><h2 class="font-display font-bold text-lg">Locking soon</h2></div>
      <span v-if="pendingCount" class="badge bg-gold-soft text-gold-dark font-bold">{{ pendingCount }} need{{ pendingCount === 1 ? 's' : '' }} a pick</span>
      <span v-else class="badge-open">All picked ✓</span>
    </div>

    <div class="divide-y divide-ink/5">
      <RouterLink
        v-for="m in upcoming" :key="m.match_no"
        to="/matches"
        class="block py-2.5 px-2 -mx-2 rounded-lg hover:bg-pitch-soft/30 transition-colors"
      >
        <!-- Mobile: two lines so team names have full width -->
        <div class="sm:hidden flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-ink/45">{{ kickoffLabel(m) }}</span>
            <span
              class="text-xs font-semibold"
              :class="predMap.has(m.match_no) ? 'text-pitch' : 'text-gold-dark'"
            >{{ predMap.has(m.match_no) ? 'Picked ✓' : 'Predict →' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Flag :team="m.team1" size="xs" />
            <span class="text-sm font-medium truncate flex-1">{{ m.team1 }}</span>
            <span class="text-ink/25 text-xs shrink-0">v</span>
            <span class="text-sm font-medium truncate flex-1 text-right">{{ m.team2 }}</span>
            <Flag :team="m.team2" size="xs" />
          </div>
        </div>

        <!-- Desktop: single tidy row -->
        <div
          class="hidden sm:grid items-center gap-x-3"
          style="grid-template-columns: 4rem minmax(0,1fr) auto minmax(0,1fr) 5.5rem"
        >
          <span class="text-[11px] text-ink/45">{{ kickoffLabel(m) }}</span>

          <span class="w-full flex items-center justify-end gap-2 min-w-0">
            <span class="text-sm font-medium truncate">{{ m.team1 }}</span>
            <Flag :team="m.team1" size="xs" />
          </span>

          <span class="text-ink/25 text-xs">v</span>

          <span class="w-full flex items-center gap-2 min-w-0">
            <Flag :team="m.team2" size="xs" />
            <span class="text-sm font-medium truncate">{{ m.team2 }}</span>
          </span>

          <span
            class="text-xs font-semibold text-right"
            :class="predMap.has(m.match_no) ? 'text-pitch' : 'text-gold-dark'"
          >{{ predMap.has(m.match_no) ? 'Picked ✓' : 'Predict →' }}</span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useMatchesStore } from '../stores/matches.js'
import { serverNow } from '../lib/serverTime.js'
import Flag from './Flag.vue'

const matchesStore = useMatchesStore()
const predMap = computed(() => matchesStore.predMap)

const WINDOW_MS = 72 * 3600 * 1000 // show matches kicking off within the next 3 days
const now = ref(serverNow())

const upcoming = computed(() => {
  const n = now.value
  return matchesStore.matches
    .filter(m =>
      m.status !== 'final' &&
      m.team1_resolved !== false && m.team2_resolved !== false && // skip unresolved knockout slots
      (() => { const k = new Date(m.kickoff_utc).getTime(); return k > n && k - n <= WINDOW_MS })()
    )
    .sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc))
    .slice(0, 6)
})

const pendingCount = computed(() => upcoming.value.filter(m => !predMap.value.has(m.match_no)).length)

function kickoffLabel(m) {
  return new Date(m.kickoff_utc).toLocaleString('en-GB', {
    weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague',
  })
}

let timer = null
onMounted(() => { timer = setInterval(() => { now.value = serverNow() }, 30_000) })
onUnmounted(() => clearInterval(timer))
</script>
