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

**Transform System**:

- **Parser** (`src/shared/parser.ts`) - URL parsing with `parseInput()` that accepts URLs, handles, or DIDs
- **Canonicalizer** (`src/shared/canonicalizer.ts`) - Pure transformation to standardized TransformInfo structure
- **Resolver** (`src/shared/resolver.ts`) - Handle/DID resolution with AT Protocol API integration and retry logic
- **Services** (`src/shared/services.ts`) - Service configuration and URL generation
- **Cache** (`src/shared/cache.ts`) - BidirectionalMap and DidHandleCache for handle↔DID persistence
- **Types** (`src/shared/types.ts`) - TypeScript interfaces and type definitions
- **Constants** (`src/shared/constants.ts`) - Shared constants including NSID shortcuts
- **Errors** (`src/shared/errors.ts`) - Discriminated union error types for neverthrow
- **Retry** (`src/shared/retry.ts`) - Network retry logic with exponential backoff

**Service Worker** (`src/background/service-worker.ts`):

- Message handling for popup communication
- Automatic tab URL monitoring with pre-caching
- Proactive background resolution of handles/DIDs
- Returns cache hit/miss metadata for debugging

**Popup** (`src/popup/popup.ts`):

- Main UI displaying destination links
- Service worker communication for resolution
- Cache management controls
- Firefox theme integration via `theme.getCurrent()`
- Development debug controls via `window.wormholeDebug`

### Build System

- **Framework**: Vite with @crxjs/vite-plugin
- **Development**: Injects background.scripts for Firefox MV3 compatibility
- **Firefox Build**: Strips service_worker, adds scripts array, creates zip
- **Chrome Build**: Standard MV3 manifest with zip output

### Supported Services

The extension recognizes and transforms URLs from:

- **bsky.app**, **deer.social** - Native Bluesky clients
- **cred.blue** - Social credit score service
- **tangled.sh** - AT Protocol-native git hosting
- **blue.mackuba.eu/skythread** - Thread viewer
- **atp.tools**, **pdsls.dev** - Developer tools
- **clearsky.app** - Block checking service
- **plc.directory**, **boat.kelinci.net** - DID:PLC information tools
- **toolify.blue** - Various AT Protocol utilities

### Special Features

**Firefox Theme Integration**:

- Automatically adopts Firefox's active theme colors
- Falls back to `prefers-color-scheme` on Chrome
- Maintains readability across all theme variations

**Debug System** (`src/shared/debug.ts`):

- Categorized logging: 🎨 Theme, 💾 Cache, 📝 Parsing, 🔧 Popup, ⚙️ Service Worker, 🔄 Transform
- Runtime control via `window.wormholeDebug` in popup console
- Persistent settings in `chrome.storage.local`

**Cache System**:

- Bidirectional handle↔DID mapping with automatic cleanup
- Write-through persistence with LRU eviction
- Proactive background resolution for visited URLs
- Visual cache hit/miss indicators in development builds

**Options System**:

- **Show Emojis**: Toggle emoji display (default: true)
- **Strict Mode**: Content-aware service filtering (default: false)
- Cross-device sync via `chrome.storage.sync`

### Error Handling

The extension uses **neverthrow** for comprehensive error handling:

- All network operations return `ResultAsync<T, WormholeError>`
- Discriminated union error types (NetworkError, ParseError, ValidationError, CacheError)
- Explicit error handling enforced by ESLint
- Automatic retry with exponential backoff for network failures

### Testing

- **Framework**: Bun's built-in test runner
- **Coverage**: URL parsing, handle resolution, URL generation, cache operations
- **Mocking**: Simulated AT Protocol API responses
- **Commands**: `bun run test` or `bun run test:watch`

## Implementation Status

### ✅ Completed

1. **Modular Architecture** - Transform system split into focused, single-responsibility modules
2. **neverthrow Integration** - Comprehensive error handling with Result types
3. **Retry Logic** - Network resilience with exponential backoff
4. **Cache System** - Reliable bidirectional persistence with LRU eviction
5. **Firefox Theme Support** - Dynamic theme adoption
6. **Options System** - User preferences with cross-device sync
7. **Debug System** - Categorized logging with runtime controls

### 📋 Remaining Tasks

- **Type Safety** - Replace remaining `any`/`unknown` types
- **Popup Error UI** - User-friendly error messages
- **Test Coverage** - Additional edge case scenarios

## Migration Plan: neverthrow → Effect

### Phase 1: Foundation Setup

1. **Install Effect** and configure TypeScript for Effect's requirements
2. **Create Effect error types** - Port WormholeError discriminated union to Effect's Data.TaggedEnum
3. **Create utility module** - Helper functions for common Effect patterns in this codebase
4. **Update ESLint** - Configure for Effect patterns (remove neverthrow plugin, add Effect rules)

#### Phase 1 Detailed Implementation Instructions

##### Prerequisites

- Ensure you're on the `neverthrow-refactor` branch
- Run all validation commands to confirm clean starting state
- Create a new feature branch: `git checkout -b effect-migration`

##### Step 1: Install Effect and Required Dependencies

**1.1. Add Effect to package.json:**

```bash
bun add effect
bun add -D @effect/eslint-plugin @effect/language-service
```

**1.2. Verify installation:**

- Check that `package.json` now includes `"effect": "^3.x.x"` in dependencies
- Run `bun install` to ensure lockfile is updated
- Run a quick build to ensure no immediate issues: `bun run build:dev`

##### Step 2: Create Effect Error Types with Schema Integration

**2.1. Create new file `src/shared/errors-effect.ts`:**

This file will contain idiomatic Effect error types using both Data.TaggedError and Schema for validation.

```typescript
// src/shared/errors-effect.ts
import { Data, Schema } from 'effect';

// Create tagged error classes using Effect's Data module with schema validation
export class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly message: string;
  readonly url: string;
  readonly status?: number;
  readonly cause?: unknown;
}> {
  static make = (params: { message: string; url: string; status?: number; cause?: unknown }) =>
    new NetworkError(params);
}

export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string;
  readonly input: string;
}> {
  static make = (params: { message: string; input: string }) => new ParseError(params);
}

export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string;
  readonly field: string;
  readonly value: unknown;
}> {
  static make = (params: { message: string; field: string; value: unknown }) => new ValidationError(params);
}

export class CacheError extends Data.TaggedError('CacheError')<{
  readonly message: string;
  readonly operation: string;
  readonly cause?: unknown;
}> {
  static make = (params: { message: string; operation: string; cause?: unknown }) => new CacheError(params);
}

// Union type for all wormhole errors
export type WormholeError = NetworkError | ParseError | ValidationError | CacheError;

// Schema for URL validation
export const UrlSchema = Schema.String.pipe(
  Schema.filter(
    (s): s is string => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    },
    { message: () => 'Invalid URL format' },
  ),
);

// Schema for DID validation
export const DidSchema = Schema.String.pipe(
  Schema.startsWith('did:'),
  Schema.filter((s): s is string => s.includes(':') && s.split(':').length >= 3, {
    message: () => 'Invalid DID format',
  }),
);

// Schema for handle validation
export const HandleSchema = Schema.String.pipe(
  Schema.filter((s): s is string => /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s.replace(/^@/, '')), {
    message: () => 'Invalid handle format',
  }),
);
```

**2.2. Validate the new error types:**

- Run `bun run typecheck` to ensure no TypeScript errors
- The file should have zero imports from neverthrow
- These errors should be compatible with Effect's error channel

##### Step 3: Create Effect Services and Layers

**3.1. Create `src/shared/services.ts` with Effect Services:**

Replace utility functions with proper Effect services and layers for better composition.

```typescript
// src/shared/services.ts
import { Context, Effect, Layer, Schema } from 'effect';
import { NetworkError, ParseError, UrlSchema } from './errors-effect.js';

// HTTP Service for network operations
export interface HttpService {
  readonly fetch: (url: string, options?: RequestInit) => Effect.Effect<Response, NetworkError>;
  readonly fetchJson: <T>(url: string, schema: Schema.Schema<T>) => Effect.Effect<T, NetworkError | ParseError>;
}

export const HttpService = Context.GenericTag<HttpService>('HttpService');

export const HttpServiceLive = Layer.succeed(
  HttpService,
  HttpService.of({
    fetch: (url, options) =>
      Effect.gen(function* () {
        yield* Schema.decodeUnknown(UrlSchema)(url);
        return yield* Effect.tryPromise({
          try: () =>
            fetch(url, {
              ...options,
              signal: AbortSignal.timeout(5000),
            }),
          catch: (e) =>
            NetworkError.make({
              message: 'Fetch failed',
              url,
              cause: e,
            }),
        });
      }),

    fetchJson: <T>(url: string, schema: Schema.Schema<T>) =>
      Effect.gen(function* () {
        const response = yield* HttpService.fetch(url);

        if (!response.ok) {
          return yield* Effect.fail(
            NetworkError.make({
              message: 'HTTP error',
              url,
              status: response.status,
            }),
          );
        }

        const text = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: () =>
            ParseError.make({
              message: 'Failed to read response body',
              input: url,
            }),
        });

        const json = yield* Effect.try({
          try: () => JSON.parse(text),
          catch: () =>
            ParseError.make({
              message: 'Invalid JSON response',
              input: text,
            }),
        });

        return yield* Schema.decodeUnknown(schema)(json);
      }),
  }),
);

// Cache Service for browser storage
export interface CacheService {
  readonly get: <T>(key: string, schema: Schema.Schema<T>) => Effect.Effect<T | null, never>;
  readonly set: <T>(key: string, value: T) => Effect.Effect<void, never>;
  readonly remove: (key: string) => Effect.Effect<void, never>;
}

export const CacheService = Context.GenericTag<CacheService>('CacheService');

export const CacheServiceLive = Layer.succeed(
  CacheService,
  CacheService.of({
    get: <T>(key: string, schema: Schema.Schema<T>) =>
      Effect.gen(function* () {
        const result = yield* Effect.promise(() => chrome.storage.local.get(key));
        const data = result[key];

        if (data == null) {
          return null;
        }

        return yield* Schema.decodeUnknown(schema)(data).pipe(Effect.catchAll(() => Effect.succeed(null)));
      }),

    set: <T>(key: string, value: T) =>
      Effect.promise(() => chrome.storage.local.set({ [key]: value })).pipe(
        Effect.asVoid,
        Effect.catchAll(() => Effect.void),
      ),

    remove: (key: string) =>
      Effect.promise(() => chrome.storage.local.remove(key)).pipe(
        Effect.asVoid,
        Effect.catchAll(() => Effect.void),
      ),
  }),
);

// Debug Service for logging
export interface DebugService {
  readonly log: (category: string, message: string, context?: unknown) => Effect.Effect<void>;
  readonly error: (category: string, error: unknown, context?: unknown) => Effect.Effect<void>;
}

export const DebugService = Context.GenericTag<DebugService>('DebugService');

export const DebugServiceLive = Layer.succeed(
  DebugService,
  DebugService.of({
    log: (category, message, context) =>
      Effect.sync(() => {
        console.log(`🔍 [${category}] ${message}`, context);
      }),

    error: (category, error, context) =>
      Effect.sync(() => {
        console.error(`❌ [${category}]`, error, context);
      }),
  }),
);

// Main application layer
export const AppLayer = Layer.mergeAll(HttpServiceLive, CacheServiceLive, DebugServiceLive);
```

**3.2. Validate the utility module:**

- Run `bun run typecheck`
- Ensure no circular dependencies with existing modules
- The utilities should facilitate gradual migration

##### Step 4: Update ESLint Configuration

**4.1. Modify `eslint.config.mjs`:**

```javascript
// Add to imports at the top
import effectPlugin from '@effect/eslint-plugin';

// In the config array, add Effect plugin configuration
export default [
  // ... existing configs ...

  // Add Effect plugin rules
  {
    plugins: {
      '@effect': effectPlugin,
    },
    rules: {
      // Effect-specific rules
      '@effect/no-direct-effect-import': 'error',

      // During migration, we'll have both systems
      // Temporarily disable the neverthrow rule for Effect files
      'neverthrow/must-use-result': [
        'error',
        {
          ignore: ['**/effect-utils.ts', '**/*-effect.ts'],
        },
      ],
    },
  },

  // ... rest of config ...
];
```

**4.2. Update TypeScript configuration (if needed):**

Check if Effect requires any specific TypeScript compiler options. Usually Effect works with standard strict mode, but verify:

- `strict: true` should already be enabled
- `exactOptionalPropertyTypes: true` is recommended by Effect
- No changes should be needed, but verify with `bun run typecheck`

##### Step 5: Create Migration Tracking Document

**5.1. Create `MIGRATION_STATUS.md`:**

```markdown
# Effect Migration Status

## Phase 1: Foundation Setup ✅

- [x] Effect installed
- [x] Effect error types created (errors-effect.ts)
- [x] Utility module created (effect-utils.ts)
- [x] ESLint configured for Effect

## Phase 2: Core Module Migration

- [ ] types.ts
- [ ] errors.ts (replace with errors-effect.ts)
- [ ] parser.ts
- [ ] canonicalizer.ts
- [ ] retry.ts

## Phase 3: Async Operations Migration

- [ ] resolver.ts
- [ ] cache.ts
- [ ] services.ts

## Phase 4: Integration Points

- [ ] service-worker.ts
- [ ] popup.ts
- [ ] options.ts
- [ ] debug.ts

## Phase 5: Testing and Cleanup

- [ ] Update all tests
- [ ] Remove neverthrow
- [ ] Bundle size check
- [ ] Performance testing

## Migration Notes

- Started: [DATE]
- Branch: effect-migration
-
```

##### Step 6: Validation and Commit

**6.1. Run ALL validation commands:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
bun run build:dev
```

**6.2. Fix any issues:**

- If ESLint complains about new Effect files, ensure the ignore patterns are correct
- If TypeScript has issues, check that Effect types are properly imported
- Tests should still pass as we haven't changed any actual functionality

**6.3. Commit the foundation:**

```bash
git add package.json bun.lockb
git add src/shared/errors-effect.ts
git add src/shared/effect-utils.ts
git add eslint.config.mjs
git add MIGRATION_STATUS.md
git commit -m "Phase 1: Set up Effect foundation with error types and utilities"
```

##### Verification Checklist for Junior Engineer

Before proceeding to Phase 2:

1. [ ] Can you import from 'effect' without errors?
2. [ ] Does `bun run typecheck` pass?
3. [ ] Does `bun run lint` pass?
4. [ ] Do all tests still pass?
5. [ ] Can you create an Effect error using `new NetworkError({ message: "test", url: "http://example.com" })`?
6. [ ] Is the Effect bundle size reasonable? (Check `dist/` after `bun run build:dev`)

##### Common Issues and Solutions

**Issue**: "Cannot find module 'effect'"

- **Solution**: Run `bun install` again

**Issue**: ESLint errors in Effect files

- **Solution**: Check that the ignore pattern in eslint.config.mjs is correct

**Issue**: TypeScript errors about Effect types

- **Solution**: Ensure you're importing from 'effect' not 'effect/index'

**Issue**: Tests fail after changes

- **Solution**: We haven't changed any logic yet - if tests fail, revert and check what was modified

##### Next Steps

Once Phase 1 is complete and all validation passes, we can begin Phase 2 by migrating the first core module (types.ts). The junior engineer should NOT proceed to Phase 2 until all Phase 1 validation passes.

### Phase 2: Core Module Migration (Bottom-up approach)

1. **Migrate types.ts** - Convert core type definitions to Effect-compatible structures
2. **Migrate errors.ts** - Implement Effect error constructors and type guards
3. **Migrate parser.ts** - Convert Result<T, E> to Effect<T, E, never> for sync operations
4. **Migrate canonicalizer.ts** - Pure functions with Effect error handling
5. **Migrate retry.ts** - Replace custom retry with Effect's Schedule combinators

#### Phase 2 Detailed Implementation Instructions

##### Prerequisites

- Phase 1 MUST be complete with all validation passing
- You should be on the `effect-migration` branch
- Verify Effect imports work: `import { Effect } from 'effect'` should not error

##### Overview

Phase 2 migrates the core modules that have no dependencies on async operations. We'll work bottom-up, starting with types, then errors, then the modules that use them.

##### Step 1: Migrate types.ts

**1.1. Analyze current types.ts:**
First, read the current file to understand what needs migration:

```bash
cat src/shared/types.ts
```

**1.2. Create Effect-compatible version:**
Since types.ts contains only TypeScript interfaces and types (no neverthrow imports), this file needs minimal changes. However, we'll create a new version to ensure compatibility:

```typescript
// src/shared/types-effect.ts
// Copy the entire contents of types.ts here
// This file should be identical to types.ts since it contains no Result types
```

**1.3. Update imports in effect-utils.ts:**
If needed, update effect-utils.ts to import from types-effect.ts:

```typescript
// In effect-utils.ts, change:
import type { SomeType } from './types.js';
// To:
import type { SomeType } from './types-effect.js';
```

**1.4. Validation:**

```bash
bun run typecheck
```

**1.5. Commit:**

```bash
git add src/shared/types-effect.ts
git commit -m "Phase 2.1: Create Effect-compatible types module"
```

##### Step 2: Replace errors.ts with errors-effect.ts

**2.1. Update all imports:**
Find all files that import from errors.ts and prepare a list:

```bash
grep -r "from './errors" src/ --include="*.ts" --include="*.tsx"
grep -r 'from "./errors' src/ --include="*.ts" --include="*.tsx"
```

**2.2. Create a migration script:**
Since we need to update many imports at once, create a temporary migration helper:

```typescript
// scripts/migrate-errors.ts
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function migrateErrorImports() {
  // List of files to update (from grep output)
  const filesToUpdate = [
    'src/shared/parser.ts',
    'src/shared/canonicalizer.ts',
    'src/shared/resolver.ts',
    'src/shared/cache.ts',
    'src/shared/retry.ts',
    // Add all files from grep output
  ];

  for (const file of filesToUpdate) {
    let content = await readFile(file, 'utf-8');

    // Replace error imports
    content = content.replace(/from ['"]\.\/errors(\.js)?['"]/g, `from './errors-effect.js'`);

    // Replace error type imports
    content = content.replace(
      /import type \{ WormholeError \}/g,
      `import type { WormholeEffectError as WormholeError }`,
    );

    await writeFile(file, content);
  }
}

migrateErrorImports().catch(console.error);
```

**2.3. Run the migration:**

```bash
bun scripts/migrate-errors.ts
```

**2.4. Delete old errors.ts:**

```bash
rm src/shared/errors.ts
```

**2.5. Update ESLint config:**
Remove the temporary ignore pattern since we're now fully using Effect errors:

```javascript
// In eslint.config.mjs, update the neverthrow rule:
'neverthrow/must-use-result': ['error', {
  ignore: ['**/effect-utils.ts'], // Remove the '**/*-effect.ts' pattern
}],
```

**2.6. Validation:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
```

**2.7. Fix any type mismatches:**
If tests fail due to error type mismatches, update test files to use Effect error types.

**2.8. Commit:**

```bash
git add -A
git commit -m "Phase 2.2: Replace neverthrow errors with Effect errors"
```

##### Step 3: Migrate parser.ts

**3.1. Read and understand current implementation:**

```bash
cat src/shared/parser.ts
```

**3.2. Create idiomatic Effect version with Schema validation:**

```typescript
// src/shared/parser-effect.ts
import { Effect, Schema, pipe } from 'effect';
import type { ParsedInput } from './types-effect.js';
import { ParseError, ValidationError, DidSchema, HandleSchema, UrlSchema } from './errors-effect.js';
import { SERVICES, findServiceByHostname } from './services.js';

// Schema for parsed inputs
const ParsedInputSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal('did'),
    did: DidSchema,
  }),
  Schema.Struct({
    type: Schema.Literal('handle'),
    handle: HandleSchema,
  }),
  Schema.Struct({
    type: Schema.Literal('url'),
    url: UrlSchema,
    hostname: Schema.String,
    pathname: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal('at-uri'),
    uri: Schema.String,
    authority: Schema.String,
    collection: Schema.optional(Schema.String),
    rkey: Schema.optional(Schema.String),
  }),
);

export const parseInput = (input: string): Effect.Effect<ParsedInput, ParseError | ValidationError> =>
  Effect.gen(function* () {
    const trimmed = input.trim();

    if (!trimmed) {
      return yield* Effect.fail(
        ParseError.make({
          message: 'Input is empty',
          input,
        }),
      );
    }

    // Handle DID
    if (trimmed.startsWith('did:')) {
      const did = yield* Schema.decodeUnknown(DidSchema)(trimmed).pipe(
        Effect.mapError(() =>
          ParseError.make({
            message: 'Invalid DID format',
            input: trimmed,
          }),
        ),
      );
      return { type: 'did', did } as const;
    }

    // Handle AT URI
    if (trimmed.startsWith('at://')) {
      return yield* parseAtUri(trimmed);
    }

    // Handle URL
    const urlResult = yield* Effect.try({
      try: () => new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`),
      catch: () => null,
    });

    if (urlResult) {
      return yield* parseUrl(urlResult);
    }

    // Handle as potential handle
    const handleResult = yield* Schema.decodeUnknown(HandleSchema)(trimmed.replace(/^@/, '')).pipe(
      Effect.match({
        onSuccess: (handle) => ({ type: 'handle', handle }) as const,
        onFailure: () => null,
      }),
    );

    if (handleResult) {
      return handleResult;
    }

    return yield* Effect.fail(
      ParseError.make({
        message: 'Invalid input format - not a valid URL, handle, DID, or AT URI',
        input,
      }),
    );
  });

const parseUrl = (url: URL): Effect.Effect<ParsedInput, ParseError> =>
  Effect.gen(function* () {
    const service = findServiceByHostname(url.hostname);

    if (!service?.parsing) {
      return {
        type: 'url',
        url: url.href,
        hostname: url.hostname,
        pathname: url.pathname,
      } as const;
    }

    // Extract parsed information from URL using service patterns
    const parsed = yield* extractFromUrl(url, service.parsing);
    return parsed;
  });

const parseAtUri = (uri: string): Effect.Effect<ParsedInput, ParseError> =>
  Effect.gen(function* () {
    const match = uri.match(/^at:\/\/([^/]+)(?:\/([^/]+)(?:\/(.+))?)?$/);

    if (!match) {
      return yield* Effect.fail(
        ParseError.make({
          message: 'Invalid AT URI format',
          input: uri,
        }),
      );
    }

    const [, authority, collection, rkey] = match;

    return {
      type: 'at-uri',
      uri,
      authority,
      collection,
      rkey,
    } as const;
  });

const extractFromUrl = (url: URL, patterns: ServiceParsingConfig): Effect.Effect<ParsedInput, ParseError> =>
  Effect.gen(function* () {
    // Implementation for extracting structured data from URLs
    // This would use the service patterns to extract handles, DIDs, etc.
    return {
      type: 'url',
      url: url.href,
      hostname: url.hostname,
      pathname: url.pathname,
    } as const;
  });
```

**3.3. Update imports in other files:**

```bash
# Find files importing from parser
grep -r "from './parser" src/ --include="*.ts"
```

For each file found, update to import from parser-effect.ts and handle Effect types.

**3.4. Remove old parser.ts:**

```bash
rm src/shared/parser.ts
mv src/shared/parser-effect.ts src/shared/parser.ts
```

**3.5. Update consumer code:**
In files that use parseInput, update from Result patterns to Effect patterns:

```typescript
// Before:
parseInput(input).match(
  (parsed) => {
    /* success */
  },
  (error) => {
    /* error */
  },
);

// After:
Effect.match(parseInput(input), {
  onSuccess: (parsed) => {
    /* success */
  },
  onFailure: (error) => {
    /* error */
  },
});
```

**3.6. Validation:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
```

**3.7. Commit:**

```bash
git add -A
git commit -m "Phase 2.3: Migrate parser to Effect"
```

##### Step 4: Migrate canonicalizer.ts

**4.1. Read current implementation:**

```bash
cat src/shared/canonicalizer.ts
```

**4.2. Create idiomatic Effect version with pattern matching:**

```typescript
// src/shared/canonicalizer-effect.ts
import { Effect, Match, Schema, pipe } from 'effect';
import type { ParsedInput, TransformInfo } from './types-effect.js';
import { ValidationError, ParseError } from './errors-effect.js';
import { DebugService } from './services.js';

// Schema for transform info output
const TransformInfoSchema = Schema.Struct({
  handle: Schema.optional(Schema.String),
  did: Schema.optional(Schema.String),
  nsid: Schema.optional(Schema.String),
  rkey: Schema.optional(Schema.String),
  cid: Schema.optional(Schema.String),
});

export const canonicalize = (parsed: ParsedInput): Effect.Effect<TransformInfo, ValidationError | ParseError> =>
  Effect.gen(function* () {
    yield* DebugService.log('CANONICALIZER', 'Canonicalizing input', { parsed });

    return yield* pipe(
      parsed,
      Match.value,
      Match.when({ type: 'handle' }, (p) => Effect.succeed({ handle: p.handle })),
      Match.when({ type: 'did' }, (p) => Effect.succeed({ did: p.did })),
      Match.when({ type: 'url' }, (p) => canonicalizeUrl(p)),
      Match.when({ type: 'at-uri' }, (p) => canonicalizeAtUri(p)),
      Match.exhaustive,
    );
  });

const canonicalizeUrl = (parsed: {
  type: 'url';
  url: string;
  hostname: string;
  pathname: string;
}): Effect.Effect<TransformInfo, ValidationError | ParseError> =>
  Effect.gen(function* () {
    const service = findServiceByHostname(parsed.hostname);

    if (!service?.parsing) {
      return yield* Effect.fail(
        ValidationError.make({
          message: 'No parsing configuration for hostname',
          field: 'hostname',
          value: parsed.hostname,
        }),
      );
    }

    // Extract structured information using service patterns
    const info = yield* extractStructuredInfo(parsed.pathname, service.parsing);

    yield* DebugService.log('CANONICALIZER', 'Extracted info from URL', { info });

    return info;
  });

const canonicalizeAtUri = (parsed: {
  type: 'at-uri';
  uri: string;
  authority: string;
  collection?: string;
  rkey?: string;
}): Effect.Effect<TransformInfo, ValidationError> =>
  Effect.gen(function* () {
    const info: TransformInfo = {
      handle: parsed.authority.startsWith('did:') ? undefined : parsed.authority,
      did: parsed.authority.startsWith('did:') ? parsed.authority : undefined,
    };

    if (parsed.collection) {
      info.nsid = parsed.collection;
    }

    if (parsed.rkey) {
      info.rkey = parsed.rkey;
    }

    yield* DebugService.log('CANONICALIZER', 'Canonicalized AT URI', { info });

    return info;
  });

const extractStructuredInfo = (
  pathname: string,
  config: ServiceParsingConfig,
): Effect.Effect<TransformInfo, ParseError> =>
  Effect.gen(function* () {
    // Implementation for extracting handles, DIDs, rkeys from URL patterns
    // This would use regex patterns from service configuration

    const info: TransformInfo = {};

    // Extract handle/identifier if pattern matches
    if (config.patterns?.profileIdentifier) {
      const match = pathname.match(config.patterns.profileIdentifier);
      if (match?.[1]) {
        info.handle = match[1];
      }
    }

    // Extract post rkey if pattern matches
    if (config.patterns?.postIdentifier) {
      const match = pathname.match(config.patterns.postIdentifier);
      if (match) {
        info.handle = match[1];
        info.rkey = match[2];
        info.nsid = 'app.bsky.feed.post';
      }
    }

    if (Object.keys(info).length === 0) {
      return yield* Effect.fail(
        ParseError.make({
          message: 'No extractable information from pathname',
          input: pathname,
        }),
      );
    }

    return info;
  });
```

**4.3. Replace and update imports:**
Follow the same process as with parser.ts.

**4.4. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
git add -A
git commit -m "Phase 2.4: Migrate canonicalizer to Effect"
```

##### Step 5: Migrate retry.ts

**5.1. Read current implementation:**

```bash
cat src/shared/retry.ts
```

**5.2. Create idiomatic Effect version using Schedule and policies:**

```typescript
// src/shared/retry-effect.ts
import { Effect, Schedule, pipe, Match, Duration } from 'effect';
import { NetworkError, type WormholeError } from './errors-effect.js';
import { DebugService } from './services.js';

// Predefined retry policies as layers
export const RetryPolicies = {
  // Network operations: exponential backoff with jitter
  network: pipe(
    Schedule.exponential(Duration.millis(100), 2),
    Schedule.intersect(Schedule.spaced(Duration.seconds(5))),
    Schedule.whileInput((error: WormholeError) => error._tag === 'NetworkError'),
    Schedule.upTo(Duration.seconds(30)),
    Schedule.jittered, // Add jitter to prevent thundering herd
  ),

  // Cache operations: fast retry with linear backoff
  cache: pipe(
    Schedule.linear(Duration.millis(50)),
    Schedule.whileInput((error: WormholeError) => error._tag === 'CacheError'),
    Schedule.upTo(Duration.seconds(5)),
  ),

  // Parse operations: immediate retry up to 2 times (for transient issues)
  parse: pipe(
    Schedule.recurs(2),
    Schedule.whileInput((error: WormholeError) => error._tag === 'ParseError'),
  ),
};

// Smart retry that chooses policy based on error type
export const withSmartRetry = <A, E extends WormholeError>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    return yield* pipe(
      effect,
      Effect.retry(
        pipe(
          Schedule.union(RetryPolicies.network, RetryPolicies.cache),
          Schedule.union(RetryPolicies.parse),
          Schedule.tapInput((error) => DebugService.log('RETRY', 'Retrying operation', { error })),
        ),
      ),
    );
  });

// Specific retry functions for common use cases
export const withNetworkRetry = <A>(effect: Effect.Effect<A, NetworkError>): Effect.Effect<A, NetworkError> =>
  Effect.retry(effect, RetryPolicies.network);

export const withCacheRetry = <A, E extends WormholeError>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  Effect.retry(effect, RetryPolicies.cache);

// Circuit breaker pattern for repeated failures
export const withCircuitBreaker = <A, E extends WormholeError>(
  effect: Effect.Effect<A, E>,
  failureThreshold = 5,
  resetTimeout = Duration.minutes(1),
) => {
  // This would implement a proper circuit breaker using Effect's Ref for state
  // For now, simplified version
  return pipe(
    effect,
    Effect.retry(pipe(Schedule.recurs(failureThreshold), Schedule.intersect(Schedule.spaced(resetTimeout)))),
  );
};

// Timeout with retry
export const withTimeoutAndRetry = <A, E extends WormholeError>(
  effect: Effect.Effect<A, E>,
  timeout = Duration.seconds(5),
  schedule = RetryPolicies.network,
): Effect.Effect<A, E> => pipe(effect, Effect.timeout(timeout), Effect.retry(schedule));
```

**5.3. Update consumers:**
Files using withRetry will need updates:

```typescript
// Before:
withRetry(() => ResultAsync.fromPromise(...))

// After:
withRetry(Effect.tryPromise(...))
```

**5.4. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
git add -A
git commit -m "Phase 2.5: Migrate retry to Effect with Schedule API"
```

##### Step 6: Update MIGRATION_STATUS.md

```markdown
## Phase 2: Core Module Migration ✅

- [x] types.ts - Created Effect-compatible version
- [x] errors.ts - Replaced with errors-effect.ts
- [x] parser.ts - Converted to Effect
- [x] canonicalizer.ts - Converted to Effect
- [x] retry.ts - Replaced with Effect Schedule API
```

##### Step 7: Final Phase 2 Validation

**7.1. Run full validation suite:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
bun run build:dev
```

**7.2. Check bundle size:**

```bash
ls -lh dist/
```

**7.3. Manual testing:**

- Load the extension in development mode
- Test basic functionality still works
- Verify no console errors

##### Troubleshooting Guide

**Issue**: "Cannot find module" errors after migration

- **Solution**: Check all import paths end with `.js` extension

**Issue**: Type mismatch between Effect and neverthrow in tests

- **Solution**: Update test to use Effect.runSync or Effect.runPromise

**Issue**: ESLint "must-use-result" errors

- **Solution**: Ensure the file is properly using Effect types, not Result

**Issue**: Test timeout

- **Solution**: Effect might need explicit runtime. Wrap test in Effect.runPromise

##### Common Patterns for Migration

**Pattern 1: Converting Result.match**

```typescript
// Before:
result.match(
  (value) => console.log(value),
  (error) => console.error(error),
);

// After:
pipe(
  effect,
  Effect.match({
    onSuccess: (value) => console.log(value),
    onFailure: (error) => console.error(error),
  }),
  Effect.runSync,
);
```

**Pattern 2: Converting ResultAsync.fromPromise**

```typescript
// Before:
ResultAsync.fromPromise(fetch(url), (e) => networkError('Failed', url, e));

// After:
Effect.tryPromise({
  try: () => fetch(url),
  catch: (e) => networkError('Failed', url, undefined, e),
});
```

**Pattern 3: Chaining operations**

```typescript
// Before:
result.andThen((value) => nextOperation(value)).map((value) => transform(value));

// After:
pipe(
  effect,
  Effect.flatMap((value) => nextOperation(value)),
  Effect.map((value) => transform(value)),
);
```

##### Next Steps

Once Phase 2 is complete with all core modules migrated, proceed to Phase 3 for async operations (resolver.ts, cache.ts). Do NOT proceed until all validation passes and manual testing confirms the extension still works.

### Phase 3: Async Operations Migration

1. **Migrate resolver.ts** - Convert ResultAsync to Effect, use Effect's timeout/retry
2. **Migrate cache.ts** - Port chrome.storage operations to Effect
3. **Update services.ts** - Ensure buildUrl functions work with Effect types

#### Phase 3 Detailed Implementation Instructions

##### Prerequisites

- Phase 1 and Phase 2 MUST be complete with all validation passing
- You should be on the `effect-migration` branch
- Verify async Effect patterns work: `Effect.tryPromise` should be available
- All core modules (parser, canonicalizer, retry) should already be using Effect

##### Overview

Phase 3 migrates the async operation modules that handle network requests, browser storage, and service configuration. These modules are critical for the extension's functionality and require careful handling of async operations.

##### Step 1: Migrate resolver.ts

**1.1. Analyze current resolver.ts:**

```bash
cat src/shared/resolver.ts
```

Key observations:

- Uses `ResultAsync` for all network operations
- Has custom retry logic via `withNetworkRetry`
- Uses `AbortSignal.timeout(5000)` for request timeouts
- Handles JSON parsing with type validation
- Returns structured error types

**1.2. Create idiomatic Effect version with services and schema:**

```typescript
// src/shared/resolver-effect.ts
import { Effect, Schema, pipe, Match } from 'effect';
import { NetworkError, ParseError, DidSchema, HandleSchema } from './errors-effect.js';
import { HttpService, DebugService } from './services.js';
import { withNetworkRetry, withTimeoutAndRetry } from './retry.js';

// Schemas for API responses
const BlueskyResolveHandleResponseSchema = Schema.Struct({
  did: Schema.String,
});

const DidDocumentSchema = Schema.Struct({
  id: Schema.optional(Schema.String),
  alsoKnownAs: Schema.optional(Schema.Array(Schema.String)),
});

// Service interface for resolver
export interface ResolverService {
  readonly resolveHandleToDid: (handle: string) => Effect.Effect<string, NetworkError | ParseError>;
  readonly resolveDidToHandle: (did: string) => Effect.Effect<string | null, NetworkError | ParseError>;
}

export const ResolverService = Context.GenericTag<ResolverService>('ResolverService');

// Implementation using Effect services
export const ResolverServiceLive = Layer.effect(
  ResolverService,
  Effect.gen(function* () {
    const http = yield* HttpService;
    const debug = yield* DebugService;

    return ResolverService.of({
      resolveHandleToDid: (handle: string) =>
        Effect.gen(function* () {
          // Validate input
          const validatedHandle = yield* Schema.decodeUnknown(HandleSchema)(handle.replace(/^@/, '')).pipe(
            Effect.mapError(() =>
              ParseError.make({
                message: 'Invalid handle format',
                input: handle,
              }),
            ),
          );

          yield* debug.log('RESOLVER', 'Resolving handle to DID', { handle: validatedHandle });

          return yield* pipe(
            validatedHandle,
            Match.value,
            Match.when(
              (h) => h.startsWith('did:web:'),
              (didWeb) => resolveDidWeb(didWeb, http, debug),
            ),
            Match.orElse((h) => resolveHandleViaBsky(h, http, debug)),
          );
        }),

      resolveDidToHandle: (did: string) =>
        Effect.gen(function* () {
          if (!did) return null;

          // Validate DID format
          const validatedDid = yield* Schema.decodeUnknown(DidSchema)(did).pipe(
            Effect.mapError(() =>
              ParseError.make({
                message: 'Invalid DID format',
                input: did,
              }),
            ),
          );

          yield* debug.log('RESOLVER', 'Resolving DID to handle', { did: validatedDid });

          return yield* pipe(
            validatedDid,
            Match.value,
            Match.when(
              (d) => d.startsWith('did:plc:'),
              (didPlc) => resolveDidPlc(didPlc, http, debug),
            ),
            Match.when(
              (d) => d.startsWith('did:web:'),
              (didWeb) => resolveDidWebToHandle(didWeb, http, debug),
            ),
            Match.orElse(() => Effect.succeed(null)),
          );
        }),
    });
  }),
).pipe(Layer.provide(Layer.mergeAll(HttpService, DebugService)));

// Helper functions using services
const resolveDidWeb = (
  didWeb: string,
  http: HttpService.Service,
  debug: DebugService.Service,
): Effect.Effect<string, NetworkError | ParseError> =>
  Effect.gen(function* () {
    const parts = didWeb.split(':');
    if (parts.length !== 3) {
      return didWeb;
    }

    const url = `https://${parts[2]}/.well-known/did.json`;
    yield* debug.log('RESOLVER', 'Fetching did:web document', { url });

    const response = yield* withTimeoutAndRetry(http.fetchJson(url, DidDocumentSchema)).pipe(
      Effect.catchAll((error) => {
        yield * debug.error('RESOLVER', 'did:web resolution failed, using fallback', { error, didWeb });
        return Effect.succeed({ id: didWeb });
      }),
    );

    return response.id ?? didWeb;
  });

const resolveHandleViaBsky = (
  handle: string,
  http: HttpService.Service,
  debug: DebugService.Service,
): Effect.Effect<string, NetworkError | ParseError> =>
  Effect.gen(function* () {
    const apiUrl = `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;

    yield* debug.log('RESOLVER', 'Resolving via Bluesky API', { handle, apiUrl });

    const response = yield* withNetworkRetry(http.fetchJson(apiUrl, BlueskyResolveHandleResponseSchema));

    yield* debug.log('RESOLVER', 'Handle resolved successfully', { handle, did: response.did });

    return response.did;
  });

const resolveDidPlc = (
  did: string,
  http: HttpService.Service,
  debug: DebugService.Service,
): Effect.Effect<string | null, NetworkError | ParseError> =>
  Effect.gen(function* () {
    const url = `https://plc.directory/${encodeURIComponent(did)}`;

    const response = yield* withNetworkRetry(http.fetchJson(url, DidDocumentSchema)).pipe(
      Effect.catchAll((error) => {
        yield * debug.error('RESOLVER', 'PLC resolution failed', { error, did });
        return Effect.succeed(null);
      }),
    );

    if (!response?.alsoKnownAs) {
      return null;
    }

    return extractHandleFromAlsoKnownAs(response.alsoKnownAs);
  });

const resolveDidWebToHandle = (
  did: string,
  http: HttpService.Service,
  debug: DebugService.Service,
): Effect.Effect<string | null, NetworkError | ParseError> =>
  Effect.gen(function* () {
    const url = getDidWebWellKnownUrl(did);

    const response = yield* withNetworkRetry(http.fetchJson(url, DidDocumentSchema)).pipe(
      Effect.catchAll((error) => {
        yield * debug.error('RESOLVER', 'did:web resolution failed, using fallback', { error, did });
        // Fallback to decoding the did:web identifier
        const fallbackHandle = decodeURIComponent(did.substring('did:web:'.length).split('#')[0]);
        return Effect.succeed(fallbackHandle);
      }),
    );

    if (typeof response === 'string') {
      return response; // fallback case
    }

    return response?.alsoKnownAs ? extractHandleFromAlsoKnownAs(response.alsoKnownAs) : null;
  });

// Pure helper functions
const extractHandleFromAlsoKnownAs = (alsoKnownAs: string[]): string | null => {
  for (const aka of alsoKnownAs) {
    if (aka.startsWith('at://')) {
      const handle = aka.substring('at://'.length);
      if (handle) {
        return handle;
      }
    }
  }
  return null;
};

const getDidWebWellKnownUrl = (did: string): string => {
  const methodSpecificId = decodeURIComponent(did.substring('did:web:'.length).split('#')[0]);
  const parts = methodSpecificId.split(':');
  const hostAndPort = parts[0];
  let path = '';
  if (parts.length > 1) {
    path = '/' + parts.slice(1).join('/');
  }
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return `https://${hostAndPort}${path}/.well-known/did.json`;
};

// Export convenience functions that use the service
export const resolveHandleToDid = (handle: string) =>
  Effect.flatMap(ResolverService, (service) => service.resolveHandleToDid(handle));

export const resolveDidToHandle = (did: string) =>
  Effect.flatMap(ResolverService, (service) => service.resolveDidToHandle(did));
```

**1.3. Update imports in consumer files:**
Find all files that use resolver functions:

```bash
grep -r "resolveHandleToDid\|resolveDidToHandle" src/ --include="*.ts"
```

**1.4. Replace and update imports:**

```bash
rm src/shared/resolver.ts
mv src/shared/resolver-effect.ts src/shared/resolver.ts
```

**1.5. Update consumer code to handle Effect returns:**

```typescript
// Before:
resolveHandleToDid(handle).match(
  (did) => {
    /* success */
  },
  (error) => {
    /* error */
  },
);

// After:
pipe(
  resolveHandleToDid(handle),
  Effect.match({
    onSuccess: (did) => {
      /* success */
    },
    onFailure: (error) => {
      /* error */
    },
  }),
  Effect.runPromise,
);
```

**1.6. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
git add -A
git commit -m "Phase 3.1: Migrate resolver to Effect with timeout and retry"
```

##### Step 2: Migrate cache.ts

**2.1. Analyze current cache.ts:**
The cache module has two main components:

- `BidirectionalMap`: A pure data structure (no async operations)
- `DidHandleCache`: Uses chrome.storage API with ResultAsync

**2.2. Create idiomatic Effect version with services and proper resource management:**

```typescript
// src/shared/cache-effect.ts
import { Effect, Schema, Ref, Layer, Context, pipe, Duration } from 'effect';
import { CacheService, DebugService } from './services.js';
import { DidSchema, HandleSchema } from './errors-effect.js';

// Schemas for cache data validation
const CacheEntrySchema = Schema.Struct({
  handle: HandleSchema,
  lastAccessed: Schema.Number,
  accessCount: Schema.optional(Schema.Number),
});

const CacheDataSchema = Schema.Record(DidSchema, CacheEntrySchema);

interface CacheEntry {
  handle: string;
  lastAccessed: number;
  accessCount?: number;
}

// Bidirectional map as a pure data structure with Effect operations
export interface BidirectionalMap<K1, K2> {
  readonly set: (k1: K1, k2: K2) => Effect.Effect<void>;
  readonly getByFirst: (k1: K1) => Effect.Effect<K2 | null>;
  readonly getBySecond: (k2: K2) => Effect.Effect<K1 | null>;
  readonly delete: (k1: K1, k2: K2) => Effect.Effect<void>;
  readonly clear: Effect.Effect<void>;
  readonly size: Effect.Effect<number>;
  readonly entries: Effect.Effect<Array<[K1, K2]>>;
}

// Cache configuration interface
export interface DidHandleCacheConfig {
  readonly maxStorageSize: number;
  readonly maxEntries: number;
  readonly ttlMillis: number;
  readonly storageKey: string;
}

// Default configuration
const defaultConfig: DidHandleCacheConfig = {
  maxStorageSize: 4 * 1024 * 1024, // 4MB
  maxEntries: 10000,
  ttlMillis: Duration.days(7).value, // 7 days
  storageKey: 'wormhole-cache',
};

// Service interface for DID-Handle cache
export interface DidHandleCacheService {
  readonly get: (did: string) => Effect.Effect<string | null>;
  readonly getReverse: (handle: string) => Effect.Effect<string | null>;
  readonly set: (did: string, handle: string) => Effect.Effect<void>;
  readonly load: Effect.Effect<void>;
  readonly persist: Effect.Effect<void>;
  readonly clear: Effect.Effect<void>;
  readonly evictExpired: Effect.Effect<number>;
  readonly stats: Effect.Effect<{
    size: number;
    estimatedStorageSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }>;
}

export const DidHandleCacheService = Context.GenericTag<DidHandleCacheService>('DidHandleCacheService');

// Live implementation using Ref for state management
export const DidHandleCacheServiceLive = (config: DidHandleCacheConfig = defaultConfig) =>
  Layer.effect(
    DidHandleCacheService,
    Effect.gen(function* () {
      const cache = yield* Ref.make(new Map<string, string>());
      const reverseCache = yield* Ref.make(new Map<string, string>());
      const accessTimes = yield* Ref.make(new Map<string, number>());
      const debug = yield* DebugService;
      const storage = yield* CacheService;

      // Helper to validate and clean expired entries
      const cleanExpired = Effect.gen(function* () {
        const now = Date.now();
        const times = yield* Ref.get(accessTimes);
        const expiredKeys: string[] = [];

        for (const [did, lastAccessed] of times) {
          if (now - lastAccessed > config.ttlMillis) {
            expiredKeys.push(did);
          }
        }

        if (expiredKeys.length > 0) {
          yield* debug.log('CACHE', 'Cleaning expired entries', { count: expiredKeys.length });

          for (const did of expiredKeys) {
            const cacheMap = yield* Ref.get(cache);
            const reverseCacheMap = yield* Ref.get(reverseCache);
            const handle = cacheMap.get(did);

            if (handle) {
              yield* Ref.update(cache, (map) => {
                map.delete(did);
                return new Map(map);
              });
              yield* Ref.update(reverseCache, (map) => {
                map.delete(handle);
                return new Map(map);
              });
            }

            yield* Ref.update(accessTimes, (map) => {
              map.delete(did);
              return new Map(map);
            });
          }
        }

        return expiredKeys.length;
      });

      // Helper to evict LRU entries if over capacity
      const evictLRU = Effect.gen(function* () {
        const cacheMap = yield* Ref.get(cache);
        const times = yield* Ref.get(accessTimes);

        if (cacheMap.size <= config.maxEntries) {
          return;
        }

        const sortedByAccess = Array.from(times.entries()).sort(([, a], [, b]) => a - b);

        const toEvict = sortedByAccess.slice(0, cacheMap.size - config.maxEntries);

        yield* debug.log('CACHE', 'Evicting LRU entries', { count: toEvict.length });

        for (const [did] of toEvict) {
          const reverseCacheMap = yield* Ref.get(reverseCache);
          const handle = cacheMap.get(did);

          if (handle) {
            yield* Ref.update(cache, (map) => {
              map.delete(did);
              return new Map(map);
            });
            yield* Ref.update(reverseCache, (map) => {
              map.delete(handle);
              return new Map(map);
            });
          }

          yield* Ref.update(accessTimes, (map) => {
            map.delete(did);
            return new Map(map);
          });
        }
      });

      return DidHandleCacheService.of({
        get: (did: string) =>
          Effect.gen(function* () {
            // Validate DID format
            yield* Schema.decodeUnknown(DidSchema)(did);

            const cacheMap = yield* Ref.get(cache);
            const handle = cacheMap.get(did);

            if (handle) {
              // Update access time
              yield* Ref.update(accessTimes, (map) => {
                map.set(did, Date.now());
                return new Map(map);
              });

              yield* debug.log('CACHE', 'Cache hit for DID', { did, handle });
            }

            return handle ?? null;
          }),

        getReverse: (handle: string) =>
          Effect.gen(function* () {
            // Validate handle format
            yield* Schema.decodeUnknown(HandleSchema)(handle);

            const reverseCacheMap = yield* Ref.get(reverseCache);
            const did = reverseCacheMap.get(handle);

            if (did) {
              // Update access time
              yield* Ref.update(accessTimes, (map) => {
                map.set(did, Date.now());
                return new Map(map);
              });

              yield* debug.log('CACHE', 'Reverse cache hit for handle', { handle, did });
            }

            return did ?? null;
          }),

        set: (did: string, handle: string) =>
          Effect.gen(function* () {
            // Validate inputs
            yield* Schema.decodeUnknown(DidSchema)(did);
            yield* Schema.decodeUnknown(HandleSchema)(handle);

            const now = Date.now();

            // Update both caches atomically
            yield* Ref.update(cache, (map) => {
              map.set(did, handle);
              return new Map(map);
            });

            yield* Ref.update(reverseCache, (map) => {
              map.set(handle, did);
              return new Map(map);
            });

            yield* Ref.update(accessTimes, (map) => {
              map.set(did, now);
              return new Map(map);
            });

            yield* debug.log('CACHE', 'Cache entry set', { did, handle });

            // Clean up if needed
            yield* evictLRU;
          }),

        load: Effect.gen(function* () {
          yield* debug.log('CACHE', 'Loading cache from storage');

          const data = yield* storage.get(config.storageKey, CacheDataSchema);

          if (!data) {
            yield* debug.log('CACHE', 'No cached data found');
            return;
          }

          let loadedCount = 0;
          const now = Date.now();

          for (const [did, entry] of Object.entries(data)) {
            // Skip expired entries
            if (now - entry.lastAccessed > config.ttlMillis) {
              continue;
            }

            yield* Ref.update(cache, (map) => {
              map.set(did, entry.handle);
              return new Map(map);
            });

            yield* Ref.update(reverseCache, (map) => {
              map.set(entry.handle, did);
              return new Map(map);
            });

            yield* Ref.update(accessTimes, (map) => {
              map.set(did, entry.lastAccessed);
              return new Map(map);
            });

            loadedCount++;
          }

          yield* debug.log('CACHE', 'Cache loaded successfully', {
            totalEntries: Object.keys(data).length,
            loadedEntries: loadedCount,
          });
        }),

        persist: Effect.gen(function* () {
          const cacheMap = yield* Ref.get(cache);
          const times = yield* Ref.get(accessTimes);

          const data: Record<string, CacheEntry> = {};

          for (const [did, handle] of cacheMap) {
            const lastAccessed = times.get(did) ?? Date.now();
            data[did] = { handle, lastAccessed };
          }

          yield* storage.set(config.storageKey, data);
          yield* debug.log('CACHE', 'Cache persisted', { entryCount: Object.keys(data).length });
        }),

        clear: Effect.gen(function* () {
          yield* Ref.set(cache, new Map());
          yield* Ref.set(reverseCache, new Map());
          yield* Ref.set(accessTimes, new Map());
          yield* storage.remove(config.storageKey);
          yield* debug.log('CACHE', 'Cache cleared');
        }),

        evictExpired: cleanExpired,

        stats: Effect.gen(function* () {
          const cacheMap = yield* Ref.get(cache);
          const times = yield* Ref.get(accessTimes);

          const accessTimeValues = Array.from(times.values());

          return {
            size: cacheMap.size,
            estimatedStorageSize: JSON.stringify(Object.fromEntries(cacheMap)).length,
            oldestEntry: accessTimeValues.length > 0 ? Math.min(...accessTimeValues) : null,
            newestEntry: accessTimeValues.length > 0 ? Math.max(...accessTimeValues) : null,
          };
        }),
      });
    }),
  ).pipe(Layer.provide(Layer.mergeAll(CacheService, DebugService)));

// Export convenience functions
export const getCachedHandle = (did: string) => Effect.flatMap(DidHandleCacheService, (cache) => cache.get(did));

export const getCachedDid = (handle: string) =>
  Effect.flatMap(DidHandleCacheService, (cache) => cache.getReverse(handle));

export const setCacheEntry = (did: string, handle: string) =>
  Effect.flatMap(DidHandleCacheService, (cache) => cache.set(did, handle));
```

**2.3. Update imports and consumer code:**
Files that use the cache will need to handle Effect returns for async operations:

```typescript
// Before:
cache.load().match(
  () => {
    /* loaded */
  },
  (error) => {
    /* error */
  },
);

// After:
await pipe(
  cache.load(),
  Effect.match({
    onSuccess: () => {
      /* loaded */
    },
    onFailure: (error) => {
      /* error */
    },
  }),
  Effect.runPromise,
);
```

**2.4. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
git add -A
git commit -m "Phase 3.2: Migrate cache to Effect with chrome.storage operations"
```

##### Step 3: Update services.ts

**3.1. Analyze current services.ts:**
The services module is mostly pure configuration with type definitions. The main consideration is ensuring it works with the new Effect-based types.

**3.2. Update type imports:**

```typescript
// src/shared/services.ts
import type { TransformInfo } from './types-effect.js';

// The rest of the file remains largely unchanged since it's configuration
export interface ServiceConfig {
  // ... existing interface definition ...
}

export const SERVICES: Record<string, ServiceConfig> = {
  // ... existing service configurations ...
};

// Helper functions may need updates if they use error types
export function findServiceByHostname(hostname: string): ServiceConfig | null {
  // ... implementation ...
}
```

**3.3. Verify compatibility:**
Since services.ts is mainly configuration and pure functions, minimal changes are needed. The main updates are:

- Import path changes to use Effect-compatible types
- Any helper functions that return errors should use Effect error types

**3.4. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
git add -A
git commit -m "Phase 3.3: Update services module for Effect compatibility"
```

##### Step 4: Update MIGRATION_STATUS.md

```markdown
## Phase 3: Async Operations Migration ✅

- [x] resolver.ts - Converted network operations to Effect
- [x] cache.ts - Ported chrome.storage to Effect
- [x] services.ts - Updated imports for Effect types
```

##### Step 5: Final Phase 3 Validation

**5.1. Run full validation suite:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
bun run build:dev
```

**5.2. Integration testing:**
Test critical async operations:

- Load the extension and verify handle/DID resolution works
- Check that cache persists across extension reloads
- Verify network retries work correctly
- Test timeout behavior with slow connections

**5.3. Performance check:**

- Monitor memory usage during cache operations
- Verify no regression in network request performance
- Check that Effect's retry mechanism doesn't add significant overhead

##### Troubleshooting Guide

**Issue**: Chrome storage API type conflicts

- **Solution**: Ensure chrome types are installed and Effect.tryPromise properly types the API

**Issue**: Effect runtime not available in async contexts

- **Solution**: Use Effect.runPromise at integration boundaries, not within library functions

**Issue**: Cache rollback logic fails

- **Solution**: Verify the rollback state is captured before mutations

**Issue**: Network timeouts not working

- **Solution**: Verify AbortSignal.timeout is supported in your runtime

##### Common Patterns for Phase 3

**Pattern 1: Browser API wrapping**

```typescript
// Wrap browser APIs with Effect.tryPromise
Effect.tryPromise({
  try: () => chrome.storage.local.get(key),
  catch: (e) => cacheError('Storage operation failed', 'get', e),
});
```

**Pattern 2: Fire-and-forget with logging**

```typescript
// For operations that shouldn't block but should log errors
void pipe(
  someEffect,
  Effect.match({
    onSuccess: () => {},
    onFailure: (error) => logError('CONTEXT', error),
  }),
  Effect.runPromise,
);
```

**Pattern 3: Fallback values for resilience**

```typescript
// Provide fallback values for non-critical failures
pipe(
  riskyOperation,
  Effect.catchAll(() => Effect.succeed(fallbackValue)),
);
```

**Pattern 4: Combining multiple async operations**

```typescript
// Use Effect.all for parallel operations
Effect.all([resolveHandleToDid(handle1), resolveHandleToDid(handle2)], { concurrency: 2 });
```

##### Key Considerations for Async Operations

1. **Effect Runtime**: Remember that Effect needs a runtime to execute. Use `Effect.runPromise` at the boundaries where you interface with non-Effect code.

2. **Error Recovery**: Effect makes error recovery explicit. Use `Effect.catchAll` or `Effect.catchTag` for specific error handling.

3. **Resource Management**: Although not used heavily in this extension, Effect's resource management (using `Effect.acquireRelease`) could be useful for future features.

4. **Concurrency Control**: Effect provides fine-grained concurrency control. Consider using it for parallel resolution operations.

5. **Testing**: Update tests to use `Effect.runPromise` or `Effect.runSync` as appropriate. Consider using Effect's test utilities for better testing.

##### Next Steps

Once Phase 3 is complete with all async operations migrated, proceed to Phase 4 for integration points (service-worker.ts, popup.ts, options.ts, debug.ts). These files interface directly with the browser extension APIs and user interface.

### Phase 4: Integration Points

1. **Migrate service-worker.ts** - Convert message handling to Effect runtime
2. **Migrate popup.ts** - Update UI communication with Effect
3. **Migrate options.ts** - Simple conversion for options handling
4. **Update debug.ts** - Ensure logging works with Effect errors

#### Phase 4 Detailed Implementation Instructions

##### Prerequisites

- Phases 1, 2, and 3 MUST be complete with all validation passing
- You should be on the `effect-migration` branch
- All library modules (parser, resolver, cache, etc.) should be using Effect
- Understand that integration points are where Effect runtime is created

##### Overview

Phase 4 migrates the integration points that interface with browser APIs and user interactions. These files are the boundaries where Effect runtime is created and managed. This is the most critical phase as it connects the Effect-based library code with the browser extension environment.

##### Step 1: Migrate service-worker.ts

**1.1. Analyze current service-worker.ts:**
Key observations:

- Uses neverthrow's `.match()` pattern throughout
- Handles async Chrome runtime messages
- Manages cache initialization on startup
- Pre-caches data based on tab updates
- All async operations use ResultAsync

**1.2. Create idiomatic Effect version with proper runtime and service composition:**

```typescript
// src/background/service-worker-effect.ts
import { Effect, Layer, Runtime, Schema, Match, pipe } from 'effect';
import { parseInput } from '../shared/parser.js';
import { ResolverService, ResolverServiceLive } from '../shared/resolver.js';
import { DidHandleCacheService, DidHandleCacheServiceLive } from '../shared/cache.js';
import { DebugService, AppLayer } from '../shared/services.js';
import type { SWMessage } from '../shared/types.js';

// Schema for service worker messages
const SWMessageSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal('UPDATE_CACHE'),
    did: Schema.String,
    handle: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal('GET_HANDLE'),
    did: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal('GET_DID'),
    handle: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal('CLEAR_CACHE'),
  }),
  Schema.Struct({
    type: Schema.Literal('DEBUG_LOG'),
    message: Schema.String,
  }),
);

// Application layer with all dependencies
const ServiceWorkerLayer = Layer.mergeAll(AppLayer, ResolverServiceLive, DidHandleCacheServiceLive());

// Create runtime with proper layer provision
const runtime = Runtime.make(ServiceWorkerLayer);

// Background resolution service
const BackgroundResolverService = Effect.gen(function* () {
  const resolver = yield* ResolverService;
  const cache = yield* DidHandleCacheService;
  const debug = yield* DebugService;

  return {
    resolveAndCache: (did: string, handle?: string) =>
      Effect.gen(function* () {
        if (handle) {
          // We have both - just cache them
          yield* cache.set(did, handle);
          return { did, handle, fromCache: false };
        }

        // Check cache first
        const cachedHandle = yield* cache.get(did);
        if (cachedHandle) {
          return { did, handle: cachedHandle, fromCache: true };
        }

        // Resolve and cache
        const resolvedHandle = yield* resolver.resolveDidToHandle(did);
        if (resolvedHandle) {
          yield* cache.set(did, resolvedHandle);
          return { did, handle: resolvedHandle, fromCache: false };
        }

        return { did, handle: null, fromCache: false };
      }),

    resolveHandleAndCache: (handle: string, did?: string) =>
      Effect.gen(function* () {
        if (did) {
          // We have both - just cache them
          yield* cache.set(did, handle);
          return { did, handle, fromCache: false };
        }

        // Check cache first
        const cachedDid = yield* cache.getReverse(handle);
        if (cachedDid) {
          return { did: cachedDid, handle, fromCache: true };
        }

        // Resolve and cache
        const resolvedDid = yield* resolver.resolveHandleToDid(handle);
        if (resolvedDid) {
          yield* cache.set(resolvedDid, handle);
          return { did: resolvedDid, handle, fromCache: false };
        }

        return { did: null, handle, fromCache: false };
      }),
  };
});

// Initialize service worker
const initializeServiceWorker = Effect.gen(function* () {
  const debug = yield* DebugService;
  const cache = yield* DidHandleCacheService;

  yield* debug.log('SERVICE_WORKER', 'Initializing service worker');

  // Load cache on startup
  yield* cache.load;

  // Set up periodic cache maintenance
  yield* Effect.fork(
    Effect.repeat(
      pipe(
        cache.evictExpired,
        Effect.flatMap((evicted) => debug.log('SERVICE_WORKER', 'Cache maintenance completed', { evicted })),
      ),
      Schedule.spaced(Duration.hours(1)),
    ),
  );

  yield* debug.log('SERVICE_WORKER', 'Service worker initialized successfully');
});

// Message handler using Effect patterns
const handleMessage = (
  request: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean => {
  const effect = Effect.gen(function* () {
    const debug = yield* DebugService;
    const cache = yield* DidHandleCacheService;
    const backgroundResolver = yield* BackgroundResolverService;

    // Validate and parse message
    const message = yield* Schema.decodeUnknown(SWMessageSchema)(request).pipe(
      Effect.mapError(() => new Error('Invalid message format')),
    );

    yield* debug.log('SERVICE_WORKER', 'Processing message', { type: message.type, sender: sender.id });

    return yield* pipe(
      message,
      Match.value,
      Match.when({ type: 'UPDATE_CACHE' }, (msg) =>
        Effect.gen(function* () {
          yield* cache.set(msg.did, msg.handle);
          return { success: true };
        }),
      ),
      Match.when({ type: 'GET_HANDLE' }, (msg) =>
        Effect.gen(function* () {
          const result = yield* backgroundResolver.resolveAndCache(msg.did);
          return {
            handle: result.handle,
            fromCache: result.fromCache,
          };
        }),
      ),
      Match.when({ type: 'GET_DID' }, (msg) =>
        Effect.gen(function* () {
          const result = yield* backgroundResolver.resolveHandleAndCache(msg.handle);
          return {
            did: result.did,
            fromCache: result.fromCache,
          };
        }),
      ),
      Match.when({ type: 'CLEAR_CACHE' }, () =>
        Effect.gen(function* () {
          yield* cache.clear;
          return { success: true };
        }),
      ),
      Match.when({ type: 'DEBUG_LOG' }, (msg) =>
        Effect.gen(function* () {
          yield* debug.log('POPUP', msg.message);
          return { success: true };
        }),
      ),
      Match.exhaustive,
    );
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const debug = yield* DebugService;
        yield* debug.error('SERVICE_WORKER', 'Message handler error', { error, request });
        return { success: false, error: String(error) };
      }),
    ),
  );

  // Run the effect and send response
  Runtime.runPromise(runtime)(effect).then(sendResponse);

  return true; // Indicates async response
};

// Tab update handler for proactive caching
const handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  const effect = Effect.gen(function* () {
    const debug = yield* DebugService;
    const backgroundResolver = yield* BackgroundResolverService;

    // Parse the URL to see if it contains identifiers
    const parsed = yield* parseInput(tab.url).pipe(Effect.catchAll(() => Effect.succeed(null)));

    if (!parsed) {
      return;
    }

    yield* debug.log('SERVICE_WORKER', 'Proactively resolving from tab URL', {
      tabId,
      url: tab.url,
      parsed,
    });

    // Handle different cases based on what we found
    return yield* pipe(
      parsed,
      Match.value,
      Match.when(
        (p) => 'did' in p && 'handle' in p,
        (p) => backgroundResolver.resolveAndCache(p.did, p.handle),
      ),
      Match.when(
        (p) => 'did' in p && !('handle' in p),
        (p) => backgroundResolver.resolveAndCache(p.did),
      ),
      Match.when(
        (p) => 'handle' in p && !('did' in p),
        (p) => backgroundResolver.resolveHandleAndCache(p.handle),
      ),
      Match.orElse(() => Effect.void),
    );
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const debug = yield* DebugService;
        yield* debug.error('SERVICE_WORKER', 'Tab update handler error', { error, tabId, url: tab.url });
      }),
    ),
  );

  // Fire and forget
  Runtime.runFork(runtime)(effect);
};

// Set up event listeners
Effect.runSync(runtime)(
  Effect.gen(function* () {
    yield* initializeServiceWorker;

    // Register Chrome API event listeners
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    const debug = yield* DebugService;
    yield* debug.log('SERVICE_WORKER', 'Event listeners registered');
  }),
);
```

**1.3. Key changes in the migration:**

- Create a single `Runtime.defaultRuntime` for the service worker
- Replace `.match()` with `Effect.match()` inside pipe
- Use `Effect.gen` for complex async flows
- Use `Runtime.runPromise(runtime)` at the boundary with Chrome APIs
- Handle errors with `Effect.catchAll`
- Convert void promises with `Effect.void`

**1.4. Replace and update imports:**

```bash
rm src/background/service-worker.ts
mv src/background/service-worker-effect.ts src/background/service-worker.ts
```

**1.5. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
bun run build:dev
# Load extension in browser and test message handling
git add -A
git commit -m "Phase 4.1: Migrate service-worker to Effect runtime"
```

##### Step 2: Migrate popup.ts

**2.1. Analyze current popup.ts:**
The popup file is large and handles:

- Firefox theme integration
- Service worker communication
- UI updates
- Debug utilities
- Tab query and URL transformation

**2.2. Create partial Effect migration for key async operations:**

Since popup.ts is complex, we'll focus on migrating the async operations that use neverthrow:

```typescript
// In src/popup/popup.ts, update the transform function:
import { Effect, pipe, Runtime } from 'effect';

const runtime = Runtime.defaultRuntime;

async function transform(inputUrl?: string): Promise<void> {
  return pipe(
    Effect.gen(function* () {
      const inputEl = getElement('input') as HTMLInputElement;
      const destEl = getElement('dest');
      const errorEl = getElement('error');
      const strictIndicator = getElement('strict-indicator');

      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      strictIndicator.classList.add('hidden');

      let currentUrl = inputUrl;
      if (!currentUrl) {
        const tabs = yield* Effect.tryPromise({
          try: () => chrome.tabs.query({ active: true, currentWindow: true }),
          catch: () => new Error('Failed to query tabs'),
        });

        currentUrl = tabs[0]?.url;
        if (currentUrl) {
          inputEl.value = currentUrl;
        }
      }

      const input = currentUrl || inputEl.value.trim();
      Debug.popup('Transform input:', input);

      if (!input) {
        destEl.innerHTML = '<p>Enter a Bluesky-compatible URL, handle, or DID above</p>';
        return;
      }

      const parsed = yield* parseInput(input);
      Debug.parsing('Parsed input:', parsed);

      if ('handle' in parsed || 'did' in parsed) {
        // Normalize the info
        const normalized = yield* pipe(
          Effect.succeed(parsed),
          Effect.flatMap((p) => {
            if ('url' in p || 'at-uri' in p) {
              return canonicalize(p);
            }
            return Effect.succeed(p);
          }),
        );

        // Resolve handle/DID if needed
        const resolved = yield* resolveIdentity(normalized);

        // Build destinations
        const destinations = buildDestinations(resolved, options.showEmojis, options.strictMode);
        const isStrictFiltered = options.strictMode && hasStrictFiltering(resolved);

        // Update UI
        updatePopupUI(destinations, isStrictFiltered);
      }
    }),
    Effect.catchAll((error) => {
      console.error('Transform error:', error);
      const errorEl = getElement('error');
      errorEl.textContent = getErrorMessage(error);
      errorEl.classList.remove('hidden');

      const destEl = getElement('dest');
      destEl.innerHTML = '';

      return Effect.void;
    }),
    Runtime.runPromise(runtime),
  );
}

// Update resolveIdentity to use Effect
async function resolveIdentity(info: TransformInfo): Effect.Effect<TransformInfo, WormholeEffectError> {
  return Effect.gen(function* () {
    const swResult = yield* sendMessageToServiceWorker(info);

    if (swResult.did && swResult.handle) {
      return { did: swResult.did, handle: swResult.handle, ...info };
    }

    // Fallback to direct resolution if SW didn't provide complete data
    if (info.did && !info.handle) {
      const handle = yield* pipe(
        resolveDidToHandle(info.did),
        Effect.map((h) => h || undefined),
      );
      return { ...info, handle };
    }

    if (info.handle && !info.did) {
      const did = yield* resolveHandleToDid(info.handle);
      return { ...info, did };
    }

    return info;
  });
}

// Convert sendMessageToServiceWorker to Effect
function sendMessageToServiceWorker(
  info: TransformInfo,
): Effect.Effect<{ did?: string; handle?: string; fromCache?: boolean }, never> {
  return Effect.tryPromise({
    try: async () => {
      if (info.did && !info.handle) {
        return chrome.runtime.sendMessage({ type: 'GET_HANDLE', did: info.did });
      } else if (info.handle && !info.did) {
        return chrome.runtime.sendMessage({ type: 'GET_DID', handle: info.handle });
      }
      return {};
    },
    catch: () => ({}), // Return empty object on error
  });
}
```

**2.3. Key considerations for popup migration:**

- Keep non-async code unchanged to minimize risk
- Focus on converting async operations that use ResultAsync
- Create runtime at module level for reuse
- Handle UI updates outside of Effect pipeline
- Maintain existing error handling behavior

**2.4. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
bun run build:dev
# Test popup functionality in browser
git add -A
git commit -m "Phase 4.2: Migrate popup async operations to Effect"
```

##### Step 3: Migrate options.ts

**3.1. Analyze current options.ts:**
Options.ts has simple async operations:

- Loading options from chrome.storage.sync
- Saving options to chrome.storage.sync
- No neverthrow usage, just try-catch

**3.2. Create Effect version:**

```typescript
// src/options/options-effect.ts
import { Effect, pipe } from 'effect';

interface OptionsData {
  showEmojis: boolean;
  strictMode: boolean;
}

const DEFAULT_OPTIONS: OptionsData = {
  showEmojis: true,
  strictMode: false,
};

const STORAGE_KEY = 'wormhole-options';

function loadOptions(): Effect.Effect<OptionsData, never> {
  return pipe(
    Effect.tryPromise({
      try: () => chrome.storage.sync.get(STORAGE_KEY),
      catch: (error) => {
        console.warn('Failed to load options:', error);
        return { [STORAGE_KEY]: null };
      },
    }),
    Effect.map((result) => {
      const data: unknown = result[STORAGE_KEY];

      if (data && typeof data === 'object') {
        const options = data as Record<string, unknown>;
        return {
          showEmojis: typeof options.showEmojis === 'boolean' ? options.showEmojis : DEFAULT_OPTIONS.showEmojis,
          strictMode: typeof options.strictMode === 'boolean' ? options.strictMode : DEFAULT_OPTIONS.strictMode,
        };
      }

      return DEFAULT_OPTIONS;
    }),
  );
}

function saveOptions(options: OptionsData): Effect.Effect<void, never> {
  return pipe(
    Effect.tryPromise({
      try: () => chrome.storage.sync.set({ [STORAGE_KEY]: options }),
      catch: (error) => {
        console.error('Failed to save options:', error);
        // Don't fail the effect, just log
      },
    }),
    Effect.asVoid,
  );
}

async function initializeOptions(): Promise<void> {
  const showEmojisCheckbox = document.getElementById('showEmojis') as HTMLInputElement | null;
  const strictModeCheckbox = document.getElementById('strictMode') as HTMLInputElement | null;

  if (!showEmojisCheckbox || !strictModeCheckbox) {
    console.error('Required checkboxes not found');
    return;
  }

  const options = await Effect.runPromise(loadOptions());
  showEmojisCheckbox.checked = options.showEmojis;
  strictModeCheckbox.checked = options.strictMode;

  const updateOptions = () => {
    const newOptions: OptionsData = {
      showEmojis: showEmojisCheckbox.checked,
      strictMode: strictModeCheckbox.checked,
    };
    void Effect.runPromise(saveOptions(newOptions));
  };

  showEmojisCheckbox.addEventListener('change', updateOptions);
  strictModeCheckbox.addEventListener('change', updateOptions);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initializeOptions();
  });
} else {
  void initializeOptions();
}
```

**3.3. Replace and update:**

```bash
rm src/options/options.ts
mv src/options/options-effect.ts src/options/options.ts
```

**3.4. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
bun run build:dev
git add -A
git commit -m "Phase 4.3: Migrate options to Effect"
```

##### Step 4: Update debug.ts

**4.1. Analyze current debug.ts:**
The debug module:

- Uses neverthrow's `isWormholeError` type guard
- Handles error logging with context
- Manages debug configuration

**4.2. Update for Effect errors:**

```typescript
// src/shared/debug-effect.ts
import type { DebugConfig } from './types-effect.js';
import type { WormholeEffectError } from './errors-effect.js';

// Helper to check if error is WormholeEffectError
function isWormholeEffectError(error: unknown): error is WormholeEffectError {
  return (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    ['NetworkError', 'ParseError', 'ValidationError', 'CacheError'].includes((error as any)._tag)
  );
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class Debug {
  // ... existing implementation remains mostly the same ...
}

/**
 * Debug log utility function that integrates with the Debug class
 */
export const debugLog = (category: string, level: string, ...args: unknown[]): void => {
  const categoryKey = category.toLowerCase() as keyof DebugConfig;
  if (Debug.getConfig()[categoryKey]) {
    console.log(`🔍 [${category}] ${level}:`, ...args);
  }
};

/**
 * Centralized error logging function that handles both WormholeEffectError and unknown errors
 * Updated to work with Effect's error types
 */
export const logError = (category: string, error: unknown, context?: Record<string, unknown>): void => {
  const errorInfo =
    isWormholeEffectError(error) ?
      {
        type: error._tag,
        message: error.message,
        ...error,
      }
    : { raw: String(error) };

  console.error(`❌ [${category}]`, errorInfo, context);

  if (import.meta.env.DEV) {
    debugLog(category, 'ERROR', errorInfo, context);
  }
};
```

**4.3. Update imports in files using debug:**

```bash
# Update imports in all files using debug
grep -r "from './debug" src/ --include="*.ts"
```

**4.4. Validation and commit:**

```bash
bun run format
bun run lint
bun run typecheck
bun run build:dev
git add -A
git commit -m "Phase 4.4: Update debug module for Effect errors"
```

##### Step 5: Update shared/options.ts (the shared module)

**5.1. Check if shared/options.ts uses neverthrow:**

```bash
cat src/shared/options.ts
```

**5.2. If it uses ResultAsync, convert to Effect:**

```typescript
// src/shared/options-effect.ts
import { Effect } from 'effect';

export interface Options {
  showEmojis: boolean;
  strictMode: boolean;
}

const DEFAULT_OPTIONS: Options = {
  showEmojis: true,
  strictMode: false,
};

const STORAGE_KEY = 'wormhole-options';

export function loadOptions(): Effect.Effect<Options, never> {
  return Effect.tryPromise({
    try: async () => {
      const result = await chrome.storage.sync.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];

      if (stored && typeof stored === 'object') {
        return {
          showEmojis: stored.showEmojis ?? DEFAULT_OPTIONS.showEmojis,
          strictMode: stored.strictMode ?? DEFAULT_OPTIONS.strictMode,
        };
      }

      return DEFAULT_OPTIONS;
    },
    catch: () => DEFAULT_OPTIONS, // Always return defaults on error
  });
}
```

##### Step 6: Update MIGRATION_STATUS.md

```markdown
## Phase 4: Integration Points ✅

- [x] service-worker.ts - Created Effect runtime for message handling
- [x] popup.ts - Migrated async operations to Effect
- [x] options.ts - Converted storage operations to Effect
- [x] debug.ts - Updated for Effect error types
```

##### Step 7: Final Phase 4 Validation

**7.1. Run full validation suite:**

```bash
bun run format
bun run lint
bun run typecheck
gtimeout 10 bun run test
bun run build:dev
bun run build:chrome
bun run build:firefox
```

**7.2. Extension functionality testing:**
Critical tests to perform manually:

1. Load extension in Chrome and Firefox
2. Test popup opens and transforms URLs correctly
3. Verify cache persistence across browser restarts
4. Test options page saves and loads settings
5. Check debug logging works in developer console
6. Verify service worker handles messages correctly
7. Test error handling with invalid inputs

**7.3. Performance validation:**

- Check popup response time
- Verify no memory leaks in service worker
- Monitor console for unexpected errors
- Test with slow network conditions

##### Troubleshooting Guide

**Issue**: "chrome is not defined" in tests

- **Solution**: Mock chrome APIs or skip integration tests that require browser environment

**Issue**: Service worker doesn't respond to messages

- **Solution**: Check that Runtime.runPromise is called and promises are handled

**Issue**: Effect runtime errors in console

- **Solution**: Ensure all Effects are run with Runtime.runPromise at boundaries

**Issue**: TypeScript errors about Effect vs ResultAsync

- **Solution**: Verify all imports are updated to Effect versions

##### Common Patterns for Integration Points

**Pattern 1: Creating Effect runtime**

```typescript
// Create once at module level
const runtime = Runtime.defaultRuntime;

// Use throughout the module
Runtime.runPromise(runtime)(effect);
```

**Pattern 2: Chrome API integration**

```typescript
// Wrap Chrome APIs that use callbacks
function chromeApiToEffect<T>(fn: (callback: (result: T) => void) => void): Effect.Effect<T, Error> {
  return Effect.async((resume) => {
    fn((result) => resume(Effect.succeed(result)));
  });
}
```

**Pattern 3: Message passing with Effect**

```typescript
// Send message and handle response
pipe(
  Effect.tryPromise({
    try: () => chrome.runtime.sendMessage(message),
    catch: (e) => new Error(`Message failed: ${e}`),
  }),
  Effect.flatMap(processResponse),
  Runtime.runPromise(runtime),
);
```

**Pattern 4: UI updates from Effect**

```typescript
// Keep UI updates outside Effect pipeline
pipe(
  effectOperation,
  Effect.match({
    onSuccess: (data) => updateUI(data),
    onFailure: (error) => showError(error),
  }),
  Runtime.runPromise(runtime),
);
```

##### Key Architectural Decisions

1. **Runtime Creation**: Create Effect runtime at module boundaries, not in library code
2. **Error Boundaries**: Use Effect.catchAll to prevent errors from breaking the extension
3. **UI Separation**: Keep DOM manipulation outside of Effect pipelines
4. **Message Handling**: Convert Chrome's callback-based APIs to Effect at the boundary
5. **Debug Integration**: Maintain existing debug patterns while supporting Effect errors

##### Integration Testing Checklist

Before considering Phase 4 complete:

- [ ] Extension loads without errors in Chrome
- [ ] Extension loads without errors in Firefox
- [ ] Popup transforms URLs correctly
- [ ] Service worker handles all message types
- [ ] Cache persists across browser restarts
- [ ] Options save and load correctly
- [ ] Debug logging works as expected
- [ ] No console errors during normal operation
- [ ] Performance is comparable to neverthrow version

##### Next Steps

Once Phase 4 is complete with all integration points migrated, proceed to Phase 5 for testing, cleanup, and final validation. This final phase will remove neverthrow completely and ensure the migration is successful.

### Phase 5: Testing and Cleanup

1. **Update all tests** - Convert test assertions for Effect types
2. **Remove neverthrow** - Uninstall package and remove from package.json
3. **Verify bundle size** - Ensure Effect doesn't bloat the extension too much
4. **Performance testing** - Confirm no regression in extension responsiveness

#### Phase 5 Detailed Implementation Instructions

##### Prerequisites

- Phases 1, 2, 3, and 4 MUST be complete with all validation passing
- You should be on the `effect-migration` branch
- The extension should be fully functional with Effect
- All modules should be migrated to use Effect instead of neverthrow

##### Overview

Phase 5 is the final cleanup phase where we remove neverthrow completely, update all tests to use Effect patterns, and ensure the migration hasn't negatively impacted performance or bundle size. This phase ensures the migration is production-ready.

##### Step 1: Update Test Files

**1.1. Identify all test files:**

```bash
find tests/ -name "*.test.ts" -type f
find src/ -name "*.test.ts" -type f
```

**1.2. Read existing tests to understand patterns:**

```bash
cat tests/cache.test.ts
cat tests/transform.test.ts
```

**1.3. Update test imports and patterns:**

For each test file, you'll need to update:

- Import statements from neverthrow to Effect
- Test assertions to work with Effect types
- Mock implementations to return Effect types

Example transformation for a typical test file:

```typescript
// Before (neverthrow version):
import { describe, expect, it } from 'bun:test';
import { parseInput } from '../src/shared/parser';

describe('parseInput', () => {
  it('should parse a valid handle', () => {
    const result = parseInput('alice.bsky.social');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      type: 'handle',
      handle: 'alice.bsky.social',
    });
  });

  it('should return error for invalid input', () => {
    const result = parseInput('');
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe('parse');
  });
});

// After (Effect version):
import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { parseInput } from '../src/shared/parser';

describe('parseInput', () => {
  it('should parse a valid handle', () => {
    const result = Effect.runSync(parseInput('alice.bsky.social'));
    expect(result._tag).toBe('Success');
    if (result._tag === 'Success') {
      expect(result.value).toEqual({
        type: 'handle',
        handle: 'alice.bsky.social',
      });
    }
  });

  it('should return error for invalid input', () => {
    const result = Effect.runSync(parseInput(''));
    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure') {
      expect(result.cause._tag).toBe('ParseError');
    }
  });
});
```

**1.4. Create idiomatic Effect test utilities with TestEnvironment:**

Create a new file `tests/effect-test-utils.ts`:

```typescript
// tests/effect-test-utils.ts
import { Effect, Exit, Layer, TestEnvironment, Ref, Context, Schema } from 'effect';
import type { WormholeError } from '../src/shared/errors-effect.js';
import { HttpService, CacheService, DebugService } from '../src/shared/services.js';

/**
 * Test-specific implementations of services
 */

// Mock HTTP service for testing
export const TestHttpService = Layer.succeed(
  HttpService,
  HttpService.of({
    fetch: (url: string, options?: RequestInit) => Effect.succeed(new Response('{}', { status: 200 })),

    fetchJson: <T>(url: string, schema: Schema.Schema<T>) =>
      Effect.gen(function* () {
        // Default successful response - can be overridden in tests
        const mockData = { did: 'did:plc:test123' };
        return yield* Schema.decodeUnknown(schema)(mockData);
      }),
  }),
);

// Mock cache service using Ref for in-memory storage
export const TestCacheService = Layer.effect(
  CacheService,
  Effect.gen(function* () {
    const storage = yield* Ref.make(new Map<string, unknown>());

    return CacheService.of({
      get: <T>(key: string, schema: Schema.Schema<T>) =>
        Effect.gen(function* () {
          const store = yield* Ref.get(storage);
          const data = store.get(key);

          if (data == null) {
            return null;
          }

          return yield* Schema.decodeUnknown(schema)(data).pipe(Effect.catchAll(() => Effect.succeed(null)));
        }),

      set: <T>(key: string, value: T) =>
        Effect.flatMap(Ref.get(storage), (store) => {
          store.set(key, value);
          return Effect.void;
        }),

      remove: (key: string) =>
        Effect.flatMap(Ref.get(storage), (store) => {
          store.delete(key);
          return Effect.void;
        }),
    });
  }),
);

// Silent debug service for tests
export const TestDebugService = Layer.succeed(
  DebugService,
  DebugService.of({
    log: () => Effect.void,
    error: () => Effect.void,
  }),
);

// Complete test layer
export const TestLayer = Layer.mergeAll(TestHttpService, TestCacheService, TestDebugService);

/**
 * Test utilities
 */

// Run Effect with test environment
export const runTestEffect = <A, E>(effect: Effect.Effect<A, E>, layer: Layer.Layer = TestLayer): Exit.Exit<A, E> => {
  return Effect.provide(effect, layer).pipe(Effect.runSyncExit);
};

// Assert Effect success with proper typing
export const expectSuccess = <A, E>(effect: Effect.Effect<A, E>, expected: A, layer: Layer.Layer = TestLayer): void => {
  const result = runTestEffect(effect, layer);

  if (Exit.isSuccess(result)) {
    expect(result.value).toEqual(expected);
  } else {
    throw new Error(`Expected success but got failure: ${result.cause}`);
  }
};

// Assert Effect failure with specific error
export const expectFailure = <A, E extends WormholeError>(
  effect: Effect.Effect<A, E>,
  errorTag: E['_tag'],
  layer: Layer.Layer = TestLayer,
): void => {
  const result = runTestEffect(effect, layer);

  if (Exit.isFailure(result)) {
    expect(result.cause._tag).toBe(errorTag);
  } else {
    throw new Error(`Expected failure with ${errorTag} but got success: ${result.value}`);
  }
};

// Create mock HTTP service with custom responses
export const createMockHttpService = (responses: Record<string, unknown>) =>
  Layer.succeed(
    HttpService,
    HttpService.of({
      fetch: (url: string) => {
        const data = responses[url];
        if (data === undefined) {
          return Effect.fail(new Error(`No mock response for ${url}`));
        }
        return Effect.succeed(new Response(JSON.stringify(data), { status: 200 }));
      },

      fetchJson: <T>(url: string, schema: Schema.Schema<T>) =>
        Effect.gen(function* () {
          const data = responses[url];
          if (data === undefined) {
            return yield* Effect.fail(new Error(`No mock response for ${url}`));
          }
          return yield* Schema.decodeUnknown(schema)(data);
        }),
    }),
  );

// Performance testing utilities
export const measureEffect = <A, E>(
  effect: Effect.Effect<A, E>,
  layer: Layer.Layer = TestLayer,
): { result: Exit.Exit<A, E>; duration: number } => {
  const start = performance.now();
  const result = runTestEffect(effect, layer);
  const duration = performance.now() - start;

  return { result, duration };
};

// Concurrent testing utilities
export const runConcurrentEffects = <A, E>(
  effects: Array<Effect.Effect<A, E>>,
  layer: Layer.Layer = TestLayer,
): Array<Exit.Exit<A, E>> => {
  const concurrentEffect = Effect.all(effects, { concurrency: 'unbounded' });
  const result = runTestEffect(concurrentEffect, layer);

  if (Exit.isSuccess(result)) {
    return result.value.map(Effect.exitSucceed);
  } else {
    return [result];
  }
};

// Property-based testing helpers
export const generateTestData = {
  validDid: () => `did:plc:${Math.random().toString(36).substring(2)}`,
  validHandle: () => `user${Math.random().toString(36).substring(2)}.bsky.social`,
  invalidDid: () => `invalid-did-${Math.random()}`,
  invalidHandle: () => `invalid.handle.${Math.random()}`,
  validUrl: () => `https://bsky.app/profile/user${Math.random().toString(36).substring(2)}.bsky.social`,
};
```

**1.5. Update each test file systematically:**

For `tests/cache.test.ts` with proper Effect testing patterns:

```typescript
// tests/cache.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { Effect, Layer } from 'effect';
import { DidHandleCacheService, DidHandleCacheServiceLive } from '../src/shared/cache.js';
import { expectSuccess, expectFailure, TestLayer, runTestEffect, generateTestData } from './effect-test-utils.js';

// Test layer with cache service
const CacheTestLayer = Layer.provide(DidHandleCacheServiceLive(), TestLayer);

describe('DidHandleCacheService', () => {
  describe('basic operations', () => {
    it('should start with empty cache', () => {
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;
        const stats = yield* cache.stats;
        return stats.size;
      });

      expectSuccess(effect, 0, CacheTestLayer);
    });

    it('should set and get DID-handle pairs', () => {
      const did = generateTestData.validDid();
      const handle = generateTestData.validHandle();

      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;

        // Set the pair
        yield* cache.set(did, handle);

        // Get both directions
        const retrievedHandle = yield* cache.get(did);
        const retrievedDid = yield* cache.getReverse(handle);

        return { retrievedHandle, retrievedDid };
      });

      expectSuccess(
        effect,
        {
          retrievedHandle: handle,
          retrievedDid: did,
        },
        CacheTestLayer,
      );
    });

    it('should return null for non-existent entries', () => {
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;
        const result = yield* cache.get('did:plc:nonexistent');
        return result;
      });

      expectSuccess(effect, null, CacheTestLayer);
    });

    it('should validate DID format', () => {
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;
        yield* cache.set('invalid-did', 'valid.handle.com');
      });

      expectFailure(effect, 'ValidationError', CacheTestLayer);
    });

    it('should validate handle format', () => {
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;
        yield* cache.set('did:plc:valid123', 'invalid-handle');
      });

      expectFailure(effect, 'ValidationError', CacheTestLayer);
    });
  });

  describe('persistence', () => {
    it('should persist and load cache data', () => {
      const did = generateTestData.validDid();
      const handle = generateTestData.validHandle();

      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;

        // Set and persist
        yield* cache.set(did, handle);
        yield* cache.persist;

        // Clear memory cache
        yield* cache.clear;

        // Load from storage
        yield* cache.load;

        // Should retrieve the data
        const retrievedHandle = yield* cache.get(did);
        return retrievedHandle;
      });

      expectSuccess(effect, handle, CacheTestLayer);
    });

    it('should handle corrupted cache data gracefully', () => {
      // This would test schema validation during load
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;

        // Simulate loading corrupted data
        // (In real implementation, this would involve mocking storage with bad data)
        yield* cache.load;

        const stats = yield* cache.stats;
        return stats.size;
      });

      expectSuccess(effect, 0, CacheTestLayer);
    });
  });

  describe('eviction and TTL', () => {
    it('should evict expired entries', () => {
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;

        // This test would need to manipulate time or use a cache with very short TTL
        const evicted = yield* cache.evictExpired;
        return evicted;
      });

      expectSuccess(effect, 0, CacheTestLayer); // No expired entries initially
    });

    it('should provide accurate statistics', () => {
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;

        // Add some entries
        yield* cache.set(generateTestData.validDid(), generateTestData.validHandle());
        yield* cache.set(generateTestData.validDid(), generateTestData.validHandle());

        const stats = yield* cache.stats;
        return stats.size;
      });

      expectSuccess(effect, 2, CacheTestLayer);
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent operations safely', () => {
      const effect = Effect.gen(function* () {
        const cache = yield* DidHandleCacheService;

        // Create multiple concurrent set operations
        const operations = Array.from({ length: 10 }, (_, i) =>
          cache.set(generateTestData.validDid(), generateTestData.validHandle()),
        );

        yield* Effect.all(operations, { concurrency: 'unbounded' });

        const stats = yield* cache.stats;
        return stats.size;
      });

      expectSuccess(effect, 10, CacheTestLayer);
    });
  });
});
```

For `tests/transform.test.ts` with comprehensive Effect testing:

```typescript
// tests/transform.test.ts
import { describe, it } from 'bun:test';
import { Effect, pipe } from 'effect';
import { parseInput } from '../src/shared/parser.js';
import { canonicalize } from '../src/shared/canonicalizer.js';
import { expectSuccess, expectFailure, TestLayer, generateTestData, measureEffect } from './effect-test-utils.js';

describe('URL transformation pipeline', () => {
  describe('parseInput with schema validation', () => {
    it('should parse valid handles', () => {
      const testCases = ['alice.bsky.social', '@alice.bsky.social', 'user.example.com', 'test123.domain.co.uk'];

      testCases.forEach((input) => {
        const effect = parseInput(input);
        const { result } = measureEffect(effect, TestLayer);

        if (Exit.isSuccess(result)) {
          expect(result.value.type).toBe('handle');
          expect(result.value.handle).toBe(input.replace(/^@/, ''));
        } else {
          throw new Error(`Failed to parse valid handle: ${input}`);
        }
      });
    });

    it('should parse valid DIDs', () => {
      const testCases = ['did:plc:abc123def456', 'did:web:example.com', 'did:web:example.com:path:to:identity'];

      testCases.forEach((did) => {
        expectSuccess(
          parseInput(did),
          {
            type: 'did',
            did,
          },
          TestLayer,
        );
      });
    });

    it('should parse AT URIs with proper structure', () => {
      const effect = parseInput('at://alice.bsky.social/app.bsky.feed.post/abc123');

      const result = runTestEffect(effect, TestLayer);
      if (Exit.isSuccess(result)) {
        expect(result.value).toMatchObject({
          type: 'at-uri',
          authority: 'alice.bsky.social',
          collection: 'app.bsky.feed.post',
          rkey: 'abc123',
        });
      }
    });

    it('should parse URLs and extract service information', () => {
      const testUrls = [
        'https://bsky.app/profile/alice.bsky.social',
        'https://bsky.app/profile/alice.bsky.social/post/abc123',
        'https://staging.bsky.app/profile/did:plc:test123',
      ];

      testUrls.forEach((url) => {
        const effect = parseInput(url);
        const result = runTestEffect(effect, TestLayer);

        if (Exit.isSuccess(result)) {
          expect(result.value.type).toBe('url');
          expect(result.value.url).toBe(url);
        }
      });
    });

    it('should validate and reject malformed inputs', () => {
      const invalidInputs = ['', '   ', 'not-a-valid-input', '123', 'did:invalid', 'at://incomplete', 'https://'];

      invalidInputs.forEach((input) => {
        expectFailure(parseInput(input), 'ParseError', TestLayer);
      });
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = ['did:web:', 'at://', '@', 'https://bsky.app', 'did:plc:'];

      edgeCases.forEach((input) => {
        const effect = parseInput(input);
        const result = runTestEffect(effect, TestLayer);
        expect(Exit.isFailure(result)).toBe(true);
      });
    });
  });

  describe('canonicalize with pattern matching', () => {
    it('should canonicalize handle inputs directly', () => {
      const effect = Effect.gen(function* () {
        const parsed = yield* parseInput('alice.bsky.social');
        const canonicalized = yield* canonicalize(parsed);
        return canonicalized;
      });

      expectSuccess(
        effect,
        {
          handle: 'alice.bsky.social',
        },
        TestLayer,
      );
    });

    it('should canonicalize DID inputs directly', () => {
      const effect = Effect.gen(function* () {
        const parsed = yield* parseInput('did:plc:abc123');
        const canonicalized = yield* canonicalize(parsed);
        return canonicalized;
      });

      expectSuccess(
        effect,
        {
          did: 'did:plc:abc123',
        },
        TestLayer,
      );
    });

    it('should extract structured data from URLs', () => {
      const effect = Effect.gen(function* () {
        const parsed = yield* parseInput('https://bsky.app/profile/alice.bsky.social/post/abc123');
        const canonicalized = yield* canonicalize(parsed);
        return canonicalized;
      });

      // This would depend on the service configuration having proper patterns
      const result = runTestEffect(effect, TestLayer);
      if (Exit.isSuccess(result)) {
        expect(result.value).toHaveProperty('handle');
        // Additional assertions based on URL parsing logic
      }
    });

    it('should handle AT URIs with all components', () => {
      const effect = Effect.gen(function* () {
        const parsed = yield* parseInput('at://alice.bsky.social/app.bsky.feed.post/abc123');
        const canonicalized = yield* canonicalize(parsed);
        return canonicalized;
      });

      const result = runTestEffect(effect, TestLayer);
      if (Exit.isSuccess(result)) {
        expect(result.value).toMatchObject({
          handle: 'alice.bsky.social',
          nsid: 'app.bsky.feed.post',
          rkey: 'abc123',
        });
      }
    });
  });

  describe('end-to-end transformation pipeline', () => {
    it('should transform complete URLs through the pipeline', () => {
      const testUrls = [
        'https://bsky.app/profile/alice.bsky.social/post/abc123',
        'https://staging.bsky.app/profile/bob.test.social',
        'at://carol.bsky.social/app.bsky.feed.like/xyz789',
      ];

      testUrls.forEach((url) => {
        const effect = pipe(
          parseInput(url),
          Effect.flatMap(canonicalize),
          Effect.tap((result) => Effect.log(`Transformed ${url} to`, result)),
        );

        const result = runTestEffect(effect, TestLayer);
        expect(Exit.isSuccess(result)).toBe(true);
      });
    });

    it('should handle transformation errors gracefully', () => {
      const effect = pipe(
        parseInput('https://unknown-service.com/profile/test'),
        Effect.flatMap(canonicalize),
        Effect.catchAll((error) => Effect.succeed({ error: error._tag })),
      );

      const result = runTestEffect(effect, TestLayer);
      if (Exit.isSuccess(result)) {
        expect(result.value).toHaveProperty('error');
      }
    });

    it('should maintain type safety throughout the pipeline', () => {
      // Property-based testing approach
      const inputs = Array.from({ length: 50 }, () => {
        const type = Math.random();
        if (type < 0.25) return generateTestData.validDid();
        if (type < 0.5) return generateTestData.validHandle();
        if (type < 0.75) return generateTestData.validUrl();
        return `at://${generateTestData.validHandle()}/app.bsky.feed.post/test123`;
      });

      inputs.forEach((input) => {
        const effect = pipe(parseInput(input), Effect.flatMap(canonicalize));

        const result = runTestEffect(effect, TestLayer);
        // Should either succeed with valid TransformInfo or fail with known error
        if (Exit.isFailure(result)) {
          expect(['ParseError', 'ValidationError']).toContain(result.cause._tag);
        }
      });
    });
  });

  describe('performance characteristics', () => {
    it('should parse inputs efficiently', () => {
      const inputs = Array.from({ length: 1000 }, () => generateTestData.validHandle());

      const effect = Effect.all(
        inputs.map((input) => parseInput(input)),
        { concurrency: 'unbounded' },
      );

      const { duration } = measureEffect(effect, TestLayer);

      // Should complete 1000 parses in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should canonicalize efficiently', () => {
      const effect = Effect.gen(function* () {
        const inputs = Array.from({ length: 500 }, () => generateTestData.validDid());
        const parsed = yield* Effect.all(inputs.map((input) => parseInput(input)));

        return yield* Effect.all(
          parsed.map((p) => canonicalize(p)),
          { concurrency: 'unbounded' },
        );
      });

      const { duration } = measureEffect(effect, TestLayer);

      // Should complete 500 canonicalizations in under 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});
```

**1.6. Run tests and fix any failures:**

```bash
bun run test
```

**1.7. Update test scripts if needed:**
Check `package.json` to ensure test scripts work with the new test structure.

**1.8. Commit test updates:**

```bash
git add tests/
git add -A
git commit -m "Phase 5.1: Update all tests to use Effect patterns"
```

##### Step 2: Remove neverthrow Dependencies

**2.1. Check for any remaining neverthrow imports:**

```bash
# Search for neverthrow imports
grep -r "neverthrow" src/ --include="*.ts" --include="*.tsx"
grep -r "Result\|ResultAsync" src/ --include="*.ts" --include="*.tsx"
grep -r "_unsafeUnwrap\|isOk\|isErr" src/ --include="*.ts" --include="*.tsx"
```

**2.2. Remove neverthrow from package.json:**

```bash
bun remove neverthrow
bun remove eslint-plugin-neverthrow
```

**2.3. Update ESLint configuration:**
Remove all neverthrow-related rules from `eslint.config.mjs`:

```javascript
// Remove these imports:
// import neverthrowPlugin from 'eslint-plugin-neverthrow';

// Remove neverthrow plugin configuration:
// Remove any rules like 'neverthrow/must-use-result'
```

**2.4. Clean up any migration helpers:**

```bash
# Remove temporary migration files if any exist
rm -f src/shared/effect-utils.ts  # Only if no longer needed
rm -f scripts/migrate-*.ts
```

**2.5. Verify no neverthrow references remain:**

```bash
# This should return no results
grep -r "neverthrow" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.lock"
```

**2.6. Run full validation:**

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build:dev
```

**2.7. Commit neverthrow removal:**

```bash
git add package.json bun.lockb
git add eslint.config.mjs
git add -A
git commit -m "Phase 5.2: Remove neverthrow and all related dependencies"
```

##### Step 3: Bundle Size Analysis

**3.1. Build production bundles:**

```bash
# Clean previous builds
rm -rf dist/

# Build for each platform
bun run build:chrome
mv dist dist-chrome

bun run build:firefox
mv dist dist-firefox
```

**3.2. Measure bundle sizes:**

```bash
# Create a size report
echo "## Bundle Size Report" > BUNDLE_SIZE_REPORT.md
echo "" >> BUNDLE_SIZE_REPORT.md
echo "### Chrome Extension" >> BUNDLE_SIZE_REPORT.md
echo "\`\`\`" >> BUNDLE_SIZE_REPORT.md
du -sh dist-chrome/* | sort -h >> BUNDLE_SIZE_REPORT.md
echo "\`\`\`" >> BUNDLE_SIZE_REPORT.md
echo "" >> BUNDLE_SIZE_REPORT.md
echo "### Firefox Extension" >> BUNDLE_SIZE_REPORT.md
echo "\`\`\`" >> BUNDLE_SIZE_REPORT.md
du -sh dist-firefox/* | sort -h >> BUNDLE_SIZE_REPORT.md
echo "\`\`\`" >> BUNDLE_SIZE_REPORT.md
echo "" >> BUNDLE_SIZE_REPORT.md
echo "### Total Sizes" >> BUNDLE_SIZE_REPORT.md
echo "- Chrome: $(du -sh dist-chrome | cut -f1)" >> BUNDLE_SIZE_REPORT.md
echo "- Firefox: $(du -sh dist-firefox | cut -f1)" >> BUNDLE_SIZE_REPORT.md
```

**3.3. Analyze JavaScript bundle sizes:**

```bash
# Find all JS files and report sizes
echo "" >> BUNDLE_SIZE_REPORT.md
echo "### JavaScript Files" >> BUNDLE_SIZE_REPORT.md
echo "\`\`\`" >> BUNDLE_SIZE_REPORT.md
find dist-chrome -name "*.js" -exec ls -lh {} \; | awk '{print $5, $9}' >> BUNDLE_SIZE_REPORT.md
echo "\`\`\`" >> BUNDLE_SIZE_REPORT.md
```

**3.4. Compare with pre-migration size (if available):**
If you have the bundle sizes from before the migration, compare them. A reasonable increase would be:

- Less than 50KB for the Effect runtime
- No more than 20% total bundle size increase

**3.5. Optimize if needed:**
If bundle size increased significantly:

a) Check if tree-shaking is working:

```typescript
// vite.config.ts - ensure these optimizations are enabled
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'effect-runtime': ['effect'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

b) Use Effect's production build:

```typescript
// Ensure you're not importing development-only features
// Use specific imports instead of barrel imports
import { Effect, pipe } from 'effect'; // Good
// import * as Effect from 'effect';     // Bad - imports everything
```

**3.6. Document findings:**

```bash
git add BUNDLE_SIZE_REPORT.md
git commit -m "Phase 5.3: Analyze and document bundle sizes"
```

##### Step 4: Performance Testing

**4.1. Create performance test scenarios:**

Create `tests/performance.test.ts`:

```typescript
// tests/performance.test.ts
import { describe, it, expect } from 'bun:test';
import { Effect } from 'effect';
import { parseInput } from '../src/shared/parser';
import { resolveHandleToDid, resolveDidToHandle } from '../src/shared/resolver';
import { DidHandleCache } from '../src/shared/cache';

describe('Performance benchmarks', () => {
  describe('Synchronous operations', () => {
    it('should parse 1000 URLs quickly', () => {
      const testUrls = [
        'https://bsky.app/profile/alice.bsky.social',
        'alice.bsky.social',
        'did:plc:abc123',
        'at://alice.bsky.social/app.bsky.feed.post/123',
      ];

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const url = testUrls[i % testUrls.length];
        Effect.runSync(parseInput(url));
      }

      const duration = performance.now() - start;
      console.log(`Parsed 1000 URLs in ${duration.toFixed(2)}ms`);

      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Cache operations', () => {
    it('should handle 1000 cache operations quickly', async () => {
      const cache = new DidHandleCache();
      await Effect.runPromise(cache.load());

      const start = performance.now();

      // Write 500 entries
      for (let i = 0; i < 500; i++) {
        await Effect.runPromise(cache.set(`did:plc:test${i}`, `user${i}.bsky.social`));
      }

      // Read 500 entries
      for (let i = 0; i < 500; i++) {
        cache.getHandle(`did:plc:test${i}`);
      }

      const duration = performance.now() - start;
      console.log(`Completed 1000 cache operations in ${duration.toFixed(2)}ms`);

      // Should complete in under 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Memory usage', () => {
    it('should not leak memory during repeated operations', async () => {
      if (global.gc) {
        global.gc(); // Force garbage collection if available
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        const effect = parseInput(`user${i}.bsky.social`);
        Effect.runSync(effect);
      }

      if (global.gc) {
        global.gc(); // Force garbage collection
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);

      // Should not increase by more than 10MB
      expect(memoryIncrease).toBeLessThan(10);
    });
  });
});
```

**4.2. Run performance tests:**

```bash
# Run with gc exposed to test memory
bun test tests/performance.test.ts
```

**4.3. Manual performance testing in browser:**

Create a test script for the extension:

```javascript
// In popup console (window.wormholeDebug context)
console.time('Transform 100 URLs');
for (let i = 0; i < 100; i++) {
  // Trigger transform with different URLs
  document.getElementById('input').value = `test${i}.bsky.social`;
  document.getElementById('input').dispatchEvent(new Event('input'));
}
console.timeEnd('Transform 100 URLs');
```

**4.4. Test startup performance:**

1. Disable the extension
2. Clear browser cache
3. Enable the extension
4. Measure time to first interaction in popup
5. Should be under 100ms

**4.5. Test memory leaks:**

1. Open browser task manager
2. Note extension memory usage
3. Use extension heavily for 5 minutes
4. Check memory hasn't grown significantly
5. Close and reopen popup multiple times
6. Verify memory returns to baseline

**4.6. Document performance results:**

```markdown
## Performance Test Results

### Parsing Performance

- 1000 URL parses: XXXms (Effect) vs YYYms (neverthrow baseline)

### Cache Performance

- 1000 cache operations: XXXms

### Memory Usage

- Baseline: XXXMB
- After 10k operations: XXXMB
- No significant memory leaks detected

### Startup Time

- Time to interactive: XXXms

### Real-world Usage

- Popup response time: <50ms
- Background resolution: <100ms average
```

**4.7. Commit performance results:**

```bash
git add tests/performance.test.ts
git add PERFORMANCE_RESULTS.md
git commit -m "Phase 5.4: Add performance tests and document results"
```

##### Step 5: Final Cleanup and Documentation

**5.1. Update README.md:**
Remove any references to neverthrow and update development setup instructions.

**5.2. Update MIGRATION_STATUS.md:**

```markdown
## Phase 5: Testing and Cleanup ✅

- [x] Update all tests to Effect patterns
- [x] Remove neverthrow dependencies
- [x] Bundle size analysis
- [x] Performance testing
- [x] Documentation updates

## Migration Complete! 🎉

### Summary

- Started: [DATE]
- Completed: [DATE]
- All modules successfully migrated to Effect
- No regressions in functionality
- Bundle size increase: XX%
- Performance: Comparable to neverthrow version

### Key Learnings

- [Document any important learnings]
- [Note any patterns that worked well]
- [List any challenges overcome]
```

**5.3. Clean up any temporary files:**

```bash
# Remove any .bak files
find . -name "*.bak" -delete

# Remove migration tracking if no longer needed
# rm MIGRATION_STATUS.md  # Optional - might want to keep for history
```

**5.4. Create final migration summary:**

```bash
git log --oneline | grep -E "Phase [1-5]" > MIGRATION_COMMITS.txt
```

**5.5. Run final validation suite:**

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build:dev
bun run build:chrome
bun run build:firefox
```

**5.6. Test extension thoroughly:**

1. Install fresh in Chrome and Firefox
2. Test all features:
   - URL transformation
   - Handle/DID resolution
   - Cache persistence
   - Options saving/loading
   - Error handling
3. Verify no console errors
4. Check DevTools for performance issues

**5.7. Final commit:**

```bash
git add -A
git commit -m "Phase 5.5: Final cleanup and documentation"
```

##### Step 6: Post-Migration Checklist

Before considering the migration complete:

**Code Quality:**

- [ ] All ESLint rules pass without any disabled rules
- [ ] TypeScript strict mode passes
- [ ] No `any` types remaining
- [ ] All tests pass

**Functionality:**

- [ ] Extension works in Chrome
- [ ] Extension works in Firefox
- [ ] All features work as before
- [ ] Error handling works correctly
- [ ] Cache persists correctly

**Performance:**

- [ ] Popup opens quickly (<100ms)
- [ ] Transformations are instant
- [ ] No memory leaks
- [ ] Bundle size acceptable

**Documentation:**

- [ ] README updated
- [ ] CLAUDE.md updated
- [ ] Migration documented
- [ ] No neverthrow references

##### Troubleshooting Guide

**Issue**: Tests fail after removing neverthrow

- **Solution**: Ensure all test utilities use Effect patterns

**Issue**: Bundle size too large

- **Solution**: Check tree-shaking, use specific imports, enable minification

**Issue**: Performance regression

- **Solution**: Profile with Chrome DevTools, check for unnecessary Effect wrapping

**Issue**: Memory leaks

- **Solution**: Ensure Effects are properly terminated, check for circular references

##### Common Cleanup Patterns

**Pattern 1: Test assertions**

```typescript
// Use Exit type for clear assertions
const exit = Effect.runSyncExit(effect);
if (Exit.isSuccess(exit)) {
  expect(exit.value).toBe(expected);
} else {
  fail('Expected success but got failure');
}
```

**Pattern 2: Performance testing**

```typescript
// Measure Effect operations
const measure = <A>(name: string, effect: Effect.Effect<A, any>) => {
  const start = performance.now();
  const result = Effect.runSync(effect);
  const duration = performance.now() - start;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return result;
};
```

**Pattern 3: Bundle optimization**

```typescript
// Use barrel imports sparingly
import { Effect, pipe } from 'effect'; // Good
import * as Effect from 'effect'; // Bad - imports everything
```

##### Migration Celebration! 🎉

Once all checks pass:

1. Create a pull request from `effect-migration` to `main`
2. Include migration summary and performance results
3. Get code review focusing on:
   - Correct Effect usage patterns
   - No remaining neverthrow code
   - Performance characteristics
   - Bundle size impact

The migration is now complete! The codebase has been successfully migrated from neverthrow to Effect, providing better error handling, more powerful async operations, and a more maintainable architecture.

### Migration Guidelines

**Idiomatic Pattern Translations**:

- `Result<T, E>` → `Effect<T, E>` with proper service dependencies
- `ResultAsync<T, E>` → `Effect<T, E>` with Layer-provided services
- `.andThen()` → `Effect.gen` with `yield*` for readability
- `.match()` → `Match.value` with pattern matching for complex cases
- `ResultAsync.fromPromise()` → Service-based HTTP operations with Schema validation
- Manual validation → `Schema.decodeUnknown` with proper error types
- Utility functions → Service interfaces with Layer implementations
- Class-based state → `Ref` and `Layer` for managed state
- Manual error handling → `Effect.catchTag` and proper error channels

**Key Principles for Idiomatic Effect**:

- **Services over Utilities**: Define interfaces and provide implementations through Layers
- **Schema over Guards**: Use Effect's Schema for validation instead of manual type guards
- **Composition over Inheritance**: Compose services through Layer.mergeAll
- **Effect.gen for Readability**: Use generators for complex async flows instead of deep pipes
- **Proper Dependencies**: Inject dependencies through Context, not global imports
- **Resource Management**: Use Ref, Layer, and Scope for proper resource lifecycle
- **Test Isolation**: Create test environments with mock services
- **Runtime at Boundaries**: Create runtime with proper layer provision at app boundaries

**Risk Mitigation**:

- Create a feature branch for the entire migration
- Test each phase thoroughly before proceeding
- Keep commits atomic - one module per commit
- Be prepared to adjust ESLint rules for Effect patterns
- Monitor bundle size throughout migration

## Adding New Services

To add a new AT Protocol service, update `src/shared/services.ts`:

```typescript
SERVICES.NEW_SERVICE = {
  emoji: '✨',
  name: 'example.com',
  contentSupport: 'full', // or 'profiles-and-posts', 'only-posts', 'only-profiles'

  // Optional: URL parsing configuration
  parsing: {
    hostname: 'example.com',
    patterns: {
      profileIdentifier: /^\/profile\/([^/]+)/,
      // Additional pattern options available
    },
  },

  // Required: URL generation
  buildUrl: (info) => {
    if (!info.handle) return null;
    if (info.rkey) {
      return `https://example.com/user/${info.handle}/post/${info.rkey}`;
    }
    return `https://example.com/user/${info.handle}`;
  },

  // Optional: Input restrictions
  requiredFields: {
    handle: true,
    rkey: true,
    plcOnly: true,
  },
};
```

No other code changes required!

## Summary of Idiomatic Effect Improvements

### Key Changes from Original Plan

The updated migration plan makes the following critical improvements to ensure truly idiomatic Effect code:

#### 1. Services and Layers Instead of Utility Functions

**Before (neverthrow-style):**

```typescript
export const parseJsonEffect = <T>(
  text: string,
  validator: (data: unknown) => data is T,
  errorMessage: string,
): Effect.Effect<T, WormholeEffectError> => // ...
```

**After (idiomatic Effect):**

```typescript
export interface HttpService {
  readonly fetchJson: <T>(url: string, schema: Schema.Schema<T>) => Effect.Effect<T, NetworkError | ParseError>;
}

export const HttpServiceLive = Layer.succeed(HttpService /* implementation */);
```

#### 2. Schema Validation Instead of Manual Type Guards

**Before:**

```typescript
if (!this.isValidDid(did)) {
  throw new Error('Invalid DID format');
}
```

**After:**

```typescript
const validatedDid =
  yield *
  Schema.decodeUnknown(DidSchema)(did).pipe(
    Effect.mapError(() =>
      ValidationError.make({
        /* ... */
      }),
    ),
  );
```

#### 3. Effect.gen and Pattern Matching

**Before:**

```typescript
return pipe(
  effect,
  Effect.flatMap((value) => nextOperation(value)),
  Effect.map((value) => transform(value)),
);
```

**After:**

```typescript
return Effect.gen(function* () {
  const value = yield* effect;
  const result = yield* nextOperation(value);
  return transform(result);
});
```

#### 4. Proper Resource Management with Ref and Layers

**Before:**

```typescript
export class DidHandleCache {
  private cache = new BidirectionalMap<string, string>();
  // Manual state management
}
```

**After:**

```typescript
export const DidHandleCacheServiceLive = Layer.effect(
  DidHandleCacheService,
  Effect.gen(function* () {
    const cache = yield* Ref.make(new Map<string, string>());
    // Managed state with Effect primitives
  }),
);
```

#### 5. Comprehensive Testing with TestEnvironment

**Before:**

```typescript
export function runTest<A>(effect: Effect.Effect<A, WormholeEffectError>): Exit.Exit<A, WormholeEffectError> {
  return Effect.runSyncExit(effect);
}
```

**After:**

```typescript
export const TestLayer = Layer.mergeAll(TestHttpService, TestCacheService, TestDebugService);

export const runTestEffect = <A, E>(effect: Effect.Effect<A, E>, layer: Layer.Layer = TestLayer): Exit.Exit<A, E> => {
  return Effect.provide(effect, layer).pipe(Effect.runSyncExit);
};
```

#### 6. Proper Runtime Setup

**Before:**

```typescript
const runtime = Runtime.defaultRuntime;
void Runtime.runPromise(runtime)(effect);
```

**After:**

```typescript
const ServiceWorkerLayer = Layer.mergeAll(AppLayer, ResolverServiceLive, DidHandleCacheServiceLive());

const runtime = Runtime.make(ServiceWorkerLayer);
Runtime.runPromise(runtime)(effect);
```

### Benefits of the Idiomatic Approach

1. **Better Composition**: Services compose naturally through Layer.mergeAll
2. **Type Safety**: Schema validation provides runtime type safety
3. **Resource Management**: Automatic cleanup and proper lifecycle management
4. **Testability**: Easy mocking and testing with test layers
5. **Maintainability**: Clear separation of concerns and dependencies
6. **Performance**: Built-in optimizations like fiber-based concurrency
7. **Error Handling**: Structured error types with proper recovery patterns

### Architecture Changes

The migration transforms the architecture from:

- **Utility-based**: Helper functions for common operations
- **Class-based**: Traditional OOP patterns with manual resource management
- **Imperative**: Step-by-step operations with manual error handling

To:

- **Service-oriented**: Dependency injection through Effect's Context system
- **Functional**: Pure functions with explicit dependencies
- **Declarative**: Effect pipelines that describe what should happen

This ensures the codebase follows Effect's principles and patterns, making it maintainable, testable, and performant.
