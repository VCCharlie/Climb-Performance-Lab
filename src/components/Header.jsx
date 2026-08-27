import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Settings, LogIn, LogOut, User, Cloud, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { safeLocalStorageSet } from '../utils/safeStorage.js';
import { formatDateTimeNl } from '../utils/formatters';
import { logout } from '../firebase';
import { runGoogleSignIn, googleSignInErrorMessage } from '../utils/googleSignIn';
import { useActivitiesSync } from '../hooks/useActivities';
import { useProfileFtp } from '../context/ProfileFtpContext';
import { useToast } from '../context/ToastContext';
import { IconButton, cn } from './ui';
import SiteQuickLinks from './shell/SiteQuickLinks';
import MainNavTabs from './shell/MainNavTabs';
import { buildDesktopHeaderToolbar, buildMobileHeaderToolbar } from './shell/MobileContextToolbar';
import { useTodayIntervalsSync } from '../context/IntervalsSyncContext';

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
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    const isToday = d.getDate() === today.getDate()
        && d.getMonth() === today.getMonth()
        && d.getFullYear() === today.getFullYear();

    if (isToday) {
        const timePart = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        return `Today, ${timePart}`;
    }
    return formatDateTimeNl(d);
}

function Header({
    userSettings,
    onOpenSettings,
    user,
    activeTab = null,
    onTabChange,
    timeRange = '1Y',
    onTimeRangeChange,
    customStart = '',
    customEnd = '',
    onCustomStart,
    onCustomEnd,
}) {
    const { showToast } = useToast();
    const { syncStatus, lastActivityDate } = useActivitiesSync();
    const profileFtp = useProfileFtp();
    const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('app_last_sync_time'));
    const [authBusy, setAuthBusy] = useState(false);
    const [avatarImgFailed, setAvatarImgFailed] = useState(false);
    const [desktopScrolled, setDesktopScrolled] = useState(false);
    const scrollRafRef = useRef(null);

    useEffect(() => {
        const onScroll = () => {
            if (scrollRafRef.current !== null) return;
            scrollRafRef.current = window.requestAnimationFrame(() => {
                scrollRafRef.current = null;
                setDesktopScrolled(window.scrollY > 6);
            });
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (scrollRafRef.current !== null) {
                window.cancelAnimationFrame(scrollRafRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (syncStatus === 'synced' || syncStatus === 'success' || syncStatus === 'done') {
            const now = new Date().toISOString();
            setLastSyncTime(now);
            safeLocalStorageSet('app_last_sync_time', now);
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
            showToast(googleSignInErrorMessage(err), { variant: 'error', durationMs: 10000 });
        } finally {
            setAuthBusy(false);
        }
    }, [user, authBusy, showToast]);

    const displayWeight = userSettings.privacyMode ? '***' : `${userSettings.weight} kg`;
    const displayFtp = userSettings.privacyMode ? '***' : `${profileFtp.ftp || userSettings.ftp} W`;
    const formattedDate = formatUpdatedAt(lastSyncTime || lastActivityDate);

    const isSynced = syncStatus === 'synced' || syncStatus === 'success' || syncStatus === 'done';
    const isSyncing = syncStatus === 'syncing' || syncStatus === 'started' || syncStatus === 'enriching';

    const syncLabel = isSynced ? 'Synced' : isSyncing ? 'Syncing' : syncStatus === 'error' ? 'Offline' : 'Idle';

    const showGooglePhoto = Boolean(user?.photoURL) && !avatarImgFailed;
    const showAppChrome = Boolean(user);
    const { syncTodayActivities, isTodaySyncBusy } = useTodayIntervalsSync();

    const toolbarProps = {
        activeTab,
        timeRange,
        onTimeRangeChange,
        customStart,
        customEnd,
        onCustomStart,
        onCustomEnd,
        syncTodayActivities,
        isTodaySyncBusy,
    };

    const mobileToolbar = user && activeTab ? buildMobileHeaderToolbar(toolbarProps) : null;
    const desktopToolbar = user && activeTab ? buildDesktopHeaderToolbar(toolbarProps) : null;

    return (
        <header
            className={cn(
                'sticky top-0 z-40 border-b border-cdborder/50',
                'bg-cdsurface/85 backdrop-blur-md supports-[backdrop-filter]:bg-cdsurface/75',
                desktopScrolled && 'md:bg-cdsurface md:backdrop-blur-none md:supports-[backdrop-filter]:md:bg-cdsurface',
            )}
        >
            <SiteQuickLinks userSettings={userSettings} />
            <div className="max-w-7xl mx-auto flex justify-between items-center gap-2 px-3 py-2 md:gap-3 md:px-4 md:py-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 shrink-0 lg:max-w-[14rem]">
                    <div className="bg-cdbrand p-1.5 md:p-2 rounded-cdmd shrink-0" aria-hidden>
                        <Activity className="text-cdonbrand w-4 h-4 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base md:text-xl font-head font-bold tracking-tight text-cdtext truncate">
                            Climb Lab <span className="text-cdbrand">Pro</span>
                        </h1>
                        {showAppChrome && (
                            <p className="hidden sm:block text-xs text-cdmuted">Performance Analytics</p>
                        )}
                    </div>
                </div>

                {showAppChrome && onTabChange && activeTab ? (
                    <div className="hidden lg:flex flex-1 justify-center min-w-0 px-2">
                        <MainNavTabs
                            activeTab={activeTab}
                            onTabChange={onTabChange}
                            variant="header"
                        />
                    </div>
                ) : null}

                {mobileToolbar?.actions ? (
                    <div className="md:hidden shrink-0">{mobileToolbar.actions}</div>
                ) : null}

                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                    {desktopToolbar?.actions ? (
                        <div className="hidden lg:flex items-center gap-1.5 mr-0.5">
                            {desktopToolbar.actions}
                        </div>
                    ) : null}

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
                        className={cn('!w-auto !h-9 md:!h-10 !rounded-cdmd px-1 gap-1.5 md:gap-2', user && 'pr-1.5 md:pr-2')}
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
                                        className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-cdborder object-cover bg-cdsurface"
                                        onError={() => setAvatarImgFailed(true)}
                                    />
                                ) : (
                                    <div
                                        className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-cdborder bg-cdsurface flex items-center justify-center text-[10px] md:text-[11px] font-bold text-cdtext"
                                        aria-hidden
                                    >
                                        {initialsFromUser(user)}
                                    </div>
                                )}
                                <LogOut size={16} className="hidden sm:block text-cdmuted" aria-hidden />
                            </>
                        ) : (
                            <>
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-cdsurfacelow flex items-center justify-center text-cdmuted" aria-hidden>
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
            {mobileToolbar?.footer ? (
                <div className="md:hidden max-w-7xl mx-auto px-3 pb-2">
                    {mobileToolbar.footer}
                </div>
            ) : null}
            {desktopToolbar?.footer ? (
                <div className="hidden lg:block max-w-7xl mx-auto px-4 pb-2">
                    {desktopToolbar.footer}
                </div>
            ) : null}
        </header>
    );
}

export default React.memo(Header);
