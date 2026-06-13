import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { rankRows } from '../lib/ranking.js'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const rows = ref([])
  const rankedRows = ref([])
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
    } finally {
      loading.value = false
    }
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

  return {
    rows, rankedRows, loading,
    load, subscribeRealtime, unsubscribeRealtime, loadRoundRecap, loadLatestCompletedRound,
  }
})
