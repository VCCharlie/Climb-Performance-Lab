import React, { useState } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { smartParseJSON } from '../../utils';
import ManualActivityImportBlock from './ManualActivityImportBlock';
import { Button, Card, inputBaseClass, cn } from '../ui';
import { useToast } from '../../context/ToastContext';

const ImportSection = ({
    intervalsConfig = { athleteId: '' },
    onDataDetected,
    stravaGetToken,
    onFetchedActivityFromUrl,
}) => {
    const [importText, setImportText] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const { showToast } = useToast();

    const processJsonText = (text) => {
        const trimmed = text.trim();
        if (!trimmed) {
            showToast('Paste JSON data first.', { variant: 'warning' });
            return;
        }
        if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
            showToast(
                'Only JSON activity exports are supported. Use Fetch & merge on the Activity Log tab, or paste JSON from Intervals.icu.',
                { variant: 'error', durationMs: 8000 },
            );
            return;
        }

        const parsedData = smartParseJSON(trimmed);
        if (parsedData.length > 0) {
            onDataDetected(parsedData);
            setImportText('');
        } else {
            showToast('No valid activities found in JSON.', { variant: 'error' });
        }
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';
        if (!isJson) {
            showToast('Only .json files are supported.', { variant: 'warning' });
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            setImportText(e.target.result);
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {typeof onFetchedActivityFromUrl === 'function' && (
                <Card variant="outlined" className="border-cdprimary/30 bg-cdprimarycontainer/10">
                    <ManualActivityImportBlock
                        intervalsConfig={intervalsConfig}
                        stravaGetToken={stravaGetToken}
                        onFetchedActivity={onFetchedActivityFromUrl}
                    />
                </Card>
            )}

            <div>
                <h4 className="text-cdtext font-semibold text-sm mb-2 flex items-center gap-2">
                    <FileJson size={16} className="text-cdblue" aria-hidden />
                    Import JSON backup
                </h4>
                <p className="text-xs text-cdmuted mb-3">
                    For one-off restores: paste or upload a <strong>.json</strong> export from Intervals.icu.
                    Day-to-day sync uses <strong>Fetch & merge</strong> on the Activity Log tab.
                </p>

                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) {
                            handleFileUpload(e.dataTransfer.files[0]);
                        }
                    }}
                    onClick={() => document.getElementById('jsonFileInput')?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('jsonFileInput')?.click(); }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                        'border-2 border-dashed rounded-cdlg p-8 mb-4 text-center cursor-pointer cd-transition cd-focus-ring',
                        isDragging
                            ? 'border-cdprimary bg-cdprimarycontainer/30'
                            : 'border-cdborder hover:border-cdprimary/40 bg-cdsurfacelow',
                    )}
                >
                    <input
                        id="jsonFileInput"
                        type="file"
                        accept=".json,application/json"
                        className="sr-only"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                    <Upload className={cn('mx-auto mb-2', isDragging ? 'text-cdprimary' : 'text-cdmuted')} size={32} aria-hidden />
                    <p className="text-sm font-semibold text-cdtext">Click to browse or drop a JSON file here</p>
                    <p className="text-xs text-cdmuted mt-1">Intervals.icu JSON export only</p>
                </div>

                <div className="relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cdsurface px-2 text-[10px] text-cdmuted font-semibold uppercase tracking-wide">
                        Or paste JSON
                    </span>
                    <textarea
                        className={cn(inputBaseClass, 'h-32 text-xs font-mono resize-y')}
                        placeholder="Paste JSON array or single activity object…"
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                    />
                </div>

                <Button variant="filled" size="lg" fullWidth className="mt-4" type="button" onClick={() => processJsonText(importText)}>
                    Process JSON
                </Button>
            </div>
        </div>
    );
};

export default ImportSection;
