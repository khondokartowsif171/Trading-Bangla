import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { analyzeSignal, calcSuperTrend, AgenticSignal, SuperTrendResult } from '@/services/agenticSignalEngine';
import { getCandles, onCandleUpdate } from '@/services/marketDataService';
import { TrendingUp, TrendingDown, Activity, BarChart3, Layers, Gauge, Zap } from 'lucide-react';

type Ind = 'MA' | 'SuperTrend' | 'BB' | 'MACD' | 'Vol';

const CHIPS: { id: Ind; label: string; icon: React.ElementType }[] = [
  { id: 'SuperTrend', label: 'SuperTrend', icon: Zap },
  { id: 'MA', label: 'MA', icon: TrendingUp },
  { id: 'BB', label: 'Bollinger', icon: Layers },
  { id: 'MACD', label: 'MACD', icon: Activity },
  { id: 'Vol', label: 'Volume', icon: BarChart3 },
];

function fmt(v?: number | null) {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  return n >= 100 ? n.toFixed(2) : n.toFixed(5);
}

export default function IndicatorTools({ symbol }: { symbol: string }) {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const [on, setOn] = useState<Record<Ind, boolean>>({ SuperTrend: true, MA: true, BB: false, MACD: true, Vol: false });
  const [sig, setSig] = useState<AgenticSignal | null>(null);
  const [st, setSt] = useState<SuperTrendResult | null>(null);
  const [vol, setVol] = useState<{ last: number; avg: number } | null>(null);

  useEffect(() => {
    const compute = () => {
      const candles = getCandles(symbol);
      if (candles.length >= 30) {
        try {
          setSig(analyzeSignal(symbol, candles));
          setSt(calcSuperTrend(candles));
          const vols = candles.slice(-20).map(c => c.volume || 0);
          setVol({ last: candles[candles.length - 1].volume || 0, avg: vols.reduce((a, b) => a + b, 0) / (vols.length || 1) });
        } catch { /* disposed/transient — ignore */ }
      } else { setSig(null); setSt(null); setVol(null); }
    };
    compute();
    const unsub = onCandleUpdate(s => { if (s === symbol) compute(); });
    const iv = setInterval(compute, 6000);
    return () => { unsub(); clearInterval(iv); };
  }, [symbol]);

  const toggle = (i: Ind) => setOn(p => ({ ...p, [i]: !p[i] }));

  const ind = sig?.indicators;
  const card = `rounded-lg border p-2.5 ${darkMode ? 'border-gray-800 bg-gray-900/40' : 'border-gray-200 bg-white'}`;
  const dirColor = (d?: string) => d === 'BUY' || d === 'BULLISH' ? 'text-green-400' : d === 'SELL' || d === 'BEARISH' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className={`rounded-xl border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} p-2.5`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <Gauge className="w-3 h-3 text-indigo-400" /> {isBn ? 'ইন্ডিকেটর টুলস' : 'Indicator Tools'}
        <span className="ml-auto text-[9px] text-gray-600 font-mono">{symbol}</span>
      </div>

      {/* Toggle chips */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {CHIPS.map(c => (
          <button key={c.id} onClick={() => toggle(c.id)}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all ${
              on[c.id] ? 'bg-indigo-500 text-white' : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
            }`}>
            <c.icon className="w-3 h-3" />{c.label}
          </button>
        ))}
      </div>

      {!ind && (
        <div className="text-[10px] text-gray-600 text-center py-4">{isBn ? 'ডেটা লোড হচ্ছে…' : 'Loading data…'}</div>
      )}

      <div className="space-y-2">
        {/* SuperTrend (smart) */}
        {on.SuperTrend && st && (
          <div className={card}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" />SuperTrend</span>
              <span className={`text-xs font-black flex items-center gap-1 ${dirColor(st.direction)}`}>
                {st.direction === 'BUY' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{st.direction}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-gray-500 font-mono">level {fmt(st.value)}</span>
              {st.flip && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold animate-pulse">🔔 FLIP</span>}
            </div>
          </div>
        )}

        {/* Moving Average */}
        {on.MA && ind && (
          <div className={card}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-400" />Moving Avg</span>
              <span className={`text-[10px] font-bold ${ind.ema9 > ind.ema21 ? 'text-green-400' : 'text-red-400'}`}>
                {ind.ema9 > ind.ema21 ? 'BULLISH' : 'BEARISH'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono">
              <span className="text-gray-500">EMA9 <span className="text-blue-400">{fmt(ind.ema9)}</span></span>
              <span className="text-gray-500">EMA21 <span className="text-orange-400">{fmt(ind.ema21)}</span></span>
              <span className="text-gray-500">SMA20 <span className="text-cyan-400">{fmt(ind.sma20)}</span></span>
              <span className="text-gray-500">SMA50 <span className="text-purple-400">{fmt(ind.sma50)}</span></span>
            </div>
          </div>
        )}

        {/* Bollinger Bands */}
        {on.BB && ind && (
          <div className={card}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 flex items-center gap-1"><Layers className="w-3 h-3 text-yellow-400" />Bollinger</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 text-[9px] font-mono">
              <span className="text-gray-500">Upper <span className="text-yellow-400">{fmt(ind.upperBB)}</span></span>
              <span className="text-gray-500">Lower <span className="text-yellow-400">{fmt(ind.lowerBB)}</span></span>
            </div>
          </div>
        )}

        {/* MACD */}
        {on.MACD && ind && (
          <div className={card}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3 text-pink-400" />MACD</span>
              <span className={`text-[10px] font-bold ${ind.macdHistogram >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {ind.macdHistogram >= 0 ? 'BULLISH' : 'BEARISH'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 text-[9px] font-mono">
              <span className="text-gray-500">MACD <span className={ind.macd >= 0 ? 'text-green-400' : 'text-red-400'}>{ind.macd.toFixed(4)}</span></span>
              <span className="text-gray-500">Signal <span className="text-orange-400">{ind.macdSignal.toFixed(4)}</span></span>
            </div>
          </div>
        )}

        {/* Volume */}
        {on.Vol && vol && (
          <div className={card}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 flex items-center gap-1"><BarChart3 className="w-3 h-3 text-emerald-400" />Volume</span>
              <span className={`text-[10px] font-bold ${vol.last > vol.avg * 1.5 ? 'text-emerald-400' : 'text-gray-400'}`}>
                {vol.last > vol.avg * 1.5 ? '⚡ SPIKE' : 'Normal'}
              </span>
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-1">last {Math.round(vol.last).toLocaleString()} · avg {Math.round(vol.avg).toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
