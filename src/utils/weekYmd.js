import { todayYmd } from './formatters.js';

/**
 * ISO Monday (YYYY-MM-DD) for the week containing referenceYmd.
 * @param {string} [referenceYmd]
 * @returns {string}
 */
export function getMondayYmd(referenceYmd = todayYmd()) {
    const [y, m, d] = referenceYmd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
