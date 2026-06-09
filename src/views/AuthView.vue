<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="card p-8 w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="text-4xl mb-2">⚽</div>
        <h1 class="text-xl font-bold text-gray-900">{{ CONFIG.poolName }}</h1>
        <p class="text-sm text-gray-500 mt-1">World Cup 2026 Prediction Pool</p>
      </div>

      <div v-if="!sent">
        <p class="text-sm text-gray-600 mb-4 text-center">
          Enter your email to receive a sign-in link.
        </p>
        <form @submit.prevent="submit">
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            class="input mb-3"
            :disabled="loading"
          />
          <button type="submit" class="btn-primary w-full" :disabled="loading">
            {{ loading ? 'Sending…' : 'Send magic link' }}
          </button>
        </form>
        <p v-if="error" class="text-red-600 text-sm mt-3 text-center">{{ error }}</p>
      </div>

      <div v-else class="text-center">
        <div class="text-3xl mb-3">📧</div>
        <p class="text-gray-700 font-medium">Check your email</p>
        <p class="text-sm text-gray-500 mt-2">
          We sent a sign-in link to <strong>{{ email }}</strong>.<br/>
          Click it to continue.
        </p>
        <button @click="sent = false" class="text-sm text-brand-600 mt-4 underline">
          Try a different email
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { CONFIG } from '../config.js'

const auth = useAuthStore()
const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.signInWithEmail(email.value)
    sent.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
