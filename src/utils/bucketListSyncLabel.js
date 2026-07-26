import { formatDateDDMMYYYY } from './formatters';

/**
 * User-facing one-line bucket list sync hint (English UI).
 * @param {{ isSignedIn?: boolean, updatedAt?: string | null, pbScanCompletedAt?: string | null }} opts
 */
export function formatBucketListSyncLabel(opts = {}) {
    const { isSignedIn = false, updatedAt, pbScanCompletedAt } = opts;
    if (!isSignedIn) {
        return 'Bucket list is stored on this device (sign in to sync across devices).';
    }
    const parts = [];
    if (pbScanCompletedAt) {
        const d = formatDateDDMMYYYY(pbScanCompletedAt.slice(0, 10));
        parts.push(`Last PB scan: ${d}`);
    }
    if (updatedAt) {
        const d = formatDateDDMMYYYY(updatedAt.slice(0, 10));
        parts.push(`Last saved: ${d}`);
    }
    if (parts.length === 0) {
        return 'Signed in — bucket list syncs to cloud when you edit or scan.';
    }
    return parts.join(' · ');
}
