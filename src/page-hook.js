/**
 * Diivo Clipper - X/Twitter page helper (runs in the page's MAIN world).
 *
 * X streams video via MSE (the <video> src is a blob:), and its API traffic
 * runs in a worker the extension can't observe - but the tweet data in
 * React's fiber tree carries plain progressive .mp4 variant URLs. The
 * content script can't see page JS objects across worlds, so it marks the
 * hovered <video> with a data attribute and asks us via postMessage to walk
 * the fiber tree and return the best variant. Nothing else is read, stored,
 * or sent anywhere.
 */
;(() => {
  if (window.__diivoClipperHooked) return
  window.__diivoClipperHooked = true

  /** Highest-bitrate video/mp4 URL inside a props subtree, or null. */
  function bestVariant(obj, depth, seen) {
    if (!obj || typeof obj !== 'object' || depth > 7 || seen.has(obj)) return null
    seen.add(obj)
    if (Array.isArray(obj.variants)) {
      const mp4 = obj.variants.filter((v) => v && v.content_type === 'video/mp4' && v.url)
      if (mp4.length) {
        return mp4.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0].url
      }
    }
    for (const k in obj) {
      try {
        const r = bestVariant(obj[k], depth + 1, seen)
        if (r) return r
      } catch {
        /* getters can throw - skip */
      }
    }
    return null
  }

  /** Walk up from the element to a node carrying a React fiber, then up
   *  the fiber tree until some ancestor's props contain the variants. */
  function findMp4(el) {
    let node = el
    for (let hop = 0; node && hop < 14; hop++) {
      const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$'))
      if (key) {
        let fiber = node[key]
        for (let up = 0; fiber && up < 40; up++) {
          const r = bestVariant(fiber.memoizedProps, 0, new WeakSet())
          if (r) return r
          fiber = fiber.return
        }
      }
      node = node.parentElement
    }
    return null
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.__diivoClipper !== 'find-video') return
    const reqId = String(e.data.reqId || '')
    if (!/^[a-z0-9]+$/i.test(reqId)) return
    const el = document.querySelector('[data-diivo-clip="' + reqId + '"]')
    let url = null
    if (el) {
      try {
        url = findMp4(el)
      } catch {
        url = null
      }
    }
    window.postMessage({ __diivoClipper: 'video-result', reqId, url }, '*')
  })
})()
