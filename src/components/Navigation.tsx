import React from 'react';
import { Plane, Sun, Moon } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavigationProps {
  t: any;
  lang: 'en' | 'tr';
  setLang: (lang: 'en' | 'tr') => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  currentUser: User | null;
  hasStarted: boolean;
  setHasStarted: (val: boolean) => void;
  onLogin: () => void;
  onShowAbout: () => void;
}

export default function Navigation({
  t,
  lang,
  setLang,
  theme,
  setTheme,
  currentUser,
  hasStarted,
  setHasStarted,
  onLogin,
  onShowAbout
}: NavigationProps) {
  return (
    <nav className="relative z-20 flex justify-between items-center py-6 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Plane className="w-6 h-6 text-[#D4AF37]" />
        <span className="font-display text-xl tracking-wider uppercase text-gray-900 dark:text-gray-100">MinikGezgin 🐾</span>
        {!hasStarted && (
          <button 
            onClick={onShowAbout} 
            className="ml-4 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:text-[#D4AF37] transition-colors border border-black/10 dark:border-white/10 rounded-full px-3 py-1 cursor-pointer"
          >
            {t.about}
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Language Selector */}
        <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-full p-1 border border-black/10 dark:border-white/10">
          <button 
            onClick={() => setLang('tr')} 
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${lang === 'tr' ? 'bg-[#D4AF37] text-gray-900' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
          >
            TR
          </button>
          <button 
            onClick={() => setLang('en')} 
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${lang === 'en' ? 'bg-[#D4AF37] text-gray-900' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
          >
            EN
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer text-gray-700 dark:text-gray-200"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4 text-[#D4AF37]" />
            : <Moon className="w-4 h-4 text-gray-600" />
          }
        </button>

        {/* Auth / Action Button */}
        {currentUser ? (
          <button 
            onClick={() => setHasStarted(true)} 
            className="nav-pill text-[#D4AF37] border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 cursor-pointer transition whitespace-nowrap"
          >
            {t.enterStudio}
          </button>
        ) : (
          <button 
            onClick={onLogin} 
            className="nav-pill hover:bg-black/5 dark:bg-white/5 cursor-pointer transition text-gray-900 dark:text-white whitespace-nowrap"
          >
            {t.signIn}
          </button>
        )}
      </div>
    </nav>
  );
}
