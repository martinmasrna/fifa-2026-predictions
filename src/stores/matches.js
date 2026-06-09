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
    const [s, t, d] = await Promise.all([
      fetch('/data/schedule.json').then(r => r.json()),
      fetch('/data/teams.json').then(r => r.json()),
      fetch('/data/dark_horse_teams.json').then(r => r.json()),
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

    const payload = {
      user_id: uid,
      top8: updates.top8 ?? pretournament.value?.top8 ?? [],
      winner: updates.winner ?? pretournament.value?.winner ?? null,
      dark_horse: updates.dark_horse ?? pretournament.value?.dark_horse ?? null,
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

  // Returns all members' predictions for a match (after kickoff)
  async function loadMatchPredictions(matchNo) {
    const { data, error } = await supabase
      .from('predictions')
      .select('*, members(display_name)')
      .eq('match_no', matchNo)
    if (error) throw error
    return data ?? []
  }

  async function loadMatchScores(matchNo) {
    const { data, error } = await supabase
      .from('prediction_scores')
      .select('*, members(display_name)')
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
