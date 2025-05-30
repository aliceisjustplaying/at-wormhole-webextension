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

#### Step 4: Simplify Cache Logic ✅

Extract and simplify the cache implementation for better maintainability and reliability.

- **Status**: Completed
- **Target**: Create `src/shared/cache.ts` with zero dependencies
- **Primary Goal**: Simple, reliable cache that persists handle↔DID mappings

##### Current Problems:

- Complex dual-map LRU implementation with synchronization issues
- 1-second debounced saves that can lose data when service worker terminates
- Reactive storage quota handling leading to unpredictable behavior
- 288-line service worker mixing cache, messages, and tab monitoring
- Over-engineered for the simple needs of the extension

##### New Architecture:

**Phase 4.1: Simple Bidirectional Cache** ✅

- ✅ Created `BidirectionalMap<K1, K2>` class for handle↔DID mapping (42 lines)
- ✅ Bidirectional lookups with automatic reverse mapping cleanup
- ✅ Handles overwrites correctly (removes old mappings when keys/values change)
- ✅ Comprehensive test coverage (18 tests covering all operations and edge cases)
- ✅ Zero external dependencies, all validation commands pass

**Phase 4.2: Minimal Cache Manager** ✅

- ✅ Created `DidHandleCache` class (184 lines with comprehensive features)
- ✅ Write-through persistence (immediate saves, no debouncing)
- ✅ Cross-browser storage size estimation for Firefox compatibility
- ✅ LRU eviction when approaching 4MB storage limit
- ✅ Input validation for DIDs and handles with error handling
- ✅ Storage failure rollback to prevent data corruption
- ✅ Comprehensive test coverage (20 tests covering all scenarios)

**Phase 4.3: Service Worker Simplification** ✅

- ✅ Extracted cache implementation to new module
- ✅ Kept message routing and tab monitoring
- ✅ Reduced service worker from 288 to 127 lines
- ✅ No changes to existing prefetch behavior
- ✅ All functionality maintained while improving reliability

**Implementation Plan for Phase 4.3:**

1. **Replace Internal Cache with DidHandleCache**

   - Remove lines 16-158 (all internal cache implementation)
   - Import and instantiate DidHandleCache from cache module
   - Replace all cache operations with DidHandleCache methods

2. **Simplify Message Handlers**

   - UPDATE_CACHE: Use `cache.set(did, handle)`
   - GET_HANDLE: Use `cache.getHandle(did)` with fallback to resolver
   - GET_DID: Use `cache.getDid(handle)` with fallback to resolver
   - CLEAR_CACHE: Use `cache.clear()`
   - Keep DEBUG_LOG handler unchanged

3. **Maintain Tab Monitoring**

   - Keep onUpdated listener (lines 261-287)
   - Replace internal cache calls with DidHandleCache methods
   - Preserve pre-caching behavior for visited URLs

4. **Expected Result**
   - Service worker reduced from 288 to ~90 lines
   - All cache logic delegated to cache module
   - Cleaner separation of concerns
   - No functionality changes

**Key Changes:**

```typescript
// Before (complex internal implementation)
let didToHandle = new Map<string, CacheEntry>();
const handleToDid = new Map<string, string>();
// ... 140+ lines of cache logic

// After (simple delegation)
import { DidHandleCache } from '../shared/cache';
const cache = new DidHandleCache();
await cache.load(); // on startup
```

##### Implementation Details

```typescript
// src/shared/cache.ts structure:
class BidirectionalMap<K1, K2> {
  set(k1: K1, k2: K2): void;
  getByFirst(k1: K1): K2 | undefined;
  getBySecond(k2: K2): K1 | undefined;
  delete(k1: K1, k2: K2): boolean;
  clear(): void;
  get size(): number;
}

class DidHandleCache {
  private cache: BidirectionalMap<string, string>;
  private lastAccessTime: Map<string, number>;
  async load(): Promise<void>;
  async set(did: string, handle: string): Promise<void>;
  getHandle(did: string): string | undefined;
  getDid(handle: string): string | undefined;
  async clear(): Promise<void>;
}
```

**No Dependencies**: Pure TypeScript implementation, no external libraries needed

**Success Metrics**:

- ✅ Cache module 242 lines total (vs previous 190+ lines in service worker)
- ✅ Service worker 127 lines (vs previous 288 lines)
- ✅ Zero data loss from debouncing
- ✅ 100% test coverage for cache operations
- ✅ Maintains all current functionality

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
  - ✅ Cache operations (BidirectionalMap and DidHandleCache fully tested)
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
