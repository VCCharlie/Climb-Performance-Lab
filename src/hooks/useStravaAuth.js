/**
 * src/hooks/useStravaAuth.js
 * Strava OAuth flow and token management.
 * Tokens zijn opgeslagen in localStorage (enkelvoudige gebruiker).
 */
import { useCallback } from 'react';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_AUTH_BASE = 'https://www.strava.com/oauth/authorize';

const useStravaAuth = (stravaConfig, setStravaConfig) => {
    const isConnected = !!(stravaConfig?.refresh_token && stravaConfig?.client_id);

    // Returns a valid access token, auto-refreshes when expired
    const getValidToken = useCallback(async () => {
        if (!stravaConfig?.refresh_token) {
            throw new Error('Niet verbonden met Strava. Koppel je account via Settings → Strava.');
        }

        const now = Math.floor(Date.now() / 1000);
        if (stravaConfig.access_token && stravaConfig.expires_at > now + 60) {
            return stravaConfig.access_token;
        }

        // Refresh the token
        const resp = await fetch(STRAVA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: stravaConfig.client_id,
                client_secret: stravaConfig.client_secret,
                refresh_token: stravaConfig.refresh_token,
                grant_type: 'refresh_token'
            })
        });

        if (!resp.ok) throw new Error('Strava token refresh mislukt. Verbind opnieuw via Settings.');

        const data = await resp.json();
        const updated = {
            ...stravaConfig,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at
        };
        setStravaConfig(updated);
        localStorage.setItem('stravaConfig', JSON.stringify(updated));
        return data.access_token;
    }, [stravaConfig, setStravaConfig]);

    // Stap 1: Redirect naar Strava voor autorisatie
    const connectStrava = useCallback(() => {
        if (!stravaConfig?.client_id || !stravaConfig?.client_secret) {
            alert('Vul eerst je Strava Client ID en Client Secret in bij Settings → Strava.');
            return;
        }
        // Gebruik de huidige pagina-URL als redirect URI
        const redirectUri = window.location.origin + window.location.pathname;
        const url = `${STRAVA_AUTH_BASE}?client_id=${stravaConfig.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all&approval_prompt=auto`;
        window.location.href = url;
    }, [stravaConfig]);

    // Stap 2: Wissel OAuth code voor tokens (wordt aangeroepen bij terugkeer van Strava)
    const handleOAuthCallback = useCallback(async (code) => {
        if (!stravaConfig?.client_id || !stravaConfig?.client_secret) return;

        const resp = await fetch(STRAVA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: stravaConfig.client_id,
                client_secret: stravaConfig.client_secret,
                code,
                grant_type: 'authorization_code'
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.message || 'Strava OAuth mislukt');
        }

        const data = await resp.json();
        const updated = {
            ...stravaConfig,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            athlete_name: data.athlete ? `${data.athlete.firstname} ${data.athlete.lastname}` : null
        };
        setStravaConfig(updated);
        localStorage.setItem('stravaConfig', JSON.stringify(updated));

        // Verwijder ?code= uit de URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('scope');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.toString());
    }, [stravaConfig, setStravaConfig]);

    // Verbreek de Strava koppeling (behoudt client_id en client_secret)
    const disconnectStrava = useCallback(() => {
        const reset = {
            client_id: stravaConfig?.client_id || '',
            client_secret: stravaConfig?.client_secret || ''
        };
        setStravaConfig(reset);
        localStorage.setItem('stravaConfig', JSON.stringify(reset));
    }, [stravaConfig, setStravaConfig]);

    return { isConnected, connectStrava, disconnectStrava, handleOAuthCallback, getValidToken };
};

export default useStravaAuth;
