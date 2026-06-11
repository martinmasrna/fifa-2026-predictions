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
    loading, matchMap, predMap, scoreMap, groupMatches, knockoutMatches,
    loadReferenceData, loadMatches, loadMyPredictions,
    savePrediction, savePretournament, loadMatchPredictions, loadMatchScores,
  }
})
