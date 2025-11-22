# 2025-11-15 remove toolify.blue

## Goal

Drop toolify.blue support entirely so the extension no longer offers or parses that destination.

## Plan

1. **Service + Manifest cleanup** – delete the Toolify config from `src/shared/services.ts` and remove its host permission from `public/manifest.json`. _(Done 2025-11-15)_
2. **Docs + UX copy** – update README/docs supported-service lists to stop advertising toolify. _(Done 2025-11-15)_
3. **Tests + Parser** – remove Toolify-specific parsing tests/expectations so the suite reflects the new support matrix. _(Done 2025-11-15)_
4. **Validation** – rerun the required format/lint/typecheck/test/build/web-ext commands. _(Done 2025-11-15)_

_Status: completed_
