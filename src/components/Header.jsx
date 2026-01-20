import React from 'react';

const Header = ({ userSettings }) => {
  // Berekeningen voor de header
  const systemWeight = (userSettings.weight + userSettings.bikeWeight).toFixed(1);
  const wkg = (userSettings.ftp / userSettings.weight).toFixed(2);

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
         {/* Logo Sectie */}
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-slate-900 font-black text-xl italic shadow-lg">
             CL
           </div>
           <h1 className="font-bold text-white text-lg">
             Climb Lab <span className="text-yellow-400 text-xs px-1 border border-yellow-400 rounded">PRO</span>
           </h1>
         </div>
         
         {/* Stats Sectie (Rechts) */}
         <div className="flex gap-6 text-sm hidden md:flex">
            <div>
               <span className="text-slate-500 block text-[10px] uppercase">Sys. Weight</span>
               <span className="text-white font-mono font-bold">{systemWeight} kg</span>
            </div>
            <div>
               <span className="text-slate-500 block text-[10px] uppercase">W/kg (FTP)</span>
               <span className="text-yellow-400 font-mono font-bold">{wkg}</span>
            </div>
         </div>
      </div>
    </header>
  );
};

export default Header;