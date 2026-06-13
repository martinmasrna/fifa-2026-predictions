<template>
  <!-- Teleport to body so the fixed overlay is measured from the viewport, not
       from an animated ancestor (animate-fade-in holds a transform, which would
       otherwise become the containing block and clip the overlay). -->
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="$emit('close')"
      >
        <div class="card w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 pt-4 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="gold-rule"></span>
            <h3 class="font-display font-bold text-lg">How scoring works</h3>
          </div>
          <button @click="$emit('close')" class="text-ink/40 hover:text-ink text-xl leading-none px-1" aria-label="Close">✕</button>
        </div>

        <!-- Tabs -->
        <div class="flex px-5 border-b border-ink/10">
          <button
            v-for="t in tabs" :key="t.id"
            @click="tab = t.id"
            class="px-1 py-2.5 mr-5 text-sm font-semibold border-b-2 -mb-px transition-colors"
            :class="tab === t.id ? 'border-pitch text-pitch-dark' : 'border-transparent text-ink/40 hover:text-ink/70'"
          >{{ t.label }}</button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          <!-- Match scoring -->
          <div v-if="tab === 'match'" class="space-y-4">
            <p class="text-sm text-ink/55">Call the full-time score of every match — the closer you get, the more you score.</p>
            <ScoringExample />
            <div class="rounded-xl bg-pitch-soft/50 px-4 py-3 text-sm text-ink/70">
              Knockout matches add <span class="font-semibold text-ink">+{{ POINTS.knockoutAdvance }}</span> for correctly picking who advances — decided after extra time &amp; penalties.
            </div>
          </div>

          <!-- Pre-tournament scoring -->
          <div v-else class="space-y-5">
            <p class="text-sm text-ink/55">Three one-time picks, all locked at the first kickoff.</p>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-ink/80">Each Top-8 pick that reaches the quarter-finals</span>
                <span class="badge-points shrink-0">+{{ POINTS.pretournament.quarterFinalist }} pts</span>
              </div>
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-ink/80">Correct champion</span>
                <span class="badge-points shrink-0">+{{ POINTS.pretournament.champion }} pts</span>
              </div>
            </div>

            <div>
              <p class="text-sm text-ink/80 mb-2.5"><span class="font-semibold">Dark horse</span> — back one underdog; the deeper they run, the more you score:</p>
              <DarkHorseLadder orientation="vertical" />
            </div>
          </div>
        </div>

        <!-- Tiebreakers — applies to the whole leaderboard, shown on both tabs -->
        <div class="px-5 py-3 border-t border-ink/10 bg-pitch-soft/30 text-xs text-ink/55">
          <span class="font-semibold text-ink/70">Ties:</span> level on points? Most correct results wins, then most exact scorelines.
        </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { POINTS } from '../lib/scoring.js'
import ScoringExample from './ScoringExample.vue'
import DarkHorseLadder from './DarkHorseLadder.vue'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const tabs = [
  { id: 'match', label: 'Match scoring' },
  { id: 'pre', label: 'Pre-tournament' },
]
const tab = ref('match')

// Reset to the first tab each time the modal opens, and wire Esc-to-close only
// while it's open.
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    tab.value = 'match'
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}
</script>
