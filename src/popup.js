/**
 * ShainBox Clipper — popup.
 *
 * Paired & valid: compact status + per-site toggle + video/GIF beta toggle;
 * the pairing form hides behind a "Change pairing token…" link. Unpaired or
 * wrong token: the form is front and center. The token is verified against
 * the app on every open and right after pairing — a stored-but-wrong token
 * must never look connected.
 */

const appDot = document.getElementById('appDot')
const appText = document.getElementById('appText')
const pairSection = document.getElementById('pairSection')
const tokenInput = document.getElementById('token')
const saveBtn = document.getElementById('save')
const hint = document.getElementById('hint')
const changeBtn = document.getElementById('changeToken')
const siteSection = document.getElementById('siteSection')
const siteHost = document.getElementById('siteHost')
const siteState = document.getElementById('siteState')
const siteToggle = document.getElementById('siteToggle')
const videoSection = document.getElementById('videoSection')
const videoState = document.getElementById('videoState')
const videoToggle = document.getElementById('videoToggle')

const HINT_DEFAULT = 'In the app: Settings → Browser clipper → turn it on → copy the token here.'
const HINT_PAIRED = 'Paired. Hover any image and click Save.'
const HINT_BAD = 'That token doesn’t match — copy a fresh one from ShainBox → Settings.'

let st = { paired: false, appOnline: false, tokenValid: false }
let editing = false
let justSaved = false
let host = null
let disabledSites = []
let videoSaves = true

function show(el, on) {
  el.classList.toggle('hidden', !on)
}

function connected() {
  return st.paired && st.tokenValid
}

function updateLayout() {
  const badToken = st.paired && st.appOnline && !st.tokenValid
  show(pairSection, !st.paired || badToken || editing)
  show(changeBtn, st.paired && !badToken && !editing)
  show(siteSection, connected() && !!host)
  show(videoSection, connected())
}

function setStatus(on, text) {
  appDot.className = 'dot ' + (on ? 'on' : 'off')
  appText.textContent = text
}

function refreshStatus() {
  chrome.runtime.sendMessage({ type: 'status' }, (s) => {
    if (chrome.runtime.lastError || !s) {
      setStatus(false, 'Extension error')
      return
    }
    st = s
    if (!s.appOnline) {
      setStatus(false, 'ShainBox not running')
    } else if (!s.paired) {
      setStatus(false, 'App found — not paired')
    } else if (!s.tokenValid) {
      setStatus(false, 'Wrong token — not connected')
    } else {
      const q = s.queued ? ` · ${s.queued} queued` : ''
      setStatus(true, `Connected · port ${s.port}${q}`)
    }
    if (justSaved) {
      justSaved = false
      if (s.paired) hint.textContent = s.tokenValid ? HINT_PAIRED : HINT_BAD
    }
    updateLayout()
  })
}

function renderSite() {
  if (!host) return
  const off = disabledSites.includes(host)
  siteHost.textContent = host
  siteState.textContent = off ? 'Clipper is off on this site' : 'Clipper is on here'
  siteToggle.textContent = off ? 'Enable' : 'Disable'
}

function renderVideo() {
  videoState.textContent = videoSaves
    ? 'Save button shows on videos too'
    : 'Images only — videos are skipped'
  videoToggle.textContent = videoSaves ? 'Turn off' : 'Turn on'
}

async function initPrefs() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = new URL(tab && tab.url ? tab.url : '')
    if (url.protocol === 'http:' || url.protocol === 'https:') host = url.hostname
  } catch {
    // chrome:// pages, the Web Store, etc — no per-site toggle there.
  }
  const { disabledSites: ds, videoSaves: vs } = await chrome.storage.local.get([
    'disabledSites',
    'videoSaves',
  ])
  disabledSites = Array.isArray(ds) ? ds : []
  videoSaves = vs !== false
  renderSite()
  renderVideo()
  updateLayout()
}

siteToggle.addEventListener('click', async () => {
  if (!host) return
  disabledSites = disabledSites.includes(host)
    ? disabledSites.filter((h) => h !== host)
    : [...disabledSites, host]
  await chrome.storage.local.set({ disabledSites })
  renderSite()
})

videoToggle.addEventListener('click', async () => {
  videoSaves = !videoSaves
  await chrome.storage.local.set({ videoSaves })
  renderVideo()
})

changeBtn.addEventListener('click', () => {
  editing = true
  updateLayout()
  tokenInput.focus()
})

saveBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim()
  await chrome.storage.local.set({ token })
  editing = false
  if (token) {
    hint.textContent = 'Checking token…'
    justSaved = true
  } else {
    hint.textContent = 'Token cleared.'
  }
  st = { ...st, paired: !!token }
  updateLayout()
  refreshStatus()
})

async function init() {
  const { token } = await chrome.storage.local.get('token')
  st = { ...st, paired: !!token }
  if (token) tokenInput.value = token
  hint.textContent = HINT_DEFAULT
  updateLayout()
  refreshStatus()
  initPrefs()
}

init()
