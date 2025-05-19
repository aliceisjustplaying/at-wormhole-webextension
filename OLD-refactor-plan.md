# Refactor Plan for at-wormhole-chrome

## Goals

- Remove noise (console.logs, superfluous comments)
- Extract reusable helpers & constants
- Flatten control flow
- Improve maintainability & readability
- Ensure consistent logging (debug/production toggle)
- Add linting & formatting

## File-by-file breakdown

### 1. popup.js

- Extract utility functions to `utils.js`
- Centralize constants (`CACHE_KEY`, selectors, templates)
- Replace repeated `list.innerHTML = ...` with `renderStatus(msg)`
- Abstract template for destination items
- Consolidate DID→handle resolution into one function
- Remove verbose console.logs; use `log.debug` wrapper

### 2. popup.html

- Move inline styles to CSS file (`popup.css`)
- Remove unnecessary comments & whitespace
- Add class names in markup to match JS selectors

### 3. service-worker.js

- Extract storage helpers (`getCache`, `setCache`)
- Remove debug logs; add error logging only
- Flatten async flow; use early return
- Add JSDoc only where needed

### 4. background.js

- Extract helpers, remove logs, flatten async
- Consistent error handling

### 5. transform.js

- Remove unused/commented code
- Group exports at bottom
- Simplify parsing logic; drop redundant variables
- Add error wrapping

### 6. test.js

- Convert to Jest/Mocha style tests
- Remove console.logs; use assertions only
- Extract test fixtures

### 7. manifest.json

- Alphabetize keys; remove unused fields
- Minimize permissions

### 8. Tooling & CI

- Add ESLint + Prettier configs
- Npm scripts: `lint`, `test`
- CI workflow (`.github/workflows/ci.yml`)

## Stages

1. **Init**: Create `utils.js`, add logging wrapper, set up linting. [✔️ Completed: Used existing `eslint.config.mjs`; lint issues fixed; removed custom `.eslintrc.js`]
2. **Core**: Refactor `popup.js` & `transform.js`. [✔️ `popup.js` refactored and rolled back; styling restored; transform.js pending]
3. **Workers**: Refactor `service-worker.js` & `background.js`
4. **UI**: Update `popup.html` & add `popup.css`
5. **Tests**: Migrate `test.js` to framework
6. **Final**: QA, manual testing, version bump
