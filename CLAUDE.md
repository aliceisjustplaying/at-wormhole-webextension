# CLAUDE.md

This file provides **MANDATORY** guidance to Claude Code when working with code in this repository.

## MANDATORY WORKFLOW CHECKLIST

**STOP AND READ**: You MUST complete this checklist for EVERY code change:

1. [ ] **START**: Print "Answered by: <model name>" before any work
2. [ ] **RE-READ**: Re-read this entire CLAUDE.md file
3. [ ] **PLAN**: Explain what you will change and why BEFORE making changes
4. [ ] **CODE**: Make minimal, focused changes only
5. [ ] **VALIDATE**: Run ALL validation commands (see below)
6. [ ] **VERIFY**: Confirm all tests pass before proceeding
7. [ ] **COMMIT**: Make git commits as needed (never push)

## VALIDATION COMMANDS (MANDATORY AFTER EVERY CODE CHANGE)

**You MUST run ALL of these commands after ANY code change:**

```bash
bun run format      # Format code
bun run lint        # Check for linting errors
bun run typecheck   # Verify TypeScript types
gtimeout 10 bun run test  # Run all tests (must complete in <10s)
bun run build:dev   # Verify build works
```

**FAILURE PROTOCOL**: If ANY command fails, you MUST fix the issue before proceeding. DO NOT skip or disable checks.

## PROHIBITED ACTIONS (NEVER DO THESE)

- **NEVER** disable ESLint or TypeScript rules (no `// eslint-disable` comments, no `@ts-ignore` comments)
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
- All code must pass ALL validation checks
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

**REMINDER**: Re-read this file after EVERY command. Update it when adding features or changing workflows.

## Architecture

This is a Manifest V3 browser extension that provides "wormhole" navigation between different AT Protocol/Bluesky services. The extension transforms URLs and identifiers from one service to equivalent URLs on other services.

### Core Components

**Transform System (modular architecture)**:

- **Parser (`src/shared/parser.ts`)** - Main entry point with `parseInput()` that accepts URLs, handles, or DIDs and extracts canonical information
- **Canonicalizer (`src/shared/canonicalizer.ts`)** - Contains `canonicalize()` function that converts any input to standardized TransformInfo structure
- **Resolver (`src/shared/resolver.ts`)** - Handle/DID resolution functions with AT Protocol API integration
- **Services (`src/shared/services.ts`)** - Service configuration and `buildDestinations()` function that generates equivalent URLs across different services
- **Types (`src/shared/types.ts`)** - All TypeScript interfaces and type definitions
- **Constants (`src/shared/constants.ts`)** - Shared constants including NSID shortcuts

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

Tests use mocked fetch responses to simulate AT Protocol API calls and handle resolution. The test suite uses bun's built-in test framework with organized test suites:

- **parseInput tests**: URL parsing from all supported services
- **resolveHandleToDid tests**: Handle→DID resolution including did:web
- **buildDestinations tests**: URL generation and service fallback behavior

Run tests with `bun run test` or `bun run test:watch` for development.

## Refactoring Plan

This section tracks the ongoing refactoring effort to make the codebase cleaner and more extensible.

### Goals

- Split large modules into focused, single-responsibility files
- Extract hardcoded configurations into centralized locations
- Improve type safety throughout the codebase
- Standardize error handling patterns
- Make adding new AT Protocol services trivial

### Step-by-Step Plan

#### Step 1: Extract Types ✅

Extract all interfaces and types into a dedicated `types.ts` file.

- **Status**: Completed
- **Files**: Created `src/shared/types.ts`
- **Changes**:
  - Extracted all type definitions to centralized location
  - Updated imports across transform.ts, service-worker.ts, popup.ts, debug.ts
  - Improved type safety with proper Firefox theme API types
  - All tests passing, no type errors

#### Step 2: Create Service Configuration ✅

Move hardcoded service URLs and patterns into a centralized configuration.

- **Status**: Completed
- **Files**: Created `src/shared/services.ts`
- **Changes**:
  - Extracted all service definitions into centralized SERVICES configuration
  - Created ServiceConfig interface with label, buildUrl function, and requiredFields
  - Updated buildDestinations() to use buildDestinationsFromServices()
  - Preserved all existing functionality while making service addition trivial
  - All tests passing, no type errors

#### Step 3: Split transform.ts ✅

Break down the monolithic transform.ts into focused modules:

- **Status**: Completed
- **Changes**:
  - **Phase 1**: Enhanced service configuration with bidirectional parsing patterns
  - **Phase 2**: Created `src/shared/parser.ts` - URL parsing logic
  - **Phase 3**: Created `src/shared/resolver.ts` - DID/handle resolution
  - **Phase 4**: Created `src/shared/canonicalizer.ts` - AT URI canonicalization
  - **Phase 5**: Updated `src/shared/transform.ts` to orchestration layer
- **Results**:
  - Service-specific parsing now centralized in services.ts
  - Each module has single responsibility
  - Circular dependencies resolved
  - All tests passing, no type errors

#### Step 4: Redesign and Extract Cache Logic ⏳

Completely redesign the cache architecture for instant popup performance and simplicity.

- **Status**: Not started
- **Target**: Create `src/shared/cache.ts` with `p-queue` dependency
- **Primary Goal**: Aggressive prefetching so popup opens instantly with all destination URLs ready

##### Current Problems:
- Complex dual-map LRU implementation with synchronization issues
- 1-second debounced saves that can lose data when service worker terminates
- Reactive storage quota handling leading to unpredictable behavior
- 288-line service worker mixing cache, messages, and tab monitoring
- Race conditions in async operations without proper coordination

##### New Architecture:

**Phase 4.1: Simple Bidirectional Cache**
- Create `BidirectionalMap<K1, K2>` class for handle↔DID mapping
- Write-through persistence (immediate storage, no debouncing)
- Dynamic size limits based on available storage quota
- Comprehensive test coverage for cache operations

**Phase 4.2: Aggressive Prefetching Strategy**
- When page loads: parse URL and immediately resolve missing handle OR DID
- Background queue using `p-queue` (concurrency: 3) for non-blocking resolution
- Prefetch both handle AND DID since different services need different formats:
  - Handle-only: `bsky.app`, `deer.social`, `cred.blue`, `tangled.sh`, `frontpage.fyi`
  - DID-only: `plc.directory`, `clearsky.app`, `boat.kelinci.net`
  - Either: `atp.tools`, `pdsls.dev`

**Phase 4.3: Service Worker Simplification**
- Remove all cache implementation (190+ lines)
- Keep only message routing and tab monitoring
- Use cache manager for all handle/DID operations
- Target: <100 lines focused on communication

**Phase 4.4: Performance Validation**
- Test popup opening speed before/after changes
- Verify cache persistence across service worker restarts
- Test storage quota management and cleanup

##### Implementation Details:

```typescript
// src/shared/cache.ts structure:
class BidirectionalMap<K1, K2> { /* ~30 lines */ }
class DidHandleCache { 
  private cache: BidirectionalMap<string, string>
  private queue: PQueue
  private maxSize: number
  /* write-through persistence, dynamic sizing */ 
}
```

**Dependencies**: Add `p-queue` to package.json (~8.5kB, 2M+ weekly downloads)

**Success Metrics**:
- Popup opens with all destinations visible immediately (no loading states)
- Cache module <150 lines total vs current 190+ lines in service worker
- Service worker <100 lines vs current 288 lines
- 100% test coverage for cache operations

#### Step 5: Fix Type Safety ⏳

Replace all `any` and `unknown` types with proper interfaces.

- **Status**: Not started
- **Focus areas**:
  - API response types
  - Message passing between popup and service worker
  - Chrome runtime API wrappers

#### Step 6: Standardize Error Handling ⏳

Create consistent error handling patterns across the codebase.

- **Status**: Not started
- **Goals**:
  - No silent failures
  - User-friendly error messages in UI
  - Consistent logging patterns

#### Step 7: Add Missing Tests ⏳

Expand test coverage for new modules and critical paths.

- **Status**: Not started
- **Target areas**:
  - Service configuration
  - Cache operations
  - Parser edge cases
  - Error scenarios

### Implementation Instructions

When working on the refactoring:

1. **Always update the status** in this section after completing a step
2. **Run all quality checks** after each change:
   ```bash
   bun run format
   bun run lint
   bun run typecheck
   bun run test
   ```
3. **Make incremental commits** with clear messages describing the refactoring step
4. **Create git commits immediately after completing each step** - use meaningful commit messages that describe what was accomplished
5. **Maintain backward compatibility** - the extension should work throughout the refactoring
6. **Update tests** as you refactor to ensure nothing breaks

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
