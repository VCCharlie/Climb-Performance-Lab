import React, { createContext, useContext, useMemo } from 'react';
import { useActivitiesList } from '../hooks/useActivities';
import { resolveEffectiveProfileFtp } from '../utils/profileFtp';

const ProfileFtpContext = createContext(null);

export function ProfileFtpProvider({ userSettings, children }) {
    const activities = useActivitiesList();
    const value = useMemo(
        () => resolveEffectiveProfileFtp(userSettings, activities),
        [userSettings, activities],
    );

    return (
        <ProfileFtpContext.Provider value={value}>
            {children}
        </ProfileFtpContext.Provider>
    );
}

export function useProfileFtp() {
    const ctx = useContext(ProfileFtpContext);
    if (!ctx) {
        return {
            ftp: 0,
            source: 'manual',
            estimate: { ftp: null, confidence: 'none' },
            estimate20: { ftp: null, confidence: 'none' },
            estimate60: { ftp: null, confidence: 'none' },
        };
    }
    return ctx;
}
