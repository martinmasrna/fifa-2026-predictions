<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Knockout Bracket</h1>

    <!-- Open for prediction -->
    <div v-if="openMatches.length" class="mb-8">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Open for prediction</h2>
      <div class="space-y-3">
        <MatchCard
          v-for="m in openMatches"
          :key="m.match_no"
          :match="m"
          :prediction="matchesStore.predMap.get(m.match_no)"
          :score="matchesStore.scoreMap.get(m.match_no) ?? null"
        />
      </div>
    </div>

    <!-- Bracket -->
    <div class="overflow-x-auto pb-4">
      <div class="relative select-none" :style="`width:${TOTAL_W}px; height:${TOTAL_H}px`">

        <!-- Round labels -->
        <div
          v-for="col in COLUMNS"
          :key="col.label"
          class="absolute text-xs font-semibold text-gray-400 uppercase tracking-wider text-center"
          :style="`left:${col.x}px; top:0; width:${CARD_W}px`"
        >{{ col.label }}</div>

        <!-- SVG connector lines -->
        <svg
          class="absolute inset-0 pointer-events-none"
          :width="TOTAL_W"
          :height="TOTAL_H"
        >
          <path
            v-for="(d, i) in connectorPaths"
            :key="i"
            :d="d"
            fill="none"
            stroke="#e5e7eb"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>

        <!-- Match cards -->
        <div
          v-for="pos in matchPositions"
          :key="pos.match_no"
          class="absolute"
          :style="`left:${pos.x}px; top:${pos.y}px; width:${CARD_W}px`"
        >
          <BracketCard :match="getMatch(pos.match_no)" />
        </div>

        <!-- Third place -->
        <div
          class="absolute text-xs font-semibold text-gray-400 uppercase tracking-wider text-center"
          :style="`left:${COLUMNS[3].x}px; top:${THIRD_LABEL_Y}px; width:${CARD_W}px`"
        >3rd place</div>
        <div
          class="absolute"
          :style="`left:${COLUMNS[3].x}px; top:${THIRD_CARD_Y}px; width:${CARD_W}px`"
        >
          <BracketCard :match="getMatch(103)" />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMatchesStore } from '../stores/matches.js'
import MatchCard from '../components/MatchCard.vue'
import BracketCard from '../components/BracketCard.vue'

const matchesStore = useMatchesStore()

// ── Layout constants ──────────────────────────────────────────
const SLOT    = 64   // px allocated per R32 match slot
const CARD_W  = 155  // px match card width
const CARD_H  = 52   // px match card height (2 rows × ~24px + border)
const COL_GAP = 40   // px gap between columns (connector lines live here)
const TOP_PAD = 28   // px for round labels

const BRACKET_H = 16 * SLOT                              // 1024px
const TOTAL_W   = 5 * CARD_W + 4 * COL_GAP              // 935px
const THIRD_LABEL_Y = TOP_PAD + BRACKET_H + 20
const THIRD_CARD_Y  = THIRD_LABEL_Y + 18
const TOTAL_H   = THIRD_CARD_Y + CARD_H + 16

// ── Column definitions ────────────────────────────────────────
function colX(round) { return round * (CARD_W + COL_GAP) }

const COLUMNS = [
  { label: 'Round of 32',  x: colX(0) },
  { label: 'Round of 16',  x: colX(1) },
  { label: 'Quarter-final', x: colX(2) },
  { label: 'Semi-final',   x: colX(3) },
  { label: 'Final',        x: colX(4) },
]

// ── Bracket order (top → bottom for each round) ───────────────
// Derived from actual W74/W77/etc. references in schedule.json
const ROUNDS = [
  [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87], // R32
  [89, 90, 93, 94, 91, 92, 95, 96],                                    // R16
  [97, 98, 99, 100],                                                    // QF
  [101, 102],                                                           // SF
  [104],                                                                // Final
]

// ── Position helpers ──────────────────────────────────────────
function yCenter(round, pos) {
  const span = Math.pow(2, round)
  return TOP_PAD + pos * span * SLOT + (span * SLOT) / 2
}

// ── Match positions ───────────────────────────────────────────
const matchPositions = computed(() =>
  ROUNDS.flatMap((order, round) =>
    order.map((match_no, pos) => ({
      match_no,
      x: colX(round),
      y: yCenter(round, pos) - CARD_H / 2,
    }))
  )
)

// ── SVG connector paths ───────────────────────────────────────
const connectorPaths = computed(() => {
  const paths = []
  for (let r = 0; r < ROUNDS.length - 1; r++) {
    const midX = colX(r) + CARD_W + COL_GAP / 2
    const xRight = colX(r) + CARD_W
    const xLeft  = colX(r + 1)

    ROUNDS[r + 1].forEach((_, parentPos) => {
      const y1      = yCenter(r, parentPos * 2)
      const y2      = yCenter(r, parentPos * 2 + 1)
      const yParent = yCenter(r + 1, parentPos)
      // Bracket ∩ shape connecting two children
      paths.push(`M ${xRight} ${y1} H ${midX} V ${y2} H ${xRight}`)
      // Horizontal line from midpoint to parent
      paths.push(`M ${midX} ${yParent} H ${xLeft}`)
    })
  }
  return paths
})

// ── Helpers ───────────────────────────────────────────────────
function getMatch(matchNo) {
  return matchesStore.matchMap.get(matchNo) ?? {
    match_no: matchNo, stage: 'knockout',
    team1: 'TBD', team2: 'TBD',
    team1_resolved: false, team2_resolved: false,
    status: 'scheduled',
  }
}

const openMatches = computed(() =>
  matchesStore.knockoutMatches.filter(m =>
    m.team1_resolved && m.team2_resolved && new Date() < new Date(m.kickoff_utc)
  )
)
</script>
