/**
 * Diivo Clipper — content script (Pinterest-style control).
 *
 * On image hover, shows a small floating control in the top-right corner:
 *   [ Diivo mark  |  ⌄ ]
 * Clicking the mark saves the image to the last-used board. Clicking the
 * chevron opens a board picker; choosing a board saves there and remembers it.
 * Styled in the Tran Mau Tri Tam idiom — white surface, hairline, soft shadow,
 * one blue accent, generous radius.
 */

const MIN_SIZE = 100
const APP_MARK =
  // Extension-resource URL (web_accessible_resources) - immune to page CSP,
  // unlike data: URIs which strict sites block via img-src.
  '<img width="18" height="18" style="display:block" alt="" src="' +
  chrome.runtime.getURL('icons/icon32.png') + '" />'
const CHECK =
  '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' +
  '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#4cc98a" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>'
const CHEVRON =
  '<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">' +
  '<path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>'

function folderSvg(color) {
  return (
    '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">' +
    '<path d="M2 4.1c0-.66.54-1.2 1.2-1.2h2.3c.39 0 .76.19.99.51l.46.64c.07.1.18.15.3.15H10.8' +
    'c.66 0 1.2.54 1.2 1.2v4.7c0 .66-.54 1.2-1.2 1.2H3.2c-.66 0-1.2-.54-1.2-1.2V4.1z" fill="' +
    color +
    '"/></svg>'
  )
}
function boardColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `hsl(${h % 360} 62% 55%)`
}

let control = null
let saveBtn = null
let menu = null
let currentMedia = null
let hideTimer = null
let menuOpen = false
let boardsLoaded = false
let lastBoard = 'Inbox'

chrome.storage.local.get('lastBoard').then(({ lastBoard: lb }) => {
  if (lb) lastBoard = lb
})

// Per-site kill switch + video/GIF beta toggle (managed from the popup).
// Both react live via storage.onChanged — no page reload needed.
let siteDisabled = false
let videoSaves = true
chrome.storage.local.get(['disabledSites', 'videoSaves']).then(({ disabledSites, videoSaves: vs }) => {
  siteDisabled = Array.isArray(disabledSites) && disabledSites.includes(location.hostname)
  videoSaves = vs !== false
  if (siteDisabled) hideControl()
})
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes.disabledSites) {
    const list = changes.disabledSites.newValue
    siteDisabled = Array.isArray(list) && list.includes(location.hostname)
    if (siteDisabled) hideControl()
  }
  if (changes.videoSaves) {
    videoSaves = changes.videoSaves.newValue !== false
    if (!videoSaves && currentMedia && isVideoLike(currentMedia)) hideControl()
  }
})

function hideControl() {
  closeMenu()
  if (control) control.style.display = 'none'
  currentMedia = null
}

function build() {
  if (control) return
  control = document.createElement('div')
  control.className = 'shainbox-clip'
  control.innerHTML =
    `<button class="shainbox-clip__save" type="button" title="Save to Diivo">${APP_MARK}</button>` +
    `<span class="shainbox-clip__div"></span>` +
    `<button class="shainbox-clip__more" type="button" title="Choose board">${CHEVRON}</button>`
  menu = document.createElement('div')
  menu.className = 'shainbox-clip__menu'
  menu.style.display = 'none'
  control.appendChild(menu)

  saveBtn = control.querySelector('.shainbox-clip__save')
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    save(lastBoard)
  })
  control.querySelector('.shainbox-clip__more').addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleMenu()
  })
  control.addEventListener('mouseenter', () => clearTimeout(hideTimer))
  control.addEventListener('mouseleave', scheduleHide)
  document.documentElement.appendChild(control)
}

function position(img) {
  const r = img.getBoundingClientRect()
  control.style.top = `${window.scrollY + r.top + 8}px`
  control.style.left = `${window.scrollX + r.right - control.offsetWidth - 8}px`
}

function showFor(img) {
  build()
  currentMedia = img
  resetSaveIcon()
  control.style.display = 'inline-flex'
  requestAnimationFrame(() => position(img))
}

function scheduleHide() {
  clearTimeout(hideTimer)
  // While the queued-note is showing, keep the pill on screen long enough
  // for the message to be read even if the cursor wanders off.
  const delay = Date.now() < noteUntil ? noteUntil - Date.now() + 200 : 160
  hideTimer = setTimeout(() => {
    if (menuOpen) return
    if (control) control.style.display = 'none'
    currentMedia = null
  }, delay)
}

function resetSaveIcon() {
  if (saveBtn) {
    saveBtn.innerHTML = APP_MARK
    saveBtn.classList.remove('is-ok', 'is-error', 'is-queued')
  }
}

/* Transient note bubble under the pill — used when the save needs the
   user to act (e.g. the desktop app is closed and the clip was queued).
   The pill stays visible while the note is up so the message can't be
   missed by a stray mouse-out. */
let noteUntil = 0
function showNote(text) {
  if (!control) return
  let note = control.querySelector('.shainbox-clip__note')
  if (!note) {
    note = document.createElement('div')
    note.className = 'shainbox-clip__note'
    control.appendChild(note)
  }
  note.textContent = text
  note.style.display = 'block'
  noteUntil = Date.now() + 3800
  setTimeout(() => {
    if (Date.now() >= noteUntil && note) note.style.display = 'none'
  }, 3900)
}

function flashSave(kind, label) {
  if (!saveBtn) return
  saveBtn.classList.remove('is-ok', 'is-error', 'is-queued')
  if (kind === 'ok') {
    saveBtn.innerHTML = CHECK
    saveBtn.classList.add('is-ok')
  } else if (kind === 'queued') {
    // Not an error, but not a success either: the clip is safe in the
    // queue, yet nothing appears in the library until the app runs.
    // Say so explicitly right here — not only in the popup.
    saveBtn.classList.add('is-queued')
    saveBtn.title = 'Diivo is closed — clip queued'
    showNote('Diivo is closed — clip saved to the queue. Open the app and it will appear in your library.')
  } else {
    saveBtn.classList.add('is-error')
    saveBtn.title = label || 'Failed'
  }
  setTimeout(resetSaveIcon, kind === 'queued' ? 3800 : 1400)
}

function save(board) {
  if (!currentMedia) return
  const imageUrl = mediaUrl(currentMedia)
  if (!imageUrl) return
  saveBtn.classList.add('is-busy')
  chrome.runtime.sendMessage(
    { type: 'save', imageUrl, pageUrl: location.href, board },
    (resp) => {
      saveBtn.classList.remove('is-busy')
      if (chrome.runtime.lastError) return flashSave('error', 'App off')
      // Queued ≠ saved: the app is closed, so be honest about it here.
      if (resp && resp.ok && resp.queued) return flashSave('queued')
      if (resp && resp.ok) return flashSave('ok')
      if (resp && resp.reason === 'unpaired') return flashSave('error', 'Pair first')
      flashSave('error', (resp && resp.error) || 'Failed')
    },
  )
  lastBoard = board
  void chrome.storage.local.set({ lastBoard: board })
  closeMenu()
}

function toggleMenu() {
  if (menuOpen) return closeMenu()
  menuOpen = true
  menu.style.display = 'block'
  renderMenu()
  if (!boardsLoaded) loadBoards()
}
function closeMenu() {
  menuOpen = false
  if (menu) menu.style.display = 'none'
}

let boards = []
function loadBoards() {
  chrome.runtime.sendMessage({ type: 'boards' }, (resp) => {
    if (chrome.runtime.lastError) return
    boards = (resp && resp.boards) || []
    boardsLoaded = true
    renderMenu()
  })
}

function renderMenu() {
  const rows =
    boards.length === 0
      ? `<div class="shainbox-clip__empty">Open Diivo and pair the extension</div>`
      : boards
          .map((b) => {
            const active = b.relPath === lastBoard ? ' is-active' : ''
            return (
              `<button class="shainbox-clip__row${active}" data-board="${encodeURIComponent(b.relPath)}" type="button">` +
              `<span class="shainbox-clip__ico">${folderSvg(boardColor(b.name))}</span>` +
              `<span class="shainbox-clip__name">${escapeHtml(b.name)}</span>` +
              (active ? '<span class="shainbox-clip__tick">✓</span>' : '') +
              `</button>`
            )
          })
          .join('')
  menu.innerHTML = `<div class="shainbox-clip__label">Save to</div>${rows}`
  menu.querySelectorAll('.shainbox-clip__row').forEach((row) => {
    row.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      save(decodeURIComponent(row.getAttribute('data-board')))
    })
  })
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

/** http(s) URL of the media, or null (blob:/data: sources can't be fetched by the app). */
function mediaUrl(el) {
  const u = el.currentSrc || el.src || ''
  if (/^https?:/i.test(u)) return u
  if (el instanceof HTMLVideoElement) {
    const s = el.querySelector('source[src]')
    if (s && /^https?:/i.test(s.src)) return s.src
  }
  return null
}

/** Part of the beta video feature: <video> elements and animated .gif images. */
function isVideoLike(el) {
  if (el instanceof HTMLVideoElement) return true
  const u = el.currentSrc || el.src || ''
  return /\.gif([?#]|$)/i.test(u)
}

function eligible(el) {
  return (
    (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) &&
    el.clientWidth >= MIN_SIZE &&
    el.clientHeight >= MIN_SIZE &&
    (videoSaves || !isVideoLike(el)) &&
    !!mediaUrl(el)
  )
}

/** Videos often hide under overlay divs — probe the element stack at the cursor. */
function findMediaAt(e) {
  if (e.target instanceof Element && eligible(e.target)) return e.target
  if (typeof e.clientX !== 'number') return null
  for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
    if (el instanceof HTMLVideoElement && eligible(el)) return el
  }
  return null
}

document.addEventListener(
  'mouseover',
  (e) => {
    if (siteDisabled) return
    if (control && control.contains(e.target)) return
    const media = findMediaAt(e)
    if (!media) return
    clearTimeout(hideTimer)
    // Re-hovering the same media (e.g. crossing a video's overlay children)
    // shouldn't reset the save-button state mid-flash.
    if (media !== currentMedia || !control || control.style.display === 'none') {
      showFor(media)
    }
  },
  true,
)
document.addEventListener(
  'mouseout',
  (e) => {
    if (!currentMedia || !control || control.style.display === 'none') return
    if (e.relatedTarget instanceof Node && control.contains(e.relatedTarget)) return
    scheduleHide()
  },
  true,
)
document.addEventListener(
  'mousedown',
  (e) => {
    if (menuOpen && control && !control.contains(e.target)) closeMenu()
  },
  true,
)
window.addEventListener(
  'scroll',
  () => {
    if (currentMedia && control && control.style.display !== 'none') position(currentMedia)
  },
  true,
)
