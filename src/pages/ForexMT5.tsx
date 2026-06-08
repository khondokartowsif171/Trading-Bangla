import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ForexMT5() {
  const { darkMode } = useApp();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative" style={{ width: '100%', height: 'calc(100vh - 56px)' }}>
      {/* Loading overlay */}
      {!loaded && !error && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            MT5 Terminal লোড হচ্ছে...
          </div>
          <p className="text-xs text-gray-600">Real-time chart ও trading panel প্রস্তুত করা হচ্ছে</p>
        </div>
      )}

      {/* Error fallback */}
      {error && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-sm font-medium text-white">Terminal লোড করতে সমস্যা হয়েছে</p>
          <p className="text-xs text-gray-500 max-w-xs text-center">পেজ রিফ্রেশ করুন অথবা কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
          <button
            onClick={() => { setError(false); setLoaded(false); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      )}

      <iframe
        key={error ? 'retry' : 'frame'}
        src="/chart-view/index.html"
        title="Trading Bangla MT5 Terminal"
        style={{ width: '100%', height: '100%', border: 0, display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        allow="notifications"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
