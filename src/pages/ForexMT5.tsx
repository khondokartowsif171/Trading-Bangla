import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import AdvancedChart from '@/components/TradingView/AdvancedChart';
import { getRecentPatterns, CandlePattern } from '@/services/candlestickPatterns';
import { analyzeSMC, SMCAnalysis } from '@/services/smcEngine';
import type { OHLCV as PatternOHLCV } from '@/services/candlestickPatterns';
import {
  TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, Layers, Activity, Zap, Shield, Target, Star, Eye, EyeOff,
  Search, ArrowUpRight, ArrowDownRight, Minus, PenLine, Plus,
} from 'lucide-react';

// ── Pairs ───────────────────────────────────────────────────────────────────
const PAIRS = [
  { sym: 'XAUUSD', label: 'XAU/USD', tvSym: 'OANDA:XAUUSD',   isJPY: false },
  { sym: 'EURUSD', label: 'EUR/USD', tvSym: 'FX:EURUSD',       isJPY: false },
  { sym: 'GBPUSD', label: 'GBP/USD', tvSym: 'FX:GBPUSD',       isJPY: false },
  { sym: 'USDJPY', label: 'USD/JPY', tvSym: 'FX:USDJPY',       isJPY: true  },
  { sym: 'AUDUSD', label: 'AUD/USD', tvSym: 'FX:AUDUSD',       isJPY: false },
  { sym: 'USDCAD', label: 'USD/CAD', tvSym: 'FX:USDCAD',       isJPY: false },
  { sym: 'USDCHF', label: 'USD/CHF', tvSym: 'FX:USDCHF',       isJPY: false },
  { sym: 'NZDUSD', label: 'NZD/USD', tvSym: 'FX:NZDUSD',       isJPY: false },
  { sym: 'EURJPY', label: 'EUR/JPY', tvSym: 'FX:EURJPY',       isJPY: true  },
  { sym: 'GBPJPY', label: 'GBP/JPY', tvSym: 'FX:GBPJPY',       isJPY: true  },
  { sym: 'EURAUD', label: 'EUR/AUD', tvSym: 'FX:EURAUD',       isJPY: false },
  { sym: 'EURCAD', label: 'EUR/CAD', tvSym: 'FX:EURCAD',       isJPY: false },
  { sym: 'GBPCAD', label: 'GBP/CAD', tvSym: 'FX:GBPCAD',       isJPY: false },
  { sym: 'EURCHF', label: 'EUR/CHF', tvSym: 'FX:EURCHF',       isJPY: false },
  { sym: 'GBPCHF', label: 'GBP/CHF', tvSym: 'FX:GBPCHF',       isJPY: false },
  { sym: 'XAGUSD', label: 'XAG/USD', tvSym: 'OANDA:XAGUSD',   isJPY: false },
  { sym: 'BTCUSD', label: 'BTC/USD', tvSym: 'BINANCE:BTCUSDT', isJPY: false },
  { sym: 'US30',   label: 'US30',    tvSym: 'FOREXCOM:US30',   isJPY: false },
  { sym: 'NAS100', label: 'NAS100',  tvSym: 'NASDAQ:NDX',      isJPY: false },
  { sym: 'USOIL',  label: 'USOIL',  tvSym: 'NYMEX:CL1!',      isJPY: false },
] as const;
type PairSym = (typeof PAIRS)[number]['sym'];

// ── Timeframes ───────────────────────────────────────────────────────────────
const TIMEFRAMES = [
  { label: 'M1',  tv: '1',   api: '1min'  },
  { label: 'M5',  tv: '5',   api: '5min'  },
  { label: 'M15', tv: '15',  api: '15min' },
  { label: 'H1',  tv: '60',  api: '1h'    },
  { label: 'H4',  tv: '240', api: '4h'    },
  { label: 'D1',  tv: 'D',   api: '1day'  },
] as const;

// ── Indicator catalog ────────────────────────────────────────────────────────
interface IndicatorDef { id: string; name: string; category: string; tvStudy?: string; custom?: boolean; }

const INDICATORS: IndicatorDef[] = [
  // Trend
  { id: 'EMA9',     name: 'EMA 9',           category: 'Trend',       tvStudy: 'MAExp@tv-basicstudies' },
  { id: 'EMA21',    name: 'EMA 21',          category: 'Trend',       tvStudy: 'MAExp@tv-basicstudies' },
  { id: 'EMA50',    name: 'EMA 50',          category: 'Trend',       tvStudy: 'MAExp@tv-basicstudies' },
  { id: 'EMA200',   name: 'EMA 200',         category: 'Trend',       tvStudy: 'MAExp@tv-basicstudies' },
  { id: 'SMA20',    name: 'SMA 20',          category: 'Trend',       tvStudy: 'MASimple@tv-basicstudies' },
  { id: 'SMA50',    name: 'SMA 50',          category: 'Trend',       tvStudy: 'MASimple@tv-basicstudies' },
  { id: 'SMA200',   name: 'SMA 200',         category: 'Trend',       tvStudy: 'MASimple@tv-basicstudies' },
  { id: 'WMA',      name: 'WMA 14',          category: 'Trend',       tvStudy: 'MAWeighted@tv-basicstudies' },
  { id: 'HMA',      name: 'HMA 14',          category: 'Trend',       tvStudy: 'HullMA@tv-basicstudies' },
  { id: 'VWAP',     name: 'VWAP',            category: 'Trend',       tvStudy: 'VWAP@tv-basicstudies' },
  { id: 'ICHIMOKU', name: 'Ichimoku Cloud',  category: 'Trend',       tvStudy: 'IchimokuCloud@tv-basicstudies' },
  { id: 'PSAR',     name: 'Parabolic SAR',   category: 'Trend',       tvStudy: 'PSAR@tv-basicstudies' },
  { id: 'SUPERTREND',name: 'SuperTrend',     category: 'Trend',       tvStudy: 'Supertrend@tv-basicstudies' },
  { id: 'ADX',      name: 'ADX 14',          category: 'Trend',       tvStudy: 'ADX@tv-basicstudies' },
  { id: 'AROON',    name: 'Aroon 25',        category: 'Trend',       tvStudy: 'Aroon@tv-basicstudies' },
  { id: 'DEMA',     name: 'DEMA 14',         category: 'Trend',       tvStudy: 'DoubleEMA@tv-basicstudies' },
  { id: 'TEMA',     name: 'TEMA 14',         category: 'Trend',       tvStudy: 'TripleEMA@tv-basicstudies' },
  { id: 'PIVOTS',   name: 'Pivot Points',    category: 'Trend',       tvStudy: 'PivotPointsStandard@tv-basicstudies' },
  // Oscillators
  { id: 'RSI',      name: 'RSI 14',          category: 'Oscillators', tvStudy: 'RSI@tv-basicstudies' },
  { id: 'MACD',     name: 'MACD',            category: 'Oscillators', tvStudy: 'MACD@tv-basicstudies' },
  { id: 'STOCH',    name: 'Stochastic',      category: 'Oscillators', tvStudy: 'Stochastic@tv-basicstudies' },
  { id: 'STOCHRSI', name: 'Stoch RSI',       category: 'Oscillators', tvStudy: 'StochasticRSI@tv-basicstudies' },
  { id: 'WILLIAMS', name: 'Williams %R',     category: 'Oscillators', tvStudy: 'WilliamsR@tv-basicstudies' },
  { id: 'AO',       name: 'Awesome Osc',     category: 'Oscillators', tvStudy: 'AO@tv-basicstudies' },
  { id: 'MOM',      name: 'Momentum 10',     category: 'Oscillators', tvStudy: 'MOM@tv-basicstudies' },
  { id: 'ROC',      name: 'ROC 12',          category: 'Oscillators', tvStudy: 'ROC@tv-basicstudies' },
  { id: 'MFI',      name: 'MFI 14',          category: 'Oscillators', tvStudy: 'MFI@tv-basicstudies' },
  { id: 'CMF',      name: 'CMF 20',          category: 'Oscillators', tvStudy: 'CMF@tv-basicstudies' },
  { id: 'PPO',      name: 'PPO',             category: 'Oscillators', tvStudy: 'PPO@tv-basicstudies' },
  { id: 'FISHER',   name: 'Fisher Transform',category: 'Oscillators', tvStudy: 'FisherTransform@tv-basicstudies' },
  { id: 'TSI',      name: 'TSI',             category: 'Oscillators', tvStudy: 'TSI@tv-basicstudies' },
  { id: 'UO',       name: 'Ultimate Osc',    category: 'Oscillators', tvStudy: 'UO@tv-basicstudies' },
  { id: 'KDJ',      name: 'KDJ',             category: 'Oscillators', tvStudy: 'KDJ@tv-basicstudies' },
  // Volume
  { id: 'VOLUME',   name: 'Volume',          category: 'Volume',      tvStudy: 'Volume@tv-basicstudies' },
  { id: 'OBV',      name: 'OBV',             category: 'Volume',      tvStudy: 'OBV@tv-basicstudies' },
  { id: 'AD',       name: 'A/D Line',        category: 'Volume',      tvStudy: 'AccDist@tv-basicstudies' },
  { id: 'CHAIKIN',  name: 'Chaikin Osc',     category: 'Volume',      tvStudy: 'ChaikinOsc@tv-basicstudies' },
  { id: 'PVT',      name: 'PVT',             category: 'Volume',      tvStudy: 'PVT@tv-basicstudies' },
  { id: 'VOLOSC',   name: 'Vol Oscillator',  category: 'Volume',      tvStudy: 'VO@tv-basicstudies' },
  { id: 'KLINGER',  name: 'Klinger Osc',     category: 'Volume',      tvStudy: 'KlingerOscillator@tv-basicstudies' },
  // Volatility
  { id: 'BB',       name: 'Bollinger Bands', category: 'Volatility',  tvStudy: 'BB@tv-basicstudies' },
  { id: 'ATR',      name: 'ATR 14',          category: 'Volatility',  tvStudy: 'ATR@tv-basicstudies' },
  { id: 'KELTNER',  name: 'Keltner Channel', category: 'Volatility',  tvStudy: 'KC@tv-basicstudies' },
  { id: 'DONCHIAN', name: 'Donchian Ch',     category: 'Volatility',  tvStudy: 'DONCH@tv-basicstudies' },
  { id: 'STDDEV',   name: 'Std Deviation',   category: 'Volatility',  tvStudy: 'StdDev@tv-basicstudies' },
  { id: 'BBW',      name: 'BB Width',        category: 'Volatility',  tvStudy: 'BBW@tv-basicstudies' },
  { id: 'NATR',     name: 'NATR 14',         category: 'Volatility',  tvStudy: 'NATR@tv-basicstudies' },
  // Smart Money
  { id: 'SMC_OB',   name: 'Order Blocks',    category: 'Smart Money', custom: true },
  { id: 'SMC_FVG',  name: 'Fair Value Gaps', category: 'Smart Money', custom: true },
  { id: 'SMC_BOS',  name: 'BOS / CHoCH',     category: 'Smart Money', custom: true },
  { id: 'SMC_LIQ',  name: 'Liquidity Zones', category: 'Smart Money', custom: true },
  { id: 'SMC_PD',   name: 'Premium/Discount',category: 'Smart Money', custom: true },
  { id: 'SMC_MIT',  name: 'Mitigation Blks', category: 'Smart Money', custom: true },
  { id: 'SMC_BRK',  name: 'Breaker Blocks',  category: 'Smart Money', custom: true },
  { id: 'SMC_IND',  name: 'Inducement',      category: 'Smart Money', custom: true },
  { id: 'SMC_DISP', name: 'Displacement',    category: 'Smart Money', custom: true },
  { id: 'SMC_PROP', name: 'Propulsion Blks', category: 'Smart Money', custom: true },
  // Patterns
  { id: 'CP_DOJI',  name: 'Doji Patterns',   category: 'Patterns',    custom: true },
  { id: 'CP_HAMMER',name: 'Hammer / Pin Bar',category: 'Patterns',    custom: true },
  { id: 'CP_ENGULF',name: 'Engulfing',       category: 'Patterns',    custom: true },
  { id: 'CP_HARAMI',name: 'Harami',          category: 'Patterns',    custom: true },
  { id: 'CP_STAR',  name: 'Star Patterns',   category: 'Patterns',    custom: true },
  { id: 'CP_3SOL',  name: '3 Soldiers/Crows',category: 'Patterns',    custom: true },
  { id: 'CP_MARUBOZU',name: 'Marubozu',      category: 'Patterns',    custom: true },
  { id: 'CP_INSIDE',name: 'Inside Bar',      category: 'Patterns',    custom: true },
  // S&R
  { id: 'PIVOT_FIB',name: 'Fib Pivots',      category: 'S&R',         tvStudy: 'PivotPointsFibonacci@tv-basicstudies' },
  { id: 'PIVOT_CAM',name: 'Camarilla',       category: 'S&R',         tvStudy: 'PivotPointsCamarilla@tv-basicstudies' },
  { id: 'SWING_HL', name: 'Swing H/L',       category: 'S&R',         tvStudy: 'PivotPointsHighLow@tv-basicstudies' },
  { id: 'FIBO',     name: 'Auto Fibonacci',  category: 'S&R',         tvStudy: 'AutoFib@tv-basicstudies' },
];

const IND_CATS = ['All', 'Trend', 'Oscillators', 'Volume', 'Volatility', 'Smart Money', 'Patterns', 'S&R'];

// ── Drawing tools ────────────────────────────────────────────────────────────
const DRAWING_TOOLS = [
  { id: 'DT_TREND',  name: 'Trend Line',        cat: 'Lines',     icon: '↗' },
  { id: 'DT_HLINE',  name: 'Horizontal Line',   cat: 'Lines',     icon: '—' },
  { id: 'DT_VLINE',  name: 'Vertical Line',     cat: 'Lines',     icon: '|' },
  { id: 'DT_RAY',    name: 'Ray',               cat: 'Lines',     icon: '→' },
  { id: 'DT_ARROW',  name: 'Arrow',             cat: 'Lines',     icon: '⇧' },
  { id: 'DT_CROSS',  name: 'Cross Line',        cat: 'Lines',     icon: '✚' },
  { id: 'DT_FIB',    name: 'Fib Retracement',   cat: 'Fibonacci', icon: 'F' },
  { id: 'DT_FIBEXT', name: 'Fib Extension',     cat: 'Fibonacci', icon: 'F+' },
  { id: 'DT_FIBFAN', name: 'Fib Fan',           cat: 'Fibonacci', icon: '⊿' },
  { id: 'DT_FIBARC', name: 'Fib Arc',           cat: 'Fibonacci', icon: '◠' },
  { id: 'DT_PICH',   name: 'Parallel Channel',  cat: 'Channels',  icon: '=' },
  { id: 'DT_REGCH',  name: 'Regression Ch',     cat: 'Channels',  icon: '~' },
  { id: 'DT_PITCH',  name: 'Pitchfork',         cat: 'Channels',  icon: 'Y' },
  { id: 'DT_GBOX',   name: 'Gann Box',          cat: 'Gann',      icon: '⬜' },
  { id: 'DT_GFAN',   name: 'Gann Fan',          cat: 'Gann',      icon: '⊞' },
  { id: 'DT_RECT',   name: 'Rectangle',         cat: 'Shapes',    icon: '▭' },
  { id: 'DT_CIRCLE', name: 'Circle',            cat: 'Shapes',    icon: '○' },
  { id: 'DT_TRI',    name: 'Triangle',          cat: 'Shapes',    icon: '△' },
  { id: 'DT_BRUSH',  name: 'Brush',             cat: 'Shapes',    icon: '/' },
  { id: 'DT_TEXT',   name: 'Text',              cat: 'Text',      icon: 'T' },
  { id: 'DT_CALL',   name: 'Callout',           cat: 'Text',      icon: '..' },
  { id: 'DT_PRICE',  name: 'Price Label',       cat: 'Text',      icon: '$' },
];
const DRAW_CATS = ['Lines', 'Fibonacci', 'Channels', 'Gann', 'Shapes', 'Text'];

const DEFAULT_ACTIVE = new Set(['EMA9', 'EMA21', 'EMA50', 'EMA200', 'RSI', 'MACD', 'BB', 'VOLUME', 'SUPERTREND', 'SMC_OB', 'SMC_FVG', 'SMC_BOS', 'CP_ENGULF', 'CP_HAMMER']);

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtP(v: number, isJPY: boolean, sym: string) {
  if (isJPY) return v.toFixed(3);
  if (sym === 'XAUUSD' || sym === 'XAGUSD') return v.toFixed(2);
  if (sym === 'BTCUSD') return v.toFixed(1);
  if (['US30', 'NAS100', 'USOIL'].includes(sym)) return v.toFixed(2);
  return v.toFixed(5);
}

function calcPnL(type: string, entry: number, bid: number, ask: number, lots: number, sym: string) {
  const exit = type === 'buy' ? bid : ask;
  const diff = (type === 'buy' ? 1 : -1) * (exit - entry);
  if (sym === 'XAUUSD' || sym === 'XAGUSD') return +(diff * lots * 100).toFixed(2);
  if (sym === 'BTCUSD') return +(diff * lots).toFixed(2);
  if (['US30', 'NAS100'].includes(sym)) return +(diff * lots * 10).toFixed(2);
  if (sym.includes('JPY')) return +(diff / 0.01 * lots * 10).toFixed(2);
  return +(diff / 0.0001 * lots * 1).toFixed(2);
}

function PatIcon({ type }: { type: CandlePattern['type'] }) {
  if (type === 'bullish') return <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />;
  if (type === 'bearish') return <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-yellow-400" />;
}

function SDot({ s }: { s: CandlePattern['strength'] }) {
  const w = s === 'strong' ? 3 : s === 'moderate' ? 2 : 1;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map(i => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= w ? (s === 'strong' ? 'bg-yellow-400' : 'bg-indigo-400') : 'bg-gray-700'}`} />)}
    </span>
  );
}

interface Position { id: string; symbol: string; type: string; entry_price: number; lot_size: number; pnl: number; opened_at: string; }

// ── Main component ────────────────────────────────────────────────────────────
export default function ForexMT5() {
  const { user } = useAuth();
  const { darkMode } = useApp();

  const [sym, setSym] = useState<PairSym>('XAUUSD');
  const [tf, setTf] = useState('H1');
  const pair = PAIRS.find(p => p.sym === sym)!;
  const tfObj = TIMEFRAMES.find(t => t.label === tf) ?? TIMEFRAMES[3];

  // Panel open/close
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<'ind' | 'draw'>('ind');
  const [rightTab, setRightTab] = useState<'smc' | 'trade'>('smc');

  // Indicators
  const [active, setActive] = useState<Set<string>>(new Set(DEFAULT_ACTIVE));
  const [indCat, setIndCat] = useState('All');
  const [indSearch, setIndSearch] = useState('');
  const [indCol, setIndCol] = useState<Record<string, boolean>>({});
  const [favInds, setFavInds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('tb_fav_mt5') ?? '[]')); } catch { return new Set(); }
  });

  // Drawing
  const [drawSearch, setDrawSearch] = useState('');
  const [drawCol, setDrawCol] = useState<Record<string, boolean>>({});
  const [favDraw, setFavDraw] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('tb_fav_draw') ?? '[]')); } catch { return new Set(); }
  });

  // Live price
  const [lp, setLp] = useState<{ bid: number; ask: number } | null>(null);
  const prevMid = useRef(0);

  // SMC
  const [smc, setSmc] = useState<SMCAnalysis | null>(null);
  const [patterns, setPatterns] = useState<CandlePattern[]>([]);
  const [smcLoading, setSmcLoading] = useState(false);

  // Trade
  const [lots, setLots] = useState(0.01);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeMsg, setTradeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Live price ──
  const fetchPrice = useCallback(async () => {
    try {
      const r = await fetch(`/api/oanda-prices?sym=${sym}`);
      if (!r.ok) return;
      const d = await r.json();
      const px = d.prices?.[0];
      if (!px) return;
      const bid = parseFloat(px.bids?.[0]?.price ?? '0');
      const ask = parseFloat(px.asks?.[0]?.price ?? '0');
      if (bid && ask) { setLp({ bid, ask }); prevMid.current = (bid + ask) / 2; }
    } catch {}
  }, [sym]);

  useEffect(() => {
    setLp(null);
    fetchPrice();
    const id = setInterval(fetchPrice, 5000);
    return () => clearInterval(id);
  }, [fetchPrice]);

  // ── SMC via real candles from API ──
  useEffect(() => {
    let cancelled = false;
    setSmcLoading(true);
    setSmc(null);
    setPatterns([]);
    fetch(`/api/oanda-candles?sym=${sym}&interval=${tfObj.api}&count=200`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !Array.isArray(d?.candles) || d.candles.length < 10) return;
        const candles: PatternOHLCV[] = d.candles.map((c: { t: number; o: number; h: number; l: number; c: number; v: number }) => ({
          time: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v,
        }));
        setSmc(analyzeSMC(candles));
        setPatterns(getRecentPatterns(candles, 6));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSmcLoading(false); });
    return () => { cancelled = true; };
  }, [sym, tf, tfObj.api]);

  // ── Positions ──
  const fetchPos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('demo_trades')
      .select('id, symbol, type, entry_price, lot_size, pnl, opened_at')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });
    if (data) setPositions(data as Position[]);
  }, [user]);

  useEffect(() => { fetchPos(); const id = setInterval(fetchPos, 10000); return () => clearInterval(id); }, [fetchPos]);

  const openTrade = useCallback(async (side: 'buy' | 'sell') => {
    if (!user || !lp) return;
    const entry = side === 'buy' ? lp.ask : lp.bid;
    const { error } = await supabase.from('demo_trades').insert({
      user_id: user.id, symbol: sym, type: side,
      entry_price: entry, lot_size: lots, pnl: 0,
      status: 'open', opened_at: new Date().toISOString(),
    });
    if (!error) {
      setTradeMsg({ text: `${side.toUpperCase()} ${lots}L @ ${fmtP(entry, pair.isJPY, sym)} ✓`, ok: true });
      fetchPos();
    } else {
      setTradeMsg({ text: 'Trade failed', ok: false });
    }
    setTimeout(() => setTradeMsg(null), 3000);
  }, [user, lp, sym, lots, pair.isJPY, fetchPos]);

  const closePos = useCallback(async (pos: Position) => {
    if (!lp) return;
    const exit = pos.type === 'buy' ? lp.bid : lp.ask;
    const pnl = calcPnL(pos.type, pos.entry_price, lp.bid, lp.ask, pos.lot_size, pos.symbol);
    await supabase.from('demo_trades').update({
      exit_price: exit, pnl, status: 'closed', closed_at: new Date().toISOString(),
    }).eq('id', pos.id);
    setTradeMsg({ text: `Closed ${fmtP(exit, pair.isJPY, sym)} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, ok: pnl >= 0 });
    setTimeout(() => setTradeMsg(null), 4000);
    fetchPos();
  }, [lp, pair.isJPY, sym, fetchPos]);

  // ── Build TV studies ──
  const tvStudies = [...new Set(
    [...active]
      .map(id => INDICATORS.find(i => i.id === id))
      .filter((i): i is IndicatorDef => !!i && !!i.tvStudy && !i.custom)
      .map(i => i.tvStudy!)
  )];

  const filteredInds = INDICATORS.filter(i =>
    (indCat === 'All' || i.category === indCat) &&
    (!indSearch || i.name.toLowerCase().includes(indSearch.toLowerCase()))
  );

  const biasColor = smc?.bias === 'bullish' ? 'text-green-400' : smc?.bias === 'bearish' ? 'text-red-400' : 'text-yellow-400';
  const isXAU = sym === 'XAUUSD' || sym === 'XAGUSD' || sym === 'BTCUSD';
  const bd = darkMode ? 'border-gray-800' : 'border-gray-200';
  const card = `rounded-lg border p-2 mb-2 ${darkMode ? 'border-gray-800/60 bg-gray-900/50' : 'border-gray-200 bg-white'}`;
  const sub = darkMode ? 'text-gray-500' : 'text-gray-400';

  const LOT_PRESETS = [0.01, 0.05, 0.10, 0.25, 0.50, 1.00];

  const totalPnL = positions.reduce((sum, p) => {
    if (!lp) return sum;
    return sum + calcPnL(p.type, p.entry_price, lp.bid, lp.ask, p.lot_size, p.symbol);
  }, 0);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 56px)', background: '#07090e' }} className="flex flex-col">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{ height: 44, minHeight: 44, background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        className="flex items-center gap-2 px-3 flex-shrink-0 overflow-x-auto">

        {/* Symbol */}
        <div className="relative flex-shrink-0">
          <select value={sym} onChange={e => setSym(e.target.value as PairSym)}
            className="appearance-none bg-[#161b22] border border-white/10 text-white text-xs font-bold rounded px-3 pr-7 py-1.5 cursor-pointer hover:border-indigo-500/50 focus:outline-none focus:border-indigo-500 transition-colors">
            {PAIRS.map(p => <option key={p.sym} value={p.sym}>{p.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
        </div>

        <div className="w-px h-5 bg-white/10 flex-shrink-0" />

        {/* TF buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {TIMEFRAMES.map(t => (
            <button key={t.label} onClick={() => setTf(t.label)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${tf === t.label ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10 flex-shrink-0" />

        {/* Live price */}
        {lp ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">BID</span>
              <span className="text-xs font-bold tabular-nums text-red-400">{fmtP(lp.bid, pair.isJPY, sym)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">ASK</span>
              <span className="text-xs font-bold tabular-nums text-green-400">{fmtP(lp.ask, pair.isJPY, sym)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">SPR</span>
              <span className="text-xs tabular-nums text-gray-400">{fmtP(lp.ask - lp.bid, pair.isJPY, sym)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <RefreshCw className="w-3 h-3 text-gray-600 animate-spin" />
            <span className="text-xs text-gray-600">Loading...</span>
          </div>
        )}

        {/* SMC bias badge */}
        {smc && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex-shrink-0 ${
            smc.bias === 'bullish' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
            smc.bias === 'bearish' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
            'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
          }`}>
            {smc.bias === 'bullish' ? '↑ BULL' : smc.bias === 'bearish' ? '↓ BEAR' : '→ NEUTRAL'}
          </span>
        )}
        {smcLoading && <RefreshCw className="w-3 h-3 text-gray-600 animate-spin flex-shrink-0" />}

        {/* PnL summary */}
        {positions.length > 0 && (
          <div className={`ml-auto flex-shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded ${totalPnL >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {positions.length} pos · {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
        )}
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── LEFT: Indicators + Drawing ── */}
        <div className={`flex-shrink-0 border-r ${bd} flex flex-col transition-all duration-200 ${leftOpen ? 'w-52' : 'w-10'} ${darkMode ? 'bg-gray-950' : 'bg-white'}`}>
          {/* Tab bar */}
          <div className={`flex border-b ${bd} flex-shrink-0`}>
            {leftOpen ? (
              <>
                <button onClick={() => setLeftTab('ind')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${leftTab === 'ind' ? 'text-indigo-400 border-indigo-500' : `border-transparent ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400'}`}`}>
                  <Layers className="w-3 h-3" /><span>Ind <span className={leftTab === 'ind' ? 'text-indigo-400' : ''}>{active.size}</span></span>
                </button>
                <button onClick={() => setLeftTab('draw')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${leftTab === 'draw' ? 'text-amber-400 border-amber-500' : `border-transparent ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400'}`}`}>
                  <PenLine className="w-3 h-3" /><span>Draw</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-1 gap-1 w-full">
                <button onClick={() => { setLeftOpen(true); setLeftTab('ind'); }} title="Indicators" className="p-1 rounded text-indigo-400 hover:bg-gray-800"><Layers className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setLeftOpen(true); setLeftTab('draw'); }} title="Drawing" className="p-1 rounded text-amber-400 hover:bg-gray-800"><PenLine className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <button onClick={() => setLeftOpen(p => !p)} className={`px-1.5 flex items-center ${darkMode ? 'text-gray-600 hover:bg-gray-800 hover:text-gray-400' : 'text-gray-400 hover:bg-gray-50'}`}>
              {leftOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {/* Indicators panel */}
          {leftTab === 'ind' && leftOpen && (
            <div className="flex-1 overflow-y-auto">
              <div className={`px-2 py-1.5 border-b ${bd}`}>
                <div className={`flex items-center gap-1 px-2 py-1 rounded border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <Search className="w-3 h-3 text-gray-500" />
                  <input value={indSearch} onChange={e => setIndSearch(e.target.value)} placeholder="Search..."
                    className={`text-[10px] bg-transparent outline-none w-full ${darkMode ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`} />
                </div>
              </div>
              <div className={`flex flex-wrap gap-1 px-2 py-1.5 border-b ${bd}`}>
                {IND_CATS.map(cat => (
                  <button key={cat} onClick={() => setIndCat(cat)}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-all ${cat === indCat ? 'bg-indigo-500 text-white' : (darkMode ? 'bg-gray-800 text-gray-500 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>
                    {cat}
                  </button>
                ))}
              </div>
              {/* Favorites */}
              {favInds.size > 0 && !indSearch && (
                <div>
                  <div className={`flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-b ${bd} text-amber-400`}>
                    <Star className="w-2.5 h-2.5 fill-amber-400" />Favorites ({favInds.size})
                  </div>
                  {INDICATORS.filter(i => favInds.has(i.id)).map(ind => (
                    <IndRow key={ind.id} ind={ind} active={active} favInds={favInds}
                      toggle={id => setActive(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                      toggleFav={(id, e) => { e.stopPropagation(); setFavInds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); try { localStorage.setItem('tb_fav_mt5', JSON.stringify([...n])); } catch {} return n; }); }}
                      darkMode={darkMode} bd={bd} />
                  ))}
                </div>
              )}
              {/* By category */}
              {IND_CATS.slice(1).map(cat => {
                const items = filteredInds.filter(i => i.category === cat);
                if (!items.length) return null;
                const col = indCol[cat];
                return (
                  <div key={cat}>
                    <button onClick={() => setIndCol(p => ({ ...p, [cat]: !p[cat] }))}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-b ${bd} ${darkMode ? 'text-gray-500 hover:bg-gray-800/50' : 'text-gray-400 hover:bg-gray-50'}`}>
                      <span className="flex items-center gap-1">
                        {cat === 'Trend' && <TrendingUp className="w-2.5 h-2.5 text-blue-400" />}
                        {cat === 'Oscillators' && <Activity className="w-2.5 h-2.5 text-purple-400" />}
                        {cat === 'Volume' && <span className="w-2.5 h-2.5 text-cyan-400 text-[9px] font-mono">V</span>}
                        {cat === 'Volatility' && <Zap className="w-2.5 h-2.5 text-yellow-400" />}
                        {cat === 'Smart Money' && <Shield className="w-2.5 h-2.5 text-emerald-400" />}
                        {cat === 'Patterns' && <Star className="w-2.5 h-2.5 text-amber-400" />}
                        {cat === 'S&R' && <Target className="w-2.5 h-2.5 text-red-400" />}
                        {cat}
                      </span>
                      {col ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
                    </button>
                    {!col && items.map(ind => (
                      <IndRow key={ind.id} ind={ind} active={active} favInds={favInds}
                        toggle={id => setActive(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                        toggleFav={(id, e) => { e.stopPropagation(); setFavInds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); try { localStorage.setItem('tb_fav_mt5', JSON.stringify([...n])); } catch {} return n; }); }}
                        darkMode={darkMode} bd={bd} />
                    ))}
                  </div>
                );
              })}
              <div className={`px-2 py-2 text-[9px] text-center ${sub}`}>{INDICATORS.length} indicators · {active.size} active</div>
            </div>
          )}

          {/* Drawing panel */}
          {leftTab === 'draw' && leftOpen && (
            <div className="flex-1 overflow-y-auto">
              <div className={`px-2 py-1.5 border-b ${bd}`}>
                <div className={`flex items-center gap-1 px-2 py-1 rounded border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <Search className="w-3 h-3 text-gray-500" />
                  <input value={drawSearch} onChange={e => setDrawSearch(e.target.value)} placeholder="Search tools..."
                    className={`text-[10px] bg-transparent outline-none w-full ${darkMode ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`} />
                </div>
              </div>
              {DRAW_CATS.map(cat => {
                const items = DRAWING_TOOLS.filter(t => t.cat === cat && (!drawSearch || t.name.toLowerCase().includes(drawSearch.toLowerCase())));
                if (!items.length) return null;
                const col = drawCol[cat];
                return (
                  <div key={cat}>
                    <button onClick={() => setDrawCol(p => ({ ...p, [cat]: !p[cat] }))}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-b ${bd} ${darkMode ? 'text-gray-500 hover:bg-gray-800/50' : 'text-gray-400 hover:bg-gray-50'}`}>
                      <span>{cat}</span>
                      {col ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
                    </button>
                    {!col && items.map(t => (
                      <div key={t.id} title={t.name}
                        className={`flex items-center gap-1.5 px-2 py-1.5 border-b last:border-b-0 ${bd} ${darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'} cursor-default`}>
                        <span className={`w-5 text-center text-[11px] flex-shrink-0 font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t.icon}</span>
                        <span className={`text-[10px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t.name}</span>
                        <button onClick={e => { e.stopPropagation(); setFavDraw(p => { const n = new Set(p); n.has(t.id) ? n.delete(t.id) : n.add(t.id); try { localStorage.setItem('tb_fav_draw', JSON.stringify([...n])); } catch {} return n; }); }}
                          className={`ml-auto text-[11px] ${favDraw.has(t.id) ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}>
                          {favDraw.has(t.id) ? '★' : '☆'}
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className={`px-2 py-2 text-[9px] text-center ${sub}`}>{DRAWING_TOOLS.length} tools · use TradingView toolbar →</div>
            </div>
          )}
        </div>

        {/* ── CENTER: TradingView chart ── */}
        <div className="flex-1 min-w-0">
          <AdvancedChart
            symbol={pair.tvSym}
            interval={tfObj.tv}
            height="100%"
            studies={tvStudies.length > 0 ? tvStudies : ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'Volume@tv-basicstudies']}
          />
        </div>

        {/* ── RIGHT: SMC + Trade ── */}
        <div className={`flex-shrink-0 border-l ${bd} flex flex-col transition-all duration-200 ${rightOpen ? 'w-64' : 'w-8'} ${darkMode ? 'bg-gray-950' : 'bg-white'}`}>
          {/* Right tab bar */}
          <div className={`flex border-b ${bd} flex-shrink-0`}>
            {rightOpen ? (
              <>
                <button onClick={() => setRightTab('smc')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${rightTab === 'smc' ? 'text-emerald-400 border-emerald-500' : `border-transparent ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400'}`}`}>
                  <Shield className="w-3 h-3" /><span>SMC</span>
                </button>
                <button onClick={() => setRightTab('trade')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-all ${rightTab === 'trade' ? 'text-indigo-400 border-indigo-500' : `border-transparent ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400'}`}`}>
                  <TrendingUp className="w-3 h-3" /><span>Trade {positions.length > 0 && <span className="text-indigo-400">{positions.length}</span>}</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-1 gap-1 w-full">
                <button onClick={() => { setRightOpen(true); setRightTab('smc'); }} title="SMC" className="p-1 rounded text-emerald-400 hover:bg-gray-800"><Shield className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setRightOpen(true); setRightTab('trade'); }} title="Trade" className="p-1 rounded text-indigo-400 hover:bg-gray-800"><TrendingUp className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <button onClick={() => setRightOpen(p => !p)} className={`px-1.5 flex items-center ${darkMode ? 'text-gray-600 hover:bg-gray-800 hover:text-gray-400' : 'text-gray-400 hover:bg-gray-50'}`}>
              {rightOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
          </div>

          {/* ── SMC TAB ── */}
          {rightOpen && rightTab === 'smc' && (
            <div className="flex-1 overflow-y-auto p-2">

              {smcLoading && <div className={`text-[9px] text-center py-4 ${sub}`}><RefreshCw className="w-3 h-3 animate-spin mx-auto mb-1" />Analyzing real candles...</div>}

              {smc && (
                <>
                  {/* Bias gauge */}
                  <div className={card}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${sub}`}>SMC Bias</span>
                      <span className={`text-xs font-black ${biasColor}`}>
                        {smc.bias === 'bullish' ? '↑ BULLISH' : smc.bias === 'bearish' ? '↓ BEARISH' : '→ NEUTRAL'}
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden mb-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <div className={`h-full rounded-full ${(smc.biasScore ?? 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.abs(smc.biasScore ?? 0)}%`, marginLeft: (smc.biasScore ?? 0) < 0 ? `${100 - Math.abs(smc.biasScore ?? 0)}%` : '0' }} />
                    </div>
                    <div className={`text-[9px] ${sub}`}>Score: {(smc.biasScore ?? 0) > 0 ? '+' : ''}{smc.biasScore ?? 0}</div>
                  </div>

                  {/* Structure */}
                  {smc.structurePoints.length > 0 && (
                    <div className={card}>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}><Activity className="w-2.5 h-2.5 text-purple-400" />Structure</div>
                      <div className="space-y-1">
                        {smc.structurePoints.slice(-4).map((sp, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sp.type === 'CHoCH' ? 'bg-amber-500/20 text-amber-400' : (sp.direction === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}`}>{sp.type}</span>
                            <span className={`text-[9px] font-mono ${sp.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>{fmtP(sp.price, isXAU, sym)}</span>
                            <span className={`text-[8px] ${sub}`}>{sp.direction === 'bullish' ? '↑' : '↓'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order Blocks */}
                  {active.has('SMC_OB') && smc.orderBlocks.filter(ob => !ob.mitigated).length > 0 && (
                    <div className={card}>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}><Shield className="w-2.5 h-2.5 text-emerald-400" />Order Blocks</div>
                      <div className="space-y-1">
                        {smc.orderBlocks.filter(ob => !ob.mitigated).slice(-3).map((ob, i) => (
                          <div key={i} className={`flex items-center justify-between text-[9px] px-1.5 py-1 rounded ${ob.type === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <span className={`font-bold ${ob.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>{ob.type === 'bullish' ? '▲ Bull' : '▼ Bear'}</span>
                            <span className="font-mono text-gray-400">{fmtP(ob.low, isXAU, sym)}–{fmtP(ob.high, isXAU, sym)}</span>
                            <span className="text-yellow-400">{ob.strength}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FVG */}
                  {active.has('SMC_FVG') && smc.fairValueGaps.filter(g => !g.filled).length > 0 && (
                    <div className={card}>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}><Zap className="w-2.5 h-2.5 text-yellow-400" />Fair Value Gaps</div>
                      <div className="space-y-1">
                        {smc.fairValueGaps.filter(g => !g.filled).slice(-3).map((fvg, i) => (
                          <div key={i} className={`flex items-center justify-between text-[9px] px-1.5 py-1 rounded ${fvg.type === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <span className={`font-bold ${fvg.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>{fvg.type === 'bullish' ? '↑' : '↓'} FVG</span>
                            <span className="font-mono text-gray-400">{fmtP(fvg.bottom, isXAU, sym)}–{fmtP(fvg.top, isXAU, sym)}</span>
                            <span className="text-cyan-400">{fvg.fillPercent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Premium/Discount */}
                  {active.has('SMC_PD') && smc.premiumDiscount && (
                    <div className={card}>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}><Target className="w-2.5 h-2.5 text-blue-400" />Premium / Discount</div>
                      <div className="space-y-1 text-[9px] font-mono">
                        <div className="flex justify-between"><span className="text-red-400">Premium</span><span className={darkMode ? 'text-white' : 'text-gray-900'}>{fmtP(smc.premiumDiscount.premium, isXAU, sym)}</span></div>
                        <div className="flex justify-between"><span className="text-yellow-400">EQ</span><span className={darkMode ? 'text-white' : 'text-gray-900'}>{fmtP(smc.premiumDiscount.equilibrium, isXAU, sym)}</span></div>
                        <div className="flex justify-between"><span className="text-green-400">Discount</span><span className={darkMode ? 'text-white' : 'text-gray-900'}>{fmtP(smc.premiumDiscount.discount, isXAU, sym)}</span></div>
                        {lp && <div className={`mt-1 text-[9px] font-bold ${lp.bid > smc.premiumDiscount.equilibrium ? 'text-red-400' : 'text-green-400'}`}>
                          Price in {lp.bid > smc.premiumDiscount.premium ? 'PREMIUM' : lp.bid < smc.premiumDiscount.discount ? 'DISCOUNT' : 'EQUILIBRIUM'}
                        </div>}
                      </div>
                    </div>
                  )}

                  {/* Liquidity */}
                  {active.has('SMC_LIQ') && smc.liquidityZones.filter(z => !z.swept).length > 0 && (
                    <div className={card}>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}><Target className="w-2.5 h-2.5 text-amber-400" />Liquidity</div>
                      <div className="space-y-1">
                        {smc.liquidityZones.filter(z => !z.swept).slice(-4).map((z, i) => (
                          <div key={i} className="flex items-center justify-between text-[9px]">
                            <span className={z.type === 'buy-side' ? 'text-green-400' : 'text-red-400'}>{z.type === 'buy-side' ? '▲ BSL' : '▼ SSL'}</span>
                            <span className="font-mono text-gray-400">{fmtP(z.price, isXAU, sym)}</span>
                            <span className={`text-[8px] ${sub}`}>{z.strength}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Candle patterns */}
              <div className={card}>
                <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                  <Star className="w-2.5 h-2.5 text-amber-400" />Candle Patterns
                  <span className={`ml-auto text-[8px] ${sub}`}>(last 6 bars)</span>
                </div>
                {patterns.length === 0
                  ? <div className={`text-[9px] text-center py-2 ${sub}`}>{smcLoading ? 'Loading...' : 'No patterns detected'}</div>
                  : <div className="space-y-1">
                    {patterns.map((p, i) => (
                      <div key={i} className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[9px] ${p.type === 'bullish' ? 'bg-green-500/10' : p.type === 'bearish' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                        <PatIcon type={p.type} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-[10px] truncate ${p.type === 'bullish' ? 'text-green-300' : p.type === 'bearish' ? 'text-red-300' : 'text-yellow-300'}`}>{p.name}</div>
                        </div>
                        <SDot s={p.strength} />
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          )}

          {/* ── TRADE TAB ── */}
          {rightOpen && rightTab === 'trade' && (
            <div className="flex-1 overflow-y-auto p-2">
              {/* Trade notification */}
              {tradeMsg && (
                <div className={`mb-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-center ${tradeMsg.ok ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {tradeMsg.text}
                </div>
              )}

              {/* Price bar */}
              <div className={card}>
                <div className={`text-[9px] font-bold uppercase tracking-wider mb-2 ${sub}`}>{pair.label}</div>
                {lp ? (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-[9px] text-gray-500 mb-0.5">SELL (BID)</div>
                      <div className="text-sm font-black text-red-400 tabular-nums">{fmtP(lp.bid, pair.isJPY, sym)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-gray-500 mb-0.5">BUY (ASK)</div>
                      <div className="text-sm font-black text-green-400 tabular-nums">{fmtP(lp.ask, pair.isJPY, sym)}</div>
                    </div>
                  </div>
                ) : (
                  <div className={`text-[9px] text-center py-2 ${sub}`}><RefreshCw className="w-3 h-3 animate-spin mx-auto mb-1" />Loading price...</div>
                )}
                <div className={`text-[9px] text-center ${sub}`}>Spread: {lp ? fmtP(lp.ask - lp.bid, pair.isJPY, sym) : '—'}</div>
              </div>

              {/* Lot size */}
              <div className={card}>
                <div className={`text-[9px] font-bold uppercase tracking-wider mb-2 ${sub}`}>Lot Size</div>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {LOT_PRESETS.map(l => (
                    <button key={l} onClick={() => setLots(l)}
                      className={`py-1 text-[10px] font-bold rounded transition-colors ${lots === l ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>
                      {l.toFixed(2)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setLots(l => Math.max(0.01, +(l - 0.01).toFixed(2)))} className={`w-7 h-7 flex items-center justify-center rounded ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}><Minus className="w-3 h-3" /></button>
                  <input type="number" value={lots} min={0.01} step={0.01}
                    onChange={e => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                    className={`flex-1 text-center text-xs font-bold py-1 rounded border outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  <button onClick={() => setLots(l => +(l + 0.01).toFixed(2))} className={`w-7 h-7 flex items-center justify-center rounded ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}><Plus className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Buy / Sell buttons */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => openTrade('sell')} disabled={!lp}
                  className="flex flex-col items-center py-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black transition-colors">
                  <TrendingDown className="w-4 h-4 mb-1" />
                  <span className="text-xs">SELL</span>
                  <span className="text-[9px] tabular-nums mt-0.5 opacity-80">{lp ? fmtP(lp.bid, pair.isJPY, sym) : '—'}</span>
                </button>
                <button onClick={() => openTrade('buy')} disabled={!lp}
                  className="flex flex-col items-center py-3 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black transition-colors">
                  <TrendingUp className="w-4 h-4 mb-1" />
                  <span className="text-xs">BUY</span>
                  <span className="text-[9px] tabular-nums mt-0.5 opacity-80">{lp ? fmtP(lp.ask, pair.isJPY, sym) : '—'}</span>
                </button>
              </div>

              {/* Open positions */}
              {positions.length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${sub}`}>
                    <span>Open Positions ({positions.length})</span>
                    <span className={`font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    {positions.map(pos => {
                      const livePnL = lp ? calcPnL(pos.type, pos.entry_price, lp.bid, lp.ask, pos.lot_size, pos.symbol) : 0;
                      return (
                        <div key={pos.id} className={`rounded-lg p-2 border ${pos.type === 'buy' ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-black ${pos.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                              {pos.type === 'buy' ? '▲' : '▼'} {pos.symbol}
                            </span>
                            <span className={`text-[9px] font-bold tabular-nums ${livePnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {livePnL >= 0 ? '+' : ''}${livePnL.toFixed(2)}
                            </span>
                          </div>
                          <div className={`text-[8px] flex justify-between ${sub} mb-1.5`}>
                            <span>{pos.lot_size}L @ {fmtP(pos.entry_price, pair.isJPY, pos.symbol)}</span>
                            <span>{new Date(pos.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <button onClick={() => closePos(pos)} disabled={!lp}
                            className={`w-full py-1 text-[9px] font-bold rounded transition-colors disabled:opacity-50 ${livePnL >= 0 ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                            Close @ {lp ? fmtP(pos.type === 'buy' ? lp.bid : lp.ask, pair.isJPY, pos.symbol) : '—'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {positions.length === 0 && !tradeMsg && (
                <div className={`text-[9px] text-center py-6 ${sub}`}>No open positions</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function IndRow({ ind, active, favInds, toggle, toggleFav, darkMode, bd }: {
  ind: IndicatorDef; active: Set<string>; favInds: Set<string>;
  toggle: (id: string) => void; toggleFav: (id: string, e: React.MouseEvent) => void;
  darkMode: boolean; bd: string;
}) {
  const isActive = active.has(ind.id);
  const isFav = favInds.has(ind.id);
  return (
    <div onClick={() => toggle(ind.id)}
      className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-all border-b last:border-b-0 ${bd} ${isActive ? (darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50') : (darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50')}`}>
      <div className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-indigo-500 border-indigo-500' : (darkMode ? 'border-gray-700' : 'border-gray-300')}`}>
        {isActive && <span className="text-white text-[8px] font-bold">✓</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-semibold truncate ${isActive ? 'text-indigo-400' : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>
          {ind.name}{ind.custom && <span className="ml-1 text-[8px] text-emerald-400">●</span>}
        </div>
      </div>
      <button onClick={e => toggleFav(ind.id, e)} className={`text-[11px] flex-shrink-0 transition-colors ${isFav ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}>
        {isFav ? '★' : '☆'}
      </button>
      {isActive ? <Eye className="w-2.5 h-2.5 text-indigo-400 flex-shrink-0" /> : <EyeOff className="w-2.5 h-2.5 text-gray-700 flex-shrink-0" />}
    </div>
  );
}
