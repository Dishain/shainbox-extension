/**
 * ShainBox Clipper — background service worker (MV3).
 *
 * Talks to the desktop app's loopback server (127.0.0.1). Responsibilities:
 *   - discover the app (ping a small port range, remember the good one)
 *   - POST /save with the pairing token
 *   - queue saves while the app is offline and flush them when it returns
 *   - reflect state on the toolbar badge
 */

const PORTS = [8127, 8128, 8129, 8130, 8131, 8132]
const PING_TIMEOUT_MS = 1200

async function getToken() {
  const { token } = await chrome.storage.local.get('token')
  return token || ''
}
async function getQueue() {
  const { queue } = await chrome.storage.local.get('queue')
  return Array.isArray(queue) ? queue : []
}
async function setQueue(queue) {
  await chrome.storage.local.set({ queue })
  await updateBadge()
}

async function pingPort(port) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS)
  try {
    const res = await fetch(`http://127.0.0.1:${port}/ping`, { signal: ctrl.signal })
    if (!res.ok) return false
    const j = await res.json()
    return !!j && j.app === 'shainbox'
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

/** Return the port the app is listening on, or null if offline. */
async function findApp() {
  const { port: known } = await chrome.storage.local.get('port')
  const order = known ? [known, ...PORTS.filter((p) => p !== known)] : PORTS
  for (const port of order) {
    if (await pingPort(port)) {
      await chrome.storage.local.set({ port })
      return port
    }
  }
  return null
}

async function postSave(port, token, payload) {
  const res = await fetch(`http://127.0.0.1:${port}/save`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-shainbox-token': token },
    body: JSON.stringify(payload),
  })
  const j = await res.json().catch(() => ({}))
  return { ok: res.ok && !!j.ok, status: res.status, error: j.error }
}

async function trySave(payload) {
  const token = await getToken()
  if (!token) return { ok: false, reason: 'unpaired' }
  const port = await findApp()
  if (!port) return { ok: false, reason: 'app-offline' }
  const r = await postSave(port, token, payload)
  if (r.ok) return { ok: true }
  if (r.status === 401) return { ok: false, reason: 'unauthorized' }
  return { ok: false, reason: 'error', error: r.error }
}

async function flushQueue() {
  const queue = await getQueue()
  if (queue.length === 0) return
  const token = await getToken()
  if (!token) return
  const port = await findApp()
  if (!port) return
  const remaining = []
  for (const item of queue) {
    const r = await postSave(port, token, item)
    // Keep transient failures for the next flush; drop on auth/success.
    if (!r.ok && r.status !== 401) remaining.push(item)
  }
  await setQueue(remaining)
}

async function updateBadge() {
  const n = (await getQueue()).length
  await chrome.action.setBadgeText({ text: n > 0 ? String(n) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#2a85ff' })
}

async function flash(color, text) {
  await chrome.action.setBadgeText({ text })
  await chrome.action.setBadgeBackgroundColor({ color })
  setTimeout(() => void updateBadge(), 1500)
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'save') {
    ;(async () => {
      const payload = { imageUrl: msg.imageUrl, pageUrl: msg.pageUrl, board: msg.board }
      const r = await trySave(payload)
      if (r.ok) {
        await flash('#1fb36b', '✓')
        sendResponse({ ok: true })
      } else if (r.reason === 'app-offline') {
        const queue = await getQueue()
        queue.push(payload)
        await setQueue(queue)
        await flash('#ff9f43', '•')
        sendResponse({ ok: true, queued: true })
      } else {
        await flash('#ff5a5a', '!')
        sendResponse({ ok: false, reason: r.reason, error: r.error })
      }
    })()
    return true // async response
  }
  if (msg && msg.type === 'boards') {
    ;(async () => {
      const token = await getToken()
      const port = await findApp()
      if (!token || !port) {
        sendResponse({ ok: false, boards: [] })
        return
      }
      try {
        const res = await fetch(`http://127.0.0.1:${port}/boards`, {
          headers: { 'x-shainbox-token': token },
        })
        const j = await res.json().catch(() => ({}))
        sendResponse({ ok: !!j.ok, boards: Array.isArray(j.boards) ? j.boards : [] })
      } catch {
        sendResponse({ ok: false, boards: [] })
      }
    })()
    return true
  }
  if (msg && msg.type === 'status') {
    ;(async () => {
      const token = await getToken()
      const port = await findApp()
      const queued = (await getQueue()).length
      // A stored token isn't a working token — ask the app. Only an explicit
      // 401 marks it invalid; a network hiccup shouldn't scare the user.
      let tokenValid = !!token
      if (token && port) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/boards`, {
            headers: { 'x-shainbox-token': token },
          })
          tokenValid = res.status !== 401
        } catch {
          tokenValid = true
        }
      }
      sendResponse({ paired: !!token, appOnline: !!port, port, queued, tokenValid })
    })()
    return true
  }
  return false
})

// The app may come online after a save was queued — retry periodically.
chrome.alarms.create('flush', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'flush') void flushQueue()
})
