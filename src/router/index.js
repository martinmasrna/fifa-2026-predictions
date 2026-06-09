import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/auth',       name: 'auth',       component: () => import('../views/AuthView.vue'),        meta: { public: true } },
  { path: '/join',       name: 'join',       component: () => import('../views/JoinView.vue'),        meta: { public: true } },
  { path: '/reset-password', name: 'reset-password', component: () => import('../views/ResetPasswordView.vue'), meta: { public: true } },
  { path: '/onboarding', name: 'onboarding', component: () => import('../views/OnboardingView.vue') },
  { path: '/',           name: 'leaderboard', component: () => import('../views/LeaderboardView.vue') },
  { path: '/matches',    name: 'matches',    component: () => import('../views/MatchesView.vue') },
  { path: '/matches/:matchNo', name: 'match-detail', component: () => import('../views/MatchDetailView.vue') },
  { path: '/tournament', name: 'tournament', component: () => import('../views/TournamentView.vue') },
  // Back-compat redirects for old bookmarks
  { path: '/standings',  redirect: '/tournament' },
  { path: '/bracket',    redirect: { path: '/tournament', query: { tab: 'bracket' } } },
  { path: '/my-picks',   name: 'my-picks',   component: () => import('../views/MyPicksView.vue') },
  { path: '/admin',      name: 'admin',      component: () => import('../views/AdminView.vue'),       meta: { ownerOnly: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Wait for initial auth check
  if (!auth.initialized) await auth.init()

  if (to.meta.public) {
    // A fully-onboarded member has no reason to sit on the auth/join pages.
    if (auth.session && auth.member && (to.name === 'auth' || to.name === 'join')) {
      return { name: 'leaderboard' }
    }
    return true
  }

  if (!auth.session) return { name: 'auth' }

  if (!auth.member) return { name: 'join' }

  if (to.meta.ownerOnly && !auth.member.is_owner) return { name: 'leaderboard' }

  return true
})

export default router
