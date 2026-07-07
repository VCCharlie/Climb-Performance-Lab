import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../firebase.js', () => ({
    loginWithGoogle: vi.fn(),
}));

import { loginWithGoogle } from '../../firebase.js';
import { runGoogleSignIn, isGoogleSignInInProgress, googleSignInErrorMessage } from '../../utils/googleSignIn.js';

describe('googleSignIn', () => {
    beforeEach(() => {
        vi.mocked(loginWithGoogle).mockReset();
        vi.mocked(loginWithGoogle).mockResolvedValue({ uid: 'u1' });
    });

    it('tracks in-progress flag during sign-in', async () => {
        let inProgressDuringCall = false;
        vi.mocked(loginWithGoogle).mockImplementation(async () => {
            inProgressDuringCall = isGoogleSignInInProgress();
            return { uid: 'u1' };
        });

        expect(isGoogleSignInInProgress()).toBe(false);
        await runGoogleSignIn();
        expect(inProgressDuringCall).toBe(true);
        expect(isGoogleSignInInProgress()).toBe(false);
    });

    it('maps auth/internal-error to a helpful message', () => {
        const msg = googleSignInErrorMessage({ code: 'auth/internal-error' });
        expect(msg).toContain('Content Security Policy');
    });
});
