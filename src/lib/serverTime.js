import { ref } from 'vue'
import { supabase } from './supabase.js'

// Offset between the Postgres server clock and this browser's clock
// (serverTime − clientTime), in ms. Used to anchor countdown / lock
// *displays* to the server so a spoofed local clock can't skew them.
//
// The authoritative prediction lock is enforced server-side by RLS
// (see supabase/migrations/001_initial.sql) regardless of this value;
// if the sync fails we simply fall back to the local clock.
const offsetMs = ref(0)
let syncing = null

export async function syncServerTime() {
  if (syncing) return syncing
  syncing = (async () => {
    try {
      const t0 = Date.now()
      const { data, error } = await supabase.rpc('server_now')
      if (error) throw error
      const rtt = Date.now() - t0
      // The server generated `data` ~rtt/2 ago; correct for that.
      offsetMs.value = new Date(data).getTime() - (t0 + rtt / 2)
    } catch {
      offsetMs.value = 0 // graceful fallback: behave as before (local clock)
    }
  })()
  return syncing
}

// Current time in ms, anchored to the server clock.
export function serverNow() {
  return Date.now() + offsetMs.value
}

export { offsetMs }
