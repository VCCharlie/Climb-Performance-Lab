/**
 * Display helpers for coach Q&A answers (lead sentence + body).
 */

/**
 * Split an answer into a bold lead sentence and the remaining body.
 * @param {string} text
 * @returns {{ lead: string, body: string }}
 */
export function splitCoachAnswerLead(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return { lead: '', body: '' };

    const newlineIdx = trimmed.indexOf('\n');
    const firstLine = newlineIdx >= 0 ? trimmed.slice(0, newlineIdx) : trimmed;
    const afterNewline = newlineIdx >= 0 ? trimmed.slice(newlineIdx + 1).trim() : '';

    const punctIdx = firstLine.search(/[.!?](?:\s|$)/);
    let lead;
    let restOfLine;
    if (punctIdx >= 0) {
        lead = firstLine.slice(0, punctIdx + 1).trim();
        restOfLine = firstLine.slice(punctIdx + 1).trim();
    } else {
        lead = firstLine.trim();
        restOfLine = '';
    }

    const body = [restOfLine, afterNewline].filter(Boolean).join('\n\n').trim();
    return { lead, body };
}

/**
 * Strip markdown bold markers for plain-text display.
 * @param {string} text
 */
export function stripMarkdownBold(text) {
    return String(text || '').replace(/\*\*/g, '');
}
