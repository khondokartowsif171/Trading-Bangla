import { useRef, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { FOREX_PAIRS } from '@/services/forexApi';
import { Search, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

const TIMEFRAMES = ['1d', '1w', '1m', '3m', '12m', 'all'] as const;

const SYMBOL_MAP: Record<string, string> = {
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'USD/CHF': 'FX:USDCHF',
  'AUD/USD': 'FX:AUDUSD',
  'USD/CAD': 'FX:USDCAD',
  'NZD/USD': 'FX:NZDUSD',
  'EUR/GBP': 'FX:EURGBP',
  'EUR/JPY': 'FX:EURJPY',
  'GBP/JPY': 'FX:GBPJPY',
  'USD/BDT': 'FX:USDBDT',
  XAU: 'OANDA:XAUUSD',
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  BNB: 'BINANCE:BNBUSDT',
  SOL: 'BINANCE:SOLUSDT',
  XRP: 'BINANCE:XRPUSDT',
  AAPL: 'NASDAQ:AAPL',
  MSFT: 'NASDAQ:MSFT',
  GOOGL: 'NASDAQ:GOOGL',
  TSLA: 'NASDAQ:TSLA',
  NVDA: 'NASDAQ:NVDA',
  AMZN: 'NASDAQ:AMZN',
  META: 'NASDAQ:META',
};

const DATE_RANGE_MAP: Record<string, string> = {
  '1d': '1d|1',
  '1w': '5d|15',
  '1m': '1m|30',
  '3m': '3m|60',
  '12m': '12m|1D',
  'all': 'all|1M',
};

export default function TradingChart() {
  const { darkMode, selectedAsset, t } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const tvSymbol = selectedAsset ? (SYMBOL_MAP[selectedAsset.symbol] || `FX:${selectedAsset.symbol.replace('/', '')}`) : 'FX:EURUSD';
  const tfValue = DATE_RANGE_MAP[timeframe] || '1m|30';

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[selectedAsset?.name || selectedAsset?.symbol || 'EUR/USD', `${tvSymbol}|1D`]],
      lineWidth: 2,
      lineType: 0,
      chartType: 'area',
      colorTheme: 'dark',
      fontColor: '#6b7280',
      backgroundColor: '#0f0f0f',
      widgetFontColor: '#d1d5db',
      gridLineColor: 'rgba(242,242,242,0.06)',
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      volumeUpColor: 'rgba(34,197,94,0.5)',
      volumeDownColor: 'rgba(239,68,68,0.5)',
      isTransparent: false,
      locale: 'en',
      chartOnly: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      dateRanges: ['1d|1', '1w|15', '1m|30', '3m|60', '12m|1D', 'all|1M'],
      fontSize: '10',
      headerFontSize: 'medium',
      autosize: true,
      width: '100%',
      height: '100%',
      noTimeScale: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
    });
    containerRef.current.appendChild(script);
  }, [selectedAsset?.symbol, tvSymbol]);

  if (!selectedAsset) return null;

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          <div>
            <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedAsset.symbol}
            </span>
            <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {selectedAsset.name}
            </span>
          </div>
        </div>

        {/* Timeframes */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                timeframe === tf
                  ? darkMode ? 'bg-green-500/30 text-green-400' : 'bg-green-100 text-green-700'
                  : darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}>
              {t(tf as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Price bar */}
      <div className={`flex items-center gap-4 px-4 py-2 border-b ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <span className={`text-xl font-bold font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          ${selectedAsset.price.toLocaleString()}
        </span>
        <span className={`text-sm font-semibold ${selectedAsset.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {selectedAsset.changePercent >= 0 ? '+' : ''}{selectedAsset.changePercent}%
        </span>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          H: ${selectedAsset.high.toLocaleString()} L: ${selectedAsset.low.toLocaleString()}
        </span>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Vol: {selectedAsset.volume}
        </span>
      </div>

      {/* TradingView Chart */}
      <div className="w-full" style={{ height: 460 }}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
