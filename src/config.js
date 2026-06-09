// Pool configuration — committed to the repo.
// The anon key is intentionally public; security is enforced by Supabase RLS.
// Fill TODO values before go-live (see pre-go-live checklist in the build plan).

export const CONFIG = {
  poolName: 'JPZK 2026',
  ownerEmail: 'martin.masrna@gmail.com',
  joinCodeHash: '$2a$10$FzbIEkYar.YNOTjcAofGnOrACYQxD6cxcFpAnpehj1i3MgkbLyqhy',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}

// Match 1 kickoff — used throughout the app to determine pre-tournament lock.
// This is a local constant so the app works even before Supabase data loads.
export const MATCH_1_KICKOFF = '2026-06-11T19:00:00Z'

// Knockout stages (for rendering and logic)
export const KNOCKOUT_STAGES = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Third place',
  'Final',
]
