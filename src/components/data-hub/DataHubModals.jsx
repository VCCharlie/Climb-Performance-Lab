import React from 'react';
import EditActivityModal from './EditActivityModal';
import BulkEditActivitiesModal from './BulkEditActivitiesModal';
import ImportModal from './ImportModal';
import DuplicateResolver from './DuplicateResolver';
import NoPowerModal from './NoPowerModal';
import MergePairModal from './MergePairModal';
import ActivityDetailModal from '../DataHub/ActivityDetailModal';
import { db } from '../../firebase';

/**
 * DataHub modal cluster (detail, edit, import preview, duplicates, no-power, merge).
 */
export default function DataHubModals({
    detailActivity,
    onCloseDetail,
    stravaGetToken,
    profileFtp,
    profileMaxHr,
    editingActivity,
    onCloseEdit,
    onSaveEdit,
    onFindOnStrava,
    activities,
    bulk,
    dataImport,
    maintenance,
    isDeleting,
}) {
    return (
        <>
            {detailActivity && (
                <ActivityDetailModal
                    activity={detailActivity}
                    onClose={onCloseDetail}
                    getStravaToken={stravaGetToken}
                    profileFtp={profileFtp}
                    profileMaxHr={profileMaxHr}
                />
            )}
            {editingActivity && (
                <EditActivityModal
                    activity={editingActivity}
                    allActivities={activities}
                    onClose={onCloseEdit}
                    onSave={onSaveEdit}
                    onFindOnStrava={onFindOnStrava}
                />
            )}
            {bulk.showBulkEditModal && (
                <BulkEditActivitiesModal
                    count={bulk.bulkSelectedIds.size}
                    allActivities={activities}
                    onClose={() => bulk.setShowBulkEditModal(false)}
                    onApply={bulk.handleBulkApplyPatch}
                />
            )}
            <ImportModal
                showModal={dataImport.showModal}
                onClose={() => dataImport.setShowModal(false)}
                fetchedActivities={dataImport.fetchedActivities}
                selectedActivities={dataImport.selectedActivities}
                setSelectedActivities={dataImport.setSelectedActivities}
                toggleActivityTypeInPreview={dataImport.toggleActivityTypeInPreview}
                previewSortConfig={dataImport.previewSortConfig}
                requestPreviewSort={dataImport.requestPreviewSort}
                confirmImport={dataImport.confirmImport}
                rawData={dataImport.rawData}
                sortedFetchedActivities={dataImport.sortedFetchedActivities}
                profileFtp={profileFtp}
            />
            {dataImport.showDuplicateModal && (
                <DuplicateResolver
                    duplicates={dataImport.duplicates}
                    onResolve={dataImport.resolveDuplicate}
                    onClose={() => dataImport.setShowDuplicateModal(false)}
                />
            )}
            <NoPowerModal
                open={maintenance.showNoPowerModal}
                activities={activities}
                selectedIds={maintenance.noPowerSelected}
                onToggleAll={() => {
                    const noPowerList = (activities || []).filter((a) => !(Number(a.avg_power) > 0));
                    const allSelected = noPowerList.every((a) => maintenance.noPowerSelected.includes(a.id));
                    maintenance.setNoPowerSelected(allSelected ? [] : noPowerList.map((a) => a.id));
                }}
                onToggleOne={(id) => maintenance.setNoPowerSelected((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )}
                onClose={() => maintenance.setShowNoPowerModal(false)}
                onDeleteSelected={maintenance.deleteNoPowerSelected}
                isDeleting={isDeleting}
            />
            <MergePairModal
                open={bulk.showMergeModal}
                mergePairPreview={bulk.mergePairPreview}
                mergeError={bulk.mergeError}
                isMerging={bulk.isMerging}
                hasDb={!!db}
                onClose={bulk.closeMergeModal}
                onConfirm={bulk.confirmMergePair}
            />
        </>
    );
}
