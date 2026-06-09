<template>
  <div class="flex items-center justify-center min-h-[80vh]">
    <div class="card shadow-lift overflow-hidden w-full max-w-4xl grid md:grid-cols-2 animate-fade-in">

      <!-- Brand panel (desktop only; mobile gets a compact header in the form) -->
      <div class="hero-grad text-white p-8 sm:p-10 hidden md:flex flex-col justify-center relative">
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
          <ul class="space-y-3 text-sm text-white/85 mt-10">
            <li class="flex items-center gap-2.5"><Icon name="target" :size="18" class="text-gold" /> Pick a score for every match</li>
            <li class="flex items-center gap-2.5"><Icon name="trophy" :size="18" class="text-gold" /> Call your Top 8, Champion &amp; Dark Horse</li>
            <li class="flex items-center gap-2.5"><Icon name="trending" :size="18" class="text-gold" /> Challenge your friends and climb the leaderboard</li>
          </ul>
        </div>
      </div>

      <!-- Form -->
      <div class="p-8 sm:p-10 flex flex-col justify-center">
        <!-- Compact brand header — mobile only -->
        <div class="md:hidden mb-7">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-7 h-7 rounded-lg bg-pitch grid place-items-center text-white text-sm">⚽</span>
            <span class="font-display font-extrabold tracking-tight">{{ CONFIG.poolName }}</span>
          </div>
          <h1 class="font-display font-extrabold text-2xl leading-tight">FIFA World Cup 2026</h1>
          <p class="text-ink/50 text-sm">6 weeks, 104 matches, 1 champion.</p>
        </div>

        <h2 class="font-display font-bold text-xl mb-6">
          {{ heading }}
        </h2>

        <!-- Reset-link sent confirmation -->
        <div v-if="mode === 'forgot' && resetSent" class="space-y-4">
          <div class="flex items-start gap-3 bg-pitch-soft/60 rounded-xl px-4 py-3.5 text-sm text-ink/75">
            <Icon name="check" :size="18" class="text-pitch mt-0.5 shrink-0" />
            <span>Check your inbox — we've sent a reset link to <span class="font-semibold text-ink">{{ email }}</span>.</span>
          </div>
          <button @click="switchMode('signin')" class="text-sm text-pitch font-semibold hover:underline">← Back to sign in</button>
        </div>

        <template v-else>
          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label for="email" class="block text-xs font-semibold text-ink/55 mb-1.5">Email</label>
              <input id="email" v-model="email" type="email" placeholder="you@example.com" required class="input" :disabled="loading" autocomplete="email" />
            </div>

            <div v-if="mode !== 'forgot'">
              <div class="flex items-center justify-between mb-1.5">
                <label for="password" class="text-xs font-semibold text-ink/55">Password</label>
                <button v-if="mode === 'signin'" type="button" @click="switchMode('forgot')" class="text-xs text-pitch font-semibold hover:underline">Forgot password?</button>
              </div>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPw ? 'text' : 'password'"
                  :placeholder="mode === 'signup' ? 'At least 6 characters' : 'Your password'"
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
            </div>

            <p v-if="mode === 'signup'" class="flex items-start gap-2 text-xs text-ink/60 bg-pitch-soft/50 rounded-lg px-3 py-2.5">
              <Icon name="users" :size="15" class="text-pitch mt-0.5 shrink-0" /> You'll need your group's join code to finish setting up — have it handy.
            </p>

            <p v-if="mode === 'forgot'" class="text-xs text-ink/50 -mt-1">We'll email you a link to set a new password.</p>

            <button type="submit" class="btn-primary w-full btn-lg" :disabled="loading">
              {{ loading ? 'Please wait…' : submitLabel }}
            </button>
          </form>

          <p v-if="error" class="text-red-600 text-sm mt-3">{{ error }}</p>

          <p class="text-sm text-center text-ink/50 mt-6">
            <template v-if="mode === 'signin'">
              No account?
              <button @click="switchMode('signup')" class="text-pitch font-semibold hover:underline">Sign up</button>
            </template>
            <template v-else-if="mode === 'signup'">
              Already have an account?
              <button @click="switchMode('signin')" class="text-pitch font-semibold hover:underline">Sign in</button>
            </template>
            <template v-else>
              <button @click="switchMode('signin')" class="text-pitch font-semibold hover:underline">← Back to sign in</button>
            </template>
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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
const mode = ref('signin') // 'signin' | 'signup' | 'forgot'
const loading = ref(false)
const error = ref('')
const showPw = ref(false)
const resetSent = ref(false)

const heading = computed(() => ({
  signin: 'Welcome back',
  signup: 'Create your account',
  forgot: 'Reset your password',
}[mode.value]))

const submitLabel = computed(() => ({
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Send reset link',
}[mode.value]))

function switchMode(m) {
  mode.value = m
  error.value = ''
  resetSent.value = false
}

// Turn raw Supabase error strings into something a human wants to read.
function friendlyError(e) {
  const m = (e?.message ?? '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Wrong email or password.'
  if (m.includes('already registered') || m.includes('already exists')) return 'That email already has an account — try signing in.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first, then sign in.'
  if (m.includes('password should be at least') || m.includes('at least 6')) return 'Password must be at least 6 characters.'
  if (m.includes('invalid email') || m.includes('unable to validate email')) return "That doesn't look like a valid email."
  if (m.includes('rate limit') || m.includes('for security purposes')) return 'Too many attempts — wait a minute and try again.'
  return e?.message ?? 'Something went wrong. Please try again.'
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
    } else if (mode.value === 'signup') {
      await auth.signUp(email.value, password.value)
      router.push('/join')
    } else {
      await auth.resetPassword(email.value)
      resetSent.value = true
    }
  } catch (e) {
    error.value = friendlyError(e)
  } finally {
    loading.value = false
  }
}
</script>
