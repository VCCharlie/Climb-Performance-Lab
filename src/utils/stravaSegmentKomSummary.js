/**
 * Build a compact Strava segment / leaderboard / PR summary from GET /activities/:id (include_all_efforts=true).
 */

/**
 * @param {object[]} efforts - Strava segment_efforts array
 * @returns {object|null} { label, tooltip, prCount, bestKomRank, kom_counts, highlights } or null
 */
export function buildStravaKomSummaryFromSegmentEfforts(efforts) {
    if (!Array.isArray(efforts) || efforts.length === 0) return null;

    const highlights = [];
    let prCount = 0;
    let bestKomRank = null;
    /** Index 1 = #1 leaderboard (crown); 2–10 = trophy + rank counts */
    const komCounts = Array(11).fill(0);

    for (const seg of efforts) {
        const name = (seg.name || seg.segment?.name || '').trim();
        if (!name) continue;

        const isPr = Number(seg.pr_rank) === 1;
        const kr = Number(seg.kom_rank);
        const inKomLeaderboard = Number.isFinite(kr) && kr >= 1 && kr <= 10;

        if (isPr) prCount += 1;
        if (inKomLeaderboard) {
            komCounts[kr] += 1;
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

    const hasKom = komCounts.some((c, i) => i >= 1 && i <= 10 && c > 0);
    const labelParts = [];
    if (prCount > 0) labelParts.push(prCount > 1 ? `${prCount}× PR` : 'PR');
    const label = labelParts.join(' · ') || (hasKom ? '\u200b' : 'Segments');

    const tooltipLines = highlights.slice(0, 12).map((h) => {
        const bits = [];
        if (h.pr) bits.push('PR');
        if (h.komRank != null) {
            bits.push(h.komRank === 1 ? '1st overall' : `${h.komRank}${ordinalSuffix(h.komRank)} overall`);
        }
        return `${h.name}${bits.length ? ` (${bits.join(', ')})` : ''}`;
    });
    const tooltip = tooltipLines.join('\n');

    return {
        label,
        tooltip,
        prCount,
        bestKomRank,
        kom_counts: komCounts,
        highlights,
    };
}

function ordinalSuffix(n) {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

/**
 * Derive crown / podium trophy counts for UI (supports legacy summaries without kom_counts).
 * @param {object|null|undefined} s - strava_kom_summary
 * @returns {{ king: number, ranks: { rank: number, count: number }[] }}
 */
export function getKomBadgeCountsFromSummary(s) {
    if (!s || typeof s !== 'object') return { king: 0, ranks: [] };

    if (Array.isArray(s.kom_counts) && s.kom_counts.length >= 11) {
        const king = Number(s.kom_counts[1]) || 0;
        const ranks = [];
        for (let r = 2; r <= 10; r += 1) {
            const c = Number(s.kom_counts[r]) || 0;
            if (c > 0) ranks.push({ rank: r, count: c });
        }
        return { king, ranks };
    }

    const label = String(s.label || '');
    const podiumMatches = [...label.matchAll(/KOM#(\d+)/gi)];
    if (podiumMatches.length > 0) {
        const byRank = new Map();
        for (const m of podiumMatches) {
            const r = Number(m[1]);
            if (r >= 2 && r <= 10) byRank.set(r, (byRank.get(r) || 0) + 1);
        }
        const ranks = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([rank, count]) => ({ rank, count }));
        return { king: 0, ranks };
    }

    if (/\bKOM\b/i.test(label) && !/KOM#/i.test(label)) {
        return { king: 1, ranks: [] };
    }

    const br = Number(s.bestKomRank);
    if (br === 1) return { king: 1, ranks: [] };
    if (Number.isFinite(br) && br >= 2 && br <= 10) return { king: 0, ranks: [{ rank: br, count: 1 }] };

    return { king: 0, ranks: [] };
}

/**
 * @param {object} stravaDetail - JSON from GET /activities/:id
 */
export function buildStravaKomSummaryFromActivityDetail(stravaDetail) {
    if (!stravaDetail || typeof stravaDetail !== 'object') return null;
    return buildStravaKomSummaryFromSegmentEfforts(stravaDetail.segment_efforts || []);
}
