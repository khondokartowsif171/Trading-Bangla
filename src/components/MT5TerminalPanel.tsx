import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useForexRates, useForexHistorical } from '@/hooks/useForexData';
import { FOREX_PAIRS } from '@/services/forexApi';
import { getRealSignals, SignalResult } from '@/services/realSignalEngine';
import { analyzeSignal, AgenticSignal } from '@/services/agenticSignalEngine';
import { startMarketData, stopMarketData, onPriceUpdate, onCandleUpdate, seedHistoricalData, getPrice, getCandles, RealTimeQuote, OHLC } from '@/services/marketDataService';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import AgenticSignalPanel from './AgenticSignalPanel';
import { Search, TrendingUp, TrendingDown, RefreshCw, Activity, Zap, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

function MarketWatch({ rates, loading, onSelect, selected }: {
  rates: any; loading: boolean; onSelect: (s: string) => void; selected: string;
}) {
  const { darkMode, lang } = useApp();
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

function MT5Chart({ symbol, realtimeCandles }: { symbol: string; realtimeCandles: OHLC[] }) {
  const { darkMode } = useApp();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { candles: histCandles, loading } = useForexHistorical(symbol, 60);
  const candles = realtimeCandles.length > 0 ? realtimeCandles : histCandles;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    try {
      const chart = createChart(chartContainerRef.current, {
        layout: { background: { color: 'transparent' }, textColor: darkMode ? '#9ca3af' : '#6b7280' },
        grid: { vertLines: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, horzLines: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
        width: chartContainerRef.current.clientWidth, height: 420,
        crosshair: { mode: 0, vertLine: { color: '#6366f1', labelBackgroundColor: '#6366f1' }, horzLine: { color: '#6366f1', labelBackgroundColor: '#6366f1' } },
        timeScale: { borderColor: darkMode ? '#374151' : '#e5e7eb', timeVisible: false, tickMarkFormatter: (time: any) => { const d = new Date(time * 1000); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; } },
        rightPriceScale: { borderColor: darkMode ? '#374151' : '#e5e7eb' },
      });
      const series = chart.addCandlestickSeries({ upColor: '#22c55e', downColor: '#ef4444', borderUpColor: '#22c55e', borderDownColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444' } as any);
      chartRef.current = chart; candleSeriesRef.current = series;
      const handleResize = () => { if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth }); };
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    if (!candleSeriesRef.current || !candles.length) return;
    try {
      const data = candles.map(c => ({ time: Math.floor(c.time), open: c.open, high: c.high, low: c.low, close: c.close }));
      candleSeriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    } catch {}
  }, [candles]);

  return (
    <div className={`relative rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      <div className={`px-4 py-2 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{symbol}</span>
          <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{candles.length}C</span>
        </div>
        {symbol === 'XAU/USD' && (
          <span className="flex items-center gap-1 text-[10px] text-green-400"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />WebSocket</span>
        )}
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

export default function MT5TerminalPanel() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const { rates, loading, refresh } = useForexRates();
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const selectedRate = rates[selectedSymbol];

  const [realtimeCandles, setRealtimeCandles] = useState<Record<string, OHLC[]>>({});
  const [livePrice, setLivePrice] = useState<RealTimeQuote | null>(null);
  const [agenticSignal, setAgenticSignal] = useState<AgenticSignal | null>(null);
  const [sigLoading, setSigLoading] = useState(false);

  useEffect(() => {
    startMarketData();
    FOREX_PAIRS.forEach(p => { seedHistoricalData(p.symbol); });

    const unsubPrice = onPriceUpdate((q) => {
      if (q.symbol === selectedSymbol) setLivePrice(q);
    });

    const unsubCandle = onCandleUpdate((sym, c) => {
      setRealtimeCandles(prev => ({ ...prev, [sym]: c }));
      if (c.length >= 30) {
        const sig = analyzeSignal(sym, c);
        setAgenticSignal(sig);
      }
    });

    return () => { unsubPrice(); unsubCandle(); stopMarketData(); };
  }, []);

  useEffect(() => {
    const q = getPrice(selectedSymbol);
    if (q) setLivePrice(q);
    const c = getCandles(selectedSymbol);
    if (c.length > 0) setRealtimeCandles(prev => ({ ...prev, [selectedSymbol]: c }));
    else seedHistoricalData(selectedSymbol).then(c2 => {
      if (c2.length > 0) setRealtimeCandles(prev => ({ ...prev, [selectedSymbol]: c2 }));
    });
  }, [selectedSymbol]);

  const ratesWithLive: Record<string, any> = { ...rates };
  Object.entries(getCandles(selectedSymbol)).forEach(([sym]) => {
    const lq = getPrice(sym);
    if (lq && !ratesWithLive[sym]) {
      ratesWithLive[sym] = { bid: lq.bid, ask: lq.ask, spread: lq.spread, change: lq.change, changePercent: lq.changePercent, high: lq.high, low: lq.low, volume: 'RT' };
    }
  });
  const displayRate = livePrice || (selectedRate && {
    bid: selectedRate.bid, ask: selectedRate.ask, spread: selectedRate.spread,
    change: selectedRate.change || 0, changePercent: selectedRate.changePercent || 0,
    high: selectedRate.high || 0, low: selectedRate.low || 0, volume: selectedRate.volume || '0',
  }) || null;

  return (
    <div className="space-y-4">
      {/* Agentic Signal Header */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Price + Chart Side */}
        <div className="space-y-3">
          {/* Live Price Bar */}
          {displayRate && (
            <div className={`rounded-xl border p-3 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
              <div className={`grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs`}>
                {[
                  { label: isBn ? 'বিড' : 'Bid', value: displayRate.bid.toFixed(selectedSymbol.includes('JPY') ? 3 : displayRate.bid > 100 ? 2 : 5), cls: '' },
                  { label: isBn ? 'আস্ক' : 'Ask', value: displayRate.ask.toFixed(selectedSymbol.includes('JPY') ? 3 : displayRate.ask > 100 ? 2 : 5), cls: 'text-blue-400' },
                  { label: isBn ? 'স্প্রেড' : 'Spread', value: displayRate.spread.toFixed(selectedSymbol.includes('JPY') ? 3 : 5), cls: 'text-yellow-400' },
                  { label: isBn ? 'উচ্চ' : 'High', value: displayRate.high.toFixed(displayRate.high > 100 ? 2 : 5), cls: 'text-green-400' },
                  { label: isBn ? 'নিচু' : 'Low', value: displayRate.low.toFixed(displayRate.low > 100 ? 2 : 5), cls: 'text-red-400' },
                  { label: isBn ? 'পরিবর্তন' : 'Change', value: `${displayRate.changePercent >= 0 ? '+' : ''}${displayRate.changePercent}%`, cls: displayRate.change >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: 'Source', value: selectedSymbol === 'XAU/USD' ? 'Binance WS' : 'Frankfurter', cls: 'text-cyan-400' },
                ].map(s => (
                  <div key={s.label}>
                    <div className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.label}</div>
                    <div className={`text-xs font-bold font-mono ${s.cls} ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          <MT5Chart symbol={selectedSymbol} realtimeCandles={realtimeCandles[selectedSymbol] || []} />

          {/* All Pairs Table */}
          <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
            <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {isBn ? `সব ফরেক্স পেয়ার (${FOREX_PAIRS.length})` : `All Forex Pairs (${FOREX_PAIRS.length})`}
              </span>
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              {FOREX_PAIRS.map(pair => {
                const r = rates[pair.symbol];
                return (
                  <div key={pair.symbol} onClick={() => setSelectedSymbol(pair.symbol)}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer border-b last:border-b-0 transition-all ${
                      darkMode ? 'border-gray-800/50 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
                    } ${pair.symbol === selectedSymbol ? (darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50') : ''}`}>
                    <div><span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pair.symbol}</span></div>
                    <div className="flex items-center gap-4">
                      <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r ? r.bid.toFixed(pair.symbol.includes('JPY') ? 3 : 5) : '—'}</span>
                      <span className={`w-16 text-right font-medium ${r ? (r.change >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>{r ? `${r.changePercent >= 0 ? '+' : ''}${r.changePercent}%` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Agentic Signal Panel */}
        <div>
          <AgenticSignalPanel signal={agenticSignal} />
        </div>
      </div>

      {/* Bottom: Market Watch + EA Signals */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        <MarketWatch rates={ratesWithLive} loading={loading} onSelect={setSelectedSymbol} selected={selectedSymbol} />
        
        {/* EA Bot Signals (fallback) */}
        <div className={`rounded-xl border p-4 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold flex items-center gap-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Zap className="w-4 h-4 text-green-400" />
              {isBn ? `EA বট — ${selectedSymbol}` : `EA Bot — ${selectedSymbol}`}
            </h3>
            {livePrice && (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {selectedSymbol === 'XAU/USD' ? 'Real-time' : '30s'}
              </span>
            )}
          </div>
          <div className="text-center py-6">
            <div className={`text-4xl mb-2 font-mono font-bold ${displayRate ? (displayRate.change >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-600'}`}>
              {displayRate ? `$${displayRate.bid.toFixed(displayRate.bid > 100 ? 2 : 5)}` : '---'}
            </div>
            <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {isBn ? 'উপরে এজেন্টিক সিগন্যাল দেখুন' : 'See Agentic Signal panel above for analysis'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
