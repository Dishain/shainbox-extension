/**
 * ShainBox Clipper — content script (Pinterest-style control).
 *
 * On image hover, shows a small floating control in the top-right corner:
 *   [ ShainBox mark  |  ⌄ ]
 * Clicking the mark saves the image to the last-used board. Clicking the
 * chevron opens a board picker; choosing a board saves there and remembers it.
 * Styled in the Tran Mau Tri Tam idiom — white surface, hairline, soft shadow,
 * one blue accent, generous radius.
 */

const MIN_SIZE = 100
const APP_MARK =
  // Simplified brand mark (blue cube on black) — dashed wireframe from the
  // full logo is dropped: it turns to noise at 16px.
  '<svg viewBox="0 0 1024 1024" width="16" height="16" aria-hidden="true">' +
  '<rect width="1024" height="1024" rx="205" fill="#0A0A0A"/>' +
  '<path d="M512 232L756 372V652L512 792L268 652V372Z" fill="#2A85FF"/></svg>'
const CHECK =
  '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' +
  '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#1fb36b" stroke-width="2" ' +
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
let currentImg = null
let hideTimer = null
let menuOpen = false
let boardsLoaded = false
let lastBoard = 'Inbox'

chrome.storage.local.get('lastBoard').then(({ lastBoard: lb }) => {
  if (lb) lastBoard = lb
})

function build() {
  if (control) return
  control = document.createElement('div')
  control.className = 'shainbox-clip'
  control.innerHTML =
    `<button class="shainbox-clip__save" type="button" title="Save to ShainBox">${APP_MARK}</button>` +
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
  currentImg = img
  resetSaveIcon()
  control.style.display = 'inline-flex'
  requestAnimationFrame(() => position(img))
}

function scheduleHide() {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (menuOpen) return
    if (control) control.style.display = 'none'
    currentImg = null
  }, 160)
}

function resetSaveIcon() {
  if (saveBtn) {
    saveBtn.innerHTML = APP_MARK
    saveBtn.classList.remove('is-ok', 'is-error')
  }
}
function flashSave(kind, label) {
  if (!saveBtn) return
  saveBtn.classList.remove('is-ok', 'is-error')
  if (kind === 'ok') {
    saveBtn.innerHTML = CHECK
    saveBtn.classList.add('is-ok')
  } else {
    saveBtn.classList.add('is-error')
    saveBtn.title = label || 'Failed'
  }
  setTimeout(resetSaveIcon, 1400)
}

function save(board) {
  if (!currentImg) return
  const imageUrl = currentImg.currentSrc || currentImg.src
  if (!imageUrl) return
  saveBtn.classList.add('is-busy')
  chrome.runtime.sendMessage(
    { type: 'save', imageUrl, pageUrl: location.href, board },
    (resp) => {
      saveBtn.classList.remove('is-busy')
      if (chrome.runtime.lastError) return flashSave('error', 'App off')
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
      ? `<div class="shainbox-clip__empty">Open ShainBox and pair the extension</div>`
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

function eligible(el) {
  return el instanceof HTMLImageElement && el.clientWidth >= MIN_SIZE && el.clientHeight >= MIN_SIZE
}

document.addEventListener(
  'mouseover',
  (e) => {
    if (control && control.contains(e.target)) return
    if (eligible(e.target)) {
      clearTimeout(hideTimer)
      showFor(e.target)
    }
  },
  true,
)
document.addEventListener(
  'mouseout',
  (e) => {
    if (e.target instanceof HTMLImageElement) scheduleHide()
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
    if (currentImg && control && control.style.display !== 'none') position(currentImg)
  },
  true,
)
