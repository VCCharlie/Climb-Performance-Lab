import React, { useCallback, useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { isLikelyMobileDevice, isStandaloneDisplayMode } from '../utils/pwa';
import { safeLocalStorageSet } from '../utils/safeStorage.js';

const DISMISS_KEY = 'pwa_install_banner_dismissed';

/**
 * Shown in the mobile browser when the app is not running standalone.
 * Helps users distinguish a bookmark/shortcut from a real PWA install.
 */
export default function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isStandaloneDisplayMode()) return;
    if (!isLikelyMobileDevice()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const timer = window.setTimeout(() => {
      if (!isStandaloneDisplayMode()) setVisible(true);
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    safeLocalStorageSet(DISMISS_KEY, '1');
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setVisible(false);
    }
  }, [deferredPrompt]);

  if (!visible || isStandaloneDisplayMode()) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto max-w-lg rounded-xl border border-cdborder bg-cdsurface shadow-lg p-3 text-sm text-cdtext">
        <div className="flex items-start gap-2">
          <Smartphone size={18} className="text-cdaccent shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-bold leading-snug">Install as app for full-screen mode</p>
            <p className="text-cdmuted text-xs leading-relaxed">
              A home-screen shortcut can still open inside Edge. Use{' '}
              <span className="font-semibold text-cdtext">Menu (⋯) → Install app</span>, then launch
              from the new icon. If it still opens as a tab, clear site data for this site and try again.
            </p>
            {deferredPrompt ? (
              <button
                type="button"
                onClick={install}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-cdaccent px-3 py-1.5 text-xs font-bold text-white"
              >
                <Download size={14} aria-hidden />
                Install app
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded p-1 text-cdmuted hover:text-cdtext"
            aria-label="Dismiss install hint"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
