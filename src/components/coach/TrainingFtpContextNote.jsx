import React from 'react';
import { Gauge } from 'lucide-react';
import { useProfileFtp } from '../../context/ProfileFtpContext';
import { describeProfileFtpSourceSubtitle } from '../../utils/profileFtp';
import CollapsibleInfoCard from '../ui/CollapsibleInfoCard';

/**
 * Shows which FTP value (manual / 20 min / 60 min) drives Training tab calculations.
 */
const TrainingFtpContextNote = ({ userSettings }) => {
    const profileFtp = useProfileFtp();
    const ftp = profileFtp.ftp || Number(userSettings?.ftp) || 0;

    if (!ftp) {
        return (
            <CollapsibleInfoCard
                title="FTP required for zone analysis"
                icon={Gauge}
                variant="primary"
                defaultExpanded
                className="mb-4"
                bodyClassName="!text-xs"
            >
                Set your FTP in Settings (manual or estimated from 20/60 min peaks) to unlock zone-based coach analysis.
            </CollapsibleInfoCard>
        );
    }

    const subtitle = describeProfileFtpSourceSubtitle(userSettings, profileFtp);

    return (
        <CollapsibleInfoCard
            title="FTP context for this tab"
            icon={Gauge}
            variant="default"
            defaultExpanded={false}
            className="mb-4"
            bodyClassName="!text-xs !text-cdmuted"
        >
            Training calculations use{' '}
            <strong className="text-cdtext tabular-nums">{ftp} W FTP</strong>
            {' '}— {subtitle}.
        </CollapsibleInfoCard>
    );
};

export default TrainingFtpContextNote;
