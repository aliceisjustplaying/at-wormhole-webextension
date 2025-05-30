# CLAUDE.md

This file provides **MANDATORY** guidance to Claude Code when working with code in this repository.

## 🚨 CRITICAL ANTI-CHEAT RULES 🚨

**READ THIS FIRST - THESE ARE ABSOLUTE RULES:**

1. **ESLint/TypeScript errors MUST be fixed properly** - NEVER disabled
2. **Using `// eslint-disable`, `// @ts-ignore`, `// @ts-expect-error` = IMMEDIATE FAILURE**
3. **If you're tempted to disable a rule, STOP and fix the actual problem**
4. **No exceptions. No excuses. No shortcuts.**

## MANDATORY PRE-FLIGHT ACKNOWLEDGMENT

Before ANY code work, you MUST type this acknowledgment:

```
I acknowledge that I will:
- Fix all linting errors properly without disabling rules
- Run all validation commands after every change
- Not take shortcuts or cheat the system
```

## MANDATORY WORKFLOW CHECKLIST

**STOP AND READ**: You MUST complete this checklist for EVERY code change:

1. [ ] **START**: Print "Answered by: <model name>" before any work
2. [ ] **ACKNOWLEDGE**: Type the pre-flight acknowledgment above
3. [ ] **RE-READ**: Re-read this entire CLAUDE.md file
4. [ ] **PLAN**: Explain what you will change and why BEFORE making changes
5. [ ] **ASK BEFORE CODING**: Ask for explicit permission before you start coding
6. [ ] **CODE**: Make minimal, focused changes only
7. [ ] **VALIDATE**: Run ALL validation commands (see below)
8. [ ] **VERIFY**: Confirm all tests pass before proceeding
9. [ ] **DOCUMENT**: Update this file after completing each step with status
10. [ ] **COMMIT**: Make git commits as needed (never push)

## WHEN YOU ENCOUNTER LINTING/TYPE ERRORS

**CORRECT APPROACH:**

- Understand WHY the error exists
- Fix the root cause of the error
- Research the proper solution if needed
- Ask for help if genuinely stuck

**FORBIDDEN APPROACHES:**

- ❌ Adding `// eslint-disable-*` comments
- ❌ Adding `// @ts-ignore` or `// @ts-expect-error`
- ❌ Modifying `.eslintrc` or `tsconfig.json` to relax rules
- ❌ Removing the code that causes the error
- ❌ Skipping the validation step

## VALIDATION COMMANDS (MANDATORY AFTER EVERY CODE CHANGE)

**You MUST run ALL of these commands after ANY code change:**

```bash
bun run format      # Format code
bun run lint        # Check for linting errors (MUST PASS)
bun run typecheck   # Verify TypeScript types (MUST PASS)
gtimeout 10 bun run test  # Run all tests (must complete in <10s)
bun run build:dev   # Verify build works
```

**FAILURE PROTOCOL**:

- If ANY command fails, you MUST fix the issue properly
- DO NOT proceed until ALL commands pass
- DO NOT disable rules to make them pass

## COMMON CHEAT SCENARIOS AND PROPER SOLUTIONS

### Scenario: "Unused variable" error

❌ WRONG: `// eslint-disable-next-line @typescript-eslint/no-unused-vars`
✅ RIGHT: Remove the unused variable or use it properly

### Scenario: "Type error" on third-party library

❌ WRONG: `// @ts-ignore`
✅ RIGHT: Add proper type definitions or use type assertions correctly

### Scenario: "Any type" warning

❌ WRONG: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
✅ RIGHT: Define proper types

### Scenario: Complex type issue

❌ WRONG: Give up and disable the check
✅ RIGHT: Ask for help with the specific type issue

## OTHER PROHIBITED ACTIONS

- **NEVER** skip running the validation commands
- **NEVER** remove functionality to "fix" test failures
- **NEVER** add features beyond the problem scope
- **NEVER** refactor working code without explicit request
- **NEVER** include non-code content in code artifacts
- **NEVER** provide sycophantic praise or cheerleading

## CODE GENERATION RULES

### Quality Standards

- Write idiomatic, modern code with minimal dependencies
- Prioritize long-term maintainability over speed
- All code must pass ALL validation checks WITHOUT disabling any rules
- Test coverage for all critical functionality

### When Writing Code

- Use artifacts for all code generation
- Show only relevant snippets when updating (not entire files)
- Explain what changed and why in your response
- Avoid comments for self-documenting code
- Keep explanations outside code artifacts

### Project Structure

- Request project structure before generating code (unless one-off script)
- Stay within problem boundaries
- Don't add unrequested features

## COMMUNICATION STYLE

- Skip ALL flattery and praise
- Challenge assumptions and present counter-evidence
- Disagree openly when appropriate
- Be direct and professional

## Build Commands Reference

- `bun run build:dev` - Build development version of the extension
- `bun run build:chrome` - Build Chrome extension
- `bun run build:firefox` - Build Firefox extension
- `bun run test:watch` - Run tests in watch mode

For Bun API documentation, see: `node_modules/bun-types/docs/**.md`

---

**FINAL REMINDER**: Using `eslint-disable` or `@ts-ignore` is NEVER acceptable. Fix the actual problem.

## Architecture

This is a Manifest V3 browser extension that provides "wormhole" navigation between different AT Protocol/Bluesky services. The extension transforms URLs and identifiers from one service to equivalent URLs on other services.

### Core Components

**Transform System (modular architecture)**:

- **Parser (`src/shared/parser.ts`)** - Main entry point with `parseInput()` that accepts URLs, handles, or DIDs and extracts canonical information
- **Canonicalizer (`src/shared/canonicalizer.ts`)** - Contains `canonicalize()` function that converts any input to standardized TransformInfo structure
- **Resolver (`src/shared/resolver.ts`)** - Handle/DID resolution functions with AT Protocol API integration
- **Services (`src/shared/services.ts`)** - Service configuration and `buildDestinations()` function that generates equivalent URLs across different services
- **Cache (`src/shared/cache.ts`)** - BidirectionalMap and DidHandleCache classes for reliable handle↔DID persistence
- **Types (`src/shared/types.ts`)** - All TypeScript interfaces and type definitions
- **Constants (`src/shared/constants.ts`)** - Shared constants including NSID shortcuts

**Service Worker (`src/background/service-worker.ts`)**:

- Delegates cache operations to DidHandleCache module
- Message handling for popup communication
- Automatic tab URL monitoring to pre-cache handle/DID pairs
- Proactive background resolution: resolves DIDs from handles and handles from DIDs
- Returns cache hit/miss metadata to popup for development debugging

**Popup (`src/popup/popup.ts`)**:

- Main UI that displays destination links for current tab or input
- Communicates with service worker for handle/DID resolution
- Cache management controls
- Firefox theme integration using `theme.getCurrent()` API
- Runtime debug controls via `window.wormholeDebug`
- Development-only debug display showing cache hit/miss status for DID/handle resolution

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
- toolify.blue (tools and utilities for AT Protocol/Bluesky)

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

### Cache System (`src/shared/cache.ts`)

Reliable bidirectional handle↔DID persistence with comprehensive features:

- **BidirectionalMap**: Core bidirectional mapping with automatic cleanup
- **DidHandleCache**: Full cache manager with write-through persistence, LRU eviction, and cross-browser compatibility
- **Service Worker Integration**: Proactive background resolution for visited URLs
- **Development Debug**: Visual cache hit/miss indicators (development builds only)

### Testing

Tests use mocked fetch responses to simulate AT Protocol API calls and handle resolution. The test suite uses bun's built-in test framework with organized test suites:

- **parseInput tests**: URL parsing from all supported services
- **resolveHandleToDid tests**: Handle→DID resolution including did:web
- **buildDestinations tests**: URL generation and service fallback behavior
- **cache tests**: Comprehensive coverage of BidirectionalMap and DidHandleCache

Run tests with `bun run test` or `bun run test:watch` for development.

## Completed Refactoring

The codebase has been successfully refactored into a clean, modular architecture:

### ✅ Completed Refactors

1. **Type System**: Centralized all TypeScript interfaces in `src/shared/types.ts`
2. **Service Configuration**: Extracted hardcoded service definitions into `src/shared/services.ts` with ServiceConfig interface
3. **Module Splitting**: Broke down monolithic transform.ts into focused modules:
   - `parser.ts` - URL parsing logic
   - `canonicalizer.ts` - Pure AT URI transformation
   - `resolver.ts` - Network resolution functions
   - `services.ts` - Service configuration and URL building
4. **Cache System**: Replaced complex cache with simple, reliable implementation:
   - `BidirectionalMap` class for handle↔DID mapping
   - `DidHandleCache` with write-through persistence and LRU eviction
   - Service worker reduced from 288 to 139 lines
5. **Architecture Cleanup**: Made canonicalizer pure (no network calls), proper separation of concerns

### 📈 Results

- **Modularity**: Each file has single responsibility
- **Maintainability**: Zero external dependencies, comprehensive test coverage
- **Performance**: Write-through caching, proactive background resolution
- **Extensibility**: Adding new services requires only updating `services.ts`
- **Reliability**: No data loss, proper error handling, cross-browser compatibility

### ⏳ Remaining Tasks

- **Type Safety**: Replace remaining `any`/`unknown` types with proper interfaces
- **Error Handling**: Standardize error patterns across modules
- **Test Coverage**: Add edge case and error scenario tests

### Adding New Services

After refactoring, adding a new AT Protocol service should be as simple as:

```typescript
// In src/shared/services.ts
SERVICES.NEW_SERVICE = {
  url: 'https://example.com',
  name: '✨ Example Service',
  patterns: {
    profile: /\/user\//,
    post: /\/post\//,
  },
  buildUrl: (info) => {
    // Build URL based on TransformInfo
  },
};
```

No other code changes should be required!

## ✅ Options Page Implementation - COMPLETED

### Status: COMPLETED ✅

Basic options page infrastructure has been successfully implemented with a single "show emojis" checkbox setting.

**Completed work:**

- ✅ `src/options/options.html` - Basic options page structure with checkbox
- ✅ `src/options/options.css` - Clean, extension-appropriate styling
- ✅ `src/options/options.ts` - Checkbox logic and storage integration
- ✅ `public/manifest.json` - Added `options_ui` configuration
- ✅ All validation commands pass (lint, typecheck, tests, build)

**Implementation details:**

- Uses `chrome.storage.sync` for cross-device synchronization
- Storage key: `showEmojis` (boolean, defaults to true)
- Follows existing storage patterns from cache system
- Chrome/Firefox compatible
- Proper TypeScript types and error handling

**Next step:** Implement the actual "show emojis" feature functionality.

## ✅ Show Emojis Feature Implementation - COMPLETED

### Feature Status: COMPLETED ✅

The "show emojis" feature has been successfully implemented with clean data separation and proper integration.

**Completed work:**

- ✅ **Updated ServiceConfig interface** - Added separate `emoji` and `name` fields
- ✅ **Updated all service configurations** - Split labels into emoji + name parts
- ✅ **Modified buildDestinations()** - Added optional `showEmojis` parameter (defaults to true)
- ✅ **Created shared options utility** (`src/shared/options.ts`) - Centralized options loading with caching
- ✅ **Updated popup integration** - Loads options and passes `showEmojis` to buildDestinations
- ✅ **Added comprehensive tests** - Tests for both emoji enabled/disabled scenarios
- ✅ **All validation commands pass** - Lint, typecheck, tests, and build all successful

**Implementation details:**

- **Clean data structure**: Each service now has separate `emoji` and `name` fields
- **Backward compatibility**: `buildDestinations()` defaults to showing emojis (existing behavior)
- **Efficient options loading**: Options are cached to avoid repeated storage calls
- **Comprehensive testing**: Added tests to verify emoji display behavior
- **Type safety**: Full TypeScript support with proper interfaces

**How it works:**

1. **Options page**: User toggles "show emojis" checkbox → setting saved to `chrome.storage.sync`
2. **Popup initialization**: Loads options via `loadOptions()` utility
3. **Destination building**: Passes `showEmojis` setting to `buildDestinations()`
4. **Label generation**: `${showEmojis ? service.emoji : ''} ${service.name}`

**Testing results:**

- All 60 existing tests continue to pass
- New tests verify emoji functionality works correctly
- Both enabled (🦋 bsky.app) and disabled (bsky.app) scenarios tested

## 🔧 toolify.blue Service Addition - COMPLETED

### Status: COMPLETED ✅

Successfully added support for toolify.blue, a tools and utility service for AT Protocol/Bluesky users.

**Target URLs:**

- Profile (handle): `https://toolify.blue/profile/alice.mosphere.at`
- Profile (DID): `https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf`
- Post (handle): `https://toolify.blue/profile/alice.mosphere.at/post/3lqeyxrcx6k2p`
- Post (DID): `https://toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf/post/3lqeyxrcx6k2p`

**Implementation Plan:**

1. **URL Pattern Analysis** ✅

   - Pattern: `/profile/IDENTIFIER` for profiles, `/profile/IDENTIFIER/post/RKEY` for posts
   - **IDENTIFIER can be either HANDLE or DID** (like bsky.app, deer.social)
   - Single regex: `/^\/profile\/([^/]+)(?:\/post\/([^/]+))?$/`
   - Supports both handle and DID inputs, no resolution restrictions

2. **Service Configuration** ✅

   - ✅ Added `TOOLIFY_BLUE` to `src/shared/services.ts`
   - ✅ `emoji: '🔧'` (tools theme), `name: 'toolify.blue'`
   - ✅ `parsing.hostname: 'toolify.blue'`
   - ✅ `parsing.patterns.profileIdentifier` with combined profile/post regex
   - ✅ `buildUrl` function for both profile and post URLs using bskyAppPath
   - ✅ **No requiredFields restrictions** (accepts both handles and DIDs)

3. **Testing Strategy** ✅

   - ✅ Parse profile with handle: `toolify.blue/profile/alice.mosphere.at` → handle extraction
   - ✅ Parse post with handle: `toolify.blue/profile/alice.mosphere.at/post/3lqeyxrcx6k2p` → handle + rkey
   - ✅ Parse profile with DID: `toolify.blue/profile/did:plc:by3jhwdqgbtrcc7q4tkkv3cf` → DID extraction
   - ✅ Parse post with DID: `toolify.blue/profile/did:plc:xyz/post/3lqeyxrcx6k2p` → DID + rkey
   - ✅ Verify buildDestinations includes toolify.blue for both handle and DID scenarios
   - ✅ Test emoji enabled/disabled display behavior

4. **Technical Requirements** ✅
   - ✅ Works with existing handle→DID resolution system
   - ✅ Works with both handle-based and DID-based transformations
   - ✅ All validation commands pass (format, lint, typecheck, test, build:dev)
   - ✅ Maintains backward compatibility with existing services

**Progress:**

- ✅ Analysis complete - URL patterns identified and documented
- ✅ Service configuration - TOOLIFY_BLUE added to services.ts
- ✅ Testing - All 4 parsing tests and 3 buildDestinations tests added and passing
- ✅ Validation - All commands pass (format, lint, typecheck, test, build:dev)
- ✅ Documentation update - CLAUDE.md and URL Pattern Recognition updated

**Final Results:**
- **66 total tests passing** (4 new toolify.blue tests added)
- **Service successfully integrated** into modular architecture
- **Full handle and DID support** like bsky.app and deer.social
- **Emoji toggle integration** works correctly (🔧 toolify.blue / toolify.blue)
- **Documentation updated** in README.md and docs/index.html
- **No breaking changes** to existing functionality

**Implementation Complete** - toolify.blue is now fully supported in the extension! 🎉
