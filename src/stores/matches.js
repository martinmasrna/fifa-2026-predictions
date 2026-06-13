import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuthStore } from './auth.js'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref([])      // all 104 matches from Supabase
  const schedule = ref([])     // static JSON schedule (for reference)
  const predictions = ref([])  // current user's predictions
  const scores = ref([])       // current user's match scores
  const pretournament = ref(null) // current user's pretournament predictions
  const teams = ref([])
  const darkHorseTeams = ref([])
  const loading = ref(false)

  const matchMap = computed(() => new Map(matches.value.map(m => [m.match_no, m])))

  const predMap = computed(() =>
    new Map(predictions.value.map(p => [p.match_no, p]))
  )

  const scoreMap = computed(() =>
    new Map(scores.value.map(s => [s.match_no, s.points]))
  )

  const groupMatches = computed(() =>
    matches.value.filter(m => m.stage === 'group')
      .sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc))
  )

  const knockoutMatches = computed(() =>
    matches.value.filter(m => m.stage !== 'group')
      .sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc))
  )

  // Teams that have reached the quarter-finals (resolved QF participants) —
  // used to gold-ring Top-8 picks that made it.
  const quarterFinalTeams = computed(() => {
    const s = new Set()
    for (const m of matches.value) {
      if (m.stage !== 'Quarter-final') continue
      if (m.team1_resolved) s.add(m.team1)
      if (m.team2_resolved) s.add(m.team2)
    }
    return s
  })

  // Teams out of the tournament: lost a completed knockout tie, or — once the
  // Round of 32 is fully drawn — a group team that didn't make the bracket.
  // (Group-stage eliminations only show once the bracket is set, to avoid false
  // positives mid-draw.)
  const eliminatedTeams = computed(() => {
    const out = new Set()
    for (const m of matches.value) {
      if (m.stage === 'group') continue
      if (m.status === 'final' && m.advancer && m.team1_resolved && m.team2_resolved) {
        out.add(m.advancer === m.team1 ? m.team2 : m.team1)
      }
    }
    const r32 = matches.value.filter(m => m.stage === 'Round of 32')
    const bracketSet = r32.length > 0 && r32.every(m => m.team1_resolved && m.team2_resolved)
    if (bracketSet) {
      const inBracket = new Set()
      for (const m of matches.value) {
        if (m.stage === 'group') continue
        if (m.team1_resolved) inBracket.add(m.team1)
        if (m.team2_resolved) inBracket.add(m.team2)
      }
      for (const m of matches.value) {
        if (m.stage !== 'group') continue
        for (const t of [m.team1, m.team2]) if (t && !inBracket.has(t)) out.add(t)
      }
    }
    return out
  })

  // The single definition of "locking soon": matches still open for prediction
  // that kick off within the window, sorted by kickoff. Shared by the home
  // attention hero and the "Locking soon" card so they never disagree. Callers
  // pass the current time (their own ticking clock) for reactivity.
  const UPCOMING_WINDOW_MS = 24 * 3600 * 1000 // next 24 hours
  function upcomingPickable(nowMs, { onlyUnpicked = false } = {}) {
    return matches.value
      .filter(m => {
        if (m.status === 'final') return false
        if (m.team1_resolved === false || m.team2_resolved === false) return false // unresolved knockout slot
        const k = new Date(m.kickoff_utc).getTime()
        if (k <= nowMs || k - nowMs > UPCOMING_WINDOW_MS) return false
        if (onlyUnpicked && predMap.value.has(m.match_no)) return false
        return true
      })
      .sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc))
  }

  async function loadReferenceData() {
    const base = import.meta.env.BASE_URL
    const [s, t, d] = await Promise.all([
      fetch(`${base}data/schedule.json`).then(r => r.json()),
      fetch(`${base}data/teams.json`).then(r => r.json()),
      fetch(`${base}data/dark_horse_teams.json`).then(r => r.json()),
    ])
    schedule.value = s
    teams.value = t
    darkHorseTeams.value = d.teams ?? []
  }

  async function loadMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff_utc')
    if (error) throw error
    // Merge Supabase data with static schedule for matches not yet in Supabase
    const dbSet = new Set(data.map(m => m.match_no))
    const staticOnly = schedule.value.filter(m => !dbSet.has(m.match_no))
    matches.value = [
      ...data,
      ...staticOnly.map(m => ({ ...m, status: 'scheduled', ft1: null, ft2: null })),
    ].sort((a, b) => new Date(a.kickoff_utc) - new Date(b.kickoff_utc))
  }

  // Load everything the signed-in app needs, in dependency order: static
  // reference data first (loadMatches merges against the schedule), then the
  // live matches, then the current user's predictions/scores.
  async function loadAppData() {
    await loadReferenceData()
    await loadMatches()
    await loadMyPredictions()
  }

  // Clear per-session state on sign-out (or user switch) so the next user never
  // sees the previous one's matches/picks. Static reference data is global and
  // intentionally left in place.
  function reset() {
    matches.value = []
    predictions.value = []
    scores.value = []
    pretournament.value = null
  }

  async function loadMyPredictions() {
    const auth = useAuthStore()
    if (!auth.session) return

    const [predRes, ptRes, scoreRes] = await Promise.all([
      supabase.from('predictions').select('*').eq('user_id', auth.session.user.id),
      supabase.from('pretournament_predictions').select('*').eq('user_id', auth.session.user.id).single(),
      supabase.from('prediction_scores').select('match_no, points').eq('user_id', auth.session.user.id),
    ])

    predictions.value = predRes.data ?? []
    pretournament.value = ptRes.data ?? null
    scores.value = scoreRes.data ?? []
  }

  // Re-pull the data that the sync Action mutates while the app is open:
  // match results (matches) and the current user's per-match points
  // (prediction_scores). Deliberately does NOT refetch `predictions` — that
  // would clobber an in-progress, unsaved pick in MatchCard. Resilient by
  // design: a transient failure during background polling is logged, not thrown.
  async function refreshLive() {
    const auth = useAuthStore()
    if (!auth.session) return

    const [matchesResult, scoreRes] = await Promise.allSettled([
      loadMatches(),
      supabase.from('prediction_scores')
        .select('match_no, points')
        .eq('user_id', auth.session.user.id),
    ])

    if (matchesResult.status === 'rejected') {
      console.warn('refreshLive: matches reload failed', matchesResult.reason)
    }
    if (scoreRes.status === 'fulfilled' && !scoreRes.value.error && scoreRes.value.data) {
      scores.value = scoreRes.value.data
    } else if (scoreRes.status === 'rejected') {
      console.warn('refreshLive: scores reload failed', scoreRes.reason)
    }
  }

  async function savePrediction(matchNo, pred1, pred2, predAdvancer) {
    const auth = useAuthStore()
    const existing = predMap.value.get(matchNo)

    const payload = {
      user_id: auth.session.user.id,
      match_no: matchNo,
      pred1,
      pred2,
      pred_advancer: predAdvancer ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = existing
      ? await supabase.from('predictions').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('predictions').insert(payload).select().single()

    if (error) throw error

    // Update local state
    const idx = predictions.value.findIndex(p => p.match_no === matchNo)
    if (idx >= 0) predictions.value[idx] = data
    else predictions.value.push(data)
  }

  async function savePretournament(updates) {
    const auth = useAuthStore()
    const uid = auth.session.user.id

    // Key-presence (not ??) so an explicit null clears a field; an omitted
    // key keeps the existing value. This lets onboarding clear a champion
    // when its team is removed from the Top 8.
    const cur = pretournament.value
    const payload = {
      user_id: uid,
      top8: 'top8' in updates ? updates.top8 : (cur?.top8 ?? []),
      winner: 'winner' in updates ? updates.winner : (cur?.winner ?? null),
      dark_horse: 'dark_horse' in updates ? updates.dark_horse : (cur?.dark_horse ?? null),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('pretournament_predictions')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    pretournament.value = data
  }

  // Returns all members' predictions for a match (after kickoff).
  // predictions.user_id and members.user_id both FK to auth.users — there is
  // no direct predictions→members relationship for PostgREST to embed, so we
  // fetch members separately and merge display names in JS.
  async function loadMatchPredictions(matchNo) {
    const [predRes, memberRes] = await Promise.all([
      supabase.from('predictions').select('*').eq('match_no', matchNo),
      supabase.from('members').select('user_id, display_name'),
    ])
    if (predRes.error) throw predRes.error
    if (memberRes.error) throw memberRes.error
    const names = new Map((memberRes.data ?? []).map(m => [m.user_id, m.display_name]))
    return (predRes.data ?? []).map(p => ({
      ...p,
      members: { display_name: names.get(p.user_id) ?? 'Unknown' },
    }))
  }

  async function loadMatchScores(matchNo) {
    const { data, error } = await supabase
      .from('prediction_scores')
      .select('user_id, points')
      .eq('match_no', matchNo)
    if (error) throw error
    return data ?? []
  }

  return {
    matches, schedule, predictions, scores, pretournament, teams, darkHorseTeams,
    loading, matchMap, predMap, scoreMap, groupMatches, knockoutMatches, upcomingPickable,
    quarterFinalTeams, eliminatedTeams,
    loadReferenceData, loadMatches, loadMyPredictions, loadAppData, reset, refreshLive,
    savePrediction, savePretournament, loadMatchPredictions, loadMatchScores,
  }
})
