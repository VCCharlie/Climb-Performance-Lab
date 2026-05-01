/**
 * Build a compact Strava segment / KOM / PR summary from GET /activities/:id (include_all_efforts=true).
 */

/**
 * @param {object[]} efforts - Strava segment_efforts array
 * @returns {object|null} { label, tooltip, prCount, bestKomRank } or null if nothing notable
 */
export function buildStravaKomSummaryFromSegmentEfforts(efforts) {
    if (!Array.isArray(efforts) || efforts.length === 0) return null;

    const highlights = [];
    let prCount = 0;
    let bestKomRank = null;

    for (const seg of efforts) {
        const name = (seg.name || seg.segment?.name || '').trim();
        if (!name) continue;

        const isPr = Number(seg.pr_rank) === 1;
        const kr = Number(seg.kom_rank);
        const inKomLeaderboard = Number.isFinite(kr) && kr >= 1 && kr <= 10;

        if (isPr) prCount += 1;
        if (inKomLeaderboard) {
            if (bestKomRank == null || kr < bestKomRank) bestKomRank = kr;
        }

        if (isPr || inKomLeaderboard) {
            highlights.push({
                name,
                pr: isPr,
                komRank: inKomLeaderboard ? kr : null,
            });
        }
    }

    if (highlights.length === 0) return null;

    const parts = [];
    if (prCount > 0) parts.push(prCount > 1 ? `${prCount}× PR` : 'PR');
    if (bestKomRank != null) {
        parts.push(bestKomRank === 1 ? 'KOM' : `KOM#${bestKomRank}`);
    }
    const label = parts.join(' · ') || 'Segments';

    const tooltipLines = highlights.slice(0, 12).map((h) => {
        const bits = [];
        if (h.pr) bits.push('PR');
        if (h.komRank != null) bits.push(h.komRank === 1 ? 'KOM' : `KOM#${h.komRank}`);
        return `${h.name}${bits.length ? ` (${bits.join(', ')})` : ''}`;
    });
    const tooltip = tooltipLines.join('\n');

    return { label, tooltip, prCount, bestKomRank, highlights };
}

/**
 * @param {object} stravaDetail - JSON from GET /activities/:id
 */
export function buildStravaKomSummaryFromActivityDetail(stravaDetail) {
    if (!stravaDetail || typeof stravaDetail !== 'object') return null;
    return buildStravaKomSummaryFromSegmentEfforts(stravaDetail.segment_efforts || []);
}
