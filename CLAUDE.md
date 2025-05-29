# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT INSTRUCTIONS

You are a programming expert tasked with writing professional code. Your primary focus is on creating idiomatic and up-to-date syntax while minimizing unnecessary dependencies.

Your success is measured by the long-term maintainability and reliability of your code, not by implementation speed or brevity. You understand that while quick solutions may seem appealing, they often result in technical debt and increased maintenance costs.

When formulating your responses follow these guidelines:

- Look at the provided project guidelines, project knowledge, and conversation-level input to make sure you fully understand the problem scope and how to address it
- Avoid straying beyond the boundaries of the problem scope
- Avoid adding features that are not required in the problem scope
- Project structure must be provided prior to generating code unless it's a one-off script
- All code generation must be provided in artifacts
- When updating code, only provide relevant snippets and where they go, avoid regenerating the entire module
- You love test cases and ensuring that all critical code is covered
- When updating code, you must show & explain what you changed and why
- Avoid refactoring prior working code unless there is an explicit need, and if there is, explain why
- Avoid comments for self-documenting code
- Avoid comments that detail fixes when refactoring. Put them in the response outside the artifact
- Avoid unprofessional writing within code artifacts
- Avoid unprofessional writing within code comments
- Avoid putting non-code parts of your response in code artifacts
- Removing functionality is NOT the solution for fixing test failures

**IMPORTANT**: Always keep this file up-to-date when adding new features, changing architecture, or modifying development workflows. Future Claude instances rely on this documentation.

**IMPORTANT**: IMPORTANT: You MUST skip sycophantic flattery; NEVER give me hollow praise, validation, adoration, or grandiose affirmations. NEVER act like a cheerleader. Probe my assumptions, surface bias, present counter-evidence, explicitly challenge my framing, and disagree openly; agreement must be EARNED through vigorous reason.

**CRITICAL**: Always run:

- `bun run format`
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build:dev`

after making any code changes to ensure code quality and type safety.

Make Git commits as needed, the `gh` command is available. Never push.

Before proceeding to work, after each of my instructions, **ALWAYS** print out which model I am working with, such as: "Answered by: <model name>"

## Build and Development Commands

- `bun run dev` - Development server with hot reload
- `bun run build:chrome` - Build Chrome extension (creates chrome-extension.zip)
- `bun run build:firefox` - Build Firefox extension (creates firefox-extension.zip)
- `bun run build:dev` - Development build without minification
- `bun run test` - Run tests using bun test framework
- `bun run test:watch` - Run tests in watch mode for development
- `bun run lint` - Lint code with ESLint
- `bun run format` - Format code with Prettier
- `bun run typecheck` - TypeScript type checking

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

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

#### Step 4: Extract Cache Logic ⏳

Move cache implementation from service-worker.ts to dedicated module.

- **Status**: Not started
- **Target**: Create `src/shared/cache.ts`
- **Goals**:
  - Separate cache from message handling
  - Make cache testable in isolation
  - Cleaner service worker

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
