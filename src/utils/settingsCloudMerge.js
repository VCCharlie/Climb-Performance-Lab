/**
 * Strip and merge settings for Firestore cloud sync.
 * Secrets/tokens stay in localStorage only; cloud carries non-sensitive metadata.
 */

const STRAVA_SECRET_KEYS = ['client_secret', 'access_token', 'refresh_token'];

/** Shape safe to persist in Firestore — never OAuth secrets or tokens. */
export function stravaConfigForCloud(stravaConfig = {}) {
    const out = {
        athlete_id: stravaConfig.athlete_id ?? null,
        athlete_name: stravaConfig.athlete_name ?? null,
    };
    if (stravaConfig.expires_at != null) {
        out.expires_at = stravaConfig.expires_at;
    }
    return out;
}

/**
 * Merge cloud strava doc into local config.
 * Never overwrite local secrets with empty/missing cloud values.
 */
export function mergeStravaConfigFromCloud(cloud = {}, local = {}) {
    const merged = {
        ...local,
        ...stravaConfigForCloud(cloud),
    };

    for (const key of STRAVA_SECRET_KEYS) {
        const localVal = local[key];
        const cloudVal = cloud[key];
        if (localVal) {
            merged[key] = localVal;
        } else if (cloudVal) {
            merged[key] = cloudVal;
        } else {
            delete merged[key];
        }
    }

    return merged;
}

/** Intervals config for Firestore — athlete id only, never API key. */
export function intervalsConfigForCloud(intervalsConfig = {}) {
    return {
        athleteId: intervalsConfig.athleteId || '',
        apiKey: '',
    };
}

/** Preserve local API key when cloud copy was stripped. */
export function mergeIntervalsConfigFromCloud(cloud = {}, local = {}) {
    return {
        athleteId: cloud.athleteId || local.athleteId || '',
        apiKey: local.apiKey || cloud.apiKey || '',
    };
}

const BODY_SECRET_KEYS = ['githubPat', 'openweatherApiKey', 'geminiApiKey'];

/** User settings for Firestore — strip PAT and weather API key. */
export function userSettingsForCloud(userSettings = {}) {
    return {
        ...userSettings,
        githubPat: '',
        openweatherApiKey: '',
        geminiApiKey: '',
    };
}

/** Preserve local secret fields when cloud copies were stripped. */
export function mergeUserSettingsFromCloud(cloud = {}, local = {}) {
    const merged = { ...local, ...cloud };
    for (const key of BODY_SECRET_KEYS) {
        if (local[key]) {
            merged[key] = local[key];
        } else if (!cloud[key]) {
            merged[key] = '';
        }
    }
    return merged;
}
