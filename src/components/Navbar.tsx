import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Menu, X, Moon, Sun, Globe, TrendingUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { darkMode, toggleDarkMode, lang, setLang, t, balance } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: t('home') },
    { to: '/dashboard', label: t('dashboard') },
    { to: '/trade', label: t('trade') },
    { to: '/portfolio', label: t('portfolio') },
    { to: '/ea-analytics', label: t('eaAnalytics') },
    { to: '/forex', label: t('forexMT5') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
      darkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo — compact on mobile */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <span className={`font-bold text-base md:text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('brandName')}
              </span>
              <span className="hidden sm:block text-[10px] text-indigo-400 leading-none">tradingbangla.com</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? darkMode
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-indigo-50 text-indigo-600'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Balance */}
            <div className={`flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-semibold ${
              darkMode ? 'bg-gray-800 text-green-400' : 'bg-green-50 text-green-700'
            }`}>
              <span className="text-[10px] md:text-xs opacity-70">$</span>
              <span className="hidden sm:inline">{balance.toLocaleString()}</span>
              <span className="sm:hidden">{balance >= 1000 ? `${(balance / 1000).toFixed(0)}K` : balance}</span>
            </div>

            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={t('language')}
            >
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-bold ml-0.5">{lang === 'en' ? 'EN' : 'BN'}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={darkMode ? t('lightMode') : t('darkMode')}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Aura Agent icon (mobile only — opens bottom sheet) */}
            <button
              onClick={() => {
                // The MobileBottomNav handles chat; this just shows as indicator
                const event = new CustomEvent('open-mobile-chat');
                window.dispatchEvent(event);
              }}
              className={`md:hidden p-2 rounded-lg transition-colors relative ${
                darkMode ? 'hover:bg-gray-800 text-violet-400' : 'hover:bg-gray-100 text-violet-600'
              }`}
              title="Aura Agent"
            >
              <Zap className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`md:hidden border-t overflow-hidden ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}
            >
              <div className="py-2 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(link.to)
                          ? darkMode
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-indigo-50 text-indigo-600'
                          : darkMode
                            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
