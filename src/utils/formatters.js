/**
 * src/utils/formatters.js
 * Date and Time utilities
 */

export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    if (dateStr.includes('/') || dateStr.includes('-')) {
        const sep = dateStr.includes('/') ? '/' : '-';
        const parts = dateStr.split(sep);
        if (parts.length === 3) {
            if (parts[0].length <= 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return dateStr;
        }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return dateStr;
};

export const formatDateDDMMYYYY = (isoString) => {
    if (!isoString) return '-';
    try {
        const d = new Date(isoString);
        // Forceer nl-NL: "09-02-2026"
        return d.toLocaleDateString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return isoString;
    }
};

export const formatTime = (seconds) => {
    const sNum = Number(seconds);
    if (!sNum || isNaN(sNum)) return "00:00";
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
