// src/services/intervalsService.js

import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { devLog } from '../utils/safeLog';

/**
 * API URL van de Google Cloud Function
 */
const API_URL = 'https://europe-west1-climb-performance-lab.cloudfunctions.net/sync-intervals-v2';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

/**
 * Haalt de eFTP en datum data op van Intervals.icu via de Cloud Function.
 * Implementeert LocalStorage caching om API calls te verminderen.
 * 
 * @param {string} startDate - De startdatum in formaat 'YYYY-MM-DD'
 * @param {string} endDate - De einddatum in formaat 'YYYY-MM-DD'
 * @returns {Promise<Array>} - Een promise die resolveert naar de array met chart data
 */
export async function fetchIntervalsData(startDate, endDate) {
  const cacheKey = `intervals_data_${startDate}_${endDate}`;

  try {
    // 1. Check Cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION) {
        devLog(`[IntervalsService] Returning cached data for ${startDate} - ${endDate}`);
        return data;
      }
    }

    // 2. Fetch API
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 3. Save to Cache (Try/Catch for quota limits)
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      console.warn('[IntervalsService] Failed to cache data (storage full?)', e);
    }

    return data;

  } catch (error) {
    console.error('Error fetching intervals data:', error);
    throw error;
  }
}