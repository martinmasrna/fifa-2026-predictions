import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { rankRows } from '../lib/ranking.js'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const rows = ref([])
  const rankedRows = ref([])
  const top8ByUser = ref({}) // user_id -> string[] of predicted Top 8 teams
  const winnerByUser = ref({}) // user_id -> predicted champion team
  const darkHorseByUser = ref({}) // user_id -> predicted dark horse team
  const loading = ref(false)
  let realtimeChannel = null

  async function load() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
      if (error) throw error
      setRows(data ?? [])
      // Everyone's Top 8 picks become readable once match 1 kicks off (RLS).
      // Fetch once — picks are frozen at lock, so no need to refetch on rescore.
      if (Object.keys(top8ByUser.value).length === 0) await loadTop8()
    } finally {
      loading.value = false
    }
  }

  async function loadTop8() {
    const { data } = await supabase
      .from('pretournament_predictions')
      .select('user_id, top8, winner, dark_horse')
    const top8 = {}
    const winners = {}
    const darkHorses = {}
    for (const p of data ?? []) {
      top8[p.user_id] = p.top8 ?? []
      winners[p.user_id] = p.winner ?? null
      darkHorses[p.user_id] = p.dark_horse ?? null
    }
    top8ByUser.value = top8
    winnerByUser.value = winners
    darkHorseByUser.value = darkHorses
  }

  function setRows(data) {
    // Ranking (incl. tiebreakers) lives in lib/ranking.js so the live board and
    // the Action's round snapshots stay identical.
    rankedRows.value = rankRows(data)
    rows.value = data
  }

  function subscribeRealtime() {
    if (realtimeChannel) return

    realtimeChannel = supabase
      .channel('scores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prediction_scores' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pretournament_scores' }, load)
      .subscribe()
  }

  function unsubscribeRealtime() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  async function loadRoundRecap(roundKey) {
    const { data } = await supabase
      .from('standings_snapshots')
      .select('*')
      .eq('round_key', roundKey)
    return data ?? []
  }

  async function loadLatestCompletedRound() {
    const { data } = await supabase
      .from('standings_snapshots')
      .select('round_key, captured_at')
      .order('captured_at', { ascending: false })
      .limit(1)
    return data?.[0]?.round_key ?? null
  }

  // A user's rank at the latest snapshotted round and how it changed vs the
  // round before (delta > 0 = climbed). Returns nulls if there aren't snapshots
  // to compare yet.
  async function loadRankDelta(userId) {
    const round = await loadLatestCompletedRound()
    if (!round) return { round: null, rank: null, delta: null }

    const cur = await loadRoundRecap(round)
    const rank = cur.find(s => s.user_id === userId)?.rank ?? null

    const { data: allSnaps } = await supabase
      .from('standings_snapshots')
      .select('round_key, captured_at')
      .order('captured_at', { ascending: false })
      .limit(60)
    const rounds = [...new Set((allSnaps ?? []).map(s => s.round_key))]
    const prevKey = rounds[rounds.indexOf(round) + 1] ?? null

    let delta = null
    if (prevKey && rank != null) {
      const prev = await loadRoundRecap(prevKey)
      const prevRank = prev.find(s => s.user_id === userId)?.rank
      if (prevRank != null) delta = prevRank - rank
    }
    return { round, rank, delta }
  }

  return {
    rows, rankedRows, top8ByUser, winnerByUser, darkHorseByUser, loading,
    load, subscribeRealtime, unsubscribeRealtime, loadRoundRecap, loadLatestCompletedRound, loadRankDelta,
  }
})
