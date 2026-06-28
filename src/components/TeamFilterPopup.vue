<template>
  <Teleport to="body">
    <transition name="fade">
      <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
           @click.self="$emit('close')">
        <div class="card w-full sm:max-w-md max-h-[82vh] flex flex-col overflow-hidden rounded-b-none sm:rounded-2xl">

          <!-- Header + search -->
          <div class="px-5 pt-4 pb-3 border-b border-ink/5">
            <div class="flex items-center justify-between mb-3">
              <div class="font-display font-extrabold text-lg">Filter by team</div>
              <button @click="$emit('close')" class="text-ink/40 hover:text-ink text-xl leading-none p-1 -mr-1" aria-label="Close">✕</button>
            </div>
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              inputmode="search"
              placeholder="Search teams…"
              class="input w-full"
              @keydown.enter="filtered.length === 1 && select(filtered[0].name)"
            />
          </div>

          <!-- Team grid -->
          <div class="px-5 py-4 overflow-y-auto flex-1 min-h-0">
            <button
              v-if="modelValue"
              @click="select(null)"
              class="btn-secondary btn-sm w-full mb-3"
            >Show all teams</button>

            <div v-if="filtered.length" class="grid grid-cols-2 gap-2">
              <button
                v-for="t in filtered"
                :key="t.name"
                @click="select(t.name)"
                class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all min-w-0"
                :class="modelValue === t.name ? 'border-pitch bg-pitch-soft' : 'border-ink/10 hover:border-pitch/40 hover:bg-pitch-soft/40'"
              >
                <Flag :team="t.name" size="md" shape="coin" />
                <span class="font-display font-bold text-sm truncate"
                      :class="modelValue === t.name ? 'text-pitch-dark' : ''">{{ t.name }}</span>
              </button>
            </div>
            <p v-else class="text-center text-ink/40 text-sm py-8">No teams match “{{ query }}”</p>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Flag from './Flag.vue'

const props = defineProps({
  teams: { type: Array, default: () => [] },   // [{ name, group }]
  modelValue: { type: String, default: null }, // selected team name | null
})
const emit = defineEmits(['update:modelValue', 'close'])

const query = ref('')
const searchInput = ref(null)

const sorted = computed(() => [...props.teams].sort((a, b) => a.name.localeCompare(b.name)))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sorted.value
  return sorted.value.filter(t => t.name.toLowerCase().includes(q))
})

function select(name) {
  emit('update:modelValue', name)
  emit('close')
}

function onKeydown(e) { if (e.key === 'Escape') emit('close') }

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  // Autofocus search, but not on touch devices where it forces the keyboard up
  // and pushes the grid off-screen before the user can see it.
  if (!window.matchMedia?.('(pointer: coarse)').matches) {
    nextTick(() => searchInput.value?.focus())
  }
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>
