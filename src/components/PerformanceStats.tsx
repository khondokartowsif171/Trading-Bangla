import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getStats, onTradeUpdate, PaperStats } from '@/services/paperTradingService';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

export default function PerformanceStats() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const [, setTick] = useState(0);

  useEffect(() => onTradeUpdate(() => setTick(t => t + 1)), []);

  const stats = getStats();

  const leftCards = [
    { label: isBn ? 'মোট ট্রেড' : 'Total Trades', value: stats.totalTrades.toString(), icon: BarChart3, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20' },
    { label: isBn ? 'জয়' : 'Wins', value: stats.wins.toString(), icon: TrendingUp, color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/20' },
    { label: isBn ? 'হার' : 'Losses', value: stats.losses.toString(), icon: TrendingDown, color: 'text-red-400', bg: 'from-red-500/20 to-orange-500/20' },
    { label: isBn ? 'উইন রেট' : 'Win Rate', value: `${stats.winRate}%`, icon: Activity, color: stats.winRate >= 60 ? 'text-green-400' : stats.winRate >= 40 ? 'text-yellow-400' : 'text-red-400', bg: 'from-purple-500/20 to-pink-500/20' },
  ];

  const rightItems = [
    { label: isBn ? 'গ্রস প্রফিট' : 'Gross Profit', value: `+$${stats.grossProfit.toFixed(2)}`, cls: 'text-green-400' },
    { label: isBn ? 'গ্রস লস' : 'Gross Loss', value: `-$${stats.grossLoss.toFixed(2)}`, cls: 'text-red-400' },
    { label: isBn ? 'নেট প্রফিট' : 'Net Profit', value: `${stats.grossProfit - stats.grossLoss >= 0 ? '+' : ''}$${(stats.grossProfit - stats.grossLoss).toFixed(2)}`, cls: (stats.grossProfit - stats.grossLoss) >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: isBn ? 'গড় জয়' : 'Avg Win', value: `+$${stats.avgWin.toFixed(2)}`, cls: 'text-green-400' },
    { label: isBn ? 'গড় লস' : 'Avg Loss', value: `-$${stats.avgLoss.toFixed(2)}`, cls: 'text-red-400' },
    { label: 'Profit Factor', value: stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2), cls: stats.profitFactor >= 1 ? 'text-green-400' : 'text-red-400' },
  ];

  return (
    <div className={`rounded-xl border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md p-3`}>
      <h3 className={`text-xs font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {isBn ? '📊 সেশন পরিসংখ্যান' : '📊 Session Statistics'}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        {leftCards.map((c, i) => (
          <div key={i} className={`rounded-lg border ${darkMode ? 'border-gray-800' : 'border-gray-200'} p-2.5 text-center`}>
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${c.bg} flex items-center justify-center mx-auto mb-1`}>
              <c.icon className={`w-3 h-3 ${c.color}`} />
            </div>
            <p className={`text-lg font-bold font-mono ${c.color}`}>{c.value}</p>
            <p className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{c.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1 text-xs">
        {rightItems.map(item => (
          <div key={item.label} className={`flex justify-between px-2 py-1 rounded ${darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{item.label}</span>
            <span className={`font-mono font-bold ${item.cls}`}>{item.value}</span>
          </div>
        ))}
      </div>
      <div className={`mt-3 pt-2 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{isBn ? 'উইন রেট' : 'Win Rate'}</span>
          <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{ width: `${stats.winRate}%` }} />
          </div>
          <span className={`text-[10px] font-mono font-bold ${stats.winRate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>{stats.winRate}%</span>
        </div>
      </div>
    </div>
  );
}
