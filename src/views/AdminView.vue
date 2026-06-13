<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Admin</h1>

    <!-- Sync status -->
    <div class="card p-5 mb-6">
      <h2 class="text-lg font-semibold mb-3">Sync status</h2>
      <div v-if="syncStatus">
        <div class="flex items-center gap-3">
          <div
            class="w-2.5 h-2.5 rounded-full"
            :class="syncStatus.last_error ? 'bg-red-500' : 'bg-green-500'"
          />
          <span class="text-sm">
            Last sync: <strong>{{ syncAgo }}</strong>
          </span>
        </div>
        <div v-if="syncStatus.last_error" class="mt-2 text-sm text-red-600 bg-red-50 rounded p-2">
          {{ syncStatus.last_error }}
        </div>
      </div>
      <div v-else class="text-gray-400 text-sm">Loading…</div>
    </div>

    <!-- Result override -->
    <div class="card p-5 mb-6">
      <h2 class="text-lg font-semibold mb-4">Result override</h2>
      <p class="text-sm text-gray-500 mb-4">
        Sets <code>result_source = manual</code> and rescores this match right away — the leaderboard updates live.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Match</label>
          <select v-model="overrideMatchNo" class="input">
            <option :value="null">Select a match…</option>
            <option v-for="m in allMatches" :key="m.match_no" :value="m.match_no">
              #{{ m.match_no }} — {{ m.team1 }} vs {{ m.team2 }} ({{ m.round_label }})
            </option>
          </select>
        </div>
      </div>

      <template v-if="overrideMatch">
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">{{ overrideMatch.team1 }} FT</label>
            <input v-model.number="ovFt1" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">{{ overrideMatch.team2 }} FT</label>
            <input v-model.number="ovFt2" type="number" min="0" class="input" />
          </div>
          <template v-if="overrideMatch.stage !== 'group'">
            <div>
              <label class="block text-xs text-gray-500 mb-1">{{ overrideMatch.team1 }} ET</label>
              <input v-model.number="ovEt1" type="number" min="0" class="input" placeholder="—" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">{{ overrideMatch.team2 }} ET</label>
              <input v-model.number="ovEt2" type="number" min="0" class="input" placeholder="—" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">{{ overrideMatch.team1 }} Pen</label>
              <input v-model.number="ovP1" type="number" min="0" class="input" placeholder="—" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">{{ overrideMatch.team2 }} Pen</label>
              <input v-model.number="ovP2" type="number" min="0" class="input" placeholder="—" />
            </div>
          </template>
        </div>

        <div v-if="overrideMatch.stage !== 'group'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Advancer</label>
          <div class="flex gap-3">
            <button
              @click="ovAdvancer = overrideMatch.team1"
              class="btn btn-sm"
              :class="ovAdvancer === overrideMatch.team1 ? 'btn-primary' : 'btn-secondary'"
            >{{ overrideMatch.team1 }}</button>
            <button
              @click="ovAdvancer = overrideMatch.team2"
              class="btn btn-sm"
              :class="ovAdvancer === overrideMatch.team2 ? 'btn-primary' : 'btn-secondary'"
            >{{ overrideMatch.team2 }}</button>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="applyOverride"
            :disabled="ovFt1 == null || ovFt2 == null || overrideSaving"
            class="btn-primary"
          >{{ overrideSaving ? 'Saving…' : 'Apply override' }}</button>
          <button @click="clearOverride" class="btn-secondary">Cancel</button>
        </div>
        <p v-if="overrideError" class="text-red-600 text-sm mt-2">{{ overrideError }}</p>
        <p v-if="overrideSuccess" class="text-green-600 text-sm mt-2">{{ overrideSuccess }}</p>
      </template>
    </div>

    <!-- Knockout slot resolution -->
    <div class="card p-5 mb-6">
      <h2 class="text-lg font-semibold mb-4">Knockout slot resolution</h2>
      <p class="text-sm text-gray-500 mb-4">
        Manually set team names for a match when the feed is slow.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Match</label>
          <select v-model="slotMatchNo" class="input">
            <option :value="null">Select a knockout match…</option>
            <option
              v-for="m in unresolvedKnockouts"
              :key="m.match_no"
              :value="m.match_no"
            >#{{ m.match_no }} — {{ m.team1 }} vs {{ m.team2 }}</option>
          </select>
        </div>
      </div>

      <template v-if="slotMatch">
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Team 1</label>
            <input v-model="slotTeam1" type="text" class="input" :placeholder="slotMatch.team1" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Team 2</label>
            <input v-model="slotTeam2" type="text" class="input" :placeholder="slotMatch.team2" />
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="applySlot" :disabled="slotSaving" class="btn-primary">
            {{ slotSaving ? 'Saving…' : 'Set teams' }}
          </button>
          <button @click="slotMatchNo = null" class="btn-secondary">Cancel</button>
        </div>
        <p v-if="slotError" class="text-red-600 text-sm mt-2">{{ slotError }}</p>
        <p v-if="slotSuccess" class="text-green-600 text-sm mt-2">{{ slotSuccess }}</p>
      </template>
    </div>

    <!-- Members -->
    <div class="card p-5">
      <h2 class="text-lg font-semibold mb-4">Members</h2>

      <div class="space-y-2 mb-4">
        <div
          v-for="member in members"
          :key="member.user_id"
          class="flex items-center justify-between p-3 rounded-lg bg-gray-50"
        >
          <div>
            <span class="font-medium">{{ member.display_name }}</span>
            <span v-if="member.is_owner" class="ml-2 badge bg-amber-100 text-amber-700">Owner</span>
            <div class="text-xs text-gray-400">{{ member.email }}</div>
          </div>
          <button
            v-if="!member.is_owner"
            @click="confirmRemove(member)"
            class="btn-danger btn-sm"
          >Remove</button>
        </div>
      </div>

      <div class="border-t border-gray-200 pt-4">
        <h3 class="text-sm font-medium text-gray-700 mb-2">Rotate join code</h3>
        <p class="text-xs text-gray-500 mb-3">
          Removed members still know the old code. Generate a new hash and redeploy to lock them out.
        </p>
        <details class="text-xs text-gray-600">
          <summary class="cursor-pointer text-pitch underline">How to rotate</summary>
          <ol class="mt-2 space-y-1 list-decimal pl-4">
            <li>Choose a new join code</li>
            <li>Run: <code class="bg-gray-100 px-1 rounded">node -e "import('bcryptjs').then(b => b.default.hash('NEWCODE', 10).then(console.log))"</code></li>
            <li>Paste the hash into <code class="bg-gray-100 px-1 rounded">src/config.js → joinCodeHash</code></li>
            <li>Push to main — the deploy Action rebuilds and the new code takes effect</li>
          </ol>
        </details>
      </div>
    </div>

    <!-- Remove confirmation modal -->
    <div
      v-if="removeTarget"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="card p-6 w-full max-w-sm">
        <h3 class="font-bold text-lg mb-2">Remove {{ removeTarget.display_name }}?</h3>
        <p class="text-sm text-gray-500 mb-6">
          Removes them from the pool and deletes their predictions &amp; scores. Their login still
          exists in Supabase Auth — delete it there (and/or rotate the join code) for a full lockout.
          Cannot be undone.
        </p>
        <div class="flex gap-3">
          <button @click="removeTarget = null" class="btn-secondary flex-1">Cancel</button>
          <button @click="removeMember" :disabled="removeSaving" class="btn-danger flex-1">
            {{ removeSaving ? 'Removing…' : 'Remove' }}
          </button>
        </div>
        <p v-if="removeError" class="text-red-600 text-sm mt-2">{{ removeError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useMatchesStore } from '../stores/matches.js'
import { nowMs } from '../lib/serverTime.js'
import { scoreGroupMatch, scoreKnockoutMatch, scorePretournament, buildPretournamentResults } from '../lib/scoring.js'

const matchesStore = useMatchesStore()

const syncStatus = ref(null)
const members = ref([])
const allMatches = computed(() => matchesStore.matches)

// Result override state
const overrideMatchNo = ref(null)
const overrideMatch = computed(() => allMatches.value.find(m => m.match_no === overrideMatchNo.value))
const ovFt1 = ref(null)
const ovFt2 = ref(null)
const ovEt1 = ref(null)
const ovEt2 = ref(null)
const ovP1 = ref(null)
const ovP2 = ref(null)
const ovAdvancer = ref(null)
const overrideSaving = ref(false)
const overrideError = ref('')
const overrideSuccess = ref('')

// Slot resolution state
const slotMatchNo = ref(null)
const slotMatch = computed(() => allMatches.value.find(m => m.match_no === slotMatchNo.value))
const slotTeam1 = ref('')
const slotTeam2 = ref('')
const slotSaving = ref(false)
const slotError = ref('')
const slotSuccess = ref('')

const unresolvedKnockouts = computed(() =>
  allMatches.value.filter(m => m.stage !== 'group' && (!m.team1_resolved || !m.team2_resolved))
)

// Member removal
const removeTarget = ref(null)
const removeSaving = ref(false)
const removeError = ref('')

const syncAgo = computed(() => {
  if (!syncStatus.value?.last_sync_at) return 'never'
  // Anchor to the server clock — the browser's may be skewed, which would make
  // a fresh sync look hours stale (or vice-versa).
  const diff = nowMs.value - new Date(syncStatus.value.last_sync_at).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
})

onMounted(async () => {
  const [syncRes, membersRes] = await Promise.all([
    supabase.from('sync_status').select('*').single(),
    supabase.from('members').select('*').order('joined_at'),
  ])
  syncStatus.value = syncRes.data
  members.value = membersRes.data ?? []

  // Auto-refresh sync status every 30s
  syncTimer = setInterval(async () => {
    const { data } = await supabase.from('sync_status').select('*').single()
    syncStatus.value = data
  }, 30_000)
})

let syncTimer = null
onUnmounted(() => { clearInterval(syncTimer) })

function clearOverride() {
  overrideMatchNo.value = null
  ovFt1.value = null; ovFt2.value = null
  ovEt1.value = null; ovEt2.value = null
  ovP1.value = null; ovP2.value = null
  ovAdvancer.value = null
  overrideError.value = ''
  overrideSuccess.value = ''
}

async function applyOverride() {
  overrideError.value = ''
  overrideSuccess.value = ''
  overrideSaving.value = true
  try {
    const update = {
      ft1: ovFt1.value,
      ft2: ovFt2.value,
      et1: ovEt1.value ?? null,
      et2: ovEt2.value ?? null,
      p1: ovP1.value ?? null,
      p2: ovP2.value ?? null,
      advancer: ovAdvancer.value ?? null,
      result_source: 'manual',
      status: 'final',
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('matches')
      .update(update)
      .eq('match_no', overrideMatchNo.value)
    if (error) throw error
    await matchesStore.loadMatches()
    // Rescore this match immediately so the leaderboard/match-detail update now.
    // Best-effort: the saved result is what matters, so if the rescore fails
    // (e.g. the apply_match_scores migration isn't applied yet) we fall back to
    // the next Action run rather than report the whole save as failed.
    try {
      await rescoreMatch(overrideMatchNo.value)
      overrideSuccess.value = 'Result saved and scores updated.'
    } catch (e) {
      console.warn('Immediate rescore failed; will update on next sync', e)
      overrideSuccess.value = 'Result saved. Scores will update on the next sync (≤10 min).'
    }
  } catch (e) {
    overrideError.value = e.message
  } finally {
    overrideSaving.value = false
  }
}

// Recompute prediction_scores for one match (every member) using the shared
// scoring module, then persist via the owner-only apply_match_scores RPC. The
// leaderboard subscribes to prediction_scores, so it updates live for everyone.
async function rescoreMatch(matchNo) {
  const match = matchesStore.matchMap.get(matchNo)
  if (!match || match.status !== 'final') return

  const [membersRes, predsRes] = await Promise.all([
    supabase.from('members').select('user_id'),
    supabase.from('predictions').select('user_id, pred1, pred2, pred_advancer').eq('match_no', matchNo),
  ])
  if (membersRes.error) throw membersRes.error
  if (predsRes.error) throw predsRes.error

  const predByUser = new Map((predsRes.data ?? []).map(p => [p.user_id, p]))
  const isGroup = match.stage === 'group'

  const scores = (membersRes.data ?? []).map(({ user_id }) => {
    const pred = predByUser.get(user_id)
    let scoreline = 0, advance = 0
    if (pred && pred.pred1 != null && pred.pred2 != null) {
      if (isGroup) {
        scoreline = scoreGroupMatch({ g1: pred.pred1, g2: pred.pred2 }, { g1: match.ft1, g2: match.ft2 })
      } else {
        const r = scoreKnockoutMatch(
          { g1: pred.pred1, g2: pred.pred2, pred_advancer: pred.pred_advancer },
          {
            ft: { g1: match.ft1, g2: match.ft2 },
            et: match.et1 != null ? { g1: match.et1, g2: match.et2 } : undefined,
            p: match.p1 != null ? { g1: match.p1, g2: match.p2 } : undefined,
            team1: match.team1,
            team2: match.team2,
          },
        )
        scoreline = r.scoreline
        advance = r.advance
      }
    }
    return { user_id, match_no: matchNo, points: scoreline + advance, scoreline_pts: scoreline, advance_pts: advance }
  })

  const { error } = await supabase.rpc('apply_match_scores', { p_scores: scores })
  if (error) throw error

  // A knockout result can change the bracket (who reached the QF/SF/final), which
  // shifts pre-tournament scoring (Top-8, champion, dark horse). Group results
  // never affect it, so only rescore pre-tournament for knockouts.
  if (!isGroup) await rescorePretournament()

  // Reflect the owner's own updated points locally too.
  await matchesStore.loadMyPredictions()
}

// Recompute every member's pre-tournament scores from the current bracket state
// and persist via the owner-only apply_pretournament_scores RPC.
async function rescorePretournament() {
  const reality = buildPretournamentResults(matchesStore.matches)
  const { data: ptPreds, error } = await supabase
    .from('pretournament_predictions')
    .select('user_id, top8, winner, dark_horse')
  if (error) throw error

  const scores = (ptPreds ?? []).map((p) => {
    const r = scorePretournament({ top8: p.top8, winner: p.winner, dark_horse: p.dark_horse }, reality)
    return { user_id: p.user_id, top8_pts: r.top8_pts, winner_pts: r.winner_pts, dark_horse_pts: r.dark_horse_pts }
  })
  if (!scores.length) return

  const { error: rpcErr } = await supabase.rpc('apply_pretournament_scores', { p_scores: scores })
  if (rpcErr) throw rpcErr
}

async function applySlot() {
  slotError.value = ''
  slotSuccess.value = ''
  slotSaving.value = true
  try {
    const update = {}
    if (slotTeam1.value.trim()) { update.team1 = slotTeam1.value.trim(); update.team1_resolved = true }
    if (slotTeam2.value.trim()) { update.team2 = slotTeam2.value.trim(); update.team2_resolved = true }
    const { error } = await supabase
      .from('matches')
      .update(update)
      .eq('match_no', slotMatchNo.value)
    if (error) throw error
    slotSuccess.value = 'Teams updated.'
    await matchesStore.loadMatches()
    slotMatchNo.value = null
  } catch (e) {
    slotError.value = e.message
  } finally {
    slotSaving.value = false
  }
}

function confirmRemove(member) {
  removeTarget.value = member
  removeError.value = ''
}

async function removeMember() {
  removeError.value = ''
  removeSaving.value = true
  try {
    const uid = removeTarget.value.user_id
    // predictions/scores reference auth.users (not members), so remove them
    // explicitly before the membership row (all gated to the owner by RLS).
    await supabase.from('predictions').delete().eq('user_id', uid)
    await supabase.from('prediction_scores').delete().eq('user_id', uid)
    await supabase.from('pretournament_predictions').delete().eq('user_id', uid)
    await supabase.from('pretournament_scores').delete().eq('user_id', uid)

    const { data, error } = await supabase
      .from('members')
      .delete()
      .eq('user_id', uid)
      .select()
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Nothing was removed — apply migration 003 (owner delete policies) in Supabase first.')
    }

    members.value = members.value.filter(m => m.user_id !== uid)
    removeTarget.value = null
  } catch (e) {
    removeError.value = e.message
  } finally {
    removeSaving.value = false
  }
}
</script>
