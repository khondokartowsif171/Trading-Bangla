import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PieChart, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function PortfolioPanel() {
  const { darkMode, t, portfolio, assets, balance, trades } = useApp();

  const { totalValue, totalPnL, holdings } = useMemo(() => {
    const holdings = portfolio.map(h => {
      const asset = assets.find(a => a.symbol === h.symbol);
      const currentPrice = asset?.price || 0;
      const value = currentPrice * h.quantity;
      const costBasis = h.avgPrice * h.quantity;
      const pnl = value - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...h, currentPrice, value, costBasis, pnl, pnlPercent, asset };
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalPnL = totalValue - totalCost;

    return { totalValue, totalPnL, holdings };
  }, [portfolio, assets]);

  const isPositive = totalPnL >= 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
    }`}>
      <div className={`px-4 py-3 border-b flex items-center gap-2 ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <PieChart className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
        <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('portfolio')}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className={`rounded-xl p-4 border ${
          darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'
        }`}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('totalPortfolio')}
              </div>
              <div className={`text-lg font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('todayPnL')}
              </div>
              <div className={`text-lg font-bold mt-0.5 flex items-center gap-1 ${
                isPositive ? 'text-green-500' : 'text-red-500'
              }`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPositive ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <Wallet className="w-3.5 h-3.5 text-gray-500" />
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('availableBalance')}:
            </span>
            <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ${balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Holdings */}
        <div className="space-y-1">
          <div className={`text-[10px] uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('orders')}
          </div>
          {holdings.length === 0 ? (
            <p className={`text-xs py-4 text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              {t('noData')}
            </p>
          ) : (
            holdings.map(h => (
              <div
                key={h.symbol}
                className={`flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="min-w-0">
                  <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {h.symbol}
                  </div>
                  <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {h.quantity} @ ${h.avgPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ${h.value.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-medium ${
                    h.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Trades */}
        {trades.length > 0 && (
          <div className="space-y-1">
            <div className={`text-[10px] uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('recentTrades')}
            </div>
            {trades.slice(0, 5).map(trade => (
              <div
                key={trade.id}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${
                  darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    trade.type === 'buy'
                      ? darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      : darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                  }`}>
                    {trade.type.toUpperCase()}
                  </span>
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {trade.symbol}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {trade.quantity} × ${trade.price}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
