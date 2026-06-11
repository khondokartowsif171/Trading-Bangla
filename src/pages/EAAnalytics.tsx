import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Lock, LogIn, Radio } from 'lucide-react';

export default function EAAnalytics() {
  const { darkMode, lang, t } = useApp();
  const { isLoggedIn, openLoginModal } = useAuth();
  const isBn = lang === 'bn';

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>

      {/* ── GUEST GATE ── */}
      {!isLoggedIn && (
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm w-full"
          >
            {/* Brand */}
            <div className="inline-block mb-5 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 font-bold text-lg text-white shadow-lg">
              🇧🇩 {t('brandName')}
            </div>

            {/* Lock icon */}
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center">
              <Lock className="w-10 h-10 text-purple-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Aura AI · MT5 Signal Scanner
            </h1>
            <p className="text-gray-400 text-sm mb-2">
              {isBn
                ? 'XAU/USD · EUR/USD · GBP/USD · USD/JPY'
                : 'XAU/USD · EUR/USD · GBP/USD · USD/JPY'}
            </p>
            <p className="text-gray-500 text-xs mb-8">
              {isBn
                ? 'Real-time BUY/SELL সিগন্যাল দেখতে login করুন। সম্পূর্ণ ফ্রি।'
                : 'Login to view real-time BUY/SELL signals. Completely free.'}
            </p>

            <button
              onClick={openLoginModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-700 px-8 py-3 font-bold text-sm text-white hover:from-purple-400 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/20"
            >
              <LogIn className="w-4 h-4" />
              {isBn ? 'Login করুন' : 'Login'}
            </button>
            <p className="text-xs text-gray-600 mt-4">
              {isBn ? 'কোনো পেমেন্ট নেই · শুধু একটি অ্যাকাউন্ট' : 'No payment · Just an account'}
            </p>
          </motion.div>
        </div>
      )}

      {/* ── LOGGED-IN: SIGNAL SCANNER ONLY ── */}
      {isLoggedIn && (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                  Aura AI · Live MT5 Signal Scanner
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">
                {isBn ? 'রিয়েল-টাইম ট্রেডিং সিগন্যাল' : 'Real-Time Trading Signals'}
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">
                XAU/USD · EUR/USD · GBP/USD · USD/JPY
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-300 font-bold">LIVE</span>
            </div>
          </motion.div>

          {/* Signal Scanner iframe */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl overflow-hidden border border-purple-500/20 shadow-2xl shadow-purple-900/20"
          >
            <iframe
              src="/mt5-signals/index.html"
              title="Aura AI MT5 Signals"
              style={{ width: '100%', height: 'calc(100vh - 180px)', minHeight: '600px', border: 0, display: 'block' }}
              allow="notifications"
            />
          </motion.div>

        </div>
      )}
    </div>
  );
}
