<template>
  <div class="flex items-center justify-center min-h-[80vh]">
    <div class="card shadow-lift overflow-hidden w-full max-w-4xl grid md:grid-cols-2 animate-fade-in">

      <!-- Brand panel -->
      <div class="hero-grad text-white p-8 sm:p-10 flex flex-col justify-between relative">
        <div class="relative z-10">
          <div class="flex items-center gap-2 mb-8">
            <span class="w-7 h-7 rounded-lg bg-white/15 grid place-items-center text-base">⚽</span>
            <span class="font-display font-semibold text-base tracking-wide text-white/70">{{ CONFIG.poolName }}</span>
          </div>
          <h1 class="font-display font-extrabold text-3xl leading-tight mb-3">
            FIFA World Cup 2026
          </h1>
          <p class="text-white text-base font-semibold max-w-xs">
            6 weeks, 104 matches, 1 champion.
          </p>
        </div>
        <ul class="relative z-10 space-y-3 text-sm text-white/85 mt-10">
          <li class="flex items-center gap-2.5"><Icon name="target" :size="18" class="text-gold" /> Pick a score for every match</li>
          <li class="flex items-center gap-2.5"><Icon name="trophy" :size="18" class="text-gold" /> Call your Top 8, Champion &amp; Dark Horse</li>
          <li class="flex items-center gap-2.5"><Icon name="trending" :size="18" class="text-gold" /> Challenge your friends and climb the leaderboard</li>
        </ul>
      </div>

      <!-- Form -->
      <div class="p-8 sm:p-10 flex flex-col justify-center">
        <h2 class="font-display font-bold text-xl mb-6">
          {{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}
        </h2>

        <form @submit.prevent="submit" class="space-y-3">
          <input v-model="email" type="email" placeholder="Email" required class="input" :disabled="loading" autocomplete="email" />

          <div class="relative">
            <input
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              placeholder="Password"
              required
              :minlength="mode === 'signup' ? 6 : undefined"
              class="input pr-11" :disabled="loading"
              :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
            />
            <button
              type="button" @click="showPw = !showPw"
              :aria-label="showPw ? 'Hide password' : 'Show password'"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-pitch transition-colors"
            >
              <Icon :name="showPw ? 'eye-off' : 'eye'" :size="18" />
            </button>
          </div>
          <p v-if="mode === 'signup'" class="text-xs text-ink/40 -mt-1">At least 6 characters.</p>

          <button type="submit" class="btn-primary w-full btn-lg" :disabled="loading">
            {{ loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account' }}
          </button>
        </form>

        <p v-if="error" class="text-red-600 text-sm mt-3">{{ error }}</p>

        <p class="text-sm text-center text-ink/50 mt-6">
          <template v-if="mode === 'signin'">
            No account?
            <button @click="switchMode('signup')" class="text-pitch font-semibold hover:underline">Sign up</button>
          </template>
          <template v-else>
            Already have an account?
            <button @click="switchMode('signin')" class="text-pitch font-semibold hover:underline">Sign in</button>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useMatchesStore } from '../stores/matches.js'
import Icon from '../components/Icon.vue'
import { CONFIG } from '../config.js'

const auth = useAuthStore()
const matchesStore = useMatchesStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const mode = ref('signin')
const loading = ref(false)
const error = ref('')
const showPw = ref(false)

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
      if (auth.member) {
        // Load their data, then go home
        await matchesStore.loadReferenceData()
        await matchesStore.loadMatches()
        await matchesStore.loadMyPredictions()
        router.push('/')
      } else {
        router.push('/join')
      }
    } else {
      await auth.signUp(email.value, password.value)
      router.push('/join')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
