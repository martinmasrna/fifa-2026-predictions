<template>
  <div class="flex flex-col items-center select-none">
    <button
      type="button"
      @click="increment"
      :disabled="disabled || (modelValue ?? 0) >= 20"
      aria-label="Increase"
      class="w-9 h-6 grid place-items-center rounded-md text-ink/30
             hover:text-pitch hover:bg-pitch-soft active:scale-95
             disabled:opacity-30 disabled:hover:bg-transparent transition"
    >
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,10.5 8,5.5 13,10.5"/></svg>
    </button>

    <span
      class="font-display tnum text-3xl font-extrabold leading-none w-10 text-center transition-colors"
      :class="modelValue == null ? 'text-ink/25' : 'text-ink'"
    >{{ modelValue ?? '·' }}</span>

    <button
      type="button"
      @click="decrement"
      :disabled="disabled || (modelValue ?? 0) <= 0"
      aria-label="Decrease"
      class="w-9 h-6 grid place-items-center rounded-md text-ink/30
             hover:text-pitch hover:bg-pitch-soft active:scale-95
             disabled:opacity-30 disabled:hover:bg-transparent transition"
    >
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,5.5 8,10.5 13,5.5"/></svg>
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
  if (props.disabled) return
  if ((props.modelValue ?? 0) < 20) emit('update:modelValue', (props.modelValue ?? 0) + 1)
}
function decrement() {
  if (props.disabled) return
  if ((props.modelValue ?? 0) > 0) emit('update:modelValue', props.modelValue - 1)
}
</script>
