<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="card p-8 w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="text-4xl mb-2">⚽</div>
        <h1 class="text-xl font-bold text-gray-900">{{ CONFIG.poolName }}</h1>
        <p class="text-sm text-gray-500 mt-1">World Cup 2026 Prediction Pool</p>
      </div>

      <form @submit.prevent="submit">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
          class="input mb-3"
          :disabled="loading"
        />
        <input
          v-if="mode === 'signup'"
          v-model="displayName"
          type="text"
          placeholder="Your name (shown on leaderboard)"
          required
          maxlength="30"
          class="input mb-3"
          :disabled="loading"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          required
          class="input mb-4"
          :disabled="loading"
        />
        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account' }}
        </button>
      </form>

      <p v-if="error" class="text-red-600 text-sm mt-3 text-center">{{ error }}</p>

      <p class="text-sm text-center text-gray-500 mt-4">
        <span v-if="mode === 'signin'">
          No account?
          <button @click="switchMode('signup')" class="text-brand-600 underline">Sign up</button>
        </span>
        <span v-else>
          Already have an account?
          <button @click="switchMode('signin')" class="text-brand-600 underline">Sign in</button>
        </span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { CONFIG } from '../config.js'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const displayName = ref('')
const mode = ref('signin')
const loading = ref(false)
const error = ref('')

function switchMode(m) {
  mode.value = m
  error.value = ''
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'signin') {
      await auth.signIn(email.value, password.value)
    } else {
      await auth.signUp(email.value, password.value, displayName.value)
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
