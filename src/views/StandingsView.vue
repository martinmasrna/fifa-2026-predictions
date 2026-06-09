<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Standings</h1>
      <div class="flex items-center gap-1.5 text-xs text-gray-500">
        <span class="w-3 h-3 rounded-sm bg-green-50 border border-green-100 inline-block"></span>
        currently advancing to Round of 32
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
      <div v-for="g in groupStandings" :key="g.letter" class="card overflow-hidden">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">
          Group {{ g.letter }}
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-gray-400 text-xs">
              <tr>
                <th class="text-left px-4 py-1.5 font-medium w-7">#</th>
                <th class="text-left px-2 py-1.5 font-medium">Team</th>
                <th class="text-right px-2 py-1.5 font-medium">W</th>
                <th class="text-right px-2 py-1.5 font-medium">D</th>
                <th class="text-right px-2 py-1.5 font-medium">L</th>
                <th class="text-right px-2 py-1.5 font-medium">Score</th>
                <th class="text-right px-2 py-1.5 font-medium">GD</th>
                <th class="text-right px-4 py-1.5 font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in g.rows"
                :key="row.team"
                class="border-t border-gray-100"
                :class="i < 2 ? 'bg-green-50' : ''"
              >
                <td class="px-4 py-2 text-gray-400">{{ i + 1 }}</td>
                <td class="px-2 py-2">
                  <div class="flex items-center gap-2">
                    <img v-if="flagUrl(row.team)" :src="flagUrl(row.team)" :alt="row.team" class="h-4 w-auto rounded-sm border border-gray-200 object-cover shrink-0" />
                    <span class="font-medium" :class="i < 2 ? 'text-green-800' : 'text-gray-800'">{{ row.team }}</span>
                  </div>
                </td>
                <td class="text-right px-2 py-2 text-gray-600">{{ row.won }}</td>
                <td class="text-right px-2 py-2 text-gray-600">{{ row.drawn }}</td>
                <td class="text-right px-2 py-2 text-gray-600">{{ row.lost }}</td>
                <td class="text-right px-2 py-2 text-gray-600">{{ row.gf }}:{{ row.ga }}</td>
                <td class="text-right px-2 py-2 text-gray-600">{{ row.gd > 0 ? '+' + row.gd : row.gd }}</td>
                <td class="text-right px-4 py-2 font-bold" :class="i < 2 ? 'text-green-800' : 'text-gray-800'">{{ row.pts }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Best third-placed teams -->
    <div class="card overflow-hidden mb-8">
      <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-3">
        Best third-placed teams
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-gray-400 text-xs">
            <tr>
              <th class="text-left px-4 py-1.5 font-medium w-7">#</th>
              <th class="text-left px-2 py-1.5 font-medium">Team</th>
              <th class="text-left px-2 py-1.5 font-medium">Grp</th>
              <th class="text-right px-2 py-1.5 font-medium">W</th>
              <th class="text-right px-2 py-1.5 font-medium">D</th>
              <th class="text-right px-2 py-1.5 font-medium">L</th>
              <th class="text-right px-2 py-1.5 font-medium">Score</th>
              <th class="text-right px-2 py-1.5 font-medium">GD</th>
              <th class="text-right px-4 py-1.5 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in bestThirds"
              :key="row.team"
              class="border-t border-gray-100"
              :class="i < 8 ? 'bg-green-50' : ''"
            >
              <td class="px-4 py-2 text-gray-400">{{ i + 1 }}</td>
              <td class="px-2 py-2">
                <div class="flex items-center gap-2">
                  <img v-if="flagUrl(row.team)" :src="flagUrl(row.team)" :alt="row.team" class="h-4 w-auto rounded-sm border border-gray-200 object-cover shrink-0" />
                  <span class="font-medium" :class="i < 8 ? 'text-green-800' : 'text-gray-800'">{{ row.team }}</span>
                </div>
              </td>
              <td class="px-2 py-2 text-gray-500">{{ row.group }}</td>
              <td class="text-right px-2 py-2 text-gray-600">{{ row.won }}</td>
              <td class="text-right px-2 py-2 text-gray-600">{{ row.drawn }}</td>
              <td class="text-right px-2 py-2 text-gray-600">{{ row.lost }}</td>
              <td class="text-right px-2 py-2 text-gray-600">{{ row.gf }}:{{ row.ga }}</td>
              <td class="text-right px-2 py-2 text-gray-600">{{ row.gd > 0 ? '+' + row.gd : row.gd }}</td>
              <td class="text-right px-4 py-2 font-bold" :class="i < 8 ? 'text-green-800' : 'text-gray-800'">{{ row.pts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
      <span class="w-3 h-3 rounded-sm bg-green-50 border border-green-100 inline-block"></span>
      currently advancing to Round of 32 (top 2 per group + 8 best third-placed teams)
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMatchesStore } from '../stores/matches.js'
import { flagUrl } from '../lib/flags.js'

const matchesStore = useMatchesStore()

const groupStandings = computed(() => {
  const groups = new Map()
  for (const t of matchesStore.teams) {
    if (!groups.has(t.group)) groups.set(t.group, new Map())
    groups.get(t.group).set(t.name, {
      team: t.name, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0,
    })
  }

  for (const m of matchesStore.matches) {
    if (m.stage !== 'group' || m.status !== 'final') continue
    const g = groups.get(m.group)
    const t1 = g?.get(m.team1)
    const t2 = g?.get(m.team2)
    if (!t1 || !t2) continue
    t1.gf += m.ft1; t1.ga += m.ft2
    t2.gf += m.ft2; t2.ga += m.ft1
    if (m.ft1 > m.ft2) { t1.won++; t2.lost++ }
    else if (m.ft1 < m.ft2) { t2.won++; t1.lost++ }
    else { t1.drawn++; t2.drawn++ }
  }

  return [...groups.entries()]
    .map(([letter, teamMap]) => ({ letter, rows: rankTeams([...teamMap.values()]) }))
    .sort((a, b) => a.letter.localeCompare(b.letter))
})

const bestThirds = computed(() => {
  const thirds = groupStandings.value
    .filter(g => g.rows.length >= 3)
    .map(g => ({ ...g.rows[2], group: g.letter }))
  return rankTeams(thirds)
})

function rankTeams(teams) {
  return teams
    .map(t => ({ ...t, gd: t.gf - t.ga, pts: t.won * 3 + t.drawn }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
}
</script>
