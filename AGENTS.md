# AGENTS.md

_Last updated: 2025-11-15_

## Purpose

- Replaces `CLAUDE.md` as the single source of truth for coding agents.
- Summarizes the guardrails that actually keep this MV3 extension healthy, plus the current review backlog.

## Core Guardrails

- Never suppress lint/type errors (`eslint-disable`, `@ts-ignore`, etc. are banned). Fix root causes instead.
- Keep changes scoped and well-explained; when work is non-trivial create a short plan (see Planning below) before editing code.
- Communicate clearly and directly—no fluff, no praise.
- Do not remove functionality or tests to “make things pass”. Prefer incremental, reversible changes.

## Required Validation Commands

Run **all** of these before handing work off:

1. `bun run format`
2. `bun run lint`
3. `bun run typecheck`
4. `bun run test`
5. `bun run build:dev`
6. `npx --yes web-ext lint -s dist --output json` (run after the build step; Firefox store rejects bundles that fail this)

## Planning & Documentation

- For anything larger than a quick fix, sketch a numbered plan (multi-step, no single-item plans) and put it in `planning/` as `YYYY-MM-DD-feature.md`. Update progress there as you work.
- Keep commit-sized work units; document tricky decisions inline with short comments when the code isn’t self-explanatory.

## Architecture Cheatsheet _(2025-11-15)_

- `src/shared/logging.ts` → tiny helper that no-ops in production; replaces the old `Debug` class.
- `src/shared/parser.ts` ➜ parses raw input/URLs and now owns the service-specific parsing helpers (no cross-module hop).
- `src/shared/canonicalizer.ts` ➜ normalizes fragments into `TransformInfo`.
- `src/shared/resolver.ts` + `src/shared/cache.ts` ➜ handle↔DID resolution with a debounced `DidHandleCache` and inlined retry logic.
- `src/shared/services.ts` ➜ service registry + destination builders; parsing helpers moved out.
- `src/shared/options.ts` ➜ minimal options API (`showEmojis`, `strictMode`, `showCacheDebug`) with listener helpers.
- `src/background/service-worker.ts` ➜ message router plus a lightweight `tabs.onUpdated` listener that precaches DID/handle pairs for any URL `parseInput` understands (all supported services).
- `src/popup/*` ➜ DOM-only rendering (no `innerHTML`), Firefox theme via CSS variables, inline cache debug panel.
- `src/options/*` ➜ simple UI with three toggles; errors revert to the last known good state.
- Builds via Vite + `@crxjs/vite-plugin`; remember to run all validation commands listed above.

## Release / QA Backlog (from 2025-11-15 review)

Update this checklist as items ship; keep it honest.

- [x] **Popup DOM sanitization** (`src/popup/popup.ts:176-193`): Rendering flow writes unsanitized strings into `innerHTML`, which `web-ext lint` flags as `UNSAFE_VAR_ASSIGNMENT`. _Fixed 2025-11-15 by replacing all popup list/status rendering with DOM node creation._
- [x] **Firefox policy metadata** (`public/manifest.json`): Add `browser_specific_settings.gecko.data_collection_permissions` so AMO accepts new uploads. _Fixed 2025-11-15 by declaring `"required": ["none"]`._
- [x] **Options revert bug** (`src/options/options.ts:13-35`): Error handling always reverts to the _initial_ checkbox state, not the last successful save, because the captured `options` object never updates. _Fixed 2025-11-15 by tracking the last persisted values and reverting to those on failures._
- [ ] **Tooling determinism** (`package.json`): Almost every devDependency is pinned to `"latest"`, which makes CI/CD non-reproducible and has already caused surprise build breaks.
- [x] **Cache write amplification** (`src/shared/cache.ts:138-205`): Every cache hit triggers a full `chrome.storage.local.set`, risking quota overruns (120 writes/min) and throttled service-worker lifetimes. _Fixed 2025-11-15 by debouncing read-hit persistence while keeping writes synchronous._

_When you clear an item, document the fix (date + PR/commit) here before removing it so future agents see the history._

## Current Simplification State (2025-11-15)

- Debug infrastructure removed; the new `debugLog/logError` helpers are the only logging hooks.
- Popup relies on static CSS + browser theme variables; all DOM updates are sanitized via `createElement`.
- Service worker precaches DID/handle pairs again by parsing every completed tab URL and only acting when `parseInput` recognizes a supported service.
- `retry.ts`, legacy options helpers, and `wormholeDebug` hooks are gone; parser owns service-specific parsing logic.
- Options include a third “Show cache debug info” toggle; popup shows cache hit/miss status when enabled.
- Remaining backlog: pin dependencies for deterministic builds.
