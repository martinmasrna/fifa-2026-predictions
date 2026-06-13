<template>
  <div class="pb-28">
    <!-- Step indicator -->
    <div v-if="step < 4" class="max-w-2xl mx-auto flex items-center gap-2 mb-8">
      <template v-for="(label, i) in steps" :key="i">
        <button
          class="flex items-center gap-2"
          :class="[isReachable(i) && i !== step ? 'cursor-pointer' : 'cursor-default']"
          :disabled="!isReachable(i)"
          @click="isReachable(i) && (step = i)"
        >
          <div
            class="w-7 h-7 rounded-full grid place-items-center text-xs font-bold border-2 transition-colors"
            :class="i < step
              ? 'bg-pitch border-pitch text-white'
              : i === step
                ? 'border-pitch text-pitch'
                : 'border-ink/20 text-ink/30'"
          >
            <span v-if="i < step">✓</span><span v-else>{{ i + 1 }}</span>
          </div>
          <span class="hidden sm:block text-sm font-semibold" :class="i === step ? 'text-ink' : i < step ? 'text-pitch' : 'text-ink/35'">{{ label }}</span>
        </button>
        <div v-if="i < steps.length - 1" class="flex-1 h-0.5 rounded" :class="i < step ? 'bg-pitch' : 'bg-ink/10'" />
      </template>
    </div>

    <!-- ── Step 0: How to Play ───────────────────────────── -->
    <div v-if="step === 0" class="max-w-3xl mx-auto animate-fade-in">
      <div class="flex items-center gap-3 mb-1"><span class="gold-rule"></span><h2 class="font-display font-extrabold text-3xl">How to play</h2></div>
      <p class="text-ink/50 text-sm mb-7">Quick rundown of how you score.</p>

      <div class="space-y-7">
        <div>
          <h3 class="font-display font-bold text-lg mb-1">Predict every match</h3>
          <p class="text-sm text-ink/55 mb-3">Call the full-time score of every match — the closer you get, the more you score. Knockout games add <span class="font-semibold text-ink/70">+{{ POINTS.knockoutAdvance }}</span> for correctly picking who goes through.</p>
          <ScoringExample />
        </div>

        <div class="rounded-xl bg-gold-soft/60 border border-gold/20 px-4 py-3.5 text-sm text-ink/70">
          Before you start predicting matches, there are <span class="font-semibold text-ink">3 one-time pre-tournament picks</span> to make — we'll walk through each next. They all lock at the first whistle.
        </div>
      </div>

      <div class="flex items-center justify-between mt-8">
        <button @click="skipToApp" class="text-sm text-ink/45 hover:text-ink">Skip for now</button>
        <button @click="step = 1" class="btn-primary btn-lg">Let's go →</button>
      </div>
    </div>

    <!-- ── Step 1: Top 8 ─────────────────────────────────── -->
    <div v-if="step === 1" class="max-w-5xl mx-auto animate-fade-in">
      <div class="flex items-center gap-3 mb-1"><span class="gold-rule"></span><h2 class="font-display font-extrabold text-3xl">Your Top 8</h2></div>
      <p class="text-ink/50 text-sm mb-6">Pick the 8 teams you think will reach the quarter-finals — {{ POINTS.pretournament.quarterFinalist }} points for each one that makes it.</p>

      <div v-for="group in groupedTeams" :key="group.letter" class="mb-5">
        <h3 class="text-xs font-bold text-ink/40 uppercase tracking-wider mb-2">Group {{ group.letter }}</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <button
            v-for="team in group.teams"
            :key="team.name"
            @click="toggleTeam(team.name)"
            :disabled="!selected.includes(team.name) && selected.length >= 8"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
            :class="selected.includes(team.name)
              ? 'border-pitch bg-pitch-soft shadow-card'
              : selected.length >= 8
                ? 'border-ink/10 text-ink/30 cursor-not-allowed'
                : 'border-ink/10 hover:border-pitch/40 hover:bg-pitch-soft/40'"
          >
            <Flag :team="team.name" size="sm" :dim="!selected.includes(team.name) && selected.length >= 8" />
            <span class="text-sm font-semibold truncate" :class="selected.includes(team.name) ? 'text-pitch-dark' : ''">{{ team.name }}</span>
            <span v-if="selected.includes(team.name)" class="ml-auto text-pitch">✓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Step 2: Winner ────────────────────────────────── -->
    <div v-if="step === 2" class="max-w-3xl mx-auto animate-fade-in">
      <div class="flex items-center gap-3 mb-1"><span class="gold-rule"></span><h2 class="font-display font-extrabold text-3xl">Your champion</h2></div>
      <p class="text-ink/50 text-sm mb-6">Which of your Top 8 lifts the trophy? Worth {{ POINTS.pretournament.champion }} points if you call it.</p>

      <!-- chosen champion spotlight -->
      <div v-if="winner" class="card bg-gold-soft/60 border-gold/20 p-5 mb-6 flex items-center gap-4 animate-pop">
        <Flag :team="winner" size="xl" />
        <div>
          <div class="text-xs font-bold uppercase tracking-wider text-gold-dark">Your champion</div>
          <div class="font-display font-extrabold text-2xl">{{ winner }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          v-for="team in selected"
          :key="team"
          @click="winner = team"
          class="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 transition-all"
          :class="winner === team ? 'border-gold bg-gold-soft shadow-card' : 'border-ink/10 hover:border-gold/40 hover:bg-gold-soft/40'"
        >
          <Flag :team="team" size="lg" />
          <span class="text-xs font-semibold text-center leading-tight">{{ team }}</span>
        </button>
      </div>
    </div>

    <!-- ── Step 3: Dark horse ────────────────────────────── -->
    <div v-if="step === 3" class="max-w-3xl mx-auto animate-fade-in">
      <div class="flex items-center gap-3 mb-1"><span class="gold-rule"></span><h2 class="font-display font-extrabold text-3xl">Your dark horse</h2></div>
      <p class="text-ink/50 text-sm mb-4">Back one underdog to go the distance. The deeper they run, the more you score.</p>

      <!-- points ladder -->
      <DarkHorseLadder class="mb-6" />

      <div class="grid sm:grid-cols-2 gap-3">
        <button
          v-for="team in darkHorseTeams"
          :key="team.name"
          @click="darkHorse = team.name"
          class="flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all"
          :class="darkHorse === team.name ? 'border-pitch bg-pitch-soft shadow-card' : 'border-ink/10 hover:border-pitch/40 hover:bg-pitch-soft/40'"
        >
          <Flag :team="team.name" size="lg" />
          <div class="min-w-0">
            <div class="font-display font-bold text-sm" :class="darkHorse === team.name ? 'text-pitch-dark' : ''">{{ team.name }}</div>
            <div class="text-xs text-ink/55 leading-snug mt-0.5">{{ team.story }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- ── Step 4: Confirmation finale ───────────────────── -->
    <div v-if="step === 4" class="max-w-2xl mx-auto text-center animate-fade-in">
      <div class="text-5xl mb-3 animate-pop">🎉</div>
      <h2 class="font-display font-extrabold text-3xl mb-1">You're locked in!</h2>
      <p class="text-ink/50 text-sm mb-8">You can tweak your picks from <span class="font-semibold text-ink/70">My Picks</span> right up until the first whistle.</p>

      <div class="card p-6 text-left space-y-6">
        <div>
          <div class="text-xs font-bold uppercase tracking-wider text-ink/40 mb-3">Top 8 · quarter-finalists</div>
          <div class="grid grid-cols-4 gap-2.5">
            <div v-for="t in selected" :key="t" class="flex flex-col items-center gap-1.5 bg-pitch-soft/50 rounded-xl py-3 px-1">
              <Flag :team="t" size="md" />
              <span class="text-[11px] font-semibold text-center leading-tight">{{ t }}</span>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gold-soft/60 border border-gold/20 rounded-xl p-4 flex flex-col items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-gold-dark">Champion</span>
            <Flag :team="winner" size="lg" />
            <span class="font-display font-bold text-sm">{{ winner }}</span>
          </div>
          <div class="bg-purple-50 border border-purple-100 rounded-xl p-4 flex flex-col items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-purple-700">Dark horse</span>
            <Flag :team="darkHorse" size="lg" />
            <span class="font-display font-bold text-sm">{{ darkHorse }}</span>
          </div>
        </div>
      </div>

      <button @click="skipToApp" class="btn-primary btn-lg w-full mt-6">See the leaderboard →</button>
    </div>

    <!-- ── Sticky action bar (steps 1–3) ─────────────────── -->
    <div v-if="step >= 1 && step <= 3" class="fixed bottom-0 inset-x-0 z-20 bg-canvas/90 backdrop-blur border-t border-ink/10">
      <div class="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <button v-if="step > 1" @click="step--" class="btn-secondary btn-sm">← Back</button>
          <span v-if="step === 1" class="text-sm font-semibold" :class="selected.length === 8 ? 'text-pitch' : 'text-ink/60'">
            {{ selected.length }}/8 selected
          </span>
          <span v-else-if="step === 2 && !winner" class="text-sm text-ink/50">Pick your champion</span>
          <span v-else-if="step === 3 && !darkHorse" class="text-sm text-ink/50">Pick a dark horse</span>
          <span v-else class="text-sm text-pitch font-semibold truncate">Ready ✓</span>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button @click="skipToApp" class="text-sm text-ink/40 hover:text-ink hidden sm:block">Skip for now</button>
          <button
            @click="advance"
            class="btn-primary"
            :disabled="saving || (step === 2 && !winner) || (step === 3 && !darkHorse)"
          >{{ saving ? 'Saving…' : step === 3 ? 'Finish →' : 'Continue →' }}</button>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-red-600 text-sm mt-3 text-center">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import confetti from 'canvas-confetti'
import { useMatchesStore } from '../stores/matches.js'
import { POINTS } from '../lib/scoring.js'
import Flag from '../components/Flag.vue'
import ScoringExample from '../components/ScoringExample.vue'
import DarkHorseLadder from '../components/DarkHorseLadder.vue'

const router = useRouter()
const matchesStore = useMatchesStore()

const steps = ['How to play', 'Top 8', 'Winner', 'Dark horse']
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
  if (!pt || (!pt.top8?.length && !pt.winner && !pt.dark_horse)) {
    step.value = 0
    return
  }
  selected.value = pt.top8 ?? []
  winner.value = pt.winner ?? null
  darkHorse.value = pt.dark_horse ?? null
  if (!pt.top8?.length) step.value = 1
  else if (!pt.winner) step.value = 2
  else if (!pt.dark_horse) step.value = 3
  else step.value = 1
})

function isReachable(i) {
  // Dark horse (3) is independent of the Top 8 / champion, so it's always reachable.
  if (i === 3) return true
  if (i <= 1) return true
  if (i === 2) return selected.value.length > 0 // champion is picked from your Top 8
  return false
}

function toggleTeam(name) {
  const idx = selected.value.indexOf(name)
  if (idx >= 0) {
    selected.value.splice(idx, 1)
    if (winner.value === name) winner.value = null
  } else if (selected.value.length < 8) {
    selected.value.push(name)
  }
}

async function advance() {
  error.value = ''
  saving.value = true
  try {
    if (step.value === 1) {
      // Persist winner too: toggleTeam clears it when the champion's team is
      // removed from the Top 8, and we want that to stick.
      await matchesStore.savePretournament({ top8: [...selected.value], winner: winner.value })
      step.value = 2
    } else if (step.value === 2) {
      await matchesStore.savePretournament({ top8: [...selected.value], winner: winner.value })
      step.value = 3
    } else if (step.value === 3) {
      await matchesStore.savePretournament({ top8: [...selected.value], winner: winner.value, dark_horse: darkHorse.value })
      step.value = 4
    }
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function skipToApp() {
  router.push('/')
}

// 🎉 Celebrate when picks are locked in (the finale). Respects reduced motion.
watch(step, (s) => {
  if (s !== 4) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#138A52', '#0E6E41', '#D99B27', '#FBF1DC']
  confetti({ particleCount: 130, spread: 80, startVelocity: 42, origin: { y: 0.4 }, colors })
  setTimeout(() => confetti({ particleCount: 70, spread: 110, scalar: 0.9, origin: { y: 0.45 }, colors }), 220)
})
</script>
