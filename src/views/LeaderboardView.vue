<template>
  <div>
    <!-- Round recap banner -->
    <RoundRecap v-if="recapRound" :round-key="recapRound" class="mb-6" />

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Leaderboard</h1>
      <span v-if="lb.loading" class="text-sm text-gray-400">Updating…</span>
    </div>

    <div v-if="lb.rankedRows.length === 0 && !lb.loading" class="text-gray-400 text-center py-12">
      No scores yet — predictions will score when matches complete.
    </div>

    <div v-else class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-center px-4 py-3 text-gray-500 font-medium w-10">#</th>
            <th class="text-left px-4 py-3 text-gray-500 font-medium">Player</th>
            <th class="text-center px-3 py-3 text-gray-500 font-medium hidden md:table-cell">Pre-Tournament</th>
            <th class="text-center px-3 py-3 text-gray-500 font-medium hidden sm:table-cell">Group Stage</th>
            <th class="text-center px-3 py-3 text-gray-500 font-medium hidden sm:table-cell">Knockout</th>
            <th class="text-center px-4 py-3 text-gray-500 font-medium">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="row in lb.rankedRows"
            :key="row.user_id"
            class="transition-colors"
            :class="row.user_id === auth.session?.user.id
              ? 'bg-brand-50 font-medium border-l-4 border-brand-500'
              : 'hover:bg-gray-50 border-l-4 border-transparent'"
          >
            <td class="px-4 py-3 font-bold text-center">
              <span v-if="row.rank === 1">🥇</span>
              <span v-else-if="row.rank === 2">🥈</span>
              <span v-else-if="row.rank === 3">🥉</span>
              <span v-else class="text-gray-500">{{ row.rank }}</span>
            </td>
            <td class="px-4 py-3">
              {{ row.display_name }}
              <span v-if="row.user_id === auth.session?.user.id" class="ml-1 text-xs text-brand-600">(you)</span>
            </td>
            <td class="px-3 py-3 text-center text-gray-500 hidden md:table-cell">{{ row.pretournament_pts }}</td>
            <td class="px-3 py-3 text-center text-gray-500 hidden sm:table-cell">{{ row.group_pts }}</td>
            <td class="px-3 py-3 text-center text-gray-500 hidden sm:table-cell">{{ row.knockout_pts }}</td>
            <td class="px-4 py-3 text-center font-bold text-brand-700">{{ row.grand_total }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-xs text-gray-400 mt-3 text-right">
      Leaderboard updates live as results come in.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useLeaderboardStore } from '../stores/leaderboard.js'
import { useAuthStore } from '../stores/auth.js'
import RoundRecap from '../components/RoundRecap.vue'

const lb = useLeaderboardStore()
const auth = useAuthStore()
const recapRound = ref(null)

onMounted(async () => {
  await lb.load()
  lb.subscribeRealtime()
  recapRound.value = await lb.loadLatestCompletedRound()
})

onUnmounted(() => {
  lb.unsubscribeRealtime()
})
</script>
