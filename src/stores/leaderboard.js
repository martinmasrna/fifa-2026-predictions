import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

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
    // Sort by grand_total desc, then tiebreakers
    const sorted = [...data].sort((a, b) => {
      if (b.grand_total !== a.grand_total) return b.grand_total - a.grand_total
      if (b.exact_scorelines !== a.exact_scorelines) return b.exact_scorelines - a.exact_scorelines
      return b.correct_results - a.correct_results
    })

    // Assign ranks (shared ranks for true ties)
    let rank = 1
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        const prev = sorted[i - 1]
        const cur = sorted[i]
        const tied =
          prev.grand_total === cur.grand_total &&
          prev.exact_scorelines === cur.exact_scorelines &&
          prev.correct_results === cur.correct_results
        if (!tied) rank = i + 1
      }
      sorted[i] = { ...sorted[i], rank }
    }

    rankedRows.value = sorted
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
