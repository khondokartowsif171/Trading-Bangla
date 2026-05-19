import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getBalance, getEquity, getStats, getTrades, PaperStats, onTradeUpdate } from '@/services/paperTradingService';
import { DollarSign, TrendingUp, BarChart3, Award } from 'lucide-react';

export default function AccountMetricsCards() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const [, setTick] = useState(0);

  useEffect(() => onTradeUpdate(() => setTick(t => t + 1)), []);

  const balance = getBalance();
  const equity = getEquity();
  const trades = getTrades();
  const stats = getStats();

  const openPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const pnlClass = openPnL >= 0 ? 'text-green-400' : 'text-red-400';

  const cards = [
    {
      icon: DollarSign,
      label: isBn ? 'অ্যাকাউন্ট ব্যালেন্স' : 'Account Balance',
      value: `$${balance.toFixed(2)}`,
      sub: isBn ? 'ডেমো' : 'USD · Demo',
      subColor: 'text-gray-400',
      iconColor: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      icon: TrendingUp,
      label: isBn ? 'ইকুইটি' : 'Account Equity',
      value: `$${equity.toFixed(2)}`,
      sub: `${equity >= balance ? '+' : ''}$${(equity - balance).toFixed(2)}`,
      subColor: equity >= balance ? 'text-green-400' : 'text-red-400',
      iconColor: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/20',
    },
    {
      icon: BarChart3,
      label: isBn ? 'ওপেন P&L' : 'Open P&L',
      value: `${openPnL >= 0 ? '+' : ''}$${openPnL.toFixed(2)}`,
      sub: `${trades.length} ${isBn ? 'পজিশন' : 'position(s)'}`,
      subColor: 'text-gray-400',
      iconColor: 'text-orange-400', bg: 'from-orange-500/20 to-amber-500/20',
      valueClass: pnlClass,
    },
    {
      icon: Award,
      label: isBn ? 'আজকের প্রফিট' : "Today's Profit",
      value: `${stats.todayProfit >= 0 ? '+' : ''}$${stats.todayProfit.toFixed(2)}`,
      sub: isBn ? `উইন রেট: ${stats.winRate}%` : `Win Rate: ${stats.winRate}%`,
      subColor: 'text-green-400',
      iconColor: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/20',
      valueClass: stats.todayProfit >= 0 ? 'text-green-400' : 'text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cards.map((c, i) => (
        <div key={i} className={`rounded-xl border p-3 ${darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-200 bg-white'} relative overflow-hidden`}>
          <div className={`absolute right-2 top-2 w-8 h-8 rounded-lg bg-gradient-to-br ${c.bg} flex items-center justify-center`}>
            <c.icon className={`w-4 h-4 ${c.iconColor}`} />
          </div>
          <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-1`}>{c.label}</p>
          <p className={`text-lg font-bold font-mono ${c.valueClass || (darkMode ? 'text-white' : 'text-gray-900')}`}>{c.value}</p>
          <p className={`text-[10px] font-mono mt-0.5 ${c.subColor}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
