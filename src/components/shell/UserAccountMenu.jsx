import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, Moon, Sun, User } from 'lucide-react';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';
import { Button, cn } from '../ui';
import { CURRENT_APP_VERSION } from '../../utils/deployRecovery';

function initialsFromUser(user) {
    const n = user?.displayName?.trim() || user?.email?.trim() || '';
    if (!n) return '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
}

/**
 * Account dropdown — sign-in prompt when signed out; profile + avatar when signed in.
 */
export default function UserAccountMenu({
    open,
    anchorRef,
    onClose,
    user,
    authBusy = false,
    onSignIn,
    onSignOut,
    theme,
    setTheme,
}) {
    const [avatarImgFailed, setAvatarImgFailed] = useState(false);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            const inButton = anchorRef?.current?.contains(e.target);
            const inMenu = e.target.closest('[data-anchored-dropdown]');
            if (!inButton && !inMenu) onClose?.();
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open, anchorRef, onClose]);

    const showGooglePhoto = Boolean(user?.photoURL) && !avatarImgFailed;
    const isDark = theme === 'dark';
    const displayName = user?.displayName?.trim() || user?.email?.trim() || 'Account';
    const email = user?.email?.trim() || '';

    const handleSignIn = async () => {
        if (authBusy || !onSignIn) return;
        onClose?.();
        await onSignIn();
    };

    const handleSignOut = async () => {
        if (authBusy || !onSignOut) return;
        onClose?.();
        await onSignOut();
    };

    return (
        <AnchoredDropdownPortal
            open={open}
            anchorRef={anchorRef}
            onClose={onClose}
            minWidth={260}
            className="min-w-[16.25rem]"
        >
            <div className="p-3 space-y-3">
                {user ? (
                    <div className="flex items-center gap-3">
                        {showGooglePhoto ? (
                            <img
                                key={`${user.uid}-${user.photoURL}`}
                                src={user.photoURL}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-full border border-cdborder object-cover bg-cdsurface shrink-0"
                                onError={() => setAvatarImgFailed(true)}
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full border border-cdborder bg-cdsurface flex items-center justify-center text-xs font-bold text-cdtext shrink-0"
                                aria-hidden
                            >
                                {initialsFromUser(user)}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-cdtext truncate" title={displayName}>
                                {displayName}
                            </p>
                            {email && email !== displayName && (
                                <p className="text-xs text-cdaccent truncate" title={email}>
                                    {email}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <Button
                        type="button"
                        fullWidth
                        size="md"
                        onClick={handleSignIn}
                        loading={authBusy}
                        disabled={authBusy}
                    >
                        <LogIn size={16} aria-hidden />
                        Sign in with Google
                    </Button>
                )}

                {CURRENT_APP_VERSION && (
                    <p className="text-[11px] text-cdmuted tabular-nums">
                        Version: {CURRENT_APP_VERSION}
                    </p>
                )}

                <div className="border-t border-cdborder/60" />

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-cdmuted mb-2">
                        Appearance
                    </p>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            {isDark ? (
                                <Moon size={14} className="text-cdblue shrink-0" aria-hidden />
                            ) : (
                                <Sun size={14} className="text-cdbrand shrink-0" aria-hidden />
                            )}
                            <span className="text-sm text-cdtext">Black/White mode</span>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isDark}
                            aria-label="Toggle Black/White mode"
                            onClick={() => setTheme?.(isDark ? 'light' : 'dark')}
                            className={cn(
                                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full cd-transition cd-focus-ring',
                                isDark ? 'bg-cdsurfacehigh' : 'bg-cdbrand',
                            )}
                        >
                            <span
                                className={cn(
                                    'inline-block h-4 w-4 transform rounded-full bg-white cd-transition',
                                    isDark ? 'translate-x-1' : 'translate-x-6',
                                )}
                            />
                        </button>
                    </div>
                </div>

                {user && (
                    <>
                        <div className="border-t border-cdborder/60" />
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleSignOut}
                            disabled={authBusy}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-cdmuted hover:text-cdtext hover:bg-cdsurfacelow rounded-cdmd cd-transition disabled:opacity-50"
                        >
                            <LogOut size={14} aria-hidden />
                            Sign out
                        </button>
                    </>
                )}

                {!user && (
                    <p className="flex items-center gap-2 text-xs text-cdmuted">
                        <User size={14} className="shrink-0" aria-hidden />
                        Sign in to sync your activities and settings.
                    </p>
                )}
            </div>
        </AnchoredDropdownPortal>
    );
}
