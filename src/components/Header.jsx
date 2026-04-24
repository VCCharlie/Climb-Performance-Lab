import React, { useState, useEffect } from 'react';
import { Activity, Settings, LogIn, LogOut, User, Cloud, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { loginWithGoogle, logout } from '../firebase';

const Header = ({ userSettings, onOpenSettings, user, syncStatus, lastActivityDate }) => {
  // 1. NIEUW: State om de échte laatste sync tijd bij te houden (uit de browser cache)
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('app_last_sync_time'));

  // 2. NIEUW: Luister naar de syncStatus. Zodra deze op 'succes' springt, sla de huidige tijd op!
  useEffect(() => {
    // Afhankelijk van de plek in de app kan status 'synced', 'success' of 'done' zijn
    if (syncStatus === 'synced' || syncStatus === 'success' || syncStatus === 'done') {
      const now = new Date().toISOString();
      setLastSyncTime(now);
      localStorage.setItem('app_last_sync_time', now);
    }
  }, [syncStatus]);

  const handleAuth = async () => {
    if (user) {
      await logout();
    } else {
      await loginWithGoogle();
    }
  };

  const displayWeight = userSettings.privacyMode ? '***' : `${userSettings.weight} kg`;
  const displayFtp = userSettings.privacyMode ? '***' : `${userSettings.ftp} W`;

  // 3. NIEUW: Slimme datum-formattering. Kies de sync-tijd als die er is, anders fallback naar laatste rit.
  const dateToDisplay = lastSyncTime || lastActivityDate;
  let formattedDate = null;
  
  if (dateToDisplay) {
      const d = new Date(dateToDisplay);
      const today = new Date();
      const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

      if (isToday) {
          // Als het vandaag is, toon we: "Vandaag, 14:30"
          formattedDate = `Vandaag, ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
          // Anders: "4 mrt. 14:30"
          formattedDate = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
  }

  // 4. Uitgebreide status check voor de icoontjes
  const isSynced = syncStatus === 'synced' || syncStatus === 'success' || syncStatus === 'done';
  const isSyncing = syncStatus === 'syncing' || syncStatus === 'started' || syncStatus === 'enriching';

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
          {/* SYNC INDICATOR */}
          <div className="flex items-center gap-2 md:mr-4 md:border-r md:border-cdborder md:pr-4" title={`Sync Status: ${syncStatus || 'idle'}`}>
            {isSynced && <CheckCircle size={16} className="text-green-500" />}
            {isSyncing && <RefreshCw size={16} className="text-yellow-400 animate-spin" />}
            {syncStatus === 'error' && <AlertCircle size={16} className="text-red-500" />}
            {(syncStatus === 'idle' || !syncStatus) && <Cloud size={16} className="text-cdmuted" />}

            <span className="text-[10px] uppercase font-bold text-cdmuted hidden md:block">
              {isSynced ? 'Synced' : isSyncing ? 'Syncing' : syncStatus === 'error' ? 'Offline' : 'Idle'}
            </span>
          </div>
          
          {/* LAATST BIJGEWERKT TEKST */}
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
            onClick={handleAuth}
            className="flex items-center gap-2 text-xs font-bold text-cdmuted hover:text-cdtext transition-colors"
            title={user ? `Logged in as ${user.displayName}` : "Login with Google"}
          >
            {user ? (
              <>
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-cdborder" />
                <LogOut size={16} className="hidden sm:block" />
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-cdsurface flex items-center justify-center"><User size={16} /></div>
                <LogIn size={16} className="hidden sm:block" />
              </>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings"
            className="bg-cdsurface hover:bg-cdborder p-2 rounded-full text-cdtext transition-all shadow-lg border border-cdborder"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
