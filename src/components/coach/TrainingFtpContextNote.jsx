import React from 'react';
import { Gauge } from 'lucide-react';
import { useProfileFtp } from '../../context/ProfileFtpContext';
import { describeProfileFtpSourceSubtitle } from '../../utils/profileFtp';

/**
 * Shows which FTP value (manual / 20 min / 60 min) drives Training tab calculations.
 */
const TrainingFtpContextNote = ({ userSettings }) => {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;

    if (!ftp) {
        return (
            <div className="mb-4 px-4 py-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-xs text-cdtext">
                <Gauge size={14} className="inline mr-1.5 text-yellow-400 align-text-bottom" />
                Set your FTP in Settings (manual or estimated from 20/60 min peaks) to unlock zone-based coach analysis.
            </div>
        );
    }

    const subtitle = describeProfileFtpSourceSubtitle(userSettings, profileFtp);

    return (
        <div className="mb-4 px-4 py-3 rounded-lg border border-cdborder bg-cdborder/10 text-xs text-cdmuted flex flex-wrap items-center gap-x-2 gap-y-1">
            <Gauge size={14} className="text-cdaccent shrink-0" aria-hidden />
            <span>
                Training calculations use{' '}
                <strong className="text-cdtext tabular-nums">{ftp} W FTP</strong>
                {' '}— {subtitle}.
            </span>
        </div>
    );
};

export default TrainingFtpContextNote;
