import React, { useState, useEffect } from 'react';
import { Activity, Settings, LogIn, LogOut, User } from 'lucide-react';
import { loginWithGoogle, logout, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const Header = ({ userSettings, onOpenSettings }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (user) {
        await logout();
    } else {
        await loginWithGoogle();
    }
  };

  const displayWeight = userSettings.privacyMode ? '***' : `${userSettings.weight} kg`;
  const displayFtp = userSettings.privacyMode ? '***' : `${userSettings.ftp} W`;

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="bg-yellow-400 p-2 rounded-lg shadow-lg shadow-yellow-400/20">
             <Activity className="text-slate-900 w-6 h-6" />
           </div>
           <div>
             <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
               Climb<span className="text-yellow-400">Lab</span>
             </h1>
             <p className="text-xs text-slate-400 font-mono">Performance Analytics</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex gap-4 text-xs font-mono mr-4 border-r border-slate-700 pr-4">
                <div className="text-right">
                    <span className="block text-slate-500 uppercase text-[10px]">Weight</span>
                    <span className="text-white font-bold">{displayWeight}</span>
                </div>
                <div className="text-right">
                    <span className="block text-slate-500 uppercase text-[10px]">FTP</span>
                    <span className="text-yellow-400 font-bold">{displayFtp}</span>
                </div>
            </div>

            <button 
                onClick={handleAuth}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                title={user ? `Logged in as ${user.displayName}` : "Login with Google"}
            >
                {user ? (
                    <>
                        <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-slate-600"/>
                        <LogOut size={16}/>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"><User size={16}/></div>
                        <LogIn size={16}/>
                    </>
                )}
            </button>

            <button 
                onClick={onOpenSettings}
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-white transition-all shadow-lg border border-slate-700"
            >
                <Settings size={20} />
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;