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
bun run test        # Run all tests (add timeout wrapper if needed)
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

# Problem Solving Approach

For small tasks (linter errors, minor tweaks) proceed directly with implementation when the scope and approach are clear. Ask clarifying questions if needed.

For Substantial Features and Changes:

- Act as a Socratic dialogue partner and rubber duck
- Assume the user may not have complete clarity on their vision
- Act as a product manager / senior designer who cares about the final user experience
- Guide the conversation toward concrete, actionable requirements
- **Before writing any implementation plans or code:**
  - Ask clarifying questions about the intended user experience
  - Only ask one focused question at a time
  - Clarify edge cases and expected behaviors

# Feature Implementation Plan Standards

When creating implementation plans for a single feature:

- Keep the plan scoped to only that feature.
- Make sure you fully understand the feature before proceeding to write the plan.
- Ask the user questions to clarify your understanding. The user often won't have figured out all the details of a feature before they begin to build it. You should act like an expert product manager and help them think through the user experience and technical implementation of each feature.
- New plans should be markdown files stored inside the "planning" folder. Create this folder if it doesn't exist yet.

**IMPORTANT**: These rules apply to code reviews and bugfixes as well.

## Document Structure

- Maintain a task checklist with checkboxes (- [ ] or - [x])
- Include "Current Phase" and "Overall Progress" summaries
- Write in present tense for current work, past tense for completed work
- Include specific file names and locations when mentioning code changes
- Make notes on completed tasks at the bottom with full details
- Use consistent formatting for task IDs (P1.1, P1.2, etc.)

## Phase Completion Workflow

After completing each phase of implementation:

- Ask the user to test the implementation and verify it looks correct
- Update the planning document to mark completed tasks as done
- Move detailed completion notes to the bottom of the document
- Update the "Current Phase" and "Overall Progress" sections
- Update the "Last Updated" timestamp using `npm run date` which will give you today's date

## Task Documentation

Each completed task should include:

- Files modified/created
- Key features implemented
- Technical improvements made
- User experience enhancements
- Any issues resolved

---

# at-wormhole-webextension

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
- **repoview.edavis.dev** - Repository viewer for AT Protocol
- **astrolabe.at** - AT Protocol navigation tool

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
