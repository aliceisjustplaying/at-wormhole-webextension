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
- **Error Handling**: Standardize error patterns across modules (see implementation plan below)
- **Test Coverage**: Add edge case and error scenario tests

## Error Handling Implementation Plan

### Phase 1: Core Infrastructure

1. **✅ Install neverthrow and its ESLint plugin**:

   ```bash
   bun add neverthrow
   bun add -D eslint-plugin-neverthrow-must-use
   ```

   **Configure ESLint** in `eslint.config.mjs`:

   ```javascript
   import neverthrowMustUse from 'eslint-plugin-neverthrow-must-use';

   export default [
     // ... existing config
     {
       files: ['**/*.ts', '**/*.tsx'],
       plugins: {
         'neverthrow-must-use': neverthrowMustUse,
       },
       rules: {
         'neverthrow-must-use/must-use-result': 'error',
       },
     },
   ];
   ```

   This enforces that all Result types must be properly handled using `.match()`, `.unwrapOr()`, or `._unsafeUnwrap()`, preventing silent error swallowing.

2. **✅ Create `src/shared/errors.ts`** with discriminated union error types:

   ```typescript
   // Error types using discriminated unions (idiomatic for neverthrow)
   export type WormholeError = NetworkError | ParseError | ValidationError | CacheError;

   export interface NetworkError {
     type: 'NETWORK_ERROR';
     message: string;
     url: string;
     status?: number;
     cause?: unknown;
   }

   export interface ParseError {
     type: 'PARSE_ERROR';
     message: string;
     input: string;
   }

   export interface ValidationError {
     type: 'VALIDATION_ERROR';
     message: string;
     field: string;
     value: unknown;
   }

   export interface CacheError {
     type: 'CACHE_ERROR';
     message: string;
     operation: string;
     cause?: unknown;
   }

   // Helper functions to create errors
   export const networkError = (message: string, url: string, status?: number, cause?: unknown): NetworkError => ({
     type: 'NETWORK_ERROR',
     message,
     url,
     status,
     cause,
   });

   export const parseError = (message: string, input: string): ParseError => ({
     type: 'PARSE_ERROR',
     message,
     input,
   });

   export const validationError = (message: string, field: string, value: unknown): ValidationError => ({
     type: 'VALIDATION_ERROR',
     message,
     field,
     value,
   });

   export const cacheError = (message: string, operation: string, cause?: unknown): CacheError => ({
     type: 'CACHE_ERROR',
     message,
     operation,
     cause,
   });

   export const isWormholeError = (error: unknown): error is WormholeError => {
     return (
       typeof error === 'object' &&
       error !== null &&
       'type' in error &&
       typeof (error as Record<string, unknown>).type === 'string' &&
       ['NETWORK_ERROR', 'PARSE_ERROR', 'VALIDATION_ERROR', 'CACHE_ERROR'].includes(
         (error as Record<string, unknown>).type as string,
       )
     );
   };
   ```

3. **✅ Extend `src/shared/debug.ts`** with centralized error logging:

   ```typescript
   export const logError = (category: string, error: WormholeError | unknown, context?: Record<string, unknown>) => {
     const errorInfo = isWormholeError(error) ? { type: error.type, ...error } : { raw: String(error) };

     console.error(`[${category}]`, errorInfo, context);

     if (import.meta.env.DEV) {
       debugLog(category, 'ERROR', errorInfo, context);
     }
   };
   ```

4. **✅ Create `src/shared/retry.ts`** for network resilience:

   ```typescript
   import { ResultAsync, ok, err } from 'neverthrow';

   interface RetryOptions {
     maxAttempts?: number;
     initialDelay?: number;
     maxDelay?: number;
     backoffFactor?: number;
     shouldRetry?: (error: WormholeError) => boolean;
   }

   export function withRetry<T>(
     fn: () => ResultAsync<T, WormholeError>,
     options: RetryOptions = {},
   ): ResultAsync<T, WormholeError> {
     // Implementation using ResultAsync chaining
   }
   ```

### Phase 2: Module Updates (in order)

1. **✅ resolver.ts** (highest priority - currently swallows all errors):

   ```typescript
   import { ResultAsync, ok, err } from 'neverthrow';
   import { networkError, parseError } from './errors';

   export function resolveHandleToDid(handle: string): ResultAsync<string, WormholeError> {
     return ResultAsync.fromPromise(fetch(apiUrl, { signal: AbortSignal.timeout(5000) }), (e) =>
       networkError('Failed to fetch', apiUrl, undefined, e),
     )
       .andThen((resp) => (resp.ok ? ok(resp) : err(networkError('Bad response', apiUrl, resp.status))))
       .andThen((resp) => ResultAsync.fromPromise(resp.json(), () => parseError('Invalid JSON response', apiUrl)))
       .map((data) => data.did);
   }
   ```

2. **✅ parser.ts**:

   ```typescript
   import { Result, ok, err } from 'neverthrow';

   export function parseInput(input: string): Result<TransformInfo | null, ParseError> {
     return Result.fromThrowable(
       () => new URL(input),
       () => parseError('Invalid URL', input),
     )().map((url) => extractInfo(url));
   }
   ```

3. **✅ canonicalizer.ts**:

   ```typescript
   export function canonicalize(info: TransformInfo): Result<TransformInfo, ValidationError> {
     if (!isValidDid(info.did)) {
       return err(validationError('Invalid DID format', 'did', info.did));
     }
     // ... rest of canonicalization
     return ok(canonicalizedInfo);
   }
   ```

4. **cache.ts**:

   - Keep existing throw patterns for programmer errors (contract violations)
   - Return `ResultAsync` for I/O operations:

   ```typescript
   export function loadCache(): ResultAsync<CacheData, CacheError> {
     return ResultAsync.fromPromise(chrome.storage.local.get(STORAGE_KEY), (e) =>
       cacheError('Failed to load cache', 'load', e),
     );
   }
   ```

5. **service-worker.ts**:

   ```typescript
   // Standardize responses
   type MessageResponse<T> =
     | {
         success: true;
         data: T;
       }
     | {
         success: false;
         error: WormholeError;
       };

   // Handle messages with proper error propagation
   handleResolve(request).match(
     (data) => sendResponse({ success: true, data }),
     (error) => sendResponse({ success: false, error }),
   );
   ```

6. **popup.ts**:

   ```typescript
   // Map errors to user messages
   function getErrorMessage(error: WormholeError): string {
     switch (error.type) {
       case 'NETWORK_ERROR':
         return `Network error: ${error.message}`;
       case 'PARSE_ERROR':
         return `Invalid input: ${error.message}`;
       default:
         return 'An unexpected error occurred';
     }
   }

   // Use pattern matching for UI updates
   resolveIdentifier(input).match(
     (data) => updateUI(data),
     (error) => {
       logError('POPUP', error);
       showError(getErrorMessage(error));
     },
   );
   ```

### Phase 3: Integration Patterns

1. **Chaining Operations**:

   ```typescript
   parseInput(url)
     .andThen((info) => (info ? ok(info) : err(parseError('No info extracted', url))))
     .andThen((info) => resolveIdentifiers(info))
     .map((resolved) => buildDestinations(resolved))
     .match(
       (destinations) => updateUI(destinations),
       (error) => showError(error),
     );
   ```

2. **Combining Results**:

   ```typescript
   ResultAsync.combine([resolveHandleToDid(handle), loadOptions()]).map(([did, options]) => ({
     did,
     options,
   }));
   ```

3. **Error Recovery**:
   ```typescript
   fetchFromPrimary(url).orElse((error) => (error.type === 'NETWORK_ERROR' ? fetchFromFallback(url) : err(error)));
   ```

### Phase 4: Testing & Documentation

1. Add tests for error scenarios
2. Test type discrimination works correctly
3. Verify error messages are helpful
4. Document patterns in code comments

### Benefits of This Approach

- Functional style aligns with neverthrow philosophy
- Discriminated unions provide excellent TypeScript support
- Lightweight compared to class hierarchies
- Easy to pattern match and handle specific errors
- Forces explicit error handling throughout the codebase

### Adding New Services

To add a new AT Protocol service, update `src/shared/services.ts`:

```typescript
// In src/shared/services.ts
SERVICES.NEW_SERVICE = {
  emoji: '✨',
  name: 'example.com',
  contentSupport: 'full', // or 'profiles-and-posts', 'only-posts', 'only-profiles'

  // Optional: For services that can parse their own URLs
  parsing: {
    hostname: 'example.com', // or ['example.com', 'example.net'] for multiple domains
    patterns: {
      // Choose the appropriate pattern type(s):
      profileIdentifier: /^\/profile\/([^/]+)/, // For handle OR DID (flexible)
      profileHandle: /^\/user\/([^/]+)$/, // For handle-only URLs
      profileDid: /^\/did\/(did:[^/]+)/, // For DID-only URLs
      queryParam: 'user', // For extracting from query parameters
      customParser: (url) => {
        // For complex URL parsing
        // Return extracted identifier or null
        return url.searchParams.get('id') || null;
      },
    },
  },

  // Required: Build URLs for this service
  buildUrl: (info) => {
    if (!info.handle) return null; // Example: require handle
    if (info.rkey) {
      return `https://example.com/user/${info.handle}/post/${info.rkey}`;
    }
    return `https://example.com/user/${info.handle}`;
  },

  // Optional: Restrict what inputs this service accepts
  requiredFields: {
    handle: true, // Require handle (no DID-only inputs)
    rkey: true, // Require rkey (posts only)
    plcOnly: true, // Only accept did:plc DIDs (not did:web)
  },
};
```

Key fields:

- `emoji`: Service icon (required)
- `name`: Service display name (required)
- `contentSupport`: What content types the service supports (required)
- `parsing`: Optional URL parsing configuration
  - `hostname`: Domain(s) to match
  - `patterns`: One or more pattern types for extracting identifiers
- `buildUrl`: Function to generate destination URLs (required)
- `requiredFields`: Optional restrictions on accepted inputs

No other code changes should be required!

## Options System

The extension includes an options page with the following settings:

- **Show Emojis**: Toggle emoji display in service names (default: true)
- **Strict Mode**: Prevent fallback behavior when viewing content (default: false)

### Implementation Details

- Options page: `src/options/options.html|ts|css`
- Storage: Uses `chrome.storage.sync` for cross-device synchronization
- Shared utility: `src/shared/options.ts` provides centralized options loading with caching
- Integration: Popup loads options and passes to `buildDestinations()`

### Service Content Support Levels

Each service has a `contentSupport` field that determines what content types it can display:

- `'full'` - Supports profiles, posts, feeds, and lists
- `'profiles-and-posts'` - Supports profiles and posts only
- `'only-posts'` - Supports posts only (requires rkey)
- `'only-profiles'` - Supports profiles only

When strict mode is enabled, the extension only shows services that support the current content type, preventing profile-level fallbacks when viewing posts, feeds, or lists.
