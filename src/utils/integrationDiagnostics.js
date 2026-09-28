/**
 * Read-only integration status for Settings diagnostics (no secrets in output).
 */

import { hasLocalIntervalsCredentials } from '../services/intervalsCloudApi.js';
import { INTERVALS_LIST_ACTIVITY_FIELDS } from './intervals.js';
import { readIntervalsSyncHealthSummary } from './intervalsSyncHealth.js';
import { readLastIntervalsSyncAt } from './activityLogSyncLabel.js';
import { formatIntervalsSyncHealthLine } from './intervalsSyncHealth.js';
import { stravaConfigHasPrivateRead } from './stravaOAuthScopes.js';

/**
 * @param {object} args
 * @param {object} args.intervalsConfig
 * @param {object} args.stravaConfig
 * @param {boolean} args.isSignedIn
 * @returns {Array<{ label: string, value: string, tone?: 'ok' | 'warn' | 'muted' }>}
 */
export function buildIntegrationDiagnosticsLines({
    intervalsConfig,
    stravaConfig,
    isSignedIn,
}) {
    const lines = [];

    const athleteId = intervalsConfig?.athleteId?.trim?.() || '';
    const hasKey = Boolean(intervalsConfig?.apiKey?.trim?.());
    const direct = hasLocalIntervalsCredentials(intervalsConfig);

    lines.push({
        label: 'Google sign-in',
        value: isSignedIn ? 'Signed in (required for cloud sync & Firestore)' : 'Not signed in',
        tone: isSignedIn ? 'ok' : 'warn',
    });

    lines.push({
        label: 'Intervals Athlete ID',
        value: athleteId || 'Not set',
        tone: athleteId ? 'ok' : 'warn',
    });

    if (direct) {
        lines.push({
            label: 'Intervals sync route',
            value: 'Direct browser API (API key in Settings)',
            tone: 'ok',
        });
    } else if (isSignedIn) {
        lines.push({
            label: 'Intervals sync route',
            value: 'Cloud sync (server credentials / Firebase token)',
            tone: athleteId ? 'ok' : 'warn',
        });
    } else {
        lines.push({
            label: 'Intervals sync route',
            value: 'Unavailable — sign in or add API key',
            tone: 'warn',
        });
    }

    if (hasKey) {
        lines.push({
            label: 'Intervals API key (this device)',
            value: 'Present (not shown)',
            tone: 'ok',
        });
    } else {
        lines.push({
            label: 'Intervals API key (this device)',
            value: 'Not stored locally (cloud/nightly use server secrets)',
            tone: 'muted',
        });
    }

    const stravaConnected = Boolean(stravaConfig?.connected || stravaConfig?.athleteId);
    lines.push({
        label: 'Strava',
        value: stravaConnected
            ? (stravaConfigHasPrivateRead(stravaConfig)
                ? `Connected (athlete ${stravaConfig.athleteId || '?'})`
                : `Connected — limited scopes (reconnect for full enrich)`)
            : 'Not connected',
        tone: stravaConnected ? 'ok' : 'muted',
    });

    const fieldCount = INTERVALS_LIST_ACTIVITY_FIELDS.split(',').filter(Boolean).length;
    lines.push({
        label: 'Intervals list API fields',
        value: `${fieldCount} fields requested (must match cloud function)`,
        tone: 'muted',
    });

    const health = readIntervalsSyncHealthSummary();
    const lastAt = readLastIntervalsSyncAt();
    const healthLine = formatIntervalsSyncHealthLine(health, lastAt);
    lines.push({
        label: 'Last manual Intervals sync',
        value: healthLine || 'No sync recorded in this browser yet',
        tone: healthLine ? 'ok' : 'muted',
    });

    if (health?.syncRoute) {
        lines.push({
            label: 'Last sync route used',
            value: health.syncRoute === 'direct' ? 'Direct API' : 'Cloud sync',
            tone: 'muted',
        });
    }

    return lines;
}
