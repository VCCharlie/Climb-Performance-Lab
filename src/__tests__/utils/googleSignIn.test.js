import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../firebase.js', () => ({
    loginWithGoogle: vi.fn(),
    loginWithGoogleRedirect: vi.fn(),
}));

import { loginWithGoogle, loginWithGoogleRedirect } from '../../firebase.js';
import {
    runGoogleSignIn,
    isGoogleSignInInProgress,
    googleSignInErrorMessage,
    shouldUseGoogleRedirectSignIn,
} from '../../utils/googleSignIn.js';

describe('googleSignIn', () => {
    beforeEach(() => {
        vi.mocked(loginWithGoogle).mockReset();
        vi.mocked(loginWithGoogleRedirect).mockReset();
        vi.mocked(loginWithGoogle).mockResolvedValue({ uid: 'u1' });
        vi.mocked(loginWithGoogleRedirect).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
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

    it('uses redirect sign-in on GitHub Pages hosts', async () => {
        vi.stubGlobal('window', {
            location: { hostname: 'vccharlie.github.io' },
        });

        await runGoogleSignIn();

        expect(loginWithGoogleRedirect).toHaveBeenCalledTimes(1);
        expect(loginWithGoogle).not.toHaveBeenCalled();
    });

    it('uses popup sign-in on localhost', async () => {
        vi.stubGlobal('window', {
            location: { hostname: 'localhost' },
        });

        await runGoogleSignIn();

        expect(loginWithGoogle).toHaveBeenCalledTimes(1);
        expect(loginWithGoogleRedirect).not.toHaveBeenCalled();
    });

    it('detects GitHub Pages hostnames', () => {
        vi.stubGlobal('window', {
            location: { hostname: 'vccharlie.github.io' },
        });
        expect(shouldUseGoogleRedirectSignIn()).toBe(true);

        vi.stubGlobal('window', {
            location: { hostname: 'localhost' },
        });
        expect(shouldUseGoogleRedirectSignIn()).toBe(false);
    });

    it('maps auth/internal-error to a helpful message', () => {
        const msg = googleSignInErrorMessage({ code: 'auth/internal-error' });
        expect(msg).toContain('Content Security Policy');
    });
});
