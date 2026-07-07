# Firestore security rules — Sentinel Phase 4.1

**Status:** Rules live in `firestore.rules` (repo). **Deploying to production requires owner sign-off.**

## What the rules do

| Collection | Access |
|------------|--------|
| `settings/{docId}` | Read/write only when signed in **and** `docId == user_{uid}` |
| `activities/{id}` | Read/write when signed in (shared log — single-owner app) |
| Everything else | Denied |

This matches the client after Phase 4.0: Firestore listeners run only when `user` is set.

## Before you deploy

1. **Export a Settings JSON backup** (Settings → export).
2. Confirm you can sign in on [GitHub Pages](https://vccharlie.github.io/Climb-Performance-Lab/).
3. In [Firebase Console](https://console.firebase.google.com/) → Firestore → **Rules**, copy the **current** rules into a local file (rollback copy).
4. Run rules tests locally (see below).

## Deploy (owner)

Requires [Firebase CLI](https://firebase.google.com/docs/cli) logged in with deploy permission on `climb-performance-lab`:

```bash
npx firebase-tools@latest login
npx firebase-tools@latest use climb-performance-lab
npx firebase-tools@latest deploy --only firestore:rules
```

## Rollback

If anything breaks after deploy, paste your saved rules back in Firebase Console → Firestore → Rules → **Publish**, or:

```bash
# After restoring firestore.rules.rollback to firestore.rules
npx firebase-tools@latest deploy --only firestore:rules
```

## Local rules tests

```bash
npm install
npm run test:rules
```

Uses `@firebase/rules-unit-testing` with the Firestore emulator (`npm run test:rules`).

## Smoke test after deploy

1. Sign out → SignInGate (no activities in UI).
2. Sign in → dashboard + activity log load.
3. Settings save → reload → settings persist.
4. Intervals sync or manual import → activities appear.

## Not covered here

- Cloud Function auth (Phase 4.2)
- App Check (Phase 4.3)
- Per-activity `ownerId` for multi-user (deferred)
