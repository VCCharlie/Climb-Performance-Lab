import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Settings, LogIn, LogOut, User, Cloud, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { logout } from '../firebase';
import { runGoogleSignIn, googleSignInErrorMessage } from '../utils/googleSignIn';
import { IconButton, cn } from './ui';

function initialsFromUser(user) {
    const n = user?.displayName?.trim() || user?.email?.trim() || '';
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
}

function formatUpdatedAt(dateToDisplay) {
    if (!dateToDisplay) return null;
    const d = new Date(dateToDisplay);
    const today = new Date();
    const isToday = d.getDate() === today.getDate()
        && d.getMonth() === today.getMonth()
        && d.getFullYear() === today.getFullYear();

    if (isToday) {
        return `Today, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const Header = ({ userSettings, onOpenSettings, user, syncStatus, lastActivityDate }) => {
    const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('app_last_sync_time'));
    const [authBusy, setAuthBusy] = useState(false);
    const [avatarImgFailed, setAvatarImgFailed] = useState(false);

    useEffect(() => {
        if (syncStatus === 'synced' || syncStatus === 'success' || syncStatus === 'done') {
            const now = new Date().toISOString();
            setLastSyncTime(now);
            localStorage.setItem('app_last_sync_time', now);
        }
    }, [syncStatus]);

    useEffect(() => {
        setAvatarImgFailed(false);
    }, [user?.uid, user?.photoURL]);

    const handleAuth = useCallback(async () => {
        if (authBusy) return;
        setAuthBusy(true);
        try {
            if (user) {
                await logout();
            } else {
                await runGoogleSignIn();
            }
        } catch (err) {
            window.alert(googleSignInErrorMessage(err));
        } finally {
            setAuthBusy(false);
        }
    }, [user, authBusy]);

    const displayWeight = userSettings.privacyMode ? '***' : `${userSettings.weight} kg`;
    const displayFtp = userSettings.privacyMode ? '***' : `${userSettings.ftp} W`;
    const formattedDate = formatUpdatedAt(lastSyncTime || lastActivityDate);

    const isSynced = syncStatus === 'synced' || syncStatus === 'success' || syncStatus === 'done';
    const isSyncing = syncStatus === 'syncing' || syncStatus === 'started' || syncStatus === 'enriching';

    const syncLabel = isSynced ? 'Synced' : isSyncing ? 'Syncing' : syncStatus === 'error' ? 'Offline' : 'Idle';

    const showGooglePhoto = Boolean(user?.photoURL) && !avatarImgFailed;
    const showAppChrome = Boolean(user);

    return (
        <header className="sticky top-0 z-40 border-b border-cdborder/50 bg-cdsurface/85 backdrop-blur-md supports-[backdrop-filter]:bg-cdsurface/75">
            <div className="max-w-7xl mx-auto flex justify-between items-center gap-3 px-3 py-2.5 md:px-4 md:py-3">
                <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                    <div className="bg-cdbrand p-2 rounded-cdmd shrink-0" aria-hidden>
                        <Activity className="text-cdonbrand w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-xl font-head font-bold tracking-tight text-cdtext truncate">
                            Climb<span className="text-cdbrand">Lab</span>
                        </h1>
                        {showAppChrome && (
                            <p className="hidden sm:block text-xs text-cdmuted">Performance Analytics</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {showAppChrome && (
                        <div
                            className="hidden sm:flex items-center gap-1.5 rounded-full bg-cdsurfacelow px-2.5 py-1.5"
                            title={`Sync status: ${syncStatus || 'idle'}`}
                        >
                            {isSynced && <CheckCircle size={14} className="text-cdgreen shrink-0" aria-hidden />}
                            {isSyncing && <RefreshCw size={14} className="text-cdbrand animate-spin shrink-0" aria-hidden />}
                            {syncStatus === 'error' && <AlertCircle size={14} className="text-cdred shrink-0" aria-hidden />}
                            {(syncStatus === 'idle' || !syncStatus) && <Cloud size={14} className="text-cdmuted shrink-0" aria-hidden />}
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-cdmuted hidden md:inline">
                                {syncLabel}
                            </span>
                        </div>
                    )}

                    {showAppChrome && formattedDate && (
                        <div className="hidden lg:flex flex-col justify-center rounded-cdmd bg-cdsurfacelow px-2.5 py-1.5 mr-1">
                            <span className="text-[10px] font-medium text-cdmuted whitespace-nowrap tabular-nums">
                                Updated {formattedDate}
                            </span>
                        </div>
                    )}

                    {showAppChrome && (
                        <div className="hidden md:flex items-center gap-2 rounded-cdmd bg-cdsurfacelow px-2.5 py-1.5 mr-1">
                            <div className="text-right">
                                <span className="block text-cdmuted text-[10px] font-medium uppercase tracking-wide">Weight</span>
                                <span className="text-cdtext text-xs font-semibold tabular-nums">{displayWeight}</span>
                            </div>
                            <div className="w-px h-8 bg-cdborder/60" aria-hidden />
                            <div className="text-right">
                                <span className="block text-cdmuted text-[10px] font-medium uppercase tracking-wide">FTP</span>
                                <span className="text-cdprimary text-xs font-semibold tabular-nums">{displayFtp}</span>
                            </div>
                        </div>
                    )}

                    <IconButton
                        variant="text"
                        onClick={handleAuth}
                        disabled={authBusy}
                        className={cn('!w-auto !h-10 !rounded-cdmd px-1.5 gap-2', user && 'pr-2')}
                        title={user ? `Logged in as ${user.displayName || user.email || 'account'}` : 'Sign in with Google'}
                        aria-label={user ? `Sign out ${user.displayName || user.email || 'account'}` : 'Sign in with Google'}
                    >
                        {user ? (
                            <>
                                {showGooglePhoto ? (
                                    <img
                                        src={user.photoURL}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="w-8 h-8 rounded-full border border-cdborder object-cover bg-cdsurface"
                                        onError={() => setAvatarImgFailed(true)}
                                    />
                                ) : (
                                    <div
                                        className="w-8 h-8 rounded-full border border-cdborder bg-cdsurface flex items-center justify-center text-[11px] font-bold text-cdtext"
                                        aria-hidden
                                    >
                                        {initialsFromUser(user)}
                                    </div>
                                )}
                                <LogOut size={16} className="hidden sm:block text-cdmuted" aria-hidden />
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-full bg-cdsurfacelow flex items-center justify-center text-cdmuted" aria-hidden>
                                    <User size={16} />
                                </div>
                                <LogIn size={16} className="hidden sm:block text-cdmuted" aria-hidden />
                            </>
                        )}
                    </IconButton>

                    {showAppChrome && (
                        <IconButton
                            variant="outlined"
                            onClick={onOpenSettings}
                            aria-label="Settings"
                            title="Settings"
                        >
                            <Settings size={20} aria-hidden />
                        </IconButton>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
