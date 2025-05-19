# Cleanup Plan for Wormhole MV3 Extension

_Last updated: 2025-05-19_

---

## Current Status (2025-05-19)

- **All source files are now modular TypeScript in `/src`.**
- **Only one `popup.html` (`src/popup/popup.html`) is used; `public/popup.html` has been removed.**
- **Vite config is minimal and uses only `@crxjs/vite-plugin`.**
- **Manifest points to TypeScript/HTML sources; the plugin rewrites these for `dist/` during build.**
- **All TypeScript errors are fixed, tests pass, and the build is clean.**
- **Codebase is ready for browser testing and further development.**

---

## 1 · Project Overview

Wormhole is a Chrome MV3 extension that, given a Bluesky/AT-Proto URL, DID, or handle, builds a list of useful "destinations" (deer.social, bsky.app, etc.) and opens them in new tabs.  
Key code units:

- `transform.js` – parses / canonicalises inputs and builds destination link objects.
- `popup.*` – popup UI, calls `transform.*`, interacts with storage.
- `service-worker.js` – LRU cache for DID→handle mapping, message bridge.
- `test.js` – node tests for `transform.*`.

## 2 · High-Level Goals

1. **Ship-ready quality** – consistent style, clear structure, zero dead code, comments tidy.
2. **Cross-browser** – Chrome MV3 first; smooth ports to Firefox (MV3 + `browser.*`) and Safari (Safari Web Extensions).
3. **Maintainability** – modular ES-modules / TypeScript, strong lint rules, automated tests + CI.
4. **Performance** – lean bundle, minimal permissions, efficient caching.

## 3 · Directory & Build Layout

| Current                              | Now (2025-05-19, implemented)                                  |
| ------------------------------------ | -------------------------------------------------------------- |
| Flat JS/CSS/HTML in root             | `/src` for sources, `/public` for static, `/dist` build output |
| `transform.js` loaded via `<script>` | ES modules bundled by Vite + CRXJS plugin                      |
| No build step                        | Simple `bun run build` producing MV3-compliant output          |
| Multiple popup.html files            | Only `src/popup/popup.html` used (no duplicates)               |

Steps:

1. ~~Create `src/background`, `src/popup`, `src/shared`.~~ **(Done: created on branch `refactor`, 2025-05-19)**
2. ~~Move JS to module files (`*.mjs`/`*.ts`).~~ **(Done: converted to TypeScript on branch `refactor`, 2025-05-19)**
3. ~~Add Vite / Rollup config with `chrome-extension` plugin.~~ **(Done: implemented on branch `refactor`, 2025-05-19)**
4. ~~Output `dist/manifest.json`, icons, HTML.~~ **(Done: implemented on branch `refactor`, 2025-05-19)**

## 4 · Manifest (`manifest.json`)

- ✅ keep `manifest_version: 3`.
- Add `short_name`, `author`, `homepage_url`, `version_name`.
- Replace `"tabs"` permission with `"activeTab"` unless (see §popup) we truly require `tabs`.
- Consider `host_permissions` wildcard `https://*/*` vs enumerating – keep explicit list for privacy.
- Add `optional_host_permissions` for rarely-used sites.
- Add `action.default_title`.
- Add `browser_specific_settings` block for Firefox with `gecko.id`.

## 5 · Source-Code Clean-up

### 5.1 Shared (`src/shared/transform.ts`)

- Convert to **TypeScript**; export named functions.
- Replace custom regex splits with clearer functions + JSDoc.
- Extract constants (`NSID_SHORTCUTS`, host lists) to separate `constants.ts`.
- Add defensive timeouts to `fetch` (AbortController) and retry logic.
- Provide unit tests for `canonicalize`, `resolve…`, `buildDestinations`.
- Use `webextension-polyfill` types when running in extension context; fall back to Node stubs for tests.

### 5.2 Popup (`src/popup`)

- Convert HTML to semantic markup (`<main>`, `<ul>` etc.).
- Externalise inline CSS into `popup.css`; add dark-mode media query.
- Use lit-html / simple template literal helpers instead of manual string concatenation for items.
- Replace direct `chrome.*` calls with `browser.*` polyfill for cross-browser.
- Break `popup.ts` into small functions: `init()`, `fetchInfo()`, `renderDestinations()`, `wireEvents()`.
- Remove global console logs; toggle via `DEBUG` flag.

### 5.3 Service Worker (`src/background/sw.ts`)

- Migrate to `browser` APIs; add type imports.
- Ensure event listeners (`onMessage`, `tabs.onUpdated`) return **false** only when no async.
- Move LRU cache into `LRU.ts` util with generics; document eviction policy.
- Persist cache in `chrome.storage.session` (MV3) where appropriate.
- Add `onInstalled` listener to register context-menu (currently commented out in `background.js`); remove unused `background.js` file entirely.
- Stress-test QUOTA_BYTES errors; maybe chunk writes.

### 5.4 Tests

- Move `test.js` to `tests/transform.test.ts`.
- Use **Jest**; configure jsdom env for browser polyfill.
- Add CI workflow (GitHub Actions) that runs `npm ci`, `npm run lint`, `npm test`, `npm run build`.

## 6 · Styling & Tooling

- **ESLint** – configured in `eslint.config.mjs` (already exists).
- **Prettier** – keep `.prettierrc` as is
- **Commit Hooks** – Husky + lint-staged.
- **Conventional Commits** + Release Please.

## 7 · Cross-Browser Adaptation

| Concern                   | Chrome         | Firefox              | Safari                |
| ------------------------- | -------------- | -------------------- | --------------------- |
| API namespace             | `chrome`       | `browser` + polyfill | `browser`             |
| MV version                | 3              | 3                    | Safari Web Extensions |
| Permissions UI            | matches        | identical            | ask in Xcode          |
| Context menu registration | service-worker | background_scripts   | automatically bridged |

Actions:

1. Import `webextension-polyfill` and always code to `browser.*`.
2. Add Firefox `browser_specific_settings` in manifest.
3. (Shelved for now!) Run `xcrun safari-webextension-convert` during CI to produce Safari build.

## 8 · Performance & UX

- Debounce handle-resolution in popup; show spinner icon.
- Cache results in `sessionStorage` for popup lifetime.
- Limit host list to top destinations; add "Copy at://" fallback.
- Lazy-load heavy icons.

## 9 · Security & Privacy

- Review third-party hosts; move some to **optional host permissions**.
- Validate URLs before opening (`URL` constructor + `origin` check).
- Add CSP to `popup.html` (script-src 'self').
- Use `rel="noopener noreferrer"` (already done) and maybe `referrerpolicy="no-referrer"`.
- Remove unused console logs before release.

## 10 · Dead Code / Assets to Remove

- `background.js` (entire file, now superseded by `service-worker.js`).
- `.DS_Store`, stray icon sizes not referenced.
- `bun.lock` if project standardises on npm/yarn/pnpm.
- `OLD-refactor-plan.md` once this plan supersedes it.

## 11 · Release Checklist

1. [ ] Implement all clean-ups above.
2. [ ] Bump version & update changelog.
3. [ ] `npm run test` – all green.
4. [ ] `npm run build` – verify size < 200 KB zipped.
5. [ ] Load `dist/` in Chrome Canary / Firefox Nightly / Safari Tech Preview.
6. [ ] Lint manifest via `chrome-webstore-upload-cli lint`.
7. [ ] Tag & create GitHub release, attach CRX/XPI/Safari pkg.
8. [ ] Submit to Chrome Web Store (Trusted Tester) and AMO.

---

_This plan intentionally contains no code changes; it serves as the authoritative TODO for the final pre-release tidy-up._
