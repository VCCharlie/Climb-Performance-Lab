/**
 * fetch() with AbortController timeout — prevents hung tabs on slow external APIs.
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs=30000]
 * @param {typeof fetch} [fetchImpl=fetch]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000, fetchImpl = fetch) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}
