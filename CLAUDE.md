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

Options page infrastructure has been successfully implemented with "show emojis" and "strict mode" checkbox settings.

**Completed work:**

- ✅ `src/options/options.html` - Options page structure with checkboxes for both settings
- ✅ `src/options/options.css` - Clean, extension-appropriate styling
- ✅ `src/options/options.ts` - Checkbox logic and storage integration for both options
- ✅ `public/manifest.json` - Added `options_ui` configuration
- ✅ All validation commands pass (lint, typecheck, tests, build)

**Implementation details:**

- Uses `chrome.storage.sync` for cross-device synchronization
- Storage keys: `showEmojis` (boolean, defaults to true), `strictMode` (boolean, defaults to false)
- Follows existing storage patterns from cache system
- Chrome/Firefox compatible
- Proper TypeScript types and error handling

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

- All existing tests continue to pass
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

## 🔒 Strict Mode Feature Implementation - COMPLETED

### Status: COMPLETED ✅

Successfully implemented the "strict mode" option to prevent fallback behavior when viewing posts or specific content types. When enabled, the extension only shows services that support the current content level (e.g., posts) rather than falling back to profile-level URLs.

**Current Behavior (Fallback Mode)**:

- When viewing a post on deer.social or pdsls.dev
- Extension shows destinations for ALL services
- Services that don't support posts (like cred.blue, tangled.sh) fall back to profile URLs
- User gets mixed results: some post URLs, some profile URLs

**Strict Mode Behavior**:

- When viewing a post, only show services that support post-level URLs
- When viewing a profile, show all applicable services
- No fallback behavior - strict content-type matching

### Service Categorization Analysis

**Full Content Support** (`'full'` - profiles, posts, feeds, lists):

- 🦌 **deer.social** - Uses `bskyAppPath` (supports `/profile/handle/post|feed|lists/xyz`)
- 🦋 **bsky.app** - Uses `bskyAppPath` (supports `/profile/handle/post|feed|lists/xyz`)
- ⚙️ **pdsls.dev** - Uses full `atUri` (complete AT Protocol support for all content types)
- 🛠️ **atp.tools** - Uses full `atUri` (complete AT Protocol support for all content types)

**Profiles and Posts Support** (`'profiles-and-posts'` - profiles and posts only):

- 🔧 **toolify.blue** - Uses `bskyAppPath` (supports `/profile/handle/post/xyz` but not feeds/lists)

**Posts-Only Services** (`'only-posts'` - require rkey, posts only):

- ☁️ **skythread** - Requires `rkey`, returns `null` without it (posts only, not feeds/lists)

**Profile-Only Services** (`'only-profiles'` - profiles only, no content):

- 🍥 **cred.blue** - Only supports handles, no content URLs
- 🪢 **tangled.sh** - Only supports handles, no content URLs
- 📰 **frontpage.fyi** - Only supports handles, no content URLs
- ☀️ **clearsky** - Profile-level DID checking only
- ⛵ **boat.kelinci** - PLC oplog viewer, profile-level only
- 🪪 **plc.directory** - PLC directory, profile-level only

**Completed work:**

- ✅ **Updated OptionsData interface** - Added `strictMode: boolean` field (defaults to false)
- ✅ **Enhanced ServiceConfig interface** - Added `contentSupport` field with values: `'only-profiles'` | `'only-posts'` | `'profiles-and-posts'` | `'full'`
- ✅ **Updated all service configurations** - Added appropriate contentSupport values for all 12 services
- ✅ **Modified buildDestinations() function** - Added strictMode parameter with filtering logic for posts/feeds/lists
- ✅ **Updated options page** - Added strict mode checkbox to HTML/CSS/TS
- ✅ **Updated popup integration** - Loads and passes strictMode option to buildDestinations
- ✅ **Added comprehensive tests** - 6 new strict mode tests covering all scenarios
- ✅ **All validation commands pass** - Format, lint, typecheck, test (72 tests), and build all successful

**Implementation details:**

- **Backward compatibility**: `strictMode` defaults to `false` (maintains existing fallback behavior)
- **Service categorization**: Each service now has explicit content support level
- **Smart filtering**: Different logic for posts vs feeds/lists in strict mode
- **Options integration**: Uses existing options system with shared storage
- **Comprehensive testing**: Added tests for all content types and combinations

**How it works:**

1. **Options page**: User toggles "strict mode" checkbox → setting saved to `chrome.storage.sync`
2. **Popup initialization**: Loads options via `loadOptions()` utility
3. **Content filtering**: When `strictMode = true` and viewing content (posts/feeds/lists):
   - For posts: Shows services with `'only-posts'`, `'profiles-and-posts'`, or `'full'` support
   - For feeds/lists: Shows only services with `'full'` support
   - Excludes services with `'only-profiles'` support
4. **Profile viewing**: No filtering applied (shows all applicable services)


### Content Support Classification

```typescript
// Example service configurations with contentSupport field
SERVICES.DEER_SOCIAL = {
  emoji: '🦌',
  name: 'deer.social',
  contentSupport: 'full', // Supports profiles, posts, feeds, lists
  // ... existing config
};

SERVICES.TOOLIFY_BLUE = {
  emoji: '🔧',
  name: 'toolify.blue',
  contentSupport: 'profiles-and-posts', // Supports profiles and posts only
  // ... existing config
};

SERVICES.CRED_BLUE = {
  emoji: '🍥',
  name: 'cred.blue',
  contentSupport: 'only-profiles', // Profile-only service
  // ... existing config
};

SERVICES.SKYTHREAD = {
  emoji: '☁️',
  name: 'skythread',
  contentSupport: 'only-posts', // Posts-only service (no feeds/lists/profiles)
  // ... existing config
};
```

### User Experience Impact

**Strict Mode OFF (Default)**:

- Viewing deer.social post/feed/list → Shows all services (current behavior)
- Some destinations are content-level, some fall back to profiles
- Maximum destinations shown, mixed content levels

**Strict Mode ON**:

- Viewing deer.social post/feed/list → Only shows content-capable services
- All destinations are content-level URLs, no profile fallbacks
- Fewer but more relevant destinations

**Benefits**:

- Reduces cognitive load when viewing content (posts/feeds/lists)
- Ensures consistent content-level navigation
- Users who want post-to-post navigation get cleaner experience
- Advanced users can enable for more precise behavior

**Testing results:**

- All 72 tests pass (6 new strict mode tests added)
- Comprehensive coverage of all content types and service combinations
- Emoji + strict mode combinations work correctly
- Backward compatibility maintained (defaults to false)

**Final Results:**
- **Service categorization**: 12 services properly categorized by content support
- **Smart filtering**: Context-aware service filtering in strict mode
- **Zero breaking changes**: Existing behavior preserved when strict mode is off
- **Comprehensive testing**: All scenarios covered with automated tests
- **Clean options integration**: Follows existing patterns and storage system

**Implementation Complete** - Strict mode is now fully functional in the extension! 🎉
