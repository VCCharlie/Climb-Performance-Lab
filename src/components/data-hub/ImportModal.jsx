
import React, { useState } from 'react';
import { Download, X, Zap, Info } from 'lucide-react';
import { TableHeader, Row } from './ActivityTable';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
    Button,
    Chip,
    IconButton,
    modalScrimClass,
    modalPanelWideClass,
    modalHeaderClass,
    modalToolbarClass,
    modalBodyScrollClass,
    modalFooterClass,
    tableClass,
    tableBodyClass,
} from '../ui';

const ImportModal = ({
    showModal,
    onClose,
    fetchedActivities,
    selectedActivities,
    setSelectedActivities,
    toggleActivityTypeInPreview,
    previewSortConfig,
    requestPreviewSort,
    confirmImport,
    rawData,
    sortedFetchedActivities,
    profileFtp,
}) => {
    const [showDebug, setShowDebug] = useState(false);
    const panelRef = useModalA11y({ isOpen: showModal, onClose });

    if (!showModal) return null;

    const selectWithPower = () => {
        const withPower = fetchedActivities.reduce((acc, a) => {
            if (a.avg_power > 0 || a.norm_power > 0) acc.push(a.id);
            return acc;
        }, []);
        setSelectedActivities(withPower);
    };

    return (
        <div className={`${modalScrimClass} z-[100]`}>
            <div
                ref={panelRef}
                className={modalPanelWideClass}
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-modal-title"
                tabIndex={-1}
            >
                <div className={modalHeaderClass}>
                    <h3 id="import-modal-title" className="font-semibold text-cdtext flex items-center gap-2 text-sm">
                        <Download size={16} className="text-cdgreen" aria-hidden />
                        {fetchedActivities.length} activities found
                    </h3>
                    <span className="text-xs text-cdmuted ml-auto mr-2 hidden sm:inline">Select activities to import or update</span>
                    <IconButton variant="text" onClick={onClose} aria-label="Close modal">
                        <X size={18} />
                    </IconButton>
                </div>
                <div className={modalToolbarClass}>
                    <Button variant="tonal" size="sm" type="button" onClick={() => setSelectedActivities(fetchedActivities.map((r) => r.id))}>
                        Select all
                    </Button>
                    <Button variant="tonal" size="sm" type="button" onClick={() => setSelectedActivities([])}>
                        Deselect all
                    </Button>
                    <Chip variant="assist" size="md" type="button" onClick={selectWithPower} icon={Zap}>
                        Only with power
                    </Chip>
                </div>
                <div className={modalBodyScrollClass}>
                    <table className={tableClass}>
                        <TableHeader config={previewSortConfig} requestSort={requestPreviewSort} hasActions={false} isPreview />
                        <tbody className={tableBodyClass}>
                            {sortedFetchedActivities.map((act) => (
                                <Row
                                    key={act.id}
                                    act={act}
                                    isPreview
                                    isSelected={selectedActivities.includes(act.id)}
                                    onToggleSelect={(id) => {
                                        if (selectedActivities.includes(id)) {
                                            setSelectedActivities((s) => s.filter((x) => x !== id));
                                        } else {
                                            setSelectedActivities((s) => [...s, id]);
                                        }
                                    }}
                                    onToggleType={toggleActivityTypeInPreview}
                                    profileFtp={profileFtp}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={modalFooterClass}>
                    <span className="text-xs text-cdmuted tabular-nums">
                        {selectedActivities.length} of {fetchedActivities.length} selected
                    </span>
                    <div className="flex gap-2">
                        <Button variant="text" size="sm" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            size="sm"
                            type="button"
                            onClick={confirmImport}
                            disabled={selectedActivities.length === 0}
                        >
                            Import {selectedActivities.length}
                        </Button>
                    </div>
                </div>
                {rawData && (
                    <div className="border-t border-cdborder/50 bg-cdsurfacelow p-3">
                        <Button variant="text" size="sm" type="button" onClick={() => setShowDebug(!showDebug)} className="w-full justify-center">
                            <Info size={12} aria-hidden />
                            {showDebug ? 'Hide debug data' : 'Show debug data (raw API response)'}
                        </Button>
                        {showDebug && (
                            <pre className="mt-2 text-[10px] text-cdgreen bg-cdsurface border border-cdborder/50 p-4 rounded-cdmd overflow-auto max-h-60 tabular-nums select-text">
                                {JSON.stringify(rawData, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportModal;
