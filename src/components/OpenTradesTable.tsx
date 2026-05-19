import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getTrades, closeTrade, onTradeUpdate, PaperTrade } from '@/services/paperTradingService';
import { X, TrendingUp, TrendingDown } from 'lucide-react';

export default function OpenTradesTable() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const [, setTick] = useState(0);

  useEffect(() => onTradeUpdate(() => setTick(t => t + 1)), []);

  const trades = getTrades();
  const marginUsed = trades.reduce((s, t) => s + t.lot * 1000, 0);

  const getDigits = (p: number) => p > 100 ? 2 : 5;

  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      <div className={`px-3 py-2 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <h3 className={`text-xs font-bold flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          {isBn ? 'ওপেন পজিশন' : 'Open Positions'} <span className="text-gray-500">({trades.length})</span>
        </h3>
        <span className={`text-[10px] font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Margin: ${marginUsed.toFixed(2)}</span>
      </div>

      {trades.length === 0 ? (
        <div className={`text-center py-8 text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
          {isBn ? 'কোনো ওপেন পজিশন নেই' : 'No open positions'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                {[isBn ? 'টিকেট' : 'Ticket', isBn ? 'সিম্বল' : 'Symbol', isBn ? 'টাইপ' : 'Type', 'Lot',
                  isBn ? 'প্রাইস' : 'Price', isBn ? 'কারেন্ট' : 'Current', 'SL', 'TP', 'Swap', 'P&L',
                  isBn ? 'সময়' : 'Time', ''].map(h => (
                  <th key={h} className={`p-2 text-left font-mono text-[10px] font-bold ${
                    darkMode ? 'text-gray-400 bg-gray-900' : 'text-gray-600 bg-gray-50'
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map(t => {
                const digits = getDigits(t.openPrice);
                return (
                  <tr key={t.ticket} className={`border-b ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>#{t.ticket}</td>
                    <td className={`p-2 font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.symbol}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        t.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {t.type === 'BUY' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {t.type}
                      </span>
                    </td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t.lot}</td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t.openPrice.toFixed(digits)}</td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{t.currentPrice.toFixed(digits)}</td>
                    <td className={`p-2 font-mono text-red-400`}>{t.sl.toFixed(digits)}</td>
                    <td className={`p-2 font-mono text-green-400`}>{t.tp.toFixed(digits)}</td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t.swap.toFixed(2)}</td>
                    <td className={`p-2 font-mono font-bold ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                    </td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t.openTime}</td>
                    <td className="p-2">
                      <button onClick={() => closeTrade(t.ticket)}
                        className={`p-1 rounded ${darkMode ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
