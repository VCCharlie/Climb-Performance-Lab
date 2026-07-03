import React, { useState } from 'react';
import { Download, Upload, ArrowUpRight } from 'lucide-react';
import { smartParseCSV, smartParseJSON } from '../../utils';
import ManualActivityImportBlock from './ManualActivityImportBlock';
import { Button, Card, inputBaseClass, cn } from '../ui';

const ImportSection = ({
    intervalsConfig = { athleteId: '' },
    onDataDetected,
    stravaGetToken,
    onFetchedActivityFromUrl,
}) => {
    const [importText, setImportText] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const handleFileUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setImportText(e.target.result);
        };
        reader.readAsText(file);
    };

    const handleProcessInfo = () => {
        const text = importText.trim();
        if (!text) {
            alert('Paste data into the field first.');
            return;
        }

        const parsedData = text.startsWith('[') || text.startsWith('{')
            ? smartParseJSON(text)
            : smartParseCSV(text);

        if (parsedData.length > 0) {
            onDataDetected(parsedData);
            setImportText('');
        } else {
            alert('No valid activities found.');
        }
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

            <Card variant="filled" padding="md">
                <h4 className="text-cdtext font-semibold text-sm mb-2 flex items-center gap-2">
                    <Download size={16} className="text-cdblue" aria-hidden />
                    Step 1: Download data
                </h4>
                <p className="text-xs text-cdmuted mb-3">
                    Open Intervals Activities, switch to list view, select rides, then <strong>Edit &gt; Export CSV</strong>.
                </p>
                <a
                    href={`https://intervals.icu/athlete/${intervalsConfig.athleteId}/activities`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-cdmd bg-cdprimarycontainer text-cdonprimarycontainer hover:brightness-95 cd-transition cd-focus-ring"
                >
                    Open Intervals.icu Activities
                    <ArrowUpRight size={12} aria-hidden />
                </a>
            </Card>

            <div>
                <h4 className="text-cdtext font-semibold text-sm mb-2 flex items-center gap-2">
                    <Upload size={16} className="text-cdgreen" aria-hidden />
                    Step 2: Import file
                </h4>

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
                    onClick={() => document.getElementById('fileInput')?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('fileInput')?.click(); }}
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
                        id="fileInput"
                        type="file"
                        accept=".csv,.json"
                        className="sr-only"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                    <Upload className={cn('mx-auto mb-2', isDragging ? 'text-cdprimary' : 'text-cdmuted')} size={32} aria-hidden />
                    <p className="text-sm font-semibold text-cdtext">Click to browse or drop a file here</p>
                    <p className="text-xs text-cdmuted mt-1">Supports .csv and .json exports from Intervals.icu</p>
                </div>

                <div className="relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cdsurface px-2 text-[10px] text-cdmuted font-semibold uppercase tracking-wide">
                        Or paste text
                    </span>
                    <textarea
                        className={cn(inputBaseClass, 'h-32 text-xs font-mono resize-y')}
                        placeholder="Paste CSV or JSON here…"
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                    />
                </div>

                <Button variant="filled" size="lg" fullWidth className="mt-4" type="button" onClick={handleProcessInfo}>
                    Process data (CSV or JSON)
                </Button>
            </div>
        </div>
    );
};

export default ImportSection;
