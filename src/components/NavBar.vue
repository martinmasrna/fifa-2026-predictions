<template>
  <nav class="bg-white border-b border-gray-200 sticky top-0 z-20">
    <div class="max-w-4xl mx-auto px-4">
      <div class="flex items-center justify-between h-14">
        <RouterLink to="/" class="font-bold text-brand-700 text-lg">⚽ {{ poolName }}</RouterLink>

        <!-- Desktop nav -->
        <div class="hidden sm:flex items-center gap-1">
          <NavLink to="/">Leaderboard</NavLink>
          <NavLink to="/matches">Matches</NavLink>
          <NavLink to="/standings">Standings</NavLink>
          <NavLink to="/bracket">Bracket</NavLink>
          <NavLink to="/my-picks">My Predictions</NavLink>
          <NavLink v-if="auth.isOwner" to="/admin">Admin</NavLink>
        </div>

        <div class="flex items-center gap-3">
          <span class="hidden sm:block text-sm text-gray-500">{{ auth.member?.display_name }}</span>
          <button @click="auth.signOut()" class="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </div>

      <!-- Mobile nav -->
      <div class="sm:hidden flex gap-1 pb-2 overflow-x-auto">
        <NavLink to="/">Leaderboard</NavLink>
        <NavLink to="/matches">Matches</NavLink>
        <NavLink to="/standings">Standings</NavLink>
        <NavLink to="/bracket">Bracket</NavLink>
        <NavLink to="/my-picks">My Predictions</NavLink>
        <NavLink v-if="auth.isOwner" to="/admin">Admin</NavLink>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink, useLink } from 'vue-router'
import { defineComponent, h, computed } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { CONFIG } from '../config.js'

const auth = useAuthStore()
const poolName = CONFIG.poolName

// Inline NavLink component
const NavLink = defineComponent({
  props: { to: String },
  setup(props, { slots }) {
    const { isActive } = useLink({ to: computed(() => props.to) })
    return () => h(RouterLink, {
      to: props.to,
      class: [
        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
        isActive.value
          ? 'bg-brand-50 text-brand-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
      ],
    }, slots)
  },
})
</script>
