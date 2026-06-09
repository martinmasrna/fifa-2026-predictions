<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="card p-8 w-full max-w-sm">
      <h1 class="text-xl font-bold mb-1">Join the pool</h1>
      <p class="text-sm text-gray-500 mb-6">Enter the join code you received, then choose a display name.</p>

      <form @submit.prevent="submit">
        <label class="block text-sm font-medium text-gray-700 mb-1">Join code</label>
        <input
          v-model="joinCode"
          type="password"
          placeholder="••••••••"
          required
          class="input mb-4"
          :disabled="loading"
        />

        <label class="block text-sm font-medium text-gray-700 mb-1">Display name</label>
        <input
          v-model="displayName"
          type="text"
          placeholder="e.g. John"
          required
          maxlength="30"
          class="input mb-6"
          :disabled="loading"
        />


        <button type="submit" class="btn-primary w-full" :disabled="loading || !joinCode || !displayName.trim()">
          {{ loading ? 'Joining…' : 'Join pool' }}
        </button>
      </form>

      <p v-if="error" class="text-red-600 text-sm mt-3 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useMatchesStore } from '../stores/matches.js'
import { MATCH_1_KICKOFF } from '../config.js'

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const router = useRouter()

const joinCode = ref('')
const displayName = ref(auth.pendingDisplayName)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.join(joinCode.value, displayName.value)
    auth.pendingDisplayName = ''
    await matchesStore.loadMyPredictions()

    const locked = new Date() >= new Date(MATCH_1_KICKOFF)
    if (locked) {
      router.push('/')
    } else {
      router.push('/onboarding')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
