<template>
  <div class="max-w-2xl mx-auto">
    <!-- Step indicator -->
    <div class="flex items-center gap-2 mb-8">
      <template v-for="(label, i) in steps" :key="i">
        <button
          class="flex items-center gap-2"
          :class="[
            i < step ? 'text-brand-600' : i === step ? 'text-gray-900' : 'text-gray-400',
            isReachable(i) && i !== step ? 'cursor-pointer' : 'cursor-default',
          ]"
          :disabled="!isReachable(i)"
          @click="isReachable(i) && (step = i)"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
            :class="i < step
              ? 'bg-brand-600 border-brand-600 text-white'
              : i === step
                ? 'border-brand-600 text-brand-600'
                : 'border-gray-300 text-gray-400'"
          >
            <span v-if="i < step">✓</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="hidden sm:block text-sm font-medium">{{ label }}</span>
        </button>
        <div v-if="i < steps.length - 1" class="flex-1 h-0.5" :class="i < step ? 'bg-brand-600' : 'bg-gray-200'" />
      </template>
    </div>

    <!-- Step 0: How to Play -->
    <div v-if="step === 0">
      <h2 class="text-2xl font-bold mb-1">How to Play</h2>
      <p class="text-gray-500 text-sm mb-6">Here's how points are earned across the tournament.</p>

      <div class="space-y-6">
        <!-- Match predictions -->
        <div>
          <h3 class="text-base font-semibold text-gray-800 mb-1">Predict every match</h3>
          <p class="text-sm text-gray-500 mb-3">
            Guess the full-time score for each match. Knockout matches also ask who advances if you predict a draw (+3 pts if correct).
          </p>
          <table class="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead class="bg-gray-50 text-gray-500">
              <tr>
                <th class="text-left px-3 py-2 font-medium">What you get right</th>
                <th class="text-right px-3 py-2 font-medium">Points</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr><td class="px-3 py-2 text-gray-700">Exact score</td><td class="px-3 py-2 text-right font-semibold text-amber-700">7</td></tr>
              <tr><td class="px-3 py-2 text-gray-700">Right result &amp; goal difference</td><td class="px-3 py-2 text-right text-gray-700">5</td></tr>
              <tr><td class="px-3 py-2 text-gray-700">Right result &amp; one score correct</td><td class="px-3 py-2 text-right text-gray-700">4</td></tr>
              <tr><td class="px-3 py-2 text-gray-700">Right result only</td><td class="px-3 py-2 text-right text-gray-700">3</td></tr>
              <tr><td class="px-3 py-2 text-gray-700">One score correct (wrong result)</td><td class="px-3 py-2 text-right text-gray-700">1</td></tr>
              <tr><td class="px-3 py-2 text-gray-500">Complete miss</td><td class="px-3 py-2 text-right text-gray-400">0</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Pre-tournament picks -->
        <div>
          <h3 class="text-base font-semibold text-gray-800 mb-1">Three pre-tournament picks</h3>
          <p class="text-sm text-gray-500 mb-3">
            Made once before the tournament kicks off — you'll set these up next. All locked at the first whistle.
          </p>
          <div class="space-y-2">
            <div class="flex items-start gap-3 px-3 py-3 rounded-lg border border-gray-200 bg-gray-50">
              <div class="text-lg leading-none mt-0.5">🏆</div>
              <div>
                <div class="text-sm font-semibold text-gray-800">Top 8 — 15 pts each</div>
                <div class="text-xs text-gray-500">Pick 8 teams to reach the quarter-finals. Max 120 pts.</div>
              </div>
            </div>
            <div class="flex items-start gap-3 px-3 py-3 rounded-lg border border-gray-200 bg-gray-50">
              <div class="text-lg leading-none mt-0.5">⭐</div>
              <div>
                <div class="text-sm font-semibold text-gray-800">Winner — 25 pts</div>
                <div class="text-xs text-gray-500">Pick the champion from your Top 8.</div>
              </div>
            </div>
            <div class="flex items-start gap-3 px-3 py-3 rounded-lg border border-gray-200 bg-gray-50">
              <div class="text-lg leading-none mt-0.5">🐴</div>
              <div>
                <div class="text-sm font-semibold text-gray-800">Dark horse — up to 50 pts</div>
                <div class="text-xs text-gray-500">Pick one team to root for. Earns points based on how far they go: Round of 16 → 5, QF → 10, SF → 20, Final → 30, Champion → 50.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-8">
        <button @click="skipToApp" class="btn-secondary">Skip for now</button>
        <button @click="step = 1" class="btn-primary flex-1">Let's go →</button>
      </div>
    </div>

    <!-- Step 1: Top 8 -->
    <div v-if="step === 1">
      <h2 class="text-2xl font-bold mb-1">Top 8</h2>
      <p class="text-gray-500 text-sm mb-6">
        Select up to 8 teams you think will reach the quarter-finals. You will earn 15 points for each correct pick.
      </p>

      <div class="flex items-center justify-between mb-4">
        <span class="text-sm text-gray-500">{{ selected.length }}/8 selected</span>
        <span v-if="selected.length < 8" class="text-sm text-amber-600">
          You can continue with fewer than 8 teams, but you won't earn points for unpicked teams.
        </span>
      </div>

      <div v-for="group in groupedTeams" :key="group.letter" class="mb-5">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Group {{ group.letter }}</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            v-for="team in group.teams"
            :key="team.name"
            @click="toggleTeam(team.name)"
            :disabled="!selected.includes(team.name) && selected.length >= 8"
            class="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border-2 transition-all"
            :class="selected.includes(team.name)
              ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium'
              : selected.length >= 8
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-200 hover:border-gray-400 text-gray-700'"
          >
            <img
              v-if="flagUrl(team.name)"
              :src="flagUrl(team.name)"
              :alt="team.name"
              class="h-7 w-auto rounded border border-gray-200 object-cover"
            />
            <span class="text-xs text-center leading-tight">{{ team.name }}</span>
          </button>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button @click="skipToApp" class="btn-secondary">Skip for now</button>
        <button @click="continueStep1" class="btn-primary flex-1" :disabled="saving">
          {{ saving ? 'Saving…' : 'Continue →' }}
        </button>
      </div>
      <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
    </div>

    <!-- Step 2: Winner -->
    <div v-if="step === 2">
      <h2 class="text-2xl font-bold mb-1">Winner</h2>
      <p class="text-gray-500 text-sm mb-6">
        Which of your Top 8 teams will win the tournament? Correct guess will earn you 25 points.
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button
          v-for="team in selected"
          :key="team"
          @click="winner = team"
          class="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border-2 transition-all"
          :class="winner === team
            ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium'
            : 'border-gray-200 hover:border-gray-400 text-gray-700'"
        >
          <img
            v-if="flagUrl(team)"
            :src="flagUrl(team)"
            :alt="team"
            class="h-7 w-auto rounded border border-gray-200 object-cover"
          />
          <span class="text-xs text-center leading-tight">{{ team }}</span>
        </button>
      </div>

      <div class="flex gap-3">
        <button @click="step = 1" class="btn-secondary">← Back</button>
        <button @click="continueStep2" class="btn-primary flex-1" :disabled="!winner || saving">
          {{ saving ? 'Saving…' : 'Continue →' }}
        </button>
      </div>
      <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
    </div>

    <!-- Step 3: Dark horse -->
    <div v-if="step === 3">
      <h2 class="text-2xl font-bold mb-1">Dark Horse</h2>
      <p class="text-gray-500 text-sm mb-3">
        Pick a team to root for and score big if they pull off a miracle run!
      </p>
      <table class="w-full text-sm mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="text-left px-3 py-2 font-medium">Reaches</th>
            <th class="text-left px-3 py-2 font-medium">Round of 16</th>
            <th class="text-left px-3 py-2 font-medium">Quarter-final</th>
            <th class="text-left px-3 py-2 font-medium">Semi-final</th>
            <th class="text-left px-3 py-2 font-medium">Final</th>
            <th class="text-left px-3 py-2 font-medium">Champion</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr>
            <td class="px-3 py-2 text-gray-500 font-medium">Points</td>
            <td class="px-3 py-2 text-gray-700">5</td>
            <td class="px-3 py-2 text-gray-700">10</td>
            <td class="px-3 py-2 text-gray-700">20</td>
            <td class="px-3 py-2 text-gray-700">30</td>
            <td class="px-3 py-2 font-semibold text-amber-700">50</td>
          </tr>
        </tbody>
      </table>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="team in darkHorseTeams"
          :key="team.name"
          @click="darkHorse = team.name"
          class="flex items-center gap-3 px-3 py-3 rounded-lg border-2 text-left transition-all"
          :class="darkHorse === team.name
            ? 'border-brand-600 bg-brand-50'
            : 'border-gray-200 hover:border-gray-400'"
        >
          <img
            v-if="flagUrl(team.name)"
            :src="flagUrl(team.name)"
            :alt="team.name"
            class="h-10 w-auto rounded border border-gray-200 shadow-sm object-cover shrink-0"
          />
          <div>
            <div class="text-sm font-semibold" :class="darkHorse === team.name ? 'text-brand-700' : 'text-gray-800'">{{ team.name }}</div>
            <div class="text-xs text-gray-500 leading-snug">{{ team.story }}</div>
          </div>
        </button>
      </div>

      <div class="flex gap-3 mt-6">
        <button @click="step = 2" class="btn-secondary">← Back</button>
        <button @click="continueStep3" class="btn-primary flex-1" :disabled="!darkHorse || saving">
          {{ saving ? 'Saving…' : 'Submit' }}
        </button>
      </div>
      <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchesStore } from '../stores/matches.js'
import { flagUrl } from '../lib/flags.js'

const router = useRouter()
const matchesStore = useMatchesStore()

const steps = ['How to Play', 'Top 8', 'Winner', 'Dark horse']
const step = ref(0)
const selected = ref([])
const winner = ref(null)
const darkHorse = ref(null)
const saving = ref(false)
const error = ref('')

const groupedTeams = computed(() => {
  const map = new Map()
  for (const t of matchesStore.teams) {
    if (!map.has(t.group)) map.set(t.group, [])
    map.get(t.group).push(t)
  }
  return [...map.entries()].map(([letter, teams]) => ({ letter, teams }))
    .sort((a, b) => a.letter.localeCompare(b.letter))
})

const darkHorseTeams = computed(() => matchesStore.darkHorseTeams)

onMounted(() => {
  const pt = matchesStore.pretournament

  // First-time user (no record yet): show How to Play first
  if (!pt || (!pt.top8?.length && !pt.winner && !pt.dark_horse)) {
    step.value = 0
    return
  }

  // Resume at first incomplete screen, skipping How to Play
  selected.value = pt.top8 ?? []
  winner.value = pt.winner ?? null
  darkHorse.value = pt.dark_horse ?? null

  if (!pt.top8?.length) step.value = 1
  else if (!pt.winner) step.value = 2
  else if (!pt.dark_horse) step.value = 3
  else step.value = 1  // already complete — start at Top 8 for editing
})

// Steps 0 and 1 are always free; step 2 requires a Top 8 pick; step 3 requires a winner.
function isReachable(i) {
  if (i <= 1) return true
  if (i === 2) return selected.value.length > 0
  if (i === 3) return winner.value !== null
  return false
}

function toggleTeam(name) {
  const idx = selected.value.indexOf(name)
  if (idx >= 0) {
    selected.value.splice(idx, 1)
    // If the removed team was the winner, clear winner
    if (winner.value === name) winner.value = null
  } else if (selected.value.length < 8) {
    selected.value.push(name)
  }
}

async function continueStep1() {
  error.value = ''
  saving.value = true
  try {
    await matchesStore.savePretournament({ top8: [...selected.value] })
    step.value = 2
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function continueStep2() {
  error.value = ''
  saving.value = true
  try {
    await matchesStore.savePretournament({ top8: [...selected.value], winner: winner.value })
    step.value = 3
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function continueStep3() {
  error.value = ''
  saving.value = true
  try {
    await matchesStore.savePretournament({
      top8: [...selected.value],
      winner: winner.value,
      dark_horse: darkHorse.value,
    })
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function skipToApp() {
  router.push('/')
}
</script>
