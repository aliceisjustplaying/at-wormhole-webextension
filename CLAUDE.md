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

### ✅ Completed (Original Extension)

1. **Modular Architecture** - Transform system split into focused, single-responsibility modules
2. **neverthrow Integration** - Comprehensive error handling with Result types
3. **Retry Logic** - Network resilience with exponential backoff
4. **Cache System** - Reliable bidirectional persistence with LRU eviction
5. **Firefox Theme Support** - Dynamic theme adoption
6. **Options System** - User preferences with cross-device sync
7. **Debug System** - Categorized logging with runtime controls

### 📋 Remaining Tasks (Original Extension)

- **Type Safety** - Replace remaining `any`/`unknown` types
- **Popup Error UI** - User-friendly error messages
- **Test Coverage** - Additional edge case scenarios

## Effect TDD Rewrite - Learning Journey

**IMPORTANT**: We're rewriting this extension from scratch using Effect, with TDD to teach Effect patterns as we go.

**EFFECT DOCUMENTATION**: Always refer to the latest Effect documentation at https://effect.website/llms.txt or /llms-full.txt when implementing Effect patterns to ensure idiomatic usage.

### 🎯 Learning Goals

1. **Understand Effect fundamentals** through real implementation
2. **Learn idiomatic Effect patterns** by solving actual problems
3. **Build confidence** with Effect's type system and error handling
4. **Master services and layers** for dependency injection

### 📚 Our TDD Learning Path

#### Phase 1: Core Concepts (Schemas & Effects)
- **Lesson 1**: Branded types with Schema - parsing handles
- **Lesson 2**: Effect basics - errors in the type system
- **Lesson 3**: Validation pipelines - building TransformInfo
- **Tests teach**: How Effect tracks errors at compile time

#### Phase 2: Services & Dependencies
- **Lesson 4**: Creating services - the Parser service
- **Lesson 5**: Dependency injection - using Context
- **Lesson 6**: Service composition - building layers
- **Tests teach**: How to test with dependency injection

#### Phase 3: Async & Error Handling
- **Lesson 7**: Network calls with Effect - resolver implementation
- **Lesson 8**: Error recovery - fallbacks and retries
- **Lesson 9**: Concurrent operations - batch resolution
- **Tests teach**: How Effect makes async composable

#### Phase 4: State & Resources
- **Lesson 10**: State management with Ref - cache implementation
- **Lesson 11**: Resource lifecycle - proper cleanup
- **Lesson 12**: Reactive state - SubscriptionRef for options
- **Tests teach**: Safe concurrent state updates

#### Phase 5: Browser Integration
- **Lesson 13**: Wrapping browser APIs - storage and tabs
- **Lesson 14**: Message passing with Schema validation
- **Lesson 15**: Service worker lifecycle management
- **Tests teach**: Effect in the browser environment

### 🛠️ Development Workflow

1. **Write a failing test** that demonstrates the next Effect concept
2. **Implement minimally** to make the test pass
3. **Refactor to idiomatic Effect** while keeping tests green
4. **Extract the pattern** and understand why it works
5. **Apply to next feature** with deeper understanding

### 📁 Project Structure

```
effect/
├── src/
│   ├── model/           # Schemas and branded types
│   ├── services/        # Service definitions and implementations
│   ├── browser/         # Browser API wrappers
│   └── ui/              # Popup and options
├── test/
│   ├── model/           # Schema tests (Phase 1)
│   ├── services/        # Service tests (Phase 2-3)
│   └── integration/     # Full pipeline tests (Phase 4-5)
├── vitest.config.ts
└── package.json
```

### 🚀 Getting Started

```bash
# Create Effect project structure
mkdir -p effect/{src/{model,services,browser,ui},test/{model,services,integration}}
cd effect

# Initialize with Effect dependencies
bun init -y
bun add effect @effect/schema @effect/platform @effect/platform-browser
bun add -D vitest @vitest/ui @effect/vitest jsdom
```

### 📝 Key Learning Resources

- Effect Docs: https://effect.website/docs
- Effect LLMs Guide: https://effect.website/llms.txt
- Our Tests: Each test file has learning comments
- This Journey: We'll document patterns as we discover them

### 🎓 Teaching Approach

Each implementation step will:
1. Start with "what problem does this solve?"
2. Show the "wrong way" first (common TS approach)
3. Introduce the Effect solution
4. Explain why Effect's approach is better
5. Practice with variations

### ⚡ Effect Patterns We'll Learn

- **Branded Types**: Type-safe domain modeling
- **Services**: Dependency injection without frameworks
- **Layers**: Composable application architecture
- **Generators**: Sequential code for functional programming
- **Error Channels**: Errors as first-class citizens
- **Concurrent Combinators**: Safe parallelism
- **Resource Management**: Guaranteed cleanup
- **Schema Validation**: Parse, don't validate

## Effect Rewrite Progress

### ✅ Phase 1: Core Concepts (COMPLETED)
- **Lesson 1**: ✅ Branded types with Schema - parsing handles (`src/model/handle.ts`)
  - Created Handle branded type with validation
  - Comprehensive tests showing parse errors
- **Lesson 2**: ✅ Effect basics - errors in the type system (`src/model/did.ts`)
  - Created DID branded type with multiple DID method support
  - Demonstrated Effect error handling
- **Lesson 3**: ✅ Validation pipelines - building TransformInfo (`src/model/transform-info.ts`)
  - Complex schema with optional fields
  - Business rule validation with filters
  - Flexible Rkey validation for various formats

### ✅ Phase 2: Services & Dependencies (COMPLETED)
- **Lesson 4**: ✅ Creating services - the Parser service (`src/services/parser.ts`)
  - Simple service using Context.Tag
  - Dependency injection pattern
- **Lesson 5**: ✅ Dependency injection - using Context (`test/services/parser.test.ts`)
  - Testing with mock implementations
  - Context.make for providing dependencies
- **Lesson 6**: ✅ Service composition - building layers (`test/services/layer-explanation.test.ts`)
  - Layer.succeed for simple services
  - Layer.effect for services with dependencies
  - Layer composition patterns

### 🚧 Phase 3: Async & Error Handling (IN PROGRESS)
- **Lesson 7**: ✅ Normalizer Service (`src/services/normalizer.ts`)
  - Replaces Canonicalizer from original
  - Handles AT URIs, DIDs, handles, and fragments
  - NSID shortcuts support (p, f, l)
  - Comprehensive error types with Data.TaggedError
  - 39 tests with full real-world coverage
- **Lesson 8**: 🔄 URL Parser Service (NEXT)
  - Parse service-specific URLs (bsky.app, toolify.blue, etc.)
  - Extract relevant parts for Normalizer
  - Handle query parameters (skythread, boat.kelinci.net)
- **Lesson 9**: ⏳ Resolver Service
  - Network calls with Effect
  - AT Protocol API integration
  - Handle to DID resolution
  - Retry logic with exponential backoff

### ⏳ Phase 4: State & Resources (TODO)
- **Lesson 10**: Cache implementation with Ref
- **Lesson 11**: Resource lifecycle management
- **Lesson 12**: Reactive state with SubscriptionRef

### ⏳ Phase 5: Browser Integration (TODO)
- **Lesson 13**: Wrapping browser APIs
- **Lesson 14**: Message passing with Schema
- **Lesson 15**: Service worker lifecycle

### 📊 Current Statistics
- **Files Created**: 14
- **Tests Written**: 67 (2 skipped)
- **Test Coverage**: 
  - Model layer: 100% (Handle, DID, TransformInfo)
  - Services: Parser (100%), Normalizer (100%)
  - Real-world scenarios: 39 comprehensive tests
- **All Tests Passing**: ✅
- **TypeScript Clean**: ✅
- **ESLint Clean**: ✅

### 🔍 Key Insights Learned
1. **Branded Types**: Much safer than type aliases, catch errors at decode time
2. **Effect Generators**: Make async code look synchronous while maintaining type safety
3. **Service Pattern**: Clean dependency injection without frameworks
4. **Data.TaggedError**: Discriminated unions for errors with built-in equality
5. **Schema Composition**: Building complex types from simple ones
6. **Layer Composition**: Services can depend on other services cleanly

### 🎯 Next Steps
1. Create URL Parser service to handle service-specific URL patterns
2. Implement Resolver service with AT Protocol API calls
3. Add retry logic with Effect's built-in retry combinators
4. Create cache service with concurrent-safe state management

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
