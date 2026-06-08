import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EaDashboard() {
  const { isLoggedIn, loading } = useAuth();
  const { darkMode } = useApp();
  const navigate = useNavigate();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/ea-analytics', { replace: true });
    }
  }, [isLoggedIn, loading, navigate]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-6"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
            <Lock className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400 text-sm mb-6">EA Terminal দেখতে login করুন।</p>
          <Link
            to="/ea-analytics"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-3 font-bold text-sm text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            EA Analytics এ ফিরে যান
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Thin header bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        <Link
          to="/ea-analytics"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-yellow-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          EA Analytics
        </Link>
        <span className="text-gray-700">|</span>
        <span className="text-xs font-bold text-yellow-400">📡 Trading Bangla EA Monitor</span>
        <span className="ml-auto text-xs text-gray-500">XAU/USD Signal Bot — VPS:9001</span>
      </div>

      {/* Full-height iframe with loading/error states */}
      <div className="flex-1 relative overflow-hidden">
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950 z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-yellow-400" />
            <span className="text-sm text-gray-400">EA Terminal লোড হচ্ছে...</span>
          </div>
        )}
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950 z-10">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-white font-medium">EA Dashboard লোড করতে সমস্যা হয়েছে</p>
            <p className="text-xs text-gray-500">Signal VPS সার্ভার অনুপলব্ধ হতে পারে।</p>
          </div>
        )}
        <iframe
          src="/ea-dashboard/index.html"
          title="Trading Bangla EA Terminal"
          className="w-full h-full border-none"
          style={{ opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
          allow="autoplay"
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeError(true)}
        />
      </div>
    </div>
  );
}
