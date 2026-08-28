# Phase 5 deferred items (Phase 5b backlog)

Items intentionally deferred from Phase 5 due to size or cross-cutting schema work.

## N3 — GPX/FIT segment import (L)

**Goal:** Import real segment-level gradient/elevation profiles instead of synthetic profiler curves.

**Suggested approach:**
- Add `src/services/gpxParser.js` and `src/services/fitParser.js` (or WASM `@garmin/fitsdk` for FIT).
- New DataHub sub-tab "Segment import" → preview → attach profile to a climb bucket-list entry or custom climb id.
- Store imported profiles in Firestore `climbProfiles/{id}` with `{ points: [{ distanceKm, elevation, gradient }] }`.
- Wire `ClimbProfiler` to prefer imported profile over `buildSyntheticProfile`.

**Stub:** No parser shipped in Phase 5; Climb Profiler continues to show the synthetic-profile disclaimer.

## N1 — Activity schema versioning (L)

**Goal:** Track activity shape evolution for safer migrations and backup restore.

**Suggested approach:**
- Add optional `schemaVersion: 1` on new/edited activities and document fields in `docs/ACTIVITY_SCHEMA.md`.
- Bump version when adding required fields; migration script reads version and applies defaults.
- Include version in backup export header (`backupSchema.js`).

**Phase 5 note:** User tags (`tags`, `user_notes`) are additive and merge-protected; no version field yet.
