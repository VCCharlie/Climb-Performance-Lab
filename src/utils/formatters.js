/**
 * src/utils/formatters.js
 * Date and Time utilities
 */

const NL_LOCALE = 'nl-NL';

/**
 * Consistent Dutch number formatting (grouping `.`, decimal `,`).
 * @param {number} value
 * @param {{ minimumFractionDigits?: number, maximumFractionDigits?: number }} [options]
 */
export function formatNlNumber(value, options = {}) {
    const n = Number(value);
    if (value === null || value === undefined || Number.isNaN(n)) return '—';
    const minF = options.minimumFractionDigits ?? 0;
    const maxF = options.maximumFractionDigits ?? (minF > 0 ? minF : 0);
    return n.toLocaleString(NL_LOCALE, {
        minimumFractionDigits: minF,
        maximumFractionDigits: maxF,
    });
}

/**
 * Calendar date (YYYY-MM-DD) for filters, grouping, and comparisons.
 * @param {string | Date | number | null | undefined} dateStr
 * @returns {string | null}
 */
export const normalizeDate = (dateStr) => {
    if (dateStr == null || dateStr === '') return null;

    if (dateStr instanceof Date) {
        if (!Number.isNaN(dateStr.getTime())) return dateStr.toISOString().split('T')[0];
        return null;
    }
    if (typeof dateStr === 'number') {
        const d = new Date(dateStr);
        if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return null;
    }

    const str = String(dateStr).trim();
    if (!str) return null;

    if (str.includes('T')) return str.split('T')[0];
    if (str.includes('/') || str.includes('-')) {
        const sep = str.includes('/') ? '/' : '-';
        const parts = str.split(sep);
        if (parts.length === 3) {
            if (parts[0].length <= 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            if (/^\d{4}$/.test(parts[0]) && parts[0].length === 4) {
                return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
            return str;
        }
    }
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return str;
};

/**
 * Activity start date/time for storage — preserves ISO datetime when the source includes time.
 * @param {string | Date | number | null | undefined} dateStr
 * @returns {string | null}
 */
export const normalizeActivityDate = (dateStr) => {
    if (dateStr == null || dateStr === '') return null;

    if (dateStr instanceof Date) {
        if (!Number.isNaN(dateStr.getTime())) return dateStr.toISOString();
        return null;
    }
    if (typeof dateStr === 'number') {
        const d = new Date(dateStr);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
        return null;
    }

    const str = String(dateStr).trim();
    if (!str) return null;

    if (str.includes('T')) {
        const d = new Date(str);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
        return str;
    }

    return normalizeDate(str);
};

export const formatDateDDMMYYYY = (isoString) => {
    if (!isoString) return '-';
    if (isoString instanceof Date) {
        if (Number.isNaN(isoString.getTime())) return '-';
        const y = isoString.getFullYear();
        const m = String(isoString.getMonth() + 1).padStart(2, '0');
        const d = String(isoString.getDate()).padStart(2, '0');
        return `${d}-${m}-${y}`;
    }
    const str = String(isoString);
    const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
        return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
    }
    try {
        const d = new Date(isoString);
        if (Number.isNaN(d.getTime())) return str;
        return d.toLocaleDateString(NL_LOCALE, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return str;
    }
};

/**
 * ISO date (YYYY-MM-DD) → Dutch display dd-mm-jjjj (same as formatDateDDMMYYYY).
 * @param {string | null | undefined} isoYmd
 * @returns {string}
 */
export function formatIsoToNlDmy(isoYmd) {
    if (!isoYmd || typeof isoYmd !== 'string' || isoYmd.length < 10) return '';
    const formatted = formatDateDDMMYYYY(isoYmd.slice(0, 10));
    return formatted === '-' ? '' : formatted;
}

/**
 * Date + time for UI labels (Dutch calendar order).
 * @param {string | Date | number} value
 * @returns {string}
 */
export function formatDateTimeNl(value) {
    if (!value) return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    const datePart = formatDateDDMMYYYY(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
    const timePart = d.toLocaleTimeString(NL_LOCALE, { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
}

/**
 * Parse Dutch day-first dates into ISO YYYY-MM-DD (for storage / filters).
 * Accepts dd/mm/jjjj, dd-mm-jjjj, dd.mm.jjjj; already-ISO values pass through.
 * @param {string} value
 * @returns {string | null} ISO date or null if empty/invalid
 */
export function parseNlDmyToIso(value) {
    const s = String(value ?? '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const formatTime = (value) => {
    let sNum = 0;
    if (typeof value === 'number' && !Number.isNaN(value)) {
        sNum = Math.floor(value);
    } else if (value != null && value !== '') {
        const parsed = parseDurationToSeconds(String(value));
        if (parsed > 0) {
            sNum = Math.floor(parsed);
        } else {
            const n = Number(value);
            if (!Number.isNaN(n) && n > 0) sNum = Math.floor(n);
        }
    }
    if (!sNum || sNum <= 0) return '00:00';
    const h = Math.floor(sNum / 3600);
    const m = Math.floor((sNum % 3600) / 60);
    const s = Math.floor(sNum % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const parseDurationToSeconds = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    if (str.includes(':')) {
        const parts = str.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    if (str.includes('h') || str.includes('m') || str.includes('s')) {
        let total = 0;
        const h = str.match(/(\d+)h/);
        const m = str.match(/(\d+)m/);
        const s = str.match(/(\d+)s/);
        if (h) total += parseInt(h[1]) * 3600;
        if (m) total += parseInt(m[1]) * 60;
        if (s) total += parseInt(s[1]);
        return total > 0 ? total : 0;
    }
    const rawNum = parseFloat(str.replace(',', '.'));
    return !isNaN(rawNum) ? rawNum : 0;
};
