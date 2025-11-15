# 2025-11-15 rel=alternate AT URI probe

## Goal

Detect `at://` links exposed via `<link rel="alternate" href="at://...">` on the active tab (Leaflet, WhtWnd, etc.) and feed those AT URIs into the popup so users can jump to any supported destination without guessing the handle.

## Plan

1. **Manifest & Types** – add the `scripting` permission, extend shared message types for a probe request/response, and describe the new detection source so later features can refer to it explicitly. _(Done 2025-11-15)_
2. **Head Scanner Helper** – build a pure helper (e.g., `extractAtUriFromHead(html: string)`) that sanitizes/validates `<link rel="alternate">` tags and returns canonical AT URIs; unit-test with representative Leaflet/WhtWnd markup. _(Done 2025-11-15)_
3. **Service Worker Probe** – add a new `PROBE_PAGE_FOR_AT_URI` handler that runs `chrome.scripting.executeScript` (activeTab gated) to collect the page’s `<head>` HTML, uses the helper to parse it, and caches the best `TransformInfo` in `chrome.storage.session` keyed by tab. _(Done 2025-11-15)_
4. **Popup Integration** – when loading the popup, fetch the cached probe info (or trigger a fresh probe) and merge it with the existing `parseInput` result; surface clear status text (“Detected via rel=alternate metadata”) so users know why new actions appeared. _(Done 2025-11-15)_
5. **Destinations & UX polish** – ensure `buildDestinations` already handles AT URIs with collection/rkey; if not, extend it plus add defensive logging, update docs/AGENTS backlog if review or permissions changed. _(Pending)_
6. **Merge Semantics** – fix `mergeTransformInfo` to treat empty strings correctly (use nullish coalescing for `bskyAppPath`) so the probe result can’t overwrite a valid empty path. _(Done 2025-11-15)_
7. **URL-aware Probe Cache** – include the page URL in the probe cache so navigating within a tab doesn’t reuse stale rel=alternate data; invalidate entries when the stored URL doesn’t match the current tab URL. _(Done 2025-11-15)_

_Status: in progress_
