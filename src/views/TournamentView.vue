<template>
  <div>
    <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <div class="flex items-center gap-3"><span class="gold-rule"></span><h1 class="font-display font-extrabold text-2xl sm:text-3xl">Tournament</h1></div>
      <div class="flex gap-1.5">
        <button
          v-for="t in tabs" :key="t.id"
          @click="setTab(t.id)"
          class="btn btn-sm"
          :class="tab === t.id ? 'btn-primary' : 'btn-secondary'"
        >{{ t.label }}</button>
      </div>
    </div>

    <component :is="activeComponent" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StandingsView from './StandingsView.vue'
import BracketView from './BracketView.vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'groups', label: 'Groups' },
  { id: 'bracket', label: 'Bracket' },
]

const tab = computed(() => (route.query.tab === 'bracket' ? 'bracket' : 'groups'))
const activeComponent = computed(() => (tab.value === 'bracket' ? BracketView : StandingsView))

// Reflect the tab in the URL (deep-linkable) without piling up history entries.
function setTab(id) {
  router.replace({ query: id === 'groups' ? {} : { tab: id } })
}
</script>
