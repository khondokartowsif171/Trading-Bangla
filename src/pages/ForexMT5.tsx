import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useForexRates, useForexHistorical } from '@/hooks/useForexData';
import { FOREX_PAIRS } from '@/services/forexApi';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Search, TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

function MarketWatch({ rates, loading, onSelect, selected }: {
  rates: any; loading: boolean; onSelect: (s: string) => void; selected: string;
}) {
  const { darkMode, t, lang } = useApp();
  const [search, setSearch] = useState('');
  const isBn = lang === 'bn';

  const filtered = useMemo(() => {
    if (!search) return FOREX_PAIRS;
    const s = search.toLowerCase();
    return FOREX_PAIRS.filter(p =>
      p.symbol.toLowerCase().includes(s) || p.name.toLowerCase().includes(s)
    );
  }, [search]);

  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      <div className={`px-3 py-2 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <Activity className="w-3.5 h-3.5 text-gray-500" />
        <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {isBn ? 'মার্কেট ওয়াচ' : 'Market Watch'}
        </span>
        {loading && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin ml-auto" />}
      </div>
      <div className={`px-2 py-1.5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <Search className="w-3 h-3 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isBn ? 'সিম্বল সার্চ...' : 'Search symbol...'}
            className={`text-xs bg-transparent outline-none w-full ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
        </div>
      </div>
      <div className={`grid grid-cols-4 gap-0 text-[10px] font-semibold px-3 py-1.5 border-b ${darkMode ? 'border-gray-800 text-gray-500 bg-gray-900/50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
        <span>{isBn ? 'সিম্বল' : 'Symbol'}</span>
        <span className="text-right">{isBn ? 'বিড' : 'Bid'}</span>
        <span className="text-right">{isBn ? 'আস্ক' : 'Ask'}</span>
        <span className="text-right">{isBn ? 'পরিবর্তন' : 'Change'}</span>
      </div>
      <div className="overflow-y-auto max-h-[400px] md:max-h-[600px]">
        {filtered.map(pair => {
          const r = rates[pair.symbol];
          const isSelected = pair.symbol === selected;
          return (
            <div key={pair.symbol} onClick={() => onSelect(pair.symbol)}
              className={`grid grid-cols-4 gap-0 px-3 py-2 text-xs cursor-pointer border-b last:border-b-0 transition-all ${
                darkMode ? 'border-gray-800/50 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
              } ${isSelected ? (darkMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'bg-indigo-50 border-l-2 border-l-indigo-500') : ''}`}>
              <div>
                <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pair.symbol}</div>
                <div className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pair.name}</div>
              </div>
              <div className={`text-right font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {r ? r.bid.toFixed(pair.symbol.includes('JPY') ? 3 : 5) : '—'}
              </div>
              <div className={`text-right font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {r ? r.ask.toFixed(pair.symbol.includes('JPY') ? 3 : 5) : '—'}
              </div>
              <div className={`text-right font-semibold ${r ? (r.change >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                {r ? `${r.changePercent >= 0 ? '+' : ''}${r.changePercent}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MT5Chart({ symbol }: { symbol: string }) {
  const { darkMode } = useApp();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { candles, loading } = useForexHistorical(symbol, 60);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: darkMode ? '#9ca3af' : '#6b7280',
      },
      grid: {
        vertLines: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        horzLines: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 460,
      crosshair: {
        mode: 0,
        vertLine: { color: darkMode ? '#6366f1' : '#6366f1', labelBackgroundColor: '#6366f1' },
        horzLine: { color: darkMode ? '#6366f1' : '#6366f1', labelBackgroundColor: '#6366f1' },
      },
      timeScale: {
        borderColor: darkMode ? '#374151' : '#e5e7eb',
        timeVisible: false,
        tickMarkFormatter: (time: any) => {
          const d = new Date(time * 1000);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        },
      },
      rightPriceScale: { borderColor: darkMode ? '#374151' : '#e5e7eb' },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    } as any);

    chartRef.current = chart;
    candleSeriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [darkMode]);

  useEffect(() => {
    if (!candleSeriesRef.current || !candles.length) return;
    const data = candles.map(c => ({
      time: new Date(c.time).getTime() / 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div className={`relative rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      <div className={`px-4 py-2 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{symbol}</span>
          <span className={`ml-2 text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {loading ? 'Loading...' : `${candles.length} candles`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>60D</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

export default function ForexMT5() {
  const { darkMode, lang, t } = useApp();
  const isBn = lang === 'bn';
  const { rates, loading, refresh } = useForexRates();
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const selectedRate = rates[selectedSymbol];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* MT5-style toolbar */}
      <div className={`sticky top-14 md:top-16 z-30 border-b backdrop-blur-xl ${darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isBn ? 'ফরেক্স টার্মিনাল' : 'Forex Terminal'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
              MT5
            </span>
          </div>
          <button onClick={refresh}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4">
        {/* Rate ticker */}
        <div className={`overflow-hidden rounded-lg border mb-4 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
          <div className="flex gap-6 animate-marquee py-2 px-3">
            {['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'GBP/JPY'].map(s => {
              const r = rates[s];
              return (
                <div key={s} className="flex items-center gap-1.5 shrink-0 text-xs">
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s}</span>
                  <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {r ? r.bid.toFixed(s.includes('JPY') ? 3 : 5) : '—'}
                  </span>
                  <span className={`font-medium ${r ? (r.change >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                    {r ? `${r.changePercent >= 0 ? '+' : ''}${r.changePercent}%` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          {/* Market Watch Panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <MarketWatch rates={rates} loading={loading} onSelect={setSelectedSymbol} selected={selectedSymbol} />
          </motion.div>

          {/* Chart + Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            {/* Price Info Bar */}
            {selectedRate && (
              <div className={`rounded-xl border p-3 grid grid-cols-4 md:grid-cols-7 gap-3 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
                {[
                  { label: isBn ? 'বিড' : 'Bid', value: selectedRate.bid.toFixed(selectedSymbol.includes('JPY') ? 3 : 5), cls: '' },
                  { label: isBn ? 'আস্ক' : 'Ask', value: selectedRate.ask.toFixed(selectedSymbol.includes('JPY') ? 3 : 5), cls: '' },
                  { label: isBn ? 'স্প্রেড' : 'Spread', value: selectedRate.spread.toFixed(selectedSymbol.includes('JPY') ? 3 : 5), cls: 'text-yellow-400' },
                  { label: isBn ? 'উচ্চ' : 'High', value: selectedRate.high.toFixed(selectedSymbol.includes('JPY') ? 3 : 5), cls: 'text-green-400' },
                  { label: isBn ? 'নিচু' : 'Low', value: selectedRate.low.toFixed(selectedSymbol.includes('JPY') ? 3 : 5), cls: 'text-red-400' },
                  { label: isBn ? 'পরিবর্তন' : 'Change', value: `${selectedRate.changePercent >= 0 ? '+' : ''}${selectedRate.changePercent}%`, cls: selectedRate.change >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: isBn ? 'ভলিউম' : 'Volume', value: selectedRate.volume, cls: '' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.label}</div>
                    <div className={`text-xs font-bold font-mono ${s.cls} ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Chart */}
            <MT5Chart symbol={selectedSymbol} />

            {/* Available Pairs Table */}
            <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
              <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {isBn ? `📊 সব ফরেক্স পেয়ার (${FOREX_PAIRS.length})` : `📊 All Forex Pairs (${FOREX_PAIRS.length})`}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {FOREX_PAIRS.map(pair => {
                  const r = rates[pair.symbol];
                  return (
                    <div key={pair.symbol} onClick={() => setSelectedSymbol(pair.symbol)}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer border-b last:border-b-0 transition-all ${
                        darkMode ? 'border-gray-800/50 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
                      } ${pair.symbol === selectedSymbol ? (darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50') : ''}`}>
                      <div>
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pair.symbol}</span>
                        <span className={`ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pair.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {r ? r.bid.toFixed(pair.symbol.includes('JPY') ? 3 : 5) : '—'}
                        </span>
                        <span className={`w-16 text-right font-medium ${r ? (r.change >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                          {r ? `${r.changePercent >= 0 ? '+' : ''}${r.changePercent}%` : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Info bar */}
        <div className={`mt-4 rounded-xl border p-3 text-center ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
          <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {isBn
              ? '📡 ডাটা সোর্স: Frankfurter API (ECB) | প্রতি ৩০ সেকেন্ডে আপডেট | বিনামূল্যে, কোনো API কী প্রয়োজন নেই'
              : '📡 Data Source: Frankfurter API (European Central Bank) | Updates every 30s | Free, no API key required'}
          </p>
        </div>
      </div>
    </div>
  );
}
