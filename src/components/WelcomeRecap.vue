<template>
  <Teleport to="body">
    <transition name="fade">
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="$emit('dismiss')">
        <div class="card w-full max-h-[88vh] flex flex-col overflow-hidden transition-[max-width]"
             :class="view === 'grid' ? 'max-w-2xl' : 'max-w-md'">

          <!-- Header -->
          <div class="flex items-start justify-between px-6 pt-5 pb-3">
            <div>
              <div class="font-display font-extrabold text-2xl">
                {{ view === 'grid' ? "Everyone's picks" : `Welcome back, ${name} 👋` }}
              </div>
              <div class="text-sm text-ink/45">{{ roundKey }} · {{ view === 'grid' ? 'full breakdown' : 'how you did' }}</div>
            </div>
            <button @click="$emit('dismiss')" class="text-ink/40 hover:text-ink text-xl leading-none p-1 -mr-1" aria-label="Close">✕</button>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="px-6 py-10 space-y-3">
            <div v-for="n in 4" :key="n" class="skeleton h-5 w-full rounded"></div>
          </div>

          <!-- ── Scorecard ── -->
          <template v-else-if="view === 'card'">
            <div class="px-6 overflow-y-auto flex-1 min-h-0">
              <div class="text-center py-4">
                <div class="font-display font-extrabold text-5xl text-pitch-dark tnum">+{{ myTotal }}</div>
                <div class="text-sm text-ink/55 mt-1">
                  points
                  <template v-if="rankDelta !== null && rankDelta !== 0">
                    · <span :class="rankDelta > 0 ? 'text-pitch' : 'text-red-500'" class="font-semibold">{{ rankDelta > 0 ? `▲ up ${rankDelta}` : `▼ down ${-rankDelta}` }}</span>
                  </template>
                  <template v-if="myRank"> to {{ ordinal(myRank) }}</template>
                </div>
              </div>

              <div class="divide-y divide-ink/5">
                <div v-for="m in matches" :key="m.match_no" class="flex items-center gap-3 py-2.5 text-sm">
                  <div class="flex items-center gap-1.5 flex-1 min-w-0">
                    <Flag :team="m.team1" size="xs" />
                    <span class="font-medium tnum">{{ m.ft1 }}–{{ m.ft2 }}</span>
                    <Flag :team="m.team2" size="xs" />
                  </div>
                  <span class="text-ink/45 text-xs shrink-0">you {{ cellFor(myId, m).pred }}</span>
                  <span class="font-display font-bold w-12 text-right shrink-0"
                        :class="cellFor(myId, m).exact ? 'text-gold-dark' : cellFor(myId, m).pts ? 'text-ink' : 'text-ink/30'">
                    {{ cellFor(myId, m).exact ? '🎯' : '' }} +{{ cellFor(myId, m).pts }}
                  </span>
                </div>
              </div>
            </div>
            <div class="px-6 py-4 mt-auto space-y-2 border-t border-ink/5">
              <button @click="view = 'grid'" class="btn-secondary w-full">See everyone's picks →</button>
              <button @click="$emit('dismiss')" class="btn-primary btn-lg w-full">Let's go →</button>
            </div>
          </template>

          <!-- ── Full breakdown grid ── -->
          <template v-else>
            <div class="py-2 overflow-auto flex-1 min-h-0">
              <table class="text-sm w-full" :style="{ minWidth: 120 + matches.length * 70 + 'px' }">
                <thead>
                  <tr class="text-[11px] uppercase tracking-wide text-ink/45">
                    <th class="text-left py-2 pr-2 pl-6 sticky left-0 bg-white z-10">Player</th>
                    <th v-for="m in matches" :key="m.match_no" class="px-1.5 py-2 text-center font-semibold">
                      <div>{{ code(m.team1) }}–{{ code(m.team2) }}</div>
                      <div class="font-display font-bold text-ink tnum">{{ m.ft1 }}–{{ m.ft2 }}</div>
                    </th>
                    <th class="pl-2 pr-6 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ink/5">
                  <tr v-for="row in rows" :key="row.user_id" :class="row.user_id === myId ? 'bg-pitch-soft' : ''">
                    <td class="relative py-2.5 pr-2 pl-6 font-semibold whitespace-nowrap sticky left-0 z-10"
                        :class="row.user_id === myId ? 'bg-pitch-soft text-pitch-dark' : 'bg-white'">
                      <span v-if="row.user_id === myId" class="absolute left-0 top-0 bottom-0 w-1 bg-pitch"></span>
                      <span v-if="row.winner">🏆 </span>{{ row.display_name }}
                    </td>
                    <td v-for="m in matches" :key="m.match_no" class="px-1.5 py-2.5 text-center tnum" :class="cellClass(cellFor(row.user_id, m))">
                      {{ cellFor(row.user_id, m).pred }}
                    </td>
                    <td class="pl-2 pr-6 py-2.5 text-center font-display font-extrabold tnum">{{ row.total }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="px-6 py-4 mt-auto border-t border-ink/5">
              <button v-if="initialView === 'card'" @click="view = 'card'" class="btn-secondary btn-sm">← Back to my recap</button>
              <button v-else @click="$emit('dismiss')" class="btn-secondary btn-sm">Close</button>
            </div>
          </template>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useMatchesStore } from '../stores/matches.js'
import { useAuthStore } from '../stores/auth.js'
import { useLeaderboardStore } from '../stores/leaderboard.js'
import Flag from './Flag.vue'

const props = defineProps({
  roundKey: { type: String, required: true },
  initialView: { type: String, default: 'card' }, // 'card' (welcome) | 'grid' (everyone's picks)
})
const emit = defineEmits(['dismiss'])

const matchesStore = useMatchesStore()
const auth = useAuthStore()
const lb = useLeaderboardStore()

const myId = auth.session?.user.id
const name = auth.member?.display_name ?? 'back'

const loading = ref(true)
const view = ref(props.initialView)
const matches = ref([])
const rows = ref([])
const myTotal = ref(0)
const myRank = ref(null)
const rankDelta = ref(null)

// per (user_id, match_no) lookups
const predByKey = new Map()
const ptsByKey = new Map()
const key = (uid, no) => `${uid}:${no}`

function cellFor(uid, m) {
  const p = predByKey.get(key(uid, m.match_no))
  const pts = ptsByKey.get(key(uid, m.match_no)) ?? 0
  const exact = !!p && p.pred1 === m.ft1 && p.pred2 === m.ft2
  return { pred: p ? `${p.pred1}–${p.pred2}` : '—', pts, exact }
}
// Encode point-strength in the TEXT channel only (no cell backgrounds — those
// are reserved for row highlighting, so the two never clash). More points →
// heavier/darker; an exact hit is the only one that earns the gold accent.
function cellClass(c) {
  if (c.exact) return 'font-extrabold text-gold-dark' // 7 — nailed the scoreline
  if (c.pts >= 4) return 'font-semibold text-ink'     // 4–5 — strong
  if (c.pts > 0) return 'text-ink/70'                 // 1–3 — partial
  return 'text-ink/30'                                // 0 / no pick — faded
}
const code = (n) => n.slice(0, 3).toUpperCase()
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - n % 10 === 10 || n % 10 > 3) ? 0 : n % 10]}`

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  try {
    matches.value = matchesStore.matches
      .filter(m => m.round_label === props.roundKey && m.status === 'final')
      .sort((a, b) => a.match_no - b.match_no)
    const matchNos = matches.value.map(m => m.match_no)
    if (!matchNos.length) { emit('dismiss'); return }

    const [predRes, scoreRes, memberRes, thisSnap, allSnaps] = await Promise.all([
      supabase.from('predictions').select('user_id, match_no, pred1, pred2').in('match_no', matchNos),
      supabase.from('prediction_scores').select('user_id, match_no, points').in('match_no', matchNos),
      supabase.from('members').select('user_id, display_name'),
      lb.loadRoundRecap(props.roundKey),
      supabase.from('standings_snapshots').select('round_key, captured_at').order('captured_at', { ascending: false }).limit(60),
    ])

    for (const p of predRes.data ?? []) predByKey.set(key(p.user_id, p.match_no), p)
    for (const s of scoreRes.data ?? []) ptsByKey.set(key(s.user_id, s.match_no), s.points)

    // Per-member round rows, sorted by round points
    const built = (memberRes.data ?? []).map(mem => {
      const total = matches.value.reduce((sum, m) => sum + (ptsByKey.get(key(mem.user_id, m.match_no)) ?? 0), 0)
      return { user_id: mem.user_id, display_name: mem.display_name, total }
    }).sort((a, b) => b.total - a.total)
    const maxTotal = built[0]?.total ?? 0
    rows.value = built.map(r => ({ ...r, winner: maxTotal > 0 && r.total === maxTotal }))

    myTotal.value = built.find(r => r.user_id === myId)?.total ?? 0

    // Rank + delta from snapshots
    myRank.value = (thisSnap ?? []).find(s => s.user_id === myId)?.rank ?? null
    const roundsDesc = [...new Set((allSnaps.data ?? []).map(s => s.round_key))]
    const prevKey = roundsDesc[roundsDesc.indexOf(props.roundKey) + 1] ?? null
    if (prevKey && myRank.value != null) {
      const prevSnap = await lb.loadRoundRecap(prevKey)
      const prevRank = prevSnap.find(s => s.user_id === myId)?.rank
      if (prevRank != null) rankDelta.value = prevRank - myRank.value
    }
  } catch (e) {
    console.error('WelcomeRecap load failed', e)
    emit('dismiss') // never trap the user behind a broken modal
  } finally {
    loading.value = false
  }
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

function onKeydown(e) { if (e.key === 'Escape') emit('dismiss') }
</script>
