<template>
  <div>
    <div class="flex items-center gap-3 mb-6"><span class="gold-rule"></span><h1 class="font-display font-extrabold text-2xl sm:text-3xl">Standings</h1></div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
      <div v-for="g in groupStandings" :key="g.letter" class="card overflow-hidden">
        <h2 class="text-xs font-bold text-ink/45 uppercase tracking-wider px-4 pt-4 pb-2">Group {{ g.letter }}</h2>
        <table class="w-full text-sm table-fixed">
          <thead class="text-ink/40 text-xs">
            <tr>
              <th class="text-center py-1.5 font-medium w-9">#</th>
              <th class="text-left px-2 py-1.5 font-medium">Team</th>
              <th class="text-center py-1.5 font-medium w-9">W</th>
              <th class="text-center py-1.5 font-medium w-9">D</th>
              <th class="text-center py-1.5 font-medium w-9">L</th>
              <th class="text-center py-1.5 font-medium w-14">Score</th>
              <th class="text-center py-1.5 font-medium w-16">Points</th>
            </tr>
          </thead>
          <tbody class="tnum">
            <tr
              v-for="(row, i) in g.rows"
              :key="row.team"
              class="border-t border-ink/5"
              :class="i < 2 ? 'bg-pitch-soft/60' : ''"
            >
              <td class="text-center py-2 text-ink/40">{{ i + 1 }}</td>
              <td class="px-2 py-2">
                <div class="flex items-center gap-2 min-w-0">
                  <Flag :team="row.team" size="xs" />
                  <span class="font-medium truncate" :class="i < 2 ? 'text-pitch-dark' : 'text-ink/80'">{{ row.team }}</span>
                </div>
              </td>
              <td class="text-center py-2 text-ink/60">{{ row.won }}</td>
              <td class="text-center py-2 text-ink/60">{{ row.drawn }}</td>
              <td class="text-center py-2 text-ink/60">{{ row.lost }}</td>
              <td class="text-center py-2 text-ink/60">{{ row.gf }}:{{ row.ga }}</td>
              <td class="text-center py-2 font-display font-extrabold" :class="i < 2 ? 'text-pitch-dark' : 'text-ink'">{{ row.pts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Best third-placed teams -->
    <div class="card overflow-hidden mb-4">
      <h2 class="text-xs font-bold text-ink/45 uppercase tracking-wider px-4 pt-4 pb-3">Best third-placed teams</h2>
      <table class="w-full text-sm table-fixed">
        <thead class="text-ink/40 text-xs">
          <tr>
            <th class="text-center py-1.5 font-medium w-9">#</th>
            <th class="text-left px-2 py-1.5 font-medium">Team</th>
            <th class="text-center py-1.5 font-medium w-16">Group</th>
            <th class="text-center py-1.5 font-medium w-9">W</th>
            <th class="text-center py-1.5 font-medium w-9">D</th>
            <th class="text-center py-1.5 font-medium w-9">L</th>
            <th class="text-center py-1.5 font-medium w-14">Score</th>
            <th class="text-center py-1.5 font-medium w-16">Points</th>
          </tr>
        </thead>
        <tbody class="tnum">
          <tr
            v-for="(row, i) in bestThirds"
            :key="row.team"
            class="border-t border-ink/5"
            :class="i < 8 ? 'bg-pitch-soft/60' : ''"
          >
            <td class="text-center py-2 text-ink/40">{{ i + 1 }}</td>
            <td class="px-2 py-2">
              <div class="flex items-center gap-2 min-w-0">
                <Flag :team="row.team" size="xs" />
                <span class="font-medium truncate" :class="i < 8 ? 'text-pitch-dark' : 'text-ink/80'">{{ row.team }}</span>
              </div>
            </td>
            <td class="text-center py-2 text-ink/50">{{ row.group }}</td>
            <td class="text-center py-2 text-ink/60">{{ row.won }}</td>
            <td class="text-center py-2 text-ink/60">{{ row.drawn }}</td>
            <td class="text-center py-2 text-ink/60">{{ row.lost }}</td>
            <td class="text-center py-2 text-ink/60">{{ row.gf }}:{{ row.ga }}</td>
            <td class="text-center py-2 font-display font-extrabold" :class="i < 8 ? 'text-pitch-dark' : 'text-ink'">{{ row.pts }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="flex items-center gap-1.5 text-xs text-ink/50">
      <span class="w-3 h-3 rounded-sm bg-pitch-soft border border-pitch/30 inline-block"></span>
      advancing to Round of 32
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMatchesStore } from '../stores/matches.js'
import Flag from '../components/Flag.vue'

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
