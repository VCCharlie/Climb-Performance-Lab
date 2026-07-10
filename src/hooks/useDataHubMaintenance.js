import { useState, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { stripUndefinedFields } from '../utils/mergeActivities';
import { enrichActivityGearFromStrava } from '../utils/stravaGearEnrich';

/**
 * Single-activity edit/delete, clear database, and no-power bulk delete flows.
 */
export function useDataHubMaintenance({
    activities,
    onImport,
    onClear,
    stravaGetToken,
    setIsDeleting,
}) {
    const [showNoPowerModal, setShowNoPowerModal] = useState(false);
    const [noPowerSelected, setNoPowerSelected] = useState([]);

    const handleSaveEdit = useCallback(async (updatedActivity, setEditingActivity) => {
        try {
            const prev = (activities || []).find((a) => String(a.id) === String(updatedActivity.id)) || {};
            let toSave = stripUndefinedFields({ ...prev, ...updatedActivity });
            if (stravaGetToken && toSave.strava_id) {
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
                await setDoc(doc(db, 'activities', String(toSave.id)), toSave, { merge: true });
            }
            onImport([toSave]);
            setEditingActivity(null);
        } catch (e) {
            alert(`Could not save changes: ${e.message}`);
        }
    }, [activities, onImport, stravaGetToken]);

    const handleDeleteSingle = useCallback(async (id) => {
        if (db) {
            try {
                await deleteDoc(doc(db, 'activities', String(id)));
            } catch {
                alert('Could not remove activity from the database.');
            }
        }
    }, []);

    const handleClearDatabase = useCallback(async () => {
        if (!confirm('Are you sure?\n\nThis removes ALL activities from the database.')) return;
        if (!confirm('Really sure? This cannot be undone.')) return;
        setIsDeleting(true);
        try {
            if (db && activities.length > 0) {
                const promises = activities.map((act) => deleteDoc(doc(db, 'activities', String(act.id))));
                await Promise.all(promises);
            }
            if (onClear) onClear();
            alert('Database cleared. Ready for a fresh start.');
        } catch (e) {
            alert(`Could not clear database: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    }, [activities, onClear, setIsDeleting]);

    const openNoPowerFilter = useCallback(() => {
        const noPower = (activities || []).filter((a) => !(Number(a.avg_power) > 0));
        if (noPower.length === 0) {
            alert('All activities have power data. Nothing to filter.');
            return;
        }
        setNoPowerSelected(noPower.map((a) => a.id));
        setShowNoPowerModal(true);
    }, [activities]);

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
            alert(`Could not delete: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    }, [noPowerSelected, setIsDeleting]);

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
