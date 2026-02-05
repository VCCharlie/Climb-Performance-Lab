import React, { useState } from 'react';
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';
import ActivityLogTab from './DataHub/ActivityLogTab';
import SyncTab from './DataHub/SyncTab';
import ImportTab from './DataHub/ImportTab';
import ReviewModal from './DataHub/ReviewModal';

const DataHub = ({ activities, onImport, onDelete, onClear, intervalsConfig }) => {
    const [internalTab, setInternalTab] = useState('log');

    // Modal & Import State
    const [showModal, setShowModal] = useState(false);
    const [fetchedActivities, setFetchedActivities] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- ACTIONS (DELETE & CLEAR) ---
    const handleDeleteSingle = async (id) => {
        // 1. Verwijder uit Firebase
        if (db) {
            try {
                await deleteDoc(doc(db, "activities", String(id)));
                console.log("Deleted from Firebase:", id);
            } catch (e) {
                console.error("Firebase delete failed:", e);
                alert("Kon activiteit niet verwijderen uit database.");
                return;
            }
        }
        // 2. Update Lokale UI (via prop)
        onDelete(id);
    };

    const handleClearDatabase = async () => {
        if (!confirm("WEET JE HET ZEKER?\n\nHiermee verwijder je ALLE activiteiten uit de database. Dit kan niet ongedaan worden gemaakt.")) return;
        if (!confirm("ECHT ZEKER? Typ 'JA' in je hoofd en klik OK.")) return;

        setIsDeleting(true);
        try {
            if (db && activities.length > 0) {
                // Verwijder één voor één
                const promises = activities.map(act => deleteDoc(doc(db, "activities", String(act.id))));
                await Promise.all(promises);
                console.log("All activities deleted from Firebase");
            }
            // Update UI
            if (onClear) onClear();
            alert("Database succesvol gewist. Klaar voor een schone start!");
        } catch (e) {
            console.error("Clear DB Error:", e);
            alert("Fout bij wissen database: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    // --- IMPORT FLOW HELPERS ---
    const handleResults = (results) => {
        if (results && results.length > 0) {
            setFetchedActivities(results);
            setSelectedActivities(results.map(r => r.id));
            setShowModal(true);
        }
    };

    const toggleActivityTypeInPreview = (id) => {
        setFetchedActivities(prev => prev.map(act => {
            if (act.id === id) {
                const newType = act.type === 'VirtualRide' ? 'Ride' : 'VirtualRide';
                return { ...act, type: newType };
            }
            return act;
        }));
    };

    const confirmImport = async () => {
        const toImport = fetchedActivities.filter(a => selectedActivities.includes(a.id));
        onImport(toImport);

        if (db) {
            let savedCount = 0;
            try {
                for (const act of toImport) {
                    if (act.id) {
                        await setDoc(doc(db, "activities", String(act.id)), act, { merge: true });
                        savedCount++;
                    }
                }
                console.log(`Saved ${savedCount} activities to Firebase`);
            } catch (e) {
                alert("Let op: Data lokaal geïmporteerd, maar Cloud backup mislukt: " + e.message);
            }
        }
        setShowModal(false);
        setFetchedActivities([]);
        setInternalTab('log');
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[500px] flex flex-col relative animate-in fade-in">

            {/* MODAL */}
            {showModal && (
                <ReviewModal
                    fetchedActivities={fetchedActivities}
                    selectedActivities={selectedActivities}
                    setSelectedActivities={setSelectedActivities}
                    onClose={() => setShowModal(false)}
                    onImport={confirmImport}
                    toggleActivityType={toggleActivityTypeInPreview}
                />
            )}

            {/* TABS */}
            <div className="flex border-b border-slate-700">
                <button onClick={() => setInternalTab('log')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'log' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Activity Log</button>
                <button onClick={() => setInternalTab('intervals')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'intervals' ? 'bg-slate-700 text-orange-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Sync (API)</button>
                <button onClick={() => setInternalTab('import')} className={`flex-1 py-3 text-sm font-bold ${internalTab === 'import' ? 'bg-slate-700 text-yellow-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>Import (CSV/JSON)</button>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {internalTab === 'log' && (
                    <ActivityLogTab
                        activities={activities}
                        onDelete={handleDeleteSingle}
                        onClear={handleClearDatabase}
                        isDeleting={isDeleting}
                    />
                )}

                {internalTab === 'intervals' && (
                    <SyncTab
                        intervalsConfig={intervalsConfig}
                        existingActivities={activities}
                        onSyncResults={handleResults}
                    />
                )}

                {internalTab === 'import' && (
                    <ImportTab
                        intervalsConfig={intervalsConfig}
                        onImportResults={handleResults}
                    />
                )}
            </div>
        </div>
    );
};

export default DataHub;