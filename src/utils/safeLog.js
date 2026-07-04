/**
 * Safe logging helpers — redact secrets before console output and gate verbose
 * sync/debug logs to development builds only.
 */

const REDACTED = '***REDACTED***';

/** Field names treated as secrets anywhere in a logged object tree. */
const SECRET_FIELDS = new Set([
    'apiKey',
    'client_secret',
    'access_token',
    'refresh_token',
    'githubPat',
    'openweatherApiKey',
    'password',
    'token',
]);

/**
 * Deep-copy an object/array and replace known secret field values.
 * @param {unknown} value
 * @param {string[]} [extraFields]
 * @returns {unknown}
 */
export function redactSecrets(value, extraFields = []) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        return value.map((item) => redactSecrets(item, extraFields));
    }

    const fields = new Set([...SECRET_FIELDS, ...extraFields]);
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
        if (fields.has(key) && nested) {
            out[key] = REDACTED;
        } else if (nested !== null && typeof nested === 'object') {
            out[key] = redactSecrets(nested, extraFields);
        } else {
            out[key] = nested;
        }
    }
    return out;
}

/** Verbose debug log — stripped from production bundles when possible. */
export function devLog(...args) {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
}

/** Verbose debug warn — development only. */
export function devWarn(...args) {
    if (import.meta.env.DEV) {
        console.warn(...args);
    }
}
