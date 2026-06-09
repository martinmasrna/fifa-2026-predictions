<template>
  <div v-if="show" class="flex items-center justify-center gap-2 flex-wrap rounded-xl bg-pitch-soft/60 py-2 px-3">
    <span class="text-xs text-ink/55 font-medium">Draw — who advances?</span>
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        @click="emit('update:modelValue', team1)"
        :disabled="disabled"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition"
        :class="modelValue === team1
          ? 'border-pitch bg-pitch text-white'
          : 'border-ink/15 bg-white text-ink/60 hover:border-pitch/40'"
      >
        <Flag :team="team1" size="xs" /> {{ team1 }}
      </button>
      <button
        type="button"
        @click="emit('update:modelValue', team2)"
        :disabled="disabled"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition"
        :class="modelValue === team2
          ? 'border-pitch bg-pitch text-white'
          : 'border-ink/15 bg-white text-ink/60 hover:border-pitch/40'"
      >
        <Flag :team="team2" size="xs" /> {{ team2 }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Flag from './Flag.vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  pred1: { type: Number, default: null },
  pred2: { type: Number, default: null },
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const show = computed(() =>
  props.pred1 != null && props.pred2 != null && props.pred1 === props.pred2
)
</script>
