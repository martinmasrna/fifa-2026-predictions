<template>
  <div class="flex flex-col items-center gap-1">
    <button
      @click="increment"
      :disabled="disabled || (modelValue ?? 0) >= 10"
      class="w-8 h-7 flex items-center justify-center rounded
             text-gray-400 hover:text-brand-600 hover:bg-brand-50
             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3,11 8,5 13,11"/>
      </svg>
    </button>
    <span class="w-8 text-center font-mono text-2xl font-bold leading-none">{{ modelValue ?? '–' }}</span>
    <button
      @click="decrement"
      :disabled="disabled || (modelValue ?? 0) <= 0"
      class="w-8 h-7 flex items-center justify-center rounded
             text-gray-400 hover:text-brand-600 hover:bg-brand-50
             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3,5 8,11 13,5"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

function increment() {
  if ((props.modelValue ?? 0) < 10) emit('update:modelValue', (props.modelValue ?? 0) + 1)
}
function decrement() {
  if ((props.modelValue ?? 0) > 0) emit('update:modelValue', props.modelValue - 1)
}
</script>
