import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAllPrices } from '@/hooks/useMarketData';
import { Star, Search, TrendingUp, TrendingDown, X, Plus } from 'lucide-react';

interface WatchlistProps {
  compact?: boolean;
}

function formatLivePrice(symbol: string, price: number): string {
  if (symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('ETH')) return price.toFixed(2);
  if (symbol.includes('JPY')) return price.toFixed(3);
  if (symbol.includes('/')) return price.toFixed(5);
  return price.toFixed(2);
}

export default function Watchlist({ compact = false }: WatchlistProps) {
  const { assets, darkMode, t, watchlist, toggleWatchlist, setSelectedAsset, selectedAsset, activeMarketTab, setActiveMarketTab } = useApp();
  const livePrices = useAllPrices();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const watchlistAssets = useMemo(() => 
    assets.filter(a => watchlist.includes(a.symbol)),
    [assets, watchlist]
  );

  const filteredAssets = useMemo(() => {
    if (!search) return assets;
    const s = search.toLowerCase();
    return assets.filter(a => 
      a.symbol.toLowerCase().includes(s) || a.name.toLowerCase().includes(s)
    );
  }, [assets, search]);

  const filterByTab = useMemo(() => {
    if (showAdd) return filteredAssets;
    return watchlistAssets.filter(a => {
      if (activeMarketTab === 'stocks') return a.type === 'stock';
      if (activeMarketTab === 'crypto') return a.type === 'crypto';
      return a.type === 'forex';
    });
  }, [filteredAssets, watchlistAssets, showAdd, activeMarketTab]);

  const tabs = [
    { key: 'forex' as const, label: t('forex') },
    { key: 'stocks' as const, label: t('stocks') },
    { key: 'crypto' as const, label: t('crypto') },
  ];

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {showAdd ? t('searchAssets') : t('watchlist')}
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`p-1.5 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveMarketTab(tab.key); setShowAdd(false); }}
            className={`flex-1 py-2 text-xs font-medium transition-all ${
              activeMarketTab === tab.key
                ? darkMode
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-indigo-600 border-b-2 border-indigo-600'
                : darkMode
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search when adding */}
      {showAdd && (
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${
            darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
          }`}>
            <Search className="w-3 h-3 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchAssets')}
              className={`text-xs bg-transparent outline-none w-full ${
                darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className={`overflow-y-auto ${compact ? 'max-h-[300px]' : 'max-h-[500px]'}`}>
        {filterByTab.map(asset => {
          const isSelected = selectedAsset?.symbol === asset.symbol;
          const isWatchlisted = watchlist.includes(asset.symbol);
          const liveQ = livePrices[asset.symbol];
          const displayPrice = liveQ ? liveQ.bid : asset.price;
          const displayChangePercent = liveQ ? liveQ.changePercent : asset.changePercent;
          const isPositive = displayChangePercent >= 0;
          const priceStr = liveQ ? formatLivePrice(asset.symbol, displayPrice) : `${displayPrice.toLocaleString()}`;

          return (
            <div
              key={asset.symbol}
              onClick={() => { setSelectedAsset(asset); }}
              className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all border-b last:border-b-0 ${
                darkMode ? 'border-gray-800/50 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
              } ${isSelected ? darkMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {showAdd && (
                  <button
                    onClick={e => { e.stopPropagation(); toggleWatchlist(asset.symbol); }}
                    className={`p-1 rounded transition-colors ${
                      isWatchlisted
                        ? 'text-yellow-400'
                        : darkMode ? 'text-gray-600 hover:text-yellow-400' : 'text-gray-400 hover:text-yellow-500'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-current' : ''}`} />
                  </button>
                )}
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {asset.symbol}
                  </div>
                  <div className={`text-[10px] truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {asset.name}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className={`text-sm font-semibold flex items-center justify-end gap-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {liveQ && <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />}
                  {priceStr}
                </div>
                <div className={`text-xs font-medium flex items-center justify-end gap-0.5 ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}>
                  {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isPositive ? '+' : ''}{displayChangePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
