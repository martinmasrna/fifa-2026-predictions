<template>
  <div ref="wrap" class="w-full select-none">
    <!-- Empty state — snapshots only exist once a round has fully completed -->
    <div v-if="!loading && rounds.length === 0" class="text-sm text-ink/45 py-8 text-center">
      Progression will appear after the first round completes.
    </div>

    <div v-else-if="loading" class="skeleton h-[240px] w-full rounded-xl"></div>

    <template v-else>
      <svg :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" class="overflow-visible">
        <!-- horizontal gridlines + Y labels; the 'avg' line (0) is emphasised -->
        <g v-for="g in yGuides" :key="g.label">
          <line :x1="PAD.l" :y1="g.y" :x2="width - PAD.r" :y2="g.y" stroke="#10261C" :stroke-opacity="g.zero ? 0.2 : 0.07" />
          <text :x="PAD.l - 6" :y="g.y + 3" text-anchor="end" class="tnum" font-size="9" fill="#10261C" :fill-opacity="g.zero ? 0.55 : 0.4">{{ g.label }}</text>
        </g>

        <!-- active-round guide -->
        <line v-if="activeI !== null" :x1="xFor(activeI)" :y1="PAD.t" :x2="xFor(activeI)" :y2="PAD.t + plotH"
              stroke="#138A52" stroke-opacity="0.35" stroke-dasharray="3 3" />

        <!-- every other line, faint; greys right out when one line is focused -->
        <polyline v-for="s in faintSeries" :key="s.userId" :points="s.pts" fill="none"
                  :stroke="focusActive ? '#10261C' : colorFor(s.userId)"
                  :stroke-opacity="focusActive ? 0.1 : 0.4" stroke-width="1.2"
                  stroke-linejoin="round" stroke-linecap="round" />

        <!-- emphasised line (hovered legend name, else selected) on top -->
        <template v-if="emphasized">
          <polyline :points="emphasized.pts" fill="none" :stroke="colorFor(emphasizedId)" stroke-width="2.75"
                    stroke-linejoin="round" stroke-linecap="round" />
          <circle v-for="(d, i) in emphasized.dots" :key="i" :cx="d.x" :cy="d.y" r="3" :fill="colorFor(emphasizedId)" />
        </template>

        <!-- X-axis labels -->
        <text v-for="(rk, i) in cols" :key="'x' + i" :x="xFor(i)" :y="HEIGHT - 8"
              text-anchor="middle" font-size="9"
              :fill="activeI === i ? '#0E6E41' : '#10261C'"
              :fill-opacity="activeI === i ? 1 : 0.45"
              :font-weight="activeI === i ? 700 : 400"
              v-show="i === 0 || i === cols.length - 1 || i % labelStep === 0">{{ abbrev(rk) }}</text>

        <!-- hover/tap targets: one full-height column per real round. Hover scrubs
             the recap; tap pins it (so it works without a hover on touch). -->
        <rect v-for="i in roundIdx" :key="'hit' + i" :x="xFor(i) - colW / 2" :y="PAD.t"
              :width="colW" :height="plotH" fill="transparent" class="cursor-pointer"
              @click="pinI = pinI === i ? null : i"
              @mouseenter="hoverI = i" @mouseleave="hoverI = null" />
      </svg>

      <!-- legend — colour ↔ player; click to highlight (mirrors the ‹ › pager) -->
      <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        <button v-for="l in legend" :key="l.userId" type="button"
                @click="$emit('select-user', l.userId)"
                @mouseenter="hoverFocusId = l.userId" @mouseleave="hoverFocusId = null"
                class="flex items-center gap-1.5 text-xs transition-colors"
                :class="l.userId === selectedUserId ? 'font-bold text-ink' : 'text-ink/55 hover:text-ink'">
          <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                :class="l.userId === selectedUserId ? 'ring-2 ring-offset-1 ring-ink/20' : ''"
                :style="{ background: l.color }"></span>
          {{ l.name }}
        </button>
      </div>

      <!-- inline recap for the active round — visible alongside the graph -->
      <RoundRecap class="mt-3" :round-key="activeRoundKey" :selected-user-id="selectedUserId" :players="legend" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLeaderboardStore } from '../stores/leaderboard.js'
import RoundRecap from './RoundRecap.vue'

const props = defineProps({
  selectedUserId: { type: String, default: null },
})
defineEmits(['select-user'])

const lb = useLeaderboardStore()

// Categorical palette (Tableau10 + Dark2) — distinct hues that read on cream.
// Cycles if the pool is larger than the palette; the legend disambiguates.
const PALETTE = [
  '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
  '#B07AA1', '#9C755F', '#EDC948', '#1B9E77', '#D95F02',
  '#7570B3', '#E7298A', '#66A61E', '#2C3E50', '#D6336C', '#16A085',
]

const HEIGHT = 360
const PAD = { l: 28, r: 12, t: 12, b: 28 }

const wrap = ref(null)
const width = ref(320)
const loading = ref(true)
const rounds = ref([]) // chronological round keys (X axis, excl. the implicit "Start")
const byUser = ref({}) // user_id -> { round_key -> cumulative total }
// Active round = whichever column the cursor is over (hover scrubs), falling back
// to the pinned column for touch (tap to pin, since there's no hover on mobile).
const hoverI = ref(null)
const pinI = ref(null)
const activeI = computed(() => hoverI.value ?? pinI.value)

let ro = null
onMounted(async () => {
  ro = new ResizeObserver(([e]) => { width.value = e.contentRect.width })
  ro.observe(wrap.value)
  width.value = wrap.value.clientWidth || 320
  try {
    const data = await lb.loadProgression()
    rounds.value = data.rounds
    byUser.value = data.byUser
  } finally {
    loading.value = false
  }
})
onUnmounted(() => ro?.disconnect())

// Columns = a zero baseline ("Start") + each completed round.
const cols = computed(() => ['Start', ...rounds.value])
const roundIdx = computed(() => cols.value.map((_, i) => i).filter(i => i > 0))
const plotW = computed(() => Math.max(0, width.value - PAD.l - PAD.r))
const plotH = HEIGHT - PAD.t - PAD.b
const colW = computed(() => cols.value.length > 1 ? plotW.value / (cols.value.length - 1) : plotW.value)

// The field's average cumulative total at each column — the "pack" baseline.
const averages = computed(() =>
  cols.value.map((_, i) => {
    const ids = userIds.value
    if (!ids.length) return 0
    let sum = 0
    for (const uid of ids) sum += rawValueAt(uid, i)
    return sum / ids.length
  })
)

// Each player is plotted as points above/below the pack average that round, so
// the lines fan out around 0 instead of all sloping up together.
function devAt(uid, i) {
  return rawValueAt(uid, i) - averages.value[i]
}

// Symmetric domain so the 0 (average) line sits in the vertical middle.
const maxAbsDev = computed(() => {
  let m = 0
  for (const uid of userIds.value)
    for (let i = 0; i < cols.value.length; i++) {
      const d = Math.abs(devAt(uid, i))
      if (d > m) m = d
    }
  return Math.max(1, m)
})

function xFor(i) {
  if (cols.value.length <= 1) return PAD.l + plotW.value / 2
  return PAD.l + (plotW.value * i) / (cols.value.length - 1)
}
function yFor(dev) {
  return PAD.t + plotH / 2 - (plotH / 2) * (dev / maxAbsDev.value)
}

// Cumulative value for a user at column i (0 = Start). Carries the last known
// total forward so a late joiner's line stays flat rather than dropping to 0.
function rawValueAt(uid, i) {
  if (i === 0) return 0
  const u = byUser.value[uid] ?? {}
  for (let j = i; j >= 1; j--) {
    const v = u[cols.value[j]]
    if (v != null) return v
  }
  return 0
}

function buildSeries(uid) {
  const dots = cols.value.map((_, i) => ({ x: xFor(i), y: yFor(devAt(uid, i)) }))
  return { userId: uid, dots, pts: dots.map(d => `${d.x},${d.y}`).join(' ') }
}
const userIds = computed(() => Object.keys(byUser.value))

// Stable colour per player: ordered by rank (so the legend reads top-down), with
// any snapshot users missing from the live board appended.
const nameFor = (uid) => lb.rankedRows.find(r => r.user_id === uid)?.display_name ?? '—'
const orderedIds = computed(() => {
  const ranked = lb.rankedRows.map(r => r.user_id).filter(id => byUser.value[id])
  const extras = userIds.value.filter(id => !ranked.includes(id))
  return [...ranked, ...extras]
})
const colorByUser = computed(() => {
  const m = {}
  orderedIds.value.forEach((id, i) => { m[id] = PALETTE[i % PALETTE.length] })
  return m
})
const colorFor = (uid) => colorByUser.value[uid] ?? '#10261C'
const legend = computed(() => orderedIds.value.map(uid => ({ userId: uid, name: nameFor(uid), color: colorFor(uid) })))

// Focus interaction: hovering a legend name isolates that line; otherwise the
// selected player is emphasised. Everything else fades so a single line is traceable.
const hoverFocusId = ref(null)
const focusActive = computed(() => hoverFocusId.value != null)
const emphasizedId = computed(() => hoverFocusId.value ?? props.selectedUserId)
const allSeries = computed(() => orderedIds.value.map(buildSeries))
const faintSeries = computed(() => allSeries.value.filter(s => s.userId !== emphasizedId.value))
const emphasized = computed(() => emphasizedId.value && byUser.value[emphasizedId.value] ? buildSeries(emphasizedId.value) : null)

// The round key under the cursor/pin (column 0 is the "Start" baseline → no recap).
const activeRoundKey = computed(() => activeI.value != null && activeI.value > 0 ? cols.value[activeI.value] : null)

// Show every label when they fit; thin them out on narrow screens.
const labelStep = computed(() => Math.max(1, Math.ceil(28 / Math.max(1, colW.value))))

const yGuides = computed(() => {
  const m = Math.round(maxAbsDev.value)
  return [
    { y: yFor(m), label: `+${m}` },
    { y: yFor(0), label: 'avg', zero: true },
    { y: yFor(-m), label: `-${m}` },
  ]
})

function abbrev(rk) {
  if (rk === 'Start') return 'Start'
  // Knockout matchday, e.g. "Round of 32 · Matchday 2" → "R32·2"
  const ko = /^Round of (32|16)\b.*Matchday (\d+)$/.exec(rk)
  if (ko) return `R${ko[1]}·${ko[2]}`
  const md = /^Matchday (\d+)$/.exec(rk)
  if (md) return 'MD' + md[1]
  return {
    'Round of 32': 'R32',
    'Round of 16': 'R16',
    'Quarter-final': 'QF',
    'Semi-final': 'SF',
    'Third place': '3rd',
    'Final': 'F',
  }[rk] ?? rk.slice(0, 3)
}
</script>
