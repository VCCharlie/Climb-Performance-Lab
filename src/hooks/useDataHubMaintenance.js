import { useState, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { stripUndefinedFields } from '../utils/mergeActivities';
import { enrichActivityGearFromStrava } from '../utils/stravaGearEnrich';
import { applyManualClimbingCorrectionFlags } from '../utils/activityFieldRetention';
import { resolveOwnerUid, stampActivityOwnerId } from '../utils/activityOwnership.js';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

/**
 * Single-activity edit/delete, clear database, and no-power bulk delete flows.
 */
export function useDataHubMaintenance({
    activities,
    onUpsert,
    onClear,
    stravaGetToken,
    setIsDeleting,
}) {
    const { confirm } = useConfirm();
    const { showToast } = useToast();
    const [showNoPowerModal, setShowNoPowerModal] = useState(false);
    const [noPowerSelected, setNoPowerSelected] = useState([]);

    const handleSaveEdit = useCallback(async (updatedActivity, setEditingActivity) => {
        try {
            const prev = (activities || []).find((a) => String(a.id) === String(updatedActivity.id)) || {};
            let toSave = stripUndefinedFields(
                applyManualClimbingCorrectionFlags(prev, { ...prev, ...updatedActivity }),
            );
            if (stravaGetToken && toSave.strava_id && toSave.climbing_user_corrected !== true) {
                try {
                    const token = await stravaGetToken();
                    if (token) {
                        toSave = await enrichActivityGearFromStrava(toSave, null, token);
                    }
                } catch (gearErr) {
                    console.warn('[Edit save] Strava enrich failed:', gearErr);
                }
            }
            if (db) {
                const payload = stampActivityOwnerId(toSave, resolveOwnerUid(), prev);
                await setDoc(doc(db, 'activities', String(toSave.id)), payload, { merge: true });
            }
            onUpsert([toSave]);
            setEditingActivity(null);
        } catch (e) {
            showToast(`Could not save changes: ${e.message}`, { variant: 'error' });
        }
    }, [activities, onUpsert, stravaGetToken, showToast]);

    const handleDeleteSingle = useCallback(async (id) => {
        if (db) {
            try {
                await deleteDoc(doc(db, 'activities', String(id)));
            } catch {
                showToast('Could not remove activity from the database.', { variant: 'error' });
            }
        }
    }, [showToast]);

    const handleClearDatabase = useCallback(async () => {
        const firstConfirmed = await confirm({
            title: 'Clear all activities',
            message: 'This removes ALL activities from the database.',
            confirmLabel: 'Continue',
            variant: 'danger',
        });
        if (!firstConfirmed) return;
        const secondConfirmed = await confirm({
            title: 'Really clear everything?',
            message: 'This cannot be undone.',
            confirmLabel: 'Delete all activities',
            variant: 'danger',
        });
        if (!secondConfirmed) return;
        setIsDeleting(true);
        try {
            if (db && activities.length > 0) {
                const promises = activities.map((act) => deleteDoc(doc(db, 'activities', String(act.id))));
                await Promise.all(promises);
            }
            if (onClear) onClear();
            showToast('Database cleared. Ready for a fresh start.', { variant: 'success' });
        } catch (e) {
            showToast(`Could not clear database: ${e.message}`, { variant: 'error' });
        } finally {
            setIsDeleting(false);
        }
    }, [activities, onClear, setIsDeleting, confirm, showToast]);

    const openNoPowerFilter = useCallback(() => {
        const noPower = (activities || []).filter((a) => !(Number(a.avg_power) > 0));
        if (noPower.length === 0) {
            showToast('All activities have power data. Nothing to filter.', { variant: 'info' });
            return;
        }
        setNoPowerSelected(noPower.map((a) => a.id));
        setShowNoPowerModal(true);
    }, [activities, showToast]);

    const deleteNoPowerSelected = useCallback(async () => {
        if (noPowerSelected.length === 0) return;
        setIsDeleting(true);
        try {
            for (const id of noPowerSelected) {
                if (db) await deleteDoc(doc(db, 'activities', String(id)));
            }
            setShowNoPowerModal(false);
            setNoPowerSelected([]);
        } catch (e) {
            showToast(`Could not delete: ${e.message}`, { variant: 'error' });
        } finally {
            setIsDeleting(false);
        }
    }, [noPowerSelected, setIsDeleting, showToast]);

    return {
        showNoPowerModal,
        setShowNoPowerModal,
        noPowerSelected,
        setNoPowerSelected,
        handleSaveEdit,
        handleDeleteSingle,
        handleClearDatabase,
        openNoPowerFilter,
        deleteNoPowerSelected,
    };
}
