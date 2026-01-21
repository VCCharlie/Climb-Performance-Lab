import React from 'react';
import { Activity } from 'lucide-react'; 

const Header = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* TITEL SECTIE */}
        <div className="flex items-center gap-3">
          {/* Logo Icoon */}
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg shadow-yellow-500/20 shadow-lg">
            <Activity size={24} className="text-slate-900" />
          </div>
          
          {/* Tekst + Badge */}
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              CLIMB PERFORMANCE LAB
              
              {/* --- AUTOMATISCHE VERSIE BADGE --- */}
              <span 
                className="text-[10px] font-mono font-medium text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded align-middle ml-1 hover:text-yellow-400 transition-colors cursor-default" 
                title="Auto-generated Build Version"
              >
                {/* eslint-disable-next-line no-undef */}
                {__APP_VERSION__}
              </span>
              {/* --------------------------------- */}
              
            </h1>
            <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">
              Data-Driven Ascent Protocols
            </span>
          </div>
        </div>

        {/* Rechterkant header (leeg of user menu) */}
        <div></div> 
        
      </div>
    </header>
  );
};

export default Header;