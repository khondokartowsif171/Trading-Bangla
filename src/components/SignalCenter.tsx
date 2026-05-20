import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { analyzeSignal, AgenticSignal } from '@/services/agenticSignalEngine';
import { getCandles, onCandleUpdate } from '@/services/marketDataService';
import { useSignalBot, BotSignal } from '@/hooks/useSignalBot';
import { Radio, TrendingUp, TrendingDown, Minus, Zap, History, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

// Gold first (friend's primary focus), then majors — must match bot DISPLAY_NAMES
const SIGNAL_SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'];

interface UISignal {
  symbol: string;
  dir: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasons: string[];
  rsi?: number;
  trend?: string;
  source: 'BOT' | 'ENGINE';
}

function fmt(v: number) {
  return v >= 100 ? v.toFixed(2) : v.toFixed(5);
}

function normalizeBot(b: BotSignal): UISignal {
  return {
    symbol: b.symbol, dir: b.direction, confidence: b.confidence,
    entry: b.entry, stopLoss: b.stopLoss, takeProfit: b.takeProfit,
    reasons: b.reasons || [],
    rsi: b.indicators?.rsi, trend: b.indicators?.trend, source: 'BOT',
  };
}
function normalizeEngine(a: AgenticSignal): UISignal {
  return {
    symbol: a.symbol, dir: a.signal, confidence: a.confidence,
    entry: a.entry, stopLoss: a.stopLoss, takeProfit: a.takeProfit,
    reasons: a.reason ? [a.reason] : [],
    rsi: a.indicators?.rsi, trend: a.indicators?.trend, source: 'ENGINE',
  };
}

const DIR_COLOR: Record<string, string> = { BUY: 'text-green-400', SELL: 'text-red-400', NEUTRAL: 'text-gray-400' };
const DIR_BG: Record<string, string> = { BUY: 'bg-green-500/10', SELL: 'bg-red-500/10', NEUTRAL: 'bg-gray-500/10' };

function HeroCard({ sig, symbol }: { sig: UISignal | null; symbol: string }) {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';

  if (!sig) {
    return (
      <div className={`rounded-xl border p-8 flex items-center justify-center ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="text-sm">{isBn ? `${symbol} সিগন্যাল আসছে…` : `Loading ${symbol} signal…`}</span>
        </div>
      </div>
    );
  }

  const rr = (sig.takeProfit !== sig.entry && sig.stopLoss !== sig.entry)
    ? Math.abs((sig.takeProfit - sig.entry) / (sig.stopLoss - sig.entry)).toFixed(1)
    : '--';
  const Icon = sig.dir === 'BUY' ? TrendingUp : sig.dir === 'SELL' ? TrendingDown : Minus;

  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <div className={`p-5 text-center ${DIR_BG[sig.dir]} border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{sig.symbol}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${sig.source === 'BOT' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
            {sig.source === 'BOT' ? '🔴 LIVE BOT' : '⚙ ENGINE'}
          </span>
        </div>
        <Icon className={`w-9 h-9 mx-auto ${DIR_COLOR[sig.dir]}`} />
        <div className={`text-3xl font-black tracking-widest ${DIR_COLOR[sig.dir]}`}>{sig.dir}</div>
        <div className="mt-3 max-w-xs mx-auto">
          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
            <span>{isBn ? 'কনফিডেন্স' : 'Confidence'}</span><span>{sig.confidence}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${sig.confidence >= 70 ? 'bg-green-500' : sig.confidence >= 50 ? 'bg-yellow-500' : 'bg-gray-500'}`} style={{ width: `${sig.confidence}%` }} />
          </div>
        </div>
      </div>
      <div className={`grid grid-cols-4 divide-x ${darkMode ? 'divide-gray-800 bg-gray-900/40' : 'divide-gray-200 bg-white'}`}>
        {[
          { l: isBn ? 'এন্ট্রি' : 'Entry', v: fmt(sig.entry), c: darkMode ? 'text-white' : 'text-gray-900' },
          { l: 'SL', v: fmt(sig.stopLoss), c: 'text-red-400' },
          { l: 'TP', v: fmt(sig.takeProfit), c: 'text-green-400' },
          { l: 'R:R', v: `${rr}:1`, c: 'text-yellow-400' },
        ].map(x => (
          <div key={x.l} className="px-2 py-2.5 text-center">
            <div className="text-[9px] text-gray-500">{x.l}</div>
            <div className={`text-xs font-mono font-bold ${x.c}`}>{x.v}</div>
          </div>
        ))}
      </div>
      {(sig.reasons.length > 0 || sig.rsi != null) && (
        <div className={`px-4 py-2.5 ${darkMode ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
          {sig.rsi != null && (
            <div className="flex items-center gap-3 text-[10px] mb-1.5">
              <span className="text-gray-500">RSI <span className={`font-mono font-bold ${sig.rsi > 70 ? 'text-red-400' : sig.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}`}>{sig.rsi.toFixed(1)}</span></span>
              {sig.trend && <span className="text-gray-500">Trend <span className={`font-bold ${/BULL|UP/.test(sig.trend) ? 'text-green-400' : /BEAR|DOWN/.test(sig.trend) ? 'text-red-400' : 'text-gray-400'}`}>{sig.trend}</span></span>}
            </div>
          )}
          <ul className="space-y-0.5">
            {sig.reasons.slice(0, 3).map((r, i) => (
              <li key={i} className="text-[10px] text-gray-500 flex gap-1.5"><span className="text-indigo-400">›</span>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SignalRow({ sig, sym, selected, onClick }: { sig: UISignal | null; sym: string; selected: boolean; onClick: () => void }) {
  const { darkMode } = useApp();
  const dir = sig?.dir ?? 'NEUTRAL';
  const Icon = dir === 'BUY' ? TrendingUp : dir === 'SELL' ? TrendingDown : Minus;
  const isGold = sym === 'XAU/USD';
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
        selected ? (darkMode ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-400 bg-indigo-50')
                 : (darkMode ? 'border-gray-800 bg-gray-900/40 hover:bg-gray-800/60' : 'border-gray-200 bg-white hover:bg-gray-50')}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${DIR_BG[dir]}`}>
        <Icon className={`w-4 h-4 ${DIR_COLOR[dir]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{sym}</span>
          {isGold && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">GOLD</span>}
          {sig?.source === 'BOT' && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-bold flex items-center gap-0.5"><span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />LIVE</span>}
        </div>
        <div className="text-[10px] text-gray-500 font-mono">{sig ? `Entry ${fmt(sig.entry)}` : 'analyzing…'}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-xs font-black ${DIR_COLOR[dir]}`}>{dir}</div>
        <div className="text-[10px] text-gray-500 font-mono">{sig ? `${sig.confidence}%` : '—'}</div>
      </div>
    </button>
  );
}

export default function SignalCenter({ selectedSymbol, onSelectSymbol }: {
  selectedSymbol: string;
  onSelectSymbol: (s: string) => void;
}) {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const { status, liveSignals, signalHistory } = useSignalBot();
  const [engineSignals, setEngineSignals] = useState<Record<string, AgenticSignal>>({});

  // Engine fallback — compute signals from real candle data when bot has no read yet
  useEffect(() => {
    const recompute = () => {
      setEngineSignals(prev => {
        const next = { ...prev };
        for (const sym of SIGNAL_SYMBOLS) {
          const candles = getCandles(sym);
          if (candles.length >= 30) next[sym] = analyzeSignal(sym, candles);
        }
        return next;
      });
    };
    recompute();
    const unsub = onCandleUpdate((sym, candles) => {
      if (SIGNAL_SYMBOLS.includes(sym) && candles.length >= 30) {
        setEngineSignals(prev => ({ ...prev, [sym]: analyzeSignal(sym, candles) }));
      }
    });
    const iv = setInterval(recompute, 6000);
    return () => { unsub(); clearInterval(iv); };
  }, []);

  // Bot-first: prefer the VPS bot's live read, fall back to the engine
  const pick = (sym: string): UISignal | null => {
    if (liveSignals[sym]) return normalizeBot(liveSignals[sym]);
    if (engineSignals[sym]) return normalizeEngine(engineSignals[sym]);
    return null;
  };

  const heroSig = pick(selectedSymbol);
  const connected = status === 'connected';
  const botCount = Object.keys(liveSignals).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{isBn ? 'লাইভ সিগন্যাল সেন্টার' : 'Live Signal Center'}</div>
            <div className="text-[10px] text-gray-500">{isBn ? 'XAU/USD + মেজর ফরেক্স' : 'XAU/USD + Major Forex'}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${connected && botCount > 0 ? 'bg-green-500/15 text-green-400' : connected ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-500/15 text-gray-400'}`}>
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected && botCount > 0 ? (isBn ? 'বট লাইভ' : 'BOT LIVE') : connected ? (isBn ? 'বট কানেক্টেড' : 'BOT CONNECTING') : (isBn ? 'ইঞ্জিন মোড' : 'ENGINE')}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-3">
        {/* Hero signal for selected symbol */}
        <HeroCard sig={heroSig} symbol={selectedSymbol} />

        {/* Multi-symbol list + history */}
        <div className="space-y-3">
          <div className={`rounded-xl border p-2.5 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Zap className="w-3 h-3 text-yellow-400" /> {isBn ? 'সব সিগন্যাল' : 'All Signals'}
            </div>
            <div className="space-y-1.5">
              {SIGNAL_SYMBOLS.map(sym => (
                <SignalRow key={sym} sym={sym} sig={pick(sym)} selected={sym === selectedSymbol} onClick={() => onSelectSymbol(sym)} />
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-2.5 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <History className="w-3 h-3 text-cyan-400" /> {isBn ? 'স্ট্রং অ্যালার্ট হিস্টরি' : 'Strong Alert History'}
            </div>
            {signalHistory.length === 0 ? (
              <div className="text-[10px] text-gray-600 text-center py-3">{isBn ? 'স্ট্রং সিগন্যাল এলে দেখাবে' : 'Shows when a strong signal fires'}</div>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {signalHistory.slice(0, 10).map((s, i) => (
                  <motion.div key={`${s.id}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-[10px] py-1 border-b border-gray-800/40 last:border-0">
                    <span className={`font-bold ${s.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{s.direction}</span>
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{s.symbol}</span>
                    <span className="text-gray-500 font-mono">@{fmt(s.entry)}</span>
                    <span className="ml-auto text-gray-500">{s.confidence}%</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
