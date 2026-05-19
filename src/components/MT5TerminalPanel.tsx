import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useForexRates, useForexHistorical } from '@/hooks/useForexData';
import { FOREX_PAIRS } from '@/services/forexApi';
import { analyzeSignal, AgenticSignal } from '@/services/agenticSignalEngine';
import { startMarketData, stopMarketData, onPriceUpdate, onCandleUpdate, seedHistoricalData, getPrice, getCandles, RealTimeQuote, OHLC } from '@/services/marketDataService';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { openTrade, updateTradePrices, onTradeUpdate } from '@/services/paperTradingService';
import { addNotif } from './NotificationsPanel';
import AgenticSignalPanel from './AgenticSignalPanel';
import AccountMetricsCards from './AccountMetricsCards';
import OpenTradesTable from './OpenTradesTable';
import PerformanceStats from './PerformanceStats';
import EaConfigPanel from './EaConfigPanel';
import NotificationsPanel from './NotificationsPanel';
import { Search, TrendingUp, TrendingDown, RefreshCw, Activity, Zap, LayoutDashboard } from 'lucide-react';
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
    return FOREX_PAIRS.filter(p => p.symbol.toLowerCase().includes(s) || p.name.toLowerCase().includes(s));
  }, [search]);

  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      <div className={`px-3 py-2 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <Activity className="w-3.5 h-3.5 text-gray-500" />
        <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isBn ? 'মার্কেট ওয়াচ' : 'Market Watch'}</span>
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
      <div className="overflow-y-auto max-h-[300px]">
        {filtered.map(pair => {
          const r = rates[pair.symbol];
          const isSelected = pair.symbol === selected;
          return (
            <div key={pair.symbol} onClick={() => onSelect(pair.symbol)}
              className={`grid grid-cols-4 gap-0 px-3 py-1.5 text-xs cursor-pointer border-b last:border-b-0 transition-all ${
                darkMode ? 'border-gray-800/50 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
              } ${isSelected ? (darkMode ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'bg-indigo-50 border-l-2 border-l-indigo-500') : ''}`}>
              <div>
                <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pair.symbol}</div>
                <div className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{pair.name}</div>
              </div>
              <div className={`text-right font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r ? r.bid.toFixed(pair.symbol.includes('JPY') ? 3 : 5) : '—'}</div>
              <div className={`text-right font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r ? r.ask.toFixed(pair.symbol.includes('JPY') ? 3 : 5) : '—'}</div>
              <div className={`text-right font-semibold ${r ? (r.change >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>{r ? `${r.changePercent >= 0 ? '+' : ''}${r.changePercent}%` : '—'}</div>
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
  const { candles: histCandles } = useForexHistorical(symbol, 60);
  const candles = realtimeCandles.length > 0 ? realtimeCandles : histCandles;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    try {
      const chart = createChart(chartContainerRef.current, {
        layout: { background: { color: 'transparent' }, textColor: darkMode ? '#9ca3af' : '#6b7280' },
        grid: { vertLines: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, horzLines: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
        width: chartContainerRef.current.clientWidth, height: 360,
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
    try { candleSeriesRef.current.setData(candles.map(c => ({ time: Math.floor(c.time), open: c.open, high: c.high, low: c.low, close: c.close }))); chartRef.current?.timeScale().fitContent(); } catch {}
  }, [candles]);

  return (
    <div className={`relative rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      <div className={`px-3 py-1.5 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{symbol}</span>
          <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{candles.length}C</span>
        </div>
        {symbol === 'XAU/USD' && <span className="flex items-center gap-1 text-[9px] text-green-400"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />WS</span>}
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

export default function MT5TerminalPanel() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const { rates, loading } = useForexRates();
  const [selectedSymbol, setSelectedSymbol] = useState('EUR/USD');
  const selectedRate = rates[selectedSymbol];
  const [realtimeCandles, setRealtimeCandles] = useState<Record<string, OHLC[]>>({});
  const [livePrice, setLivePrice] = useState<RealTimeQuote | null>(null);
  const [agenticSignal, setAgenticSignal] = useState<AgenticSignal | null>(null);
  const [view, setView] = useState<'dashboard' | 'trades'>('dashboard');

  useEffect(() => {
    startMarketData();
    FOREX_PAIRS.forEach(p => seedHistoricalData(p.symbol));
    const unsubPrice = onPriceUpdate(q => { if (q.symbol === selectedSymbol) setLivePrice(q); });
    const unsubCandle = onCandleUpdate((sym, c) => {
      setRealtimeCandles(prev => ({ ...prev, [sym]: c }));
      if (c.length >= 30) {
        const sig = analyzeSignal(sym, c);
        setAgenticSignal(sig);
        if (sig.signal !== 'NEUTRAL' && sig.confidence >= 65) {
          const lot = +(0.1 + Math.random() * 0.2).toFixed(2);
          openTrade(sym, sig.signal, lot, sig.entry, sig.stopLoss, sig.takeProfit);
          addNotif(sig.signal === 'BUY' ? 'buy' : 'sell', `EA opened ${sig.signal} ${lot} lot on ${sym} (${sig.confidence}% conf)`, 'EA');
        }
      }
    });
    const priceInterval = setInterval(updateTradePrices, 2000);
    return () => { unsubPrice(); unsubCandle(); clearInterval(priceInterval); stopMarketData(); };
  }, []);

  useEffect(() => {
    const q = getPrice(selectedSymbol);
    if (q) setLivePrice(q);
    const c = getCandles(selectedSymbol);
    if (c.length > 0) setRealtimeCandles(prev => ({ ...prev, [selectedSymbol]: c }));
    else seedHistoricalData(selectedSymbol).then(c2 => { if (c2.length > 0) setRealtimeCandles(prev => ({ ...prev, [selectedSymbol]: c2 })); });
  }, [selectedSymbol]);

  const displayRate = livePrice || (selectedRate && {
    bid: selectedRate.bid, ask: selectedRate.ask, spread: selectedRate.spread,
    change: selectedRate.change || 0, changePercent: selectedRate.changePercent || 0,
    high: selectedRate.high || 0, low: selectedRate.low || 0, volume: selectedRate.volume || '0',
  }) || null;

  return (
    <div className="space-y-3">
      {/* Account Metrics */}
      <AccountMetricsCards />

      {/* View Switcher */}
      <div className={`flex rounded-lg p-0.5 border self-start ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
        <button onClick={() => setView('dashboard')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'dashboard' ? (darkMode ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 shadow-sm') : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
          <LayoutDashboard className="w-3 h-3 inline mr-1" />{isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}
        </button>
        <button onClick={() => setView('trades')}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'trades' ? (darkMode ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 shadow-sm') : (darkMode ? 'text-gray-400' : 'text-gray-500')}`}>
          <TrendingUp className="w-3 h-3 inline mr-1" />{isBn ? 'ট্রেডস' : 'Trades'}
        </button>
      </div>

      {view === 'dashboard' ? (
        <div className="grid xl:grid-cols-[1fr_340px] gap-3">
          {/* Main Panel */}
          <div className="space-y-3">
            {/* Live Price Bar */}
            {displayRate && (
              <div className={`rounded-xl border p-2.5 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-1 text-center text-[10px]">
                  {[
                    { label: isBn ? 'বিড' : 'Bid', v: displayRate.bid.toFixed(displayRate.bid > 100 ? 2 : 5), c: '' },
                    { label: isBn ? 'আস্ক' : 'Ask', v: displayRate.ask.toFixed(displayRate.ask > 100 ? 2 : 5), c: 'text-blue-400' },
                    { label: isBn ? 'স্প্রেড' : 'Spread', v: displayRate.spread.toFixed(3), c: 'text-yellow-400' },
                    { label: isBn ? 'উচ্চ' : 'High', v: displayRate.high.toFixed(displayRate.high > 100 ? 2 : 5), c: 'text-green-400' },
                    { label: isBn ? 'নিচু' : 'Low', v: displayRate.low.toFixed(displayRate.low > 100 ? 2 : 5), c: 'text-red-400' },
                    { label: isBn ? 'পরিবর্তন' : 'Chg', v: `${displayRate.changePercent >= 0 ? '+' : ''}${displayRate.changePercent}%`, c: displayRate.change >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Data', v: selectedSymbol === 'XAU/USD' ? 'Binance' : 'ECB', c: 'text-cyan-400' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className={`text-[8px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.label}</div>
                      <div className={`text-[11px] font-bold font-mono ${s.c} ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart + Market Watch */}
            <div className="grid lg:grid-cols-[1fr_260px] gap-3">
              <MT5Chart symbol={selectedSymbol} realtimeCandles={realtimeCandles[selectedSymbol] || []} />
              <MarketWatch rates={rates} loading={loading} onSelect={setSelectedSymbol} selected={selectedSymbol} />
            </div>

            {/* Agentic Signal + Config + Notifs */}
            <div className="grid md:grid-cols-3 gap-3">
              <AgenticSignalPanel signal={agenticSignal} />
              <EaConfigPanel />
              <NotificationsPanel />
            </div>

            {/* Performance Stats */}
            <PerformanceStats />

            {/* All Pairs */}
            <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
              <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isBn ? `সব ফরেক্স পেয়ার (${FOREX_PAIRS.length})` : `All Forex Pairs (${FOREX_PAIRS.length})`}</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {FOREX_PAIRS.map(pair => {
                  const r = rates[pair.symbol];
                  return (
                    <div key={pair.symbol} onClick={() => setSelectedSymbol(pair.symbol)}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer border-b last:border-b-0 transition-all ${
                        darkMode ? 'border-gray-800/50 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'
                      } ${pair.symbol === selectedSymbol ? (darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50') : ''}`}>
                      <div><span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pair.symbol}</span></div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{r ? r.bid.toFixed(pair.symbol.includes('JPY') ? 3 : 5) : '—'}</span>
                        <span className={`w-14 text-right font-medium ${r ? (r.change >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>{r ? `${r.changePercent >= 0 ? '+' : ''}${r.changePercent}%` : '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar — Hidden on mobile, visible on xl */}
          <div className="hidden xl:flex flex-col gap-3">
            <EaConfigPanel />
            <NotificationsPanel />
          </div>
        </div>
      ) : (
        /* Trades View */
        <div className="space-y-3">
          <OpenTradesTable />
          <PerformanceStats />
          <NotificationsPanel />
        </div>
      )}
    </div>
  );
}
