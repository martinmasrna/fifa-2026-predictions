<template>
  <nav class="sticky top-0 z-30 bg-canvas/85 backdrop-blur border-b border-ink/10">
    <div class="max-w-6xl mx-auto px-4 sm:px-5">
      <div class="flex items-center justify-between h-16">
        <RouterLink to="/" class="flex items-center gap-2.5 shrink-0">
          <span class="w-8 h-8 rounded-lg bg-pitch grid place-items-center text-white text-sm">⚽</span>
          <span class="font-display font-extrabold text-xl tracking-tight">{{ poolName }}</span>
        </RouterLink>

        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-1 text-sm font-semibold">
          <NavLink to="/">Leaderboard</NavLink>
          <NavLink to="/matches">Matches</NavLink>
          <NavLink to="/tournament">Tournament</NavLink>
          <NavLink to="/my-picks">My Predictions</NavLink>
          <NavLink v-if="auth.isOwner" to="/admin">Admin</NavLink>
        </div>

        <div class="flex items-center gap-3">
          <span class="hidden sm:block text-sm font-medium text-ink/80">{{ auth.member?.display_name }}</span>
          <span class="hidden sm:block w-px h-5 bg-ink/15"></span>
          <button
            @click="signOut"
            class="flex items-center justify-center text-ink/40 hover:text-ink hover:bg-pitch-soft rounded-lg p-1.5 transition-colors"
            title="Sign out" aria-label="Sign out"
          >
            <Icon name="logout" :size="18" />
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <div class="md:hidden flex gap-1 pb-2 -mx-1 px-1 overflow-x-auto text-sm font-semibold">
        <NavLink to="/">Leaderboard</NavLink>
        <NavLink to="/matches">Matches</NavLink>
        <NavLink to="/tournament">Tournament</NavLink>
        <NavLink to="/my-picks">My Predictions</NavLink>
        <NavLink v-if="auth.isOwner" to="/admin">Admin</NavLink>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink, useLink, useRouter } from 'vue-router'
import { defineComponent, h, computed } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { CONFIG } from '../config.js'
import Icon from './Icon.vue'

const auth = useAuthStore()
const router = useRouter()
const poolName = CONFIG.poolName

async function signOut() {
  await auth.signOut()
  router.push('/auth')
}

const NavLink = defineComponent({
  props: { to: String },
  setup(props, { slots }) {
    const { isActive, isExactActive } = useLink({ to: computed(() => props.to) })
    const active = computed(() => (props.to === '/' ? isExactActive.value : isActive.value))
    return () => h(RouterLink, {
      to: props.to,
      class: [
        'px-3.5 py-2 rounded-full whitespace-nowrap transition-colors',
        active.value
          ? 'bg-pitch text-white'
          : 'text-ink/55 hover:text-ink hover:bg-pitch-soft',
      ],
    }, slots)
  },
})
</script>
