// src/services/intervalsService.js

/**
 * API URL van de Google Cloud Function
 */
const API_URL = 'https://europe-west1-climb-performance-lab.cloudfunctions.net/sync-intervals-v2';

/**
 * Haalt de eFTP en datum data op van Intervals.icu via de Cloud Function.
 * * @param {string} startDate - De startdatum in formaat 'YYYY-MM-DD'
 * @param {string} endDate - De einddatum in formaat 'YYYY-MM-DD'
 * @returns {Promise<Array>} - Een promise die resolveert naar de array met chart data
 */
export async function fetchIntervalsData(startDate, endDate) {
  try {
    const response = await fetch(API_URL, {
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
    return data;

  } catch (error) {
    console.error('Error fetching intervals data:', error);
    // We gooien de error opnieuw op zodat de component weet dat het misging
    throw error;
  }
}