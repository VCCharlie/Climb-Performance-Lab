/**
 * OpenWeatherMap — prefer local Settings API key; optional cloud proxy fallback.
 */

import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { OPENWEATHER_PROXY_URL } from '../config';

export { OPENWEATHER_PROXY_URL };

/**
 * @param {string} action
 * @param {Record<string, unknown>} payload
 * @returns {Promise<unknown>}
 */
async function callOpenWeatherProxy(action, payload) {
    const response = await fetchWithTimeout(OPENWEATHER_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
    }, 25000);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.error || `Weather proxy failed (${response.status})`);
    }
    return data;
}

async function geocodeDirect(query, localApiKey, limit = 5) {
    const response = await fetchWithTimeout(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${encodeURIComponent(localApiKey)}`,
    );
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

async function fetchWeatherDirect(location, localApiKey) {
    let url;
    if (location.lat != null && location.lon != null) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${encodeURIComponent(localApiKey)}&units=metric`;
    } else if (location.q) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.q)}&appid=${encodeURIComponent(localApiKey)}&units=metric`;
    } else {
        throw new Error('Location required for weather lookup');
    }
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('Invalid API key. Check your key at openweathermap.org');
        if (response.status === 404) throw new Error('Location not found. Search for a town near the climb.');
        throw new Error(errData.message || 'Unknown error fetching weather data');
    }
    return response.json();
}

/**
 * Local API key first (per-device), cloud proxy when no key is configured.
 */
export async function geocodeLocation(query, localApiKey, limit = 5) {
    if (hasLocalOpenWeatherKey(localApiKey)) {
        return geocodeDirect(query, localApiKey, limit);
    }
    const data = await callOpenWeatherProxy('geocode', { query, limit });
    return Array.isArray(data) ? data : [];
}

/**
 * Local API key first, cloud proxy fallback.
 */
export async function fetchCurrentWeather(location, localApiKey) {
    if (hasLocalOpenWeatherKey(localApiKey)) {
        return fetchWeatherDirect(location, localApiKey);
    }
    return callOpenWeatherProxy('weather', location);
}

/** @param {string | undefined | null} localKey */
export function hasLocalOpenWeatherKey(localKey) {
    return !!(localKey && String(localKey).trim());
}
