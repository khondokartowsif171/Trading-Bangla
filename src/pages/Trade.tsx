import { useNavigate } from 'react-router-dom';
import { Monitor } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function Trade() {
  const { lang } = useApp();
  const isBn = lang === 'bn';
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <header className="h-10 min-h-[40px] flex items-center justify-between px-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-yellow-400" />
          <span className="font-bold text-yellow-400 text-sm">MT5 Terminal</span>
          <span className="text-gray-500 text-xs hidden sm:inline">XAU/USD EA Signal Bot</span>
        </div>
        <button
          onClick={() => navigate('/ea-dashboard')}
          className="text-xs text-gray-400 hover:text-yellow-400 transition-colors"
        >
          {isBn ? 'ফুল স্ক্রিন →' : 'Full Screen →'}
        </button>
      </header>
      <iframe
        src="/ea-dashboard/index.html"
        title="Trading Bangla MT5 Terminal"
        allow="autoplay"
        className="flex-1 w-full border-none bg-gray-950"
      />
    </div>
  );
}
