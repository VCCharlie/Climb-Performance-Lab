/**
 * src/hooks/useStravaAuth.js
 * Strava OAuth via server-side token exchange (client secret stays on Cloud Run / GitHub Secrets).
 */
import { useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { safeLocalStorageSet, safeSessionStorageSet } from '../utils/safeStorage.js';
import { stravaConfigForCloud } from '../utils/settingsCloudMerge.js';
import {
    resolveStravaClientId,
    exchangeStravaCodeViaCloud,
    fetchStravaAccessTokenViaCloud,
    disconnectStravaViaCloud,
} from '../services/stravaCloudApi.js';

const STRAVA_AUTH_BASE = 'https://www.strava.com/oauth/authorize';

async function syncStravaMetadataToCloud(stravaConfig) {
    if (!auth?.currentUser || !db) return;
    const settingsId = `user_${auth.currentUser.uid}`;
    await setDoc(
        doc(db, 'settings', settingsId),
        { strava: stravaConfigForCloud(stravaConfig) },
        { merge: true },
    );
}

const useStravaAuth = (stravaConfig, setStravaConfig) => {
    const isConnected = !!(stravaConfig?.athlete_id);

    const getValidToken = useCallback(async () => {
        if (!isConnected) {
            throw new Error('Not connected to Strava. Connect your account via Settings → Strava.');
        }
        return fetchStravaAccessTokenViaCloud();
    }, [isConnected]);

    const connectStrava = useCallback(async () => {
        let clientId = '';
        try {
            clientId = await resolveStravaClientId();
        } catch (err) {
            alert(`Strava is not configured on the server yet: ${err.message}`);
            return;
        }

        const redirectUri = window.location.origin + window.location.pathname;

        const array = new Uint32Array(4);
        window.crypto.getRandomValues(array);
        const state = Array.from(array, (dec) => ('0' + dec.toString(16)).substr(-8)).join('');
        safeSessionStorageSet('strava_oauth_state', state);

        const url = `${STRAVA_AUTH_BASE}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all&approval_prompt=auto&state=${encodeURIComponent(state)}`;
        window.location.href = url;
    }, []);

    const handleOAuthCallback = useCallback(async (code, state) => {
        const savedState = sessionStorage.getItem('strava_oauth_state');
        sessionStorage.removeItem('strava_oauth_state');
        if (!state || state !== savedState) {
            throw new Error('Invalid state parameter. Possible CSRF attack.');
        }

        const redirectUri = window.location.origin + window.location.pathname;
        const data = await exchangeStravaCodeViaCloud({ code, redirectUri });

        const updated = {
            athlete_id: data.athlete_id ?? null,
            athlete_name: data.athlete_name ?? null,
            expires_at: data.expires_at ?? null,
        };
        setStravaConfig(updated);
        safeLocalStorageSet('stravaConfig', JSON.stringify(updated));
        await syncStravaMetadataToCloud(updated);

        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('scope');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.toString());
    }, [setStravaConfig]);

    const disconnectStrava = useCallback(async () => {
        try {
            await disconnectStravaViaCloud();
        } catch (err) {
            console.warn('[Strava] Server disconnect failed:', err.message);
        }
        const reset = {};
        setStravaConfig(reset);
        safeLocalStorageSet('stravaConfig', JSON.stringify(reset));
        await syncStravaMetadataToCloud(reset);
    }, [setStravaConfig]);

    return { isConnected, connectStrava, disconnectStrava, handleOAuthCallback, getValidToken };
};

export default useStravaAuth;
