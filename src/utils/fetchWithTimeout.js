/**
 * fetch() with AbortController timeout — prevents hung tabs on slow external APIs.
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs=30000]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}
