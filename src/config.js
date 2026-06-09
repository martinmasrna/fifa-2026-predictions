// Pool configuration — committed to the repo.
// The anon key is intentionally public; security is enforced by Supabase RLS.

export const CONFIG = {
  poolName: 'JPZK',
  ownerEmail: 'martin.masrna@gmail.com',
  joinCodeHash: '$2a$10$FzbIEkYar.YNOTjcAofGnOrACYQxD6cxcFpAnpehj1i3MgkbLyqhy',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}

// Match 1 kickoff — used throughout the app to determine pre-tournament lock.
// This is a local constant so the app works even before Supabase data loads.
export const MATCH_1_KICKOFF = '2026-06-11T19:00:00Z'

// Group quotes / inside jokes — rotated on the login screen.
// Add more any time; keep them exactly as said.
export const QUOTES = [
  { text: 'nabuduce ta uz nenecham vyhrať ;)', author: 'Martin' },
  { text: 'Buď si hráč, alebo si sráč.', author: 'Unknown' },
  { text: 'Tu mace fotbal ... a bavce fotbal.', author: 'Vlado Matúš' },
]

// Knockout stages (for rendering and logic)
export const KNOCKOUT_STAGES = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Third place',
  'Final',
]
