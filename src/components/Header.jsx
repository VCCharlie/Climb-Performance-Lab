import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Settings, LogIn, LogOut, User, Cloud, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { loginWithGoogle, logout } from '../firebase';

function initialsFromUser(user) {
    const n = user?.displayName?.trim() || user?.email?.trim() || '';
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
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
                await loginWithGoogle();
            }
        } catch (err) {
            const code = err?.code;
            let msg = err?.message || 'Sign-in failed.';
            if (code === 'auth/popup-blocked') {
                msg = 'Pop-up was blocked. Allow pop-ups for this site and try again.';
            } else if (code === 'auth/popup-closed-by-user') {
                msg = 'Sign-in was cancelled.';
            } else if (code === 'auth/network-request-failed') {
                msg = 'Network error. Check your connection and try again.';
            } else if (code === 'auth/unauthorized-domain') {
                msg = 'This domain is not authorized for Google sign-in. Check Firebase Auth settings.';
            }
            window.alert(msg);
        } finally {
            setAuthBusy(false);
        }
    }, [user, authBusy]);

    const displayWeight = userSettings.privacyMode ? '***' : `${userSettings.weight} kg`;
    const displayFtp = userSettings.privacyMode ? '***' : `${userSettings.ftp} W`;

    const dateToDisplay = lastSyncTime || lastActivityDate;
    let formattedDate = null;

    if (dateToDisplay) {
        const d = new Date(dateToDisplay);
        const today = new Date();
        const isToday = d.getDate() === today.getDate()
            && d.getMonth() === today.getMonth()
            && d.getFullYear() === today.getFullYear();

        if (isToday) {
            formattedDate = `Vandaag, ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            formattedDate = d.toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
    }

    const isSynced = syncStatus === 'synced' || syncStatus === 'success' || syncStatus === 'done';
    const isSyncing = syncStatus === 'syncing' || syncStatus === 'started' || syncStatus === 'enriching';

    const showGooglePhoto = Boolean(user?.photoURL) && !avatarImgFailed;

    return (
        <header className="bg-cdbg border-b border-cdborder p-3 md:p-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-yellow-400 p-1.5 md:p-2 rounded-lg shadow-lg shadow-yellow-400/20">
                        <Activity className="text-cdtext w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black tracking-tight text-cdtext uppercase italic">
                            Climb<span className="text-yellow-400">Lab</span>
                        </h1>
                        <p className="hidden sm:block text-xs text-cdmuted font-mono">Performance Analytics</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2 md:mr-4 md:border-r md:border-cdborder md:pr-4" title={`Sync Status: ${syncStatus || 'idle'}`}>
                        {isSynced && <CheckCircle size={16} className="text-green-500" />}
                        {isSyncing && <RefreshCw size={16} className="text-yellow-400 animate-spin" />}
                        {syncStatus === 'error' && <AlertCircle size={16} className="text-red-500" />}
                        {(syncStatus === 'idle' || !syncStatus) && <Cloud size={16} className="text-cdmuted" />}

                        <span className="text-[10px] uppercase font-bold text-cdmuted hidden md:block">
                            {isSynced ? 'Synced' : isSyncing ? 'Syncing' : syncStatus === 'error' ? 'Offline' : 'Idle'}
                        </span>
                    </div>

                    {formattedDate && (
                        <div className="hidden md:flex flex-col justify-center mr-4 border-r border-cdborder pr-4">
                            <span className="text-[10px] uppercase tracking-widest text-cdmuted font-mono whitespace-nowrap">
                                Bijgewerkt: {formattedDate}
                            </span>
                        </div>
                    )}

                    <div className="hidden md:flex gap-4 text-xs font-mono mr-4 border-r border-cdborder pr-4">
                        <div className="text-right">
                            <span className="block text-cdmuted uppercase text-[10px]">Weight</span>
                            <span className="text-cdtext font-bold">{displayWeight}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-cdmuted uppercase text-[10px]">FTP</span>
                            <span className="text-yellow-400 font-bold">{displayFtp}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleAuth}
                        disabled={authBusy}
                        className="flex items-center gap-2 text-xs font-bold text-cdmuted hover:text-cdtext transition-colors focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded-full p-1 disabled:opacity-50 disabled:pointer-events-none"
                        title={user ? `Logged in as ${user.displayName || user.email || 'account'}` : 'Login with Google'}
                        aria-label={user ? `Logout ${user.displayName || user.email || 'account'}` : 'Login with Google'}
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
                                        className="w-8 h-8 rounded-full border border-cdborder bg-cdsurface flex items-center justify-center text-[11px] font-black text-cdtext"
                                        aria-hidden
                                        title={user.displayName || user.email || 'Account'}
                                    >
                                        {initialsFromUser(user)}
                                    </div>
                                )}
                                <LogOut size={16} className="hidden sm:block" />
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-full bg-cdsurface flex items-center justify-center">
                                    <User size={16} />
                                </div>
                                <LogIn size={16} className="hidden sm:block" />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onOpenSettings}
                        aria-label="Settings and Configuration"
                        title="Settings"
                        className="bg-cdsurface hover:bg-cdborder p-2 rounded-full text-cdtext transition-all shadow-lg border border-cdborder focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                    >
                        <Settings size={20} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
