<template>
  <img
    v-if="src"
    :src="src"
    :alt="team"
    :title="team"
    loading="lazy"
    :class="[sizeClass, shapeClass, dim ? 'opacity-50 grayscale' : '', highlight ? 'ring-2 ring-gold ring-offset-1 ring-offset-canvas' : '']"
  />
  <!-- Fallback when no flag is mapped (unresolved knockout slots, e.g. "2B") -->
  <span
    v-else
    class="bg-ink/5 border border-dashed border-ink/20 grid place-items-center text-ink/30 font-bold shrink-0 leading-none"
    :class="[sizeClass, markClass, shape === 'coin' ? 'rounded-full aspect-square' : 'rounded aspect-[4/3]']"
  >?</span>
</template>

<script setup>
import { computed } from 'vue'
import { flagUrl } from '../lib/flags.js'

const props = defineProps({
  team: { type: String, default: null },
  size: { type: String, default: 'md' }, // xs | sm | md | lg | xl
  shape: { type: String, default: 'rect' }, // rect | coin
  dim: { type: Boolean, default: false },        // eliminated → greyscale
  highlight: { type: Boolean, default: false },  // reached the quarter-finals → gold ring
})

const SIZES = {
  xs: { rect: 'w-5',  coin: 'w-5 h-5',   px: 80,  mark: 'text-[9px]' },
  sm: { rect: 'w-7',  coin: 'w-7 h-7',   px: 80,  mark: 'text-[10px]' },
  md: { rect: 'w-9',  coin: 'w-9 h-9',   px: 80,  mark: 'text-xs' },
  lg: { rect: 'w-12', coin: 'w-11 h-11', px: 160, mark: 'text-sm' },
  xl: { rect: 'w-16', coin: 'w-14 h-14', px: 160, mark: 'text-base' },
}

const cfg = computed(() => SIZES[props.size] ?? SIZES.md)
const sizeClass = computed(() => (props.shape === 'coin' ? cfg.value.coin : cfg.value.rect))
const markClass = computed(() => cfg.value.mark)
const shapeClass = computed(() =>
  props.shape === 'coin'
    ? 'flag-coin shrink-0'
    : 'rounded object-cover ring-1 ring-ink/10 shrink-0 aspect-[4/3]'
)
const src = computed(() => (props.team ? flagUrl(props.team, cfg.value.px) : null))
</script>
