// src/services/intervalsService.js

import { devLog } from '../utils/safeLog';
import { fetchIntervalsActivitiesViaCloud } from './intervalsCloudApi';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

/**
 * Fetches eFTP / fitness chart data from Intervals.icu via the Cloud Function.
 * Server-side credentials — no API key in the browser.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function fetchIntervalsData(startDate, endDate) {
  const cacheKey = `intervals_data_${startDate}_${endDate}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION) {
        devLog(`[IntervalsService] Returning cached data for ${startDate} - ${endDate}`);
        return data;
      }
    }

    const data = await fetchIntervalsActivitiesViaCloud({ startDate, endDate });

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
