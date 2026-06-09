import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { CONFIG, MATCH_1_KICKOFF } from '../config.js'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const member = ref(null)
  const initialized = ref(false)

  const isOwner = computed(() => member.value?.is_owner === true)
  const pretournamentLocked = computed(() => new Date() >= new Date(MATCH_1_KICKOFF))

  async function init() {
    if (initialized.value) return

    const { data: { session: s } } = await supabase.auth.getSession()

    if (s) {
      // Refresh the access token immediately — avoids JWT expired errors on first DB call
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
      if (refreshErr || !refreshed.session) {
        await supabase.auth.signOut()
      } else {
        session.value = refreshed.session
        await fetchMember(refreshed.session.user.id)
      }
    }

    supabase.auth.onAuthStateChange(async (event, s) => {
      session.value = s
      if (s) {
        await fetchMember(s.user.id)
      } else {
        member.value = null
      }
    })

    initialized.value = true
  }

  async function fetchMember(userId) {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .single()
    member.value = data ?? null
  }

  async function signInWithEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    member.value = null
  }

  async function join(joinCodePlain, displayName) {
    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(joinCodePlain, CONFIG.joinCodeHash)
    if (!valid) throw new Error('Invalid join code')

    const user = session.value?.user
    if (!user) throw new Error('Not authenticated')

    const isOwner = user.email === CONFIG.ownerEmail

    const { error } = await supabase.from('members').insert({
      user_id: user.id,
      display_name: displayName.trim(),
      email: user.email,
      is_owner: isOwner,
    })
    if (error) throw error

    await fetchMember(user.id)
  }

  async function rotateMemberRow() {
    await fetchMember(session.value.user.id)
  }

  return {
    session, member, initialized, isOwner, pretournamentLocked,
    init, signInWithEmail, signOut, join, rotateMemberRow,
  }
})
