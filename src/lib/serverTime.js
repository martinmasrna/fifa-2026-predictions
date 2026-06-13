import { ref } from 'vue'
import { supabase } from './supabase.js'

// Offset between the Postgres server clock and this browser's clock
// (serverTime − clientTime), in ms. Anchors countdown / lock *displays* to the
// server so a spoofed or drifting local clock can't skew them. The real
// prediction lock is enforced server-side by RLS regardless of this value.
const offsetMs = ref(0)
let syncing = null

export async function syncServerTime() {
  if (syncing) return syncing // dedupe concurrent calls only
  syncing = (async () => {
    try {
      const t0 = Date.now()
      const { data, error } = await supabase.rpc('server_now')
      if (error) throw error
      const rtt = Date.now() - t0
      // The server generated `data` ~rtt/2 ago; correct for that.
      offsetMs.value = new Date(data).getTime() - (t0 + rtt / 2)
    } catch {
      // Keep the last good offset; don't clobber it back to the local clock.
    } finally {
      syncing = null // CRITICAL: allow future re-syncs — the local clock can
                     // drift or be corrected during a long-lived session.
    }
  })()
  return syncing
}

// Current time in ms, anchored to the server clock.
export function serverNow() {
  return Date.now() + offsetMs.value
}

// ── Shared reactive clock ──────────────────────────────────────
// Every time-gated view reads `nowMs` so they all advance together. The ticker
// pauses while the tab is hidden and, on regaining focus, RE-SYNCS the offset
// and updates immediately — browsers freeze timers in background tabs, so a long
// idle would otherwise leave the UI stuck in the past (matches shown "open"
// after kickoff, reveals not unlocking) until a hard refresh.
const nowMs = ref(serverNow())
let ticker = null
let started = false

function tick() { nowMs.value = serverNow() }
function startTicker() { if (!ticker) ticker = setInterval(tick, 1000) }
function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null } }

async function resume() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  await syncServerTime() // re-anchor in case the clock drifted while away
  tick()
  startTicker()
}

function onVisibility() {
  if (document.visibilityState === 'visible') resume()
  else stopTicker()
}

// Start the global clock once (from App.vue). Idempotent.
export function startClock() {
  if (started) return
  started = true
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', resume)
  resume() // initial sync + tick + start ticking
}

export { offsetMs, nowMs }
