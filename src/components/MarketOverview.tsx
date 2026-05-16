import { useApp } from '@/context/AppContext';
import { TrendingUp, TrendingDown, BarChart3, Globe, Coins } from 'lucide-react';

export default function MarketOverview() {
  const { darkMode, t, assets } = useApp();

  const marketStats = (() => {
    const stocks = assets.filter(a => a.type === 'stock');
    const crypto = assets.filter(a => a.type === 'crypto');
    const forex = assets.filter(a => a.type === 'forex');

    const avgChange = (arr: typeof assets) =>
      arr.reduce((sum, a) => sum + a.changePercent, 0) / arr.length;

    return [
      {
        label: t('stocks'),
        icon: BarChart3,
        change: avgChange(stocks),
        count: stocks.length,
        color: 'from-blue-500 to-cyan-500',
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
      },
      {
        label: t('crypto'),
        icon: Coins,
        change: avgChange(crypto),
        count: crypto.length,
        color: 'from-orange-500 to-yellow-500',
        textColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
      },
      {
        label: t('forex'),
        icon: Globe,
        change: avgChange(forex),
        count: forex.length,
        color: 'from-green-500 to-emerald-500',
        textColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
      },
    ];
  })();

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
    }`}>
      <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('market')} {t('overview')}
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {marketStats.map(stat => {
          const isPositive = stat.change >= 0;
          return (
            <div
              key={stat.label}
              className={`rounded-xl p-3.5 border transition-all ${
                darkMode ? 'border-gray-800 hover:border-gray-700 bg-gray-900/50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.textColor}`} />
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stat.label}
                    </div>
                    <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {stat.count} assets
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isPositive ? '+' : ''}{stat.change.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
