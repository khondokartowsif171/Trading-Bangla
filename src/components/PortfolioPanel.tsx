import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PieChart, Wallet, TrendingUp, TrendingDown, Trophy, BarChart2, ArrowUpRight } from 'lucide-react';

export default function PortfolioPanel() {
  const { darkMode, t, portfolio, assets, balance, trades } = useApp();

  const { totalValue, totalPnL, holdings, winRate, totalTrades, bestTrade } = useMemo(() => {
    const holdings = portfolio.map(h => {
      const asset       = assets.find(a => a.symbol === h.symbol);
      const currentPrice = asset?.price ?? 0;
      const value       = currentPrice * h.quantity;
      const costBasis   = h.avgPrice * h.quantity;
      const pnl         = value - costBasis;
      const pnlPercent  = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...h, currentPrice, value, costBasis, pnl, pnlPercent, asset };
    });

    const totalValue   = holdings.reduce((s, h) => s + h.value, 0);
    const totalCost    = holdings.reduce((s, h) => s + h.costBasis, 0);
    const totalPnL     = totalValue - totalCost;
    const wins         = trades.filter(t => t.type === 'sell' && t.price > (t as { avgBuy?: number }).avgBuy!).length;
    const winRate      = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;
    const bestTrade    = trades.length > 0
      ? trades.reduce((best, t) => (!best || (t as { pnl?: number }).pnl! > (best as { pnl?: number }).pnl!) ? t : best, trades[0])
      : null;

    return { totalValue, totalPnL, holdings, winRate, totalTrades: trades.length, bestTrade };
  }, [portfolio, assets, trades]);

  const isPositive  = totalPnL >= 0;
  const totalEquity = totalValue + balance;

  const dm = darkMode;

  return (
    <div className={`rounded-2xl border overflow-hidden ${dm ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${dm ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <PieChart className={`w-4 h-4 ${dm ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`font-semibold text-sm ${dm ? 'text-white' : 'text-gray-900'}`}>{t('portfolio')}</h3>
        </div>
        {totalTrades > 0 && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            <Trophy className="w-3 h-3" />
            {winRate}% Win Rate
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-xl p-3 border text-center ${dm ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-[9px] uppercase tracking-wider mb-0.5 ${dm ? 'text-gray-600' : 'text-gray-400'}`}>Total Equity</p>
            <p className={`text-sm font-bold tabular-nums ${dm ? 'text-white' : 'text-gray-900'}`}>
              ${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className={`rounded-xl p-3 border text-center ${dm ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-[9px] uppercase tracking-wider mb-0.5 ${dm ? 'text-gray-600' : 'text-gray-400'}`}>Portfolio P/L</p>
            <p className={`text-sm font-bold flex items-center justify-center gap-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isPositive ? '+' : ''}${totalPnL.toFixed(2)}
            </p>
          </div>
          <div className={`rounded-xl p-3 border text-center ${dm ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-[9px] uppercase tracking-wider mb-0.5 ${dm ? 'text-gray-600' : 'text-gray-400'}`}>Cash</p>
            <div className="flex items-center justify-center gap-1">
              <Wallet className={`w-3 h-3 ${dm ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={`text-sm font-bold tabular-nums ${dm ? 'text-white' : 'text-gray-900'}`}>
                ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>

        {/* Allocation progress bars */}
        {holdings.length > 0 && (
          <div className="space-y-2">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${dm ? 'text-gray-500' : 'text-gray-400'}`}>Holdings</p>
            {holdings.map(h => {
              const allocPct = totalEquity > 0 ? (h.value / totalEquity) * 100 : 0;
              return (
                <div key={h.symbol}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${dm ? 'text-white' : 'text-gray-900'}`}>{h.symbol}</span>
                      <span className={`text-[10px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{h.quantity} shares</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${dm ? 'text-gray-200' : 'text-gray-800'}`}>
                        ${h.value.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-bold min-w-[44px] text-right ${h.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {/* Allocation bar */}
                  <div className={`h-1.5 rounded-full overflow-hidden ${dm ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${h.pnlPercent >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(allocPct, 100)}%` }}
                    />
                  </div>
                  <div className={`text-[9px] mt-0.5 ${dm ? 'text-gray-700' : 'text-gray-400'}`}>
                    {allocPct.toFixed(1)}% of portfolio · avg ${h.avgPrice.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {holdings.length === 0 && (
          <div className={`py-6 text-center ${dm ? 'text-gray-700' : 'text-gray-400'}`}>
            <BarChart2 className="w-7 h-7 mx-auto mb-1.5 opacity-25" />
            <p className="text-xs">{t('noData')}</p>
            <p className="text-[10px] mt-0.5">Trade করে portfolio তৈরি করুন</p>
          </div>
        )}

        {/* Recent Trades */}
        {trades.length > 0 && (
          <div className="space-y-1.5">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{t('recentTrades')}</p>
            {trades.slice(0, 4).map(trade => (
              <div key={trade.id}
                className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors ${dm ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    trade.type === 'buy'
                      ? dm ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      : dm ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                  }`}>{trade.type.toUpperCase()}</span>
                  <span className={`text-xs font-semibold ${dm ? 'text-gray-300' : 'text-gray-700'}`}>{trade.symbol}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{trade.quantity} × ${trade.price}</span>
                  <ArrowUpRight className={`w-3 h-3 ${dm ? 'text-gray-700' : 'text-gray-300'}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        {totalTrades > 0 && (
          <div className={`rounded-xl p-3 border grid grid-cols-3 gap-2 text-center ${dm ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
            <div>
              <p className={`text-[9px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>Trades</p>
              <p className={`text-sm font-bold ${dm ? 'text-white' : 'text-gray-900'}`}>{totalTrades}</p>
            </div>
            <div>
              <p className={`text-[9px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>Win Rate</p>
              <p className={`text-sm font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{winRate}%</p>
            </div>
            <div>
              <p className={`text-[9px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>Holdings</p>
              <p className={`text-sm font-bold ${dm ? 'text-indigo-400' : 'text-indigo-600'}`}>{holdings.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
