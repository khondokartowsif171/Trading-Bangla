import { Suspense, lazy } from 'react';
import { useApp } from '@/context/AppContext';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const MT5TerminalPanel = lazy(() => import('@/components/MT5TerminalPanel'));

export default function ForexMT5() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* MT5-style toolbar */}
      <div className={`sticky top-14 md:top-16 z-30 border-b backdrop-blur-xl ${darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isBn ? 'ফরেক্স টার্মিনাল' : 'Forex Terminal'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
              MT5
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4">
        <Suspense fallback={
          <div className={`flex items-center justify-center py-20 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">{isBn ? 'MT5 টার্মিনাল লোড হচ্ছে...' : 'Loading MT5 Terminal...'}</span>
            </div>
          </div>
        }>
          <MT5TerminalPanel />
        </Suspense>
      </div>
    </div>
  );
}
