# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: Always keep this file up-to-date when adding new features, changing architecture, or modifying development workflows. Future Claude instances rely on this documentation.

**CRITICAL**: Always run:

- `bun run format`
- `bun run lint`
- `bun run typecheck`
- `bun run test`

after making any code changes to ensure code quality and type safety.

## Build and Development Commands

- `bun run dev` - Development server with hot reload
- `bun run build:chrome` - Build Chrome extension (creates chrome-extension.zip)
- `bun run build:firefox` - Build Firefox extension (creates firefox-extension.zip)
- `bun run build:dev` - Development build without minification
- `bun run test` - Run tests using tsx
- `bun run lint` - Lint code with ESLint
- `bun run format` - Format code with Prettier
- `bun run typecheck` - TypeScript type checking

## Architecture

This is a Manifest V3 browser extension that provides "wormhole" navigation between different AT Protocol/Bluesky services. The extension transforms URLs and identifiers from one service to equivalent URLs on other services.

### Core Components

**Transform System (`src/shared/transform.ts`)**:

- `parseInput()` - Main entry point that accepts URLs, handles, or DIDs and extracts canonical information
- `canonicalize()` - Converts any input to standardized TransformInfo structure
- `buildDestinations()` - Generates list of equivalent URLs across different services
- Handle/DID resolution functions with caching

**Service Worker (`src/background/service-worker.ts`)**:

- LRU cache for handle↔DID mappings with storage persistence
- Message handling for popup communication
- Automatic tab URL monitoring to pre-cache handle/DID pairs

**Popup (`src/popup/popup.ts`)**:

- Main UI that displays destination links for current tab or input
- Communicates with service worker for handle/DID resolution
- Cache management controls
- Firefox theme integration using `theme.getCurrent()` API
- Runtime debug controls via `window.wormholeDebug`

### Build System

Uses Vite with @crxjs/vite-plugin for extension building. Special handling:

- Development mode: Injects background.scripts for Firefox MV3 compatibility
- Firefox build: Strips service_worker, adds scripts array, creates zip
- Chrome build: Creates zip with standard MV3 manifest

### URL Pattern Recognition

The extension recognizes URLs from these services and extracts AT Protocol identifiers:

- bsky.app, deer.social (native Bluesky)
- cred.blue (social credit score for Bluesky)
- tangled.sh (atproto-native git hosting)
- blue.mackuba.eu/skythread (thread viewer)
- atp.tools, pdsls.dev (developer tools)
- clearsky.app (block checking)
- plc.directory, boat.kelinci.net (did:plc information tools)

### Firefox Theme Integration

The extension automatically adopts Firefox's active theme colors while maintaining readability:

- Uses `theme.getCurrent()` API to retrieve theme colors
- Maps theme colors to popup elements (background, text, buttons, borders)
- Falls back to `prefers-color-scheme` media queries on Chrome or when no theme available
- Chrome/non-themed Firefox continues using light/dark mode detection

### Debug System (`src/shared/debug.ts`)

Categorized debug logging system with build-time and runtime controls:

**Categories**:

- `🎨 [THEME]` - Firefox theme detection and application
- `💾 [CACHE]` - DID/handle cache operations
- `📝 [PARSING]` - URL parsing and transformation
- `🔧 [POPUP]` - Popup UI operations
- `⚙️ [SW]` - Service worker operations
- `🔄 [TRANSFORM]` - Transform utility functions

**Control Methods**:

- Build-time: Development builds enable all debug by default
- Environment variables: `VITE_DEBUG_THEME=true`, etc.
- Runtime: `window.wormholeDebug.theme(false)` in popup console
- Persistent: Settings saved to `chrome.storage.local`

**Usage**:

```javascript
// Runtime control (in popup console)
window.wormholeDebug.theme(false); // Disable theme debug
window.wormholeDebug.all(true); // Enable all categories
window.wormholeDebug.getConfig(); // Check current settings
```

### Testing

Tests use mocked fetch responses to simulate AT Protocol API calls and handle resolution. Run single test with `bun run test`.
