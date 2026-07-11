# Diivo Clipper

A Chrome/Chromium extension (Manifest V3) that saves images from any website
straight into the **Diivo** desktop app — hover an image, click **Save**, and
it lands in your Diivo Inbox.

## How it works

- A content script shows a small **Save** button on the top-right of any
  reasonably-sized image on hover.
- Clicking sends the image URL + page URL to the background service worker.
- The worker talks to the Diivo desktop app over a **local loopback server**
  (`http://127.0.0.1:8127`, with a small fallback port range), authenticated
  with a **pairing token**.
- If the app isn't running, saves are **queued** and flushed automatically when
  the app comes back online.

Nothing leaves your machine except the request to your own local app — the
extension only talks to `127.0.0.1`.

## Setup

1. In **Diivo → Settings → Browser clipper**, turn the clipper on and copy the
   **pairing token**.
2. Load this extension in Chrome:
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - **Load unpacked** → select this folder.
3. Open the extension popup, paste the token, click **Pair**.
4. Hover any image on the web → click **Save**.

The toolbar badge flashes ✓ on save, shows a count of queued items when the app
is offline, and `!` on error.

## Status

MVP. Saves public images by URL. Planned: blob upload for auth-gated images,
icons, a nicer popup, and Chrome Web Store packaging.
