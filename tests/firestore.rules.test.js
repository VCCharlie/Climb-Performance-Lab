/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'climb-performance-lab-rules-test';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');

let testEnv;

describe('firestore.rules', () => {
    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                rules: readFileSync(RULES_PATH, 'utf8'),
            },
        });
    });

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    it('denies unauthenticated read of settings', async () => {
        const ctx = testEnv.unauthenticatedContext();
        await assertFails(ctx.firestore().doc('settings/user_abc123').get());
    });

    it('denies unauthenticated read of activities', async () => {
        const ctx = testEnv.unauthenticatedContext();
        await assertFails(ctx.firestore().doc('activities/ride-1').get());
    });

    it('allows owner read/write of own settings doc', async () => {
        const uid = 'owner-uid-1';
        const ctx = testEnv.authenticatedContext(uid, { email: 'owner@example.com' });
        const ref = ctx.firestore().doc(`settings/user_${uid}`);
        await assertSucceeds(ref.set({ body: { ftp: 280 } }));
        await assertSucceeds(ref.get());
    });

    it('denies access to another user settings doc', async () => {
        const ctx = testEnv.authenticatedContext('user-a', { email: 'a@example.com' });
        await assertFails(ctx.firestore().doc('settings/user_user-b').get());
    });

    it('allows owner-tagged activity create/read/update', async () => {
        const uid = 'user-a';
        const ctx = testEnv.authenticatedContext(uid, { email: 'a@example.com' });
        const ref = ctx.firestore().doc('activities/intervals-42');
        await assertSucceeds(ref.set({
            id: 'intervals-42',
            type: 'Ride',
            date: '2026-01-01',
            ownerId: uid,
        }));
        await assertSucceeds(ref.get());
        await assertSucceeds(ref.update({ load: 50 }));
    });

    it('denies activity write without matching ownerId', async () => {
        const ctx = testEnv.authenticatedContext('user-a', { email: 'a@example.com' });
        const ref = ctx.firestore().doc('activities/bad-owner');
        await assertFails(ref.set({ id: 'bad-owner', type: 'Ride', ownerId: 'other-user' }));
    });

    it('denies read of another users owned activity', async () => {
        await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
            await adminCtx.firestore().doc('activities/owned-by-b').set({
                id: 'owned-by-b',
                type: 'Ride',
                ownerId: 'user-b',
            });
        });
        const ctx = testEnv.authenticatedContext('user-a', { email: 'a@example.com' });
        await assertFails(ctx.firestore().doc('activities/owned-by-b').get());
    });

    it('allows legacy activity without ownerId until backfill', async () => {
        await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
            await adminCtx.firestore().doc('activities/legacy-1').set({
                id: 'legacy-1',
                type: 'Ride',
                date: '2026-01-01',
            });
        });
        const ctx = testEnv.authenticatedContext('user-a', { email: 'a@example.com' });
        const ref = ctx.firestore().doc('activities/legacy-1');
        await assertSucceeds(ref.get());
        await assertSucceeds(ref.set({ id: 'legacy-1', type: 'Ride', date: '2026-01-01', ownerId: 'user-a' }, { merge: true }));
    });

    it('denies client access to strava_tokens (Admin SDK only)', async () => {
        const ctx = testEnv.authenticatedContext('user-a', { email: 'a@example.com' });
        await assertFails(ctx.firestore().doc('strava_tokens/automation').get());
        await assertFails(ctx.firestore().doc('strava_tokens/automation').set({ refresh_token: 'x' }));
    });

    it('denies writes to unknown collections', async () => {
        const ctx = testEnv.authenticatedContext('user-a', { email: 'a@example.com' });
        await assertFails(ctx.firestore().doc('secrets/api-keys').set({ key: 'x' }));
    });
});
