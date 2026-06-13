<template>
  <div class="flex items-center justify-center min-h-[80vh]">
    <div class="card shadow-lift w-full max-w-md p-8 animate-fade-in">
      <div class="flex items-center gap-2.5 mb-6">
        <span class="w-9 h-9 rounded-xl bg-pitch grid place-items-center text-white">⚽</span>
        <span class="font-display font-extrabold text-xl tracking-tight">{{ CONFIG.poolName }}</span>
      </div>

      <h1 class="font-display font-bold text-2xl mb-1">You're almost in</h1>
      <p class="text-sm text-ink/50 mb-6">Enter the join code you were given and pick the name your friends will see.</p>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-ink/70 mb-1.5">Join code</label>
          <input v-model="joinCode" type="password" placeholder="••••••••" required class="input" :disabled="loading" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink/70 mb-1.5">Display name</label>
          <input v-model="displayName" type="text" placeholder="e.g. Martin" required maxlength="30" class="input" :disabled="loading" />
        </div>

        <button type="submit" class="btn-primary w-full btn-lg" :disabled="loading || !joinCode || !displayName.trim()">
          {{ loading ? 'Joining…' : 'Join the pool →' }}
        </button>
      </form>

      <p v-if="error" class="text-red-600 text-sm mt-3 text-center">{{ error }}</p>

      <button @click="signOut" class="text-xs text-ink/40 hover:text-ink mt-6 mx-auto block">
        Sign out
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { MATCH_1_KICKOFF, CONFIG } from '../config.js'
import { serverNow, syncServerTime } from '../lib/serverTime.js'

const auth = useAuthStore()
const router = useRouter()

const joinCode = ref('')
const displayName = ref(auth.pendingDisplayName)
const loading = ref(false)
const error = ref('')

async function signOut() {
  await auth.signOut()
  router.push('/auth')
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.join(joinCode.value, displayName.value)
    auth.pendingDisplayName = ''
    // Match data is loaded centrally (App.vue) when the session was established;
    // a brand-new member has no predictions yet, so nothing to fetch here.

    await syncServerTime()
    const locked = serverNow() >= new Date(MATCH_1_KICKOFF).getTime()
    router.push(locked ? '/' : '/onboarding')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
