import React, { useState } from 'react';
import { Activity, Settings, LogIn, X, Save, RefreshCw } from 'lucide-react';

const Header = ({
  intervalsConfig,
  updateIntervalsConfig,
  onSaveSettings,
  user,
  onLogin,
  onLogout
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveSettings?.();
    setIsSaving(false);
    setShowSettings(false);
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* LOGO + TITEL */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg shadow-yellow-500/20 shadow-lg">
              <Activity size={20} className="text-slate-900" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                CLIMB PERFORMANCE LAB
                <span
                  className="text-[9px] font-mono font-medium text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded"
                  title="Build Version"
                >
                  {/* eslint-disable-next-line no-undef */}
                  {__APP_VERSION__}
                </span>
              </h1>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                Data-Driven Ascent Protocols
              </span>
            </div>
          </div>

          {/* RECHTS: Settings + Login */}
          <div className="flex items-center gap-2">
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>

            {/* Login Button */}
            {user ? (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                <span className="hidden sm:inline">{user.displayName?.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-sm font-bold transition-colors"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Settings size={18} className="text-slate-400" /> Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-orange-400 mb-3">Intervals.icu Integration</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Athlete ID</label>
                    <input
                      type="text"
                      placeholder="e.g. i12345"
                      value={intervalsConfig?.athleteId || ''}
                      onChange={e => updateIntervalsConfig?.('athleteId', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-orange-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">API Key</label>
                    <input
                      type="password"
                      placeholder="Your API Key"
                      value={intervalsConfig?.apiKey || ''}
                      onChange={e => updateIntervalsConfig?.('apiKey', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-orange-400 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-green-500 hover:bg-green-400 text-white disabled:bg-slate-600"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;