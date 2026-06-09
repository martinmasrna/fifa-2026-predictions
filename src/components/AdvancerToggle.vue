<template>
  <div v-if="show" class="flex items-center gap-2 text-sm">
    <span class="text-gray-500 text-xs">Advances:</span>
    <button
      @click="emit('update:modelValue', team1)"
      :disabled="disabled"
      class="px-3 py-1 rounded-full border-2 text-xs font-medium transition-all"
      :class="modelValue === team1
        ? 'border-brand-600 bg-brand-50 text-brand-700'
        : 'border-gray-200 text-gray-500 hover:border-gray-400'"
    >{{ team1 }}</button>
    <button
      @click="emit('update:modelValue', team2)"
      :disabled="disabled"
      class="px-3 py-1 rounded-full border-2 text-xs font-medium transition-all"
      :class="modelValue === team2
        ? 'border-brand-600 bg-brand-50 text-brand-700'
        : 'border-gray-200 text-gray-500 hover:border-gray-400'"
    >{{ team2 }}</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  pred1: { type: Number, default: null },
  pred2: { type: Number, default: null },
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

// Only show when score is a draw (ambiguous who advances)
const show = computed(() =>
  props.pred1 != null && props.pred2 != null && props.pred1 === props.pred2
)
</script>
