import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import { PieChart, TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';

export default function PortfolioPage() {
  const { darkMode, t, portfolio, assets, balance, trades } = useApp();

  const { totalValue, totalPnL, totalPnLPercent, holdings } = useMemo(() => {
    const holdings = portfolio.map(h => {
      const asset = assets.find(a => a.symbol === h.symbol);
      const currentPrice = asset?.price || 0;
      const value = currentPrice * h.quantity;
      const costBasis = h.avgPrice * h.quantity;
      const pnl = value - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...h, currentPrice, value, costBasis, pnl, pnlPercent, asset, allocation: 0 };
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    return {
      totalValue,
      totalPnL,
      totalPnLPercent,
      holdings: holdings.map(h => ({
        ...h,
        allocation: totalValue > 0 ? (h.value / totalValue) * 100 : 0,
      })),
    };
  }, [portfolio, assets]);

  const isPositive = totalPnL >= 0;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />
      
      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div>
          <h1 className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('portfolio')}
          </h1>
          <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('paperTrading')} • {t('demoAccount')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: t('totalPortfolio'),
              value: `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: PieChart,
              color: 'text-indigo-400',
            },
            {
              label: t('todayPnL'),
              value: `${isPositive ? '+' : ''}$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: isPositive ? TrendingUp : TrendingDown,
              color: isPositive ? 'text-green-400' : 'text-red-400',
              subValue: `${isPositive ? '+' : ''}${totalPnLPercent.toFixed(2)}%`,
            },
            {
              label: t('availableBalance'),
              value: `$${balance.toLocaleString()}`,
              icon: Wallet,
              color: 'text-blue-400',
            },
            {
              label: t('totalReturn'),
              value: `${isPositive ? '+' : ''}${totalPnLPercent.toFixed(2)}%`,
              icon: Activity,
              color: isPositive ? 'text-green-400' : 'text-red-400',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-5 ${
                darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {stat.label}
                </span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {stat.value}
              </div>
              {stat.subValue && (
                <div className={`text-sm font-semibold mt-0.5 ${stat.color}`}>
                  {stat.subValue}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Holdings Table */}
        <div className={`rounded-2xl border overflow-hidden ${
          darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
        }`}>
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('orders')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                  <th className="text-left py-3 px-4 font-medium">Symbol</th>
                  <th className="text-right py-3 px-4 font-medium">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium">Avg Price</th>
                  <th className="text-right py-3 px-4 font-medium">Current Price</th>
                  <th className="text-right py-3 px-4 font-medium">Value</th>
                  <th className="text-right py-3 px-4 font-medium">P&L</th>
                  <th className="text-right py-3 px-4 font-medium">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const isPositivePnL = h.pnl >= 0;
                  return (
                    <tr
                      key={h.symbol}
                      className={`border-b last:border-b-0 transition-colors ${
                        darkMode ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {h.symbol}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {h.asset?.name || ''}
                        </div>
                      </td>
                      <td className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {h.quantity}
                      </td>
                      <td className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        ${h.avgPrice.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        ${h.currentPrice.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${h.value.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-4 font-semibold ${
                        isPositivePnL ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {isPositivePnL ? '+' : ''}${h.pnl.toFixed(2)} ({isPositivePnL ? '+' : ''}{h.pnlPercent.toFixed(2)}%)
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className={`w-16 h-1.5 rounded-full overflow-hidden ${
                            darkMode ? 'bg-gray-800' : 'bg-gray-200'
                          }`}>
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${Math.min(h.allocation, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {h.allocation.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade History */}
        <div className={`rounded-2xl border overflow-hidden ${
          darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
        }`}>
          <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('recentTrades')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                  <th className="text-left py-3 px-4 font-medium">ID</th>
                  <th className="text-left py-3 px-4 font-medium">Symbol</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-right py-3 px-4 font-medium">Qty</th>
                  <th className="text-right py-3 px-4 font-medium">Price</th>
                  <th className="text-right py-3 px-4 font-medium">Total</th>
                  <th className="text-right py-3 px-4 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`text-center py-8 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  trades.map(trade => (
                    <tr
                      key={trade.id}
                      className={`border-b last:border-b-0 transition-colors ${
                        darkMode ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <td className={`py-3 px-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {trade.id}
                      </td>
                      <td className={`py-3 px-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {trade.symbol}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          trade.type === 'buy'
                            ? darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                            : darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                        }`}>
                          {trade.type.toUpperCase()}
                        </span>
                      </td>
                      <td className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {trade.quantity}
                      </td>
                      <td className={`text-right py-3 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-4 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ${trade.total.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {trade.timestamp.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
