/**
 * Build the rows that should be persisted when an import replaces duplicate
 * activity ids. The merge happens before deletion so the replacement row can
 * carry enrichment fields from the duplicate that is about to be removed.
 *
 * @param {object} args
 * @param {object[]} args.activities existing rows
 * @param {object[]} args.toImport incoming rows selected for import
 * @param {(activities: object[], incoming: object) => object|null} args.findDuplicate
 * @param {(incoming: object, duplicate: object) => object} args.mergeDuplicate
 * @returns {{preparedImport: object[], idsToDelete: Array<string|number>, replacedCount: number}}
 */
export function prepareImportedActivitiesForDuplicateReplacement({
    activities = [],
    toImport = [],
    findDuplicate,
    mergeDuplicate,
}) {
    const idsToDelete = [];
    let replacedCount = 0;

    const preparedImport = (toImport || []).map((activity) => {
        const duplicate = findDuplicate ? findDuplicate(activities || [], activity) : null;
        if (!duplicate) return activity;

        idsToDelete.push(duplicate.id);
        replacedCount++;

        return mergeDuplicate ? mergeDuplicate(activity, duplicate) : activity;
    });

    return { preparedImport, idsToDelete, replacedCount };
}

/**
 * Persist imported activity rows before removing duplicate rows they replace.
 * This avoids cloud data loss if a replacement write fails partway through an import.
 *
 * @param {object} args
 * @param {object[]} args.activities existing rows, used to protect enriched fields
 * @param {object[]} args.toImport incoming rows selected for import
 * @param {Array<string|number>} args.idsToDelete duplicate ids to remove after writes succeed
 * @param {(id: string|number, payload: object) => Promise<unknown>} args.writeActivity
 * @param {(id: string|number) => Promise<unknown>} args.deleteActivity
 * @param {(incoming: object, existing: object|undefined) => object} args.mergePayload
 * @returns {Promise<number>} number of imported activities written
 */
export async function persistImportedActivitiesReplacingDuplicates({
    activities = [],
    toImport = [],
    idsToDelete = [],
    writeActivity,
    deleteActivity,
    mergePayload,
}) {
    const existingById = new Map((activities || []).map((activity) => [String(activity.id), activity]));

    await Promise.all(
        (toImport || []).map((activity) => {
            if (!activity?.id) return Promise.resolve();
            const existing = existingById.get(String(activity.id));
            const payload = mergePayload ? mergePayload(activity, existing) : activity;
            return writeActivity(activity.id, payload);
        }),
    );

    await Promise.all((idsToDelete || []).map((id) => deleteActivity(id)));
    return (toImport || []).length;
}
