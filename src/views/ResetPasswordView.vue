<template>
  <div class="flex items-center justify-center min-h-[80vh]">
    <div class="card shadow-lift w-full max-w-md p-8 animate-fade-in">
      <h2 class="font-display font-bold text-xl mb-1">Set a new password</h2>
      <p class="text-ink/50 text-sm mb-6">Choose a new password for your account.</p>

      <form @submit.prevent="submit" class="space-y-3">
        <div>
          <label for="np" class="block text-xs font-semibold text-ink/55 mb-1.5">New password</label>
          <div class="relative">
            <input
              id="np"
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              minlength="6" required
              placeholder="At least 6 characters"
              class="input pr-11" :disabled="loading"
              autocomplete="new-password"
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

        <button type="submit" class="btn-primary w-full btn-lg" :disabled="loading || password.length < 6">
          {{ loading ? 'Updating…' : 'Update password' }}
        </button>
      </form>

      <p v-if="error" class="text-red-600 text-sm mt-3">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import Icon from '../components/Icon.vue'

const auth = useAuthStore()
const router = useRouter()
const password = ref('')
const showPw = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.updatePassword(password.value)
    router.push(auth.member ? '/' : '/join')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
