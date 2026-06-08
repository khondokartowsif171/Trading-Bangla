import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useSignalBot } from '@/hooks/useSignalBot';
import { useAllPrices } from '@/hooks/useMarketData';
import AdvancedChart from '@/components/TradingView/AdvancedChart';
import {
  TrendingUp, TrendingDown, Zap, Wifi, WifiOff, X,
  BarChart2, Clock, Trophy, DollarSign, Activity,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaperPosition {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  sl: number;
  tp: number;
  openTime: number;
}
interface ClosedTrade extends PaperPosition {
  exitPrice: number;
  exitTime: number;
  pnl: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SYMBOLS = [
  'XAU/USD','EUR/USD','GBP/USD','USD/JPY','BTC/USD',
  'AUD/USD','USD/CAD','NZD/USD','GBP/JPY','EUR/JPY',
  'XAG/USD','US30','NAS100','USOIL',
];
const TF_OPTIONS = [
  { label:'M1', value:'1' }, { label:'M5', value:'5' },
  { label:'M15', value:'15' }, { label:'M30', value:'30' },
  { label:'H1', value:'60' }, { label:'H4', value:'240' },
  { label:'D1', value:'D' }, { label:'W1', value:'W' },
];
const INIT_BALANCE = 10000;
const LEVERAGE = 100;

function symKey(s: string) { return s.replace('/', ''); }

function getPnlMult(sym: string): number {
  const s = symKey(sym).toUpperCase();
  if (s.includes('XAU')) return 100;
  if (s.includes('XAG')) return 5000;
  if (s.includes('BTC')) return 1;
  if (s.includes('JPY')) return 1000;
  if (s === 'US30' || s === 'NAS100') return 1;
  if (s.includes('OIL')) return 100;
  return 100000;
}

function calcPnl(pos: PaperPosition, cur: number): number {
  const dir = pos.direction === 'BUY' ? 1 : -1;
  return dir * (cur - pos.entryPrice) * pos.lots * getPnlMult(pos.symbol);
}

function calcMargin(sym: string, price: number, lots: number): number {
  return (price * lots * getPnlMult(sym)) / LEVERAGE;
}

function fmtPrice(sym: string, price: number): string {
  const s = symKey(sym).toUpperCase();
  if (s.includes('XAU') || s.includes('BTC') || s === 'US30' || s === 'NAS100') return price.toFixed(2);
  if (s.includes('XAG') || s.includes('OIL')) return price.toFixed(3);
  if (s.includes('JPY')) return price.toFixed(3);
  return price.toFixed(5);
}

function fmtPnl(pnl: number): string {
  return (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2);
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return m > 0 ? `${m}m` : `${s}s`;
}

// ─── Paper Trading Hook ───────────────────────────────────────────────────────
function usePaperTrading() {
  const [balance, setBalance] = useState<number>(() => {
    const v = localStorage.getItem('tb_mt5_balance');
    return v ? parseFloat(v) : INIT_BALANCE;
  });
  const [positions, setPositions] = useState<PaperPosition[]>(() => {
    try { return JSON.parse(localStorage.getItem('tb_mt5_positions') || '[]'); } catch { return []; }
  });
  const [history, setHistory] = useState<ClosedTrade[]>(() => {
    try { return JSON.parse(localStorage.getItem('tb_mt5_history') || '[]'); } catch { return []; }
  });

  const save = useCallback((bal: number, pos: PaperPosition[], hist: ClosedTrade[]) => {
    localStorage.setItem('tb_mt5_balance', String(bal));
    localStorage.setItem('tb_mt5_positions', JSON.stringify(pos));
    localStorage.setItem('tb_mt5_history', JSON.stringify(hist));
  }, []);

  const openTrade = useCallback((sym: string, dir: 'BUY' | 'SELL', lots: number, price: number, sl: number, tp: number) => {
    const pos: PaperPosition = { id: Date.now().toString(), symbol: sym, direction: dir, lots, entryPrice: price, sl, tp, openTime: Date.now() };
    const margin = calcMargin(sym, price, lots);
    setBalance(b => { const nb = b - margin; return nb; });
    setPositions(prev => { const next = [...prev, pos]; save(balance - margin, next, history); return next; });
  }, [balance, history, save]);

  const closeTrade = useCallback((posId: string, cur: number) => {
    setPositions(prev => {
      const pos = prev.find(p => p.id === posId);
      if (!pos) return prev;
      const pnl = calcPnl(pos, cur);
      const margin = calcMargin(pos.symbol, pos.entryPrice, pos.lots);
      const closed: ClosedTrade = { ...pos, exitPrice: cur, exitTime: Date.now(), pnl };
      const next = prev.filter(p => p.id !== posId);
      const newHist = [closed, ...history].slice(0, 100);
      setBalance(b => b + margin + pnl);
      setHistory(newHist);
      save(balance + margin + pnl, next, newHist);
      return next;
    });
  }, [balance, history, save]);

  const resetAccount = useCallback(() => {
    setBalance(INIT_BALANCE); setPositions([]); setHistory([]);
    save(INIT_BALANCE, [], []);
  }, [save]);

  return { balance, positions, history, openTrade, closeTrade, resetAccount };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MT5ChartPage() {
  const { darkMode } = useApp();
  const { status: botStatus, latestSignal } = useSignalBot();
  const livePrices = useAllPrices();
  const { balance, positions, history, openTrade, closeTrade, resetAccount } = usePaperTrading();

  const [symbol, setSymbol]       = useState('XAU/USD');
  const [tf, setTf]               = useState('15');
  const [orderDir, setOrderDir]   = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots]           = useState('0.01');
  const [sl, setSl]               = useState('');
  const [tp, setTp]               = useState('');
  const [bottomTab, setBottomTab] = useState<'positions' | 'history' | 'signals'>('positions');
  const [orderErr, setOrderErr]   = useState('');
  const [now, setNow]             = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const liveQ    = livePrices[symKey(symbol)] ?? livePrices[symbol] ?? null;
  const liveAsk  = liveQ?.ask ?? liveQ?.bid ?? 0;
  const liveBid  = liveQ?.bid ?? 0;
  const livePrice = orderDir === 'BUY' ? liveAsk : liveBid;
  const spread   = liveQ ? liveQ.ask - liveQ.bid : 0;
  const chgPct   = liveQ?.changePercent ?? 0;

  const floatingPnl = useMemo(() =>
    positions.reduce((sum, pos) => {
      const q = livePrices[symKey(pos.symbol)] ?? livePrices[pos.symbol];
      return sum + calcPnl(pos, q?.bid ?? pos.entryPrice);
    }, 0),
  [positions, livePrices]);

  const usedMargin = useMemo(() =>
    positions.reduce((sum, pos) => sum + calcMargin(pos.symbol, pos.entryPrice, pos.lots), 0),
  [positions]);

  const equity      = balance + floatingPnl;
  const freeMargin  = equity - usedMargin;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;
  const winRate     = history.length > 0 ? Math.round((history.filter(t => t.pnl > 0).length / history.length) * 100) : 0;
  const totalPnl    = history.reduce((s, t) => s + t.pnl, 0);

  // Auto-suggest SL/TP on symbol or direction change
  useEffect(() => {
    if (!livePrice) return;
    const s = symKey(symbol).toUpperCase();
    let slPips = 50, tpPips = 100;
    if (s.includes('XAU')) { slPips = 300; tpPips = 600; }
    else if (s.includes('BTC')) { slPips = 500; tpPips = 1000; }
    const pipSz = s.includes('JPY') ? 0.01 : s.includes('XAU') ? 0.01 : s.includes('BTC') ? 1 : 0.0001;
    setSl(fmtPrice(symbol, orderDir === 'BUY' ? livePrice - slPips * pipSz : livePrice + slPips * pipSz));
    setTp(fmtPrice(symbol, orderDir === 'BUY' ? livePrice + tpPips * pipSz : livePrice - tpPips * pipSz));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, orderDir, livePrice > 0 ? symbol : null]);

  const handleExecute = () => {
    setOrderErr('');
    const lotsN = parseFloat(lots);
    if (!lotsN || lotsN <= 0) { setOrderErr('Valid lot size দিন'); return; }
    if (!livePrice)            { setOrderErr('Live price পাওয়া যাচ্ছে না'); return; }
    const margin = calcMargin(symbol, livePrice, lotsN);
    if (margin > freeMargin)   { setOrderErr(`Margin প্রয়োজন: $${margin.toFixed(2)} (Available: $${freeMargin.toFixed(2)})`); return; }
    openTrade(symbol, orderDir, lotsN, livePrice, parseFloat(sl) || 0, parseFloat(tp) || 0);
    setOrderErr('');
  };

  const dm = darkMode;
  const border = dm ? 'border-gray-800' : 'border-gray-200';
  const bg2    = dm ? 'bg-gray-900' : 'bg-white';

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${dm ? 'bg-gray-950' : 'bg-gray-100'}`}>

      {/* ════ TOP BAR ════ */}
      <div className={`flex items-center gap-3 px-4 py-2 border-b ${border} ${bg2} shrink-0 flex-wrap gap-y-1`}>
        <select value={symbol} onChange={e => setSymbol(e.target.value)}
          className={`text-sm font-bold rounded-lg px-3 py-1.5 border outline-none ${dm ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
          {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex gap-0.5">
          {TF_OPTIONS.map(t => (
            <button key={t.value} onClick={() => setTf(t.value)}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                tf === t.value ? 'bg-indigo-500 text-white' : dm ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}>{t.label}</button>
          ))}
        </div>

        {liveQ && (
          <div className="flex items-center gap-3">
            <div className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
              Bid <span className={`font-bold tabular-nums ${dm ? 'text-white' : 'text-gray-900'}`}>{fmtPrice(symbol, liveBid)}</span>
            </div>
            <div className="text-xs text-blue-400">
              Ask <span className="font-bold tabular-nums">{fmtPrice(symbol, liveAsk)}</span>
            </div>
            <span className={`text-xs font-medium ${chgPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {chgPct >= 0 ? '+' : ''}{chgPct.toFixed(2)}%
            </span>
            {spread > 0 && (
              <span className={`text-[10px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
                Spread {(spread * (symbol.includes('JPY') ? 100 : 10000)).toFixed(1)}
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          botStatus === 'connected' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {botStatus === 'connected'
            ? <><Wifi className="w-3.5 h-3.5" /> MT5 Bot Connected</>
            : <><WifiOff className="w-3.5 h-3.5" /> Demo Mode</>}
        </div>
      </div>

      {/* ════ ACCOUNT BAR ════ */}
      <div className={`flex items-center gap-4 px-4 py-1.5 border-b text-xs ${dm ? 'border-gray-800 bg-gray-900/70' : 'border-gray-100 bg-white'} shrink-0 overflow-x-auto`}>
        {[
          ['Balance',      `$${balance.toFixed(2)}`,                         dm ? 'text-white' : 'text-gray-900'],
          ['Equity',       `$${equity.toFixed(2)}`,                          equity >= balance ? 'text-green-400' : 'text-red-400'],
          ['P/L Float',    fmtPnl(floatingPnl),                              floatingPnl >= 0 ? 'text-green-400' : 'text-red-400'],
          ['Margin',       `$${usedMargin.toFixed(2)}`,                      dm ? 'text-gray-300' : 'text-gray-700'],
          ['Free Margin',  `$${freeMargin.toFixed(2)}`,                      freeMargin < 500 ? 'text-yellow-400' : dm ? 'text-gray-300' : 'text-gray-700'],
          ['Margin Lvl',   usedMargin > 0 ? `${marginLevel.toFixed(0)}%` : '—', marginLevel > 200 || usedMargin === 0 ? 'text-green-400' : marginLevel > 100 ? 'text-yellow-400' : 'text-red-400'],
          ['Win Rate',     `${winRate}%`,                                    winRate >= 50 ? 'text-green-400' : 'text-yellow-400'],
        ].map(([label, val, color]) => (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <span className={dm ? 'text-gray-600' : 'text-gray-400'}>{label}:</span>
            <span className={`font-bold tabular-nums ${color}`}>{val}</span>
            <div className={`w-px h-3.5 ${dm ? 'bg-gray-800' : 'bg-gray-200'}`} />
          </div>
        ))}
        <div className="flex-1" />
        <button onClick={resetAccount}
          className={`text-[10px] px-2 py-0.5 rounded ${dm ? 'text-gray-700 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'} transition-colors`}>
          Reset Demo
        </button>
      </div>

      {/* ════ MAIN AREA ════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Chart */}
        <div className="flex-1 min-w-0">
          <AdvancedChart symbol={symbol} interval={tf} height="100%" />
        </div>

        {/* Right Panel — Order + Bot */}
        <div className={`w-72 shrink-0 border-l flex flex-col overflow-hidden ${border} ${bg2}`}>

          {/* Order Form */}
          <div className={`p-4 border-b space-y-3 ${dm ? 'border-gray-800' : 'border-gray-100'} overflow-y-auto`} style={{ maxHeight: '55%' }}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${dm ? 'text-white' : 'text-gray-900'}`}>{symbol}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${dm ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                1:{LEVERAGE}
              </span>
            </div>

            {/* BUY / SELL */}
            <div className="grid grid-cols-2 gap-2">
              {(['BUY', 'SELL'] as const).map(d => (
                <button key={d} onClick={() => setOrderDir(d)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    orderDir === d
                      ? d === 'BUY'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                        : 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                      : dm ? 'bg-gray-800 text-gray-500 hover:text-gray-300' : 'bg-gray-100 text-gray-400 hover:text-gray-700'
                  }`}>
                  {d === 'BUY' ? '▲' : '▼'} {d}
                  {liveQ && (
                    <div className="text-[10px] font-mono mt-0.5 opacity-75">
                      {fmtPrice(symbol, d === 'BUY' ? liveAsk : liveBid)}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Lot presets + input */}
            <div>
              <label className={`text-[10px] font-medium ${dm ? 'text-gray-400' : 'text-gray-600'}`}>
                Lot Size
                {livePrice > 0 && <span className={`ml-1 ${dm ? 'text-gray-600' : 'text-gray-400'}`}>(margin: ~${calcMargin(symbol, livePrice, parseFloat(lots)||0.01).toFixed(0)})</span>}
              </label>
              <div className="flex gap-0.5 mt-1 mb-1">
                {['0.01','0.05','0.1','0.5','1.0'].map(v => (
                  <button key={v} onClick={() => setLots(v)}
                    className={`flex-1 py-1 text-[9px] font-medium rounded transition-all ${
                      lots === v ? 'bg-indigo-500/25 text-indigo-400 border border-indigo-500/30' : dm ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                    }`}>{v}</button>
                ))}
              </div>
              <input type="number" step="0.01" min="0.01" value={lots} onChange={e => setLots(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-lg text-xs border outline-none ${dm ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
            </div>

            {/* SL / TP */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-red-400">Stop Loss</label>
                <input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)}
                  className={`w-full mt-1 px-2 py-1.5 rounded-lg text-xs border outline-none ${dm ? 'bg-gray-800 border-red-900/40 text-white' : 'bg-white border-red-200 text-gray-900'}`} />
              </div>
              <div>
                <label className="text-[10px] font-medium text-green-400">Take Profit</label>
                <input type="number" step="any" value={tp} onChange={e => setTp(e.target.value)}
                  className={`w-full mt-1 px-2 py-1.5 rounded-lg text-xs border outline-none ${dm ? 'bg-gray-800 border-green-900/40 text-white' : 'bg-white border-green-200 text-gray-900'}`} />
              </div>
            </div>

            {orderErr && <p className="text-[10px] text-red-400">{orderErr}</p>}

            <button onClick={handleExecute}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
                orderDir === 'BUY'
                  ? 'bg-green-500 hover:bg-green-400 text-white shadow-green-500/20'
                  : 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
              }`}>
              {orderDir === 'BUY' ? '▲ EXECUTE BUY' : '▼ EXECUTE SELL'}
            </button>
          </div>

          {/* Signal Bot Panel */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${dm ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={`text-xs font-bold ${dm ? 'text-white' : 'text-gray-900'}`}>Signal Bot</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                botStatus === 'connected' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>{botStatus === 'connected' ? '● LIVE' : '○ OFFLINE'}</span>
            </div>

            {latestSignal ? (
              <div className={`rounded-xl p-3 border space-y-2 ${dm ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${dm ? 'text-white' : 'text-gray-900'}`}>{latestSignal.symbol}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    latestSignal.direction === 'BUY' ? 'bg-green-500/20 text-green-400' :
                    latestSignal.direction === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>{latestSignal.direction}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className={dm ? 'text-gray-400' : 'text-gray-600'}>Entry: <span className="font-mono font-bold">{latestSignal.entry?.toFixed(2)}</span></div>
                  <div className="text-green-400">TP: <span className="font-mono font-bold">{latestSignal.takeProfit?.toFixed(2)}</span></div>
                  <div className="text-red-400">SL: <span className="font-mono font-bold">{latestSignal.stopLoss?.toFixed(2)}</span></div>
                  <div className={dm ? 'text-gray-400' : 'text-gray-600'}>R/R: <span className="font-bold">{latestSignal.riskReward?.toFixed(1)}</span></div>
                </div>
                <div className="space-y-1">
                  <div className={`flex justify-between text-[10px] ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>Confidence</span>
                    <span className="font-bold text-indigo-400">{latestSignal.confidence}%</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${dm ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${latestSignal.confidence}%` }} />
                  </div>
                </div>
                {latestSignal.direction !== 'NEUTRAL' && (
                  <button onClick={() => {
                    const sym = latestSignal.symbol.includes('/') ? latestSignal.symbol
                      : latestSignal.symbol.slice(0,3) + '/' + latestSignal.symbol.slice(3);
                    setSymbol(sym);
                    setOrderDir(latestSignal.direction as 'BUY' | 'SELL');
                  }} className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors">
                    ⚡ Use Signal
                  </button>
                )}
              </div>
            ) : (
              <div className={`rounded-xl p-4 border text-center ${dm ? 'bg-gray-800/30 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                <Zap className="w-5 h-5 mx-auto mb-1 opacity-30" />
                <p className={`text-[10px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
                  {botStatus === 'connected' ? 'Waiting for signal...' : 'USTAD EA v3 সংযোগ করুন'}
                </p>
              </div>
            )}

            {/* Performance mini-card */}
            {history.length > 0 && (
              <div className={`rounded-xl p-3 border ${dm ? 'bg-gray-800/40 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-[10px] font-bold mb-2 ${dm ? 'text-gray-400' : 'text-gray-600'}`}>Performance</p>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    { label: 'Trades', val: history.length, color: dm ? 'text-white' : 'text-gray-900' },
                    { label: 'Win Rate', val: `${winRate}%`, color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Net P/L', val: fmtPnl(totalPnl), color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className={`text-[9px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>{item.label}</p>
                      <p className={`text-sm font-bold ${item.color}`}>{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════ BOTTOM PANEL ════ */}
      <div className={`border-t ${border} shrink-0`} style={{ height: '210px' }}>
        {/* Tab bar */}
        <div className={`flex items-center border-b ${border} ${bg2}`}>
          {[
            { key: 'positions', label: `Positions (${positions.length})`, icon: BarChart2 },
            { key: 'history',   label: `History (${history.length})`,   icon: Clock },
            { key: 'signals',   label: 'Overview',                       icon: Trophy },
          ].map(tab => (
            <button key={tab.key} onClick={() => setBottomTab(tab.key as typeof bottomTab)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
                bottomTab === tab.key
                  ? dm ? 'border-indigo-400 text-indigo-400' : 'border-indigo-600 text-indigo-600'
                  : `border-transparent ${dm ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`
              }`}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
          {floatingPnl !== 0 && (
            <div className={`ml-auto mr-4 flex items-center gap-1 text-xs font-bold ${floatingPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {floatingPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {fmtPnl(floatingPnl)}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-auto" style={{ height: '170px' }}>

          {/* Positions */}
          {bottomTab === 'positions' && (positions.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${dm ? 'text-gray-700' : 'text-gray-400'}`}>
              <BarChart2 className="w-7 h-7 mb-1 opacity-25" />
              <p className="text-xs">Open positions নেই — উপরে Buy/Sell করুন</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className={`sticky top-0 ${dm ? 'bg-gray-900 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                <tr>{['Symbol','Type','Lots','Entry','Current','P/L','Pips','Duration','Close'].map(h => (
                  <th key={h} className="px-3 py-1.5 text-left text-[10px] font-medium whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const q   = livePrices[symKey(pos.symbol)] ?? livePrices[pos.symbol];
                  const cur = q?.bid ?? pos.entryPrice;
                  const pnl = calcPnl(pos, cur);
                  const pipSz = pos.symbol.includes('JPY') ? 0.01 : pos.symbol.includes('XAU') ? 0.01 : 0.0001;
                  const pips  = (pos.direction === 'BUY' ? cur - pos.entryPrice : pos.entryPrice - cur) / pipSz;
                  return (
                    <tr key={pos.id} className={`border-b transition-colors ${dm ? 'border-gray-800 hover:bg-gray-800/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <td className={`px-3 py-2 font-semibold ${dm ? 'text-white' : 'text-gray-900'}`}>{pos.symbol}</td>
                      <td className={`px-3 py-2 font-bold ${pos.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{pos.direction}</td>
                      <td className={`px-3 py-2 ${dm ? 'text-gray-300' : 'text-gray-700'}`}>{pos.lots}</td>
                      <td className={`px-3 py-2 font-mono ${dm ? 'text-gray-400' : 'text-gray-600'}`}>{fmtPrice(pos.symbol, pos.entryPrice)}</td>
                      <td className={`px-3 py-2 font-mono ${dm ? 'text-gray-200' : 'text-gray-800'}`}>{fmtPrice(pos.symbol, cur)}</td>
                      <td className={`px-3 py-2 font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPnl(pnl)}</td>
                      <td className={`px-3 py-2 ${pips >= 0 ? 'text-green-400' : 'text-red-400'}`}>{pips >= 0 ? '+' : ''}{pips.toFixed(1)}</td>
                      <td className={`px-3 py-2 text-[10px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>{fmtDuration(now - pos.openTime)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => closeTrade(pos.id, cur)}
                          className={`p-1 rounded transition-colors ${dm ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}

          {/* History */}
          {bottomTab === 'history' && (history.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${dm ? 'text-gray-700' : 'text-gray-400'}`}>
              <Clock className="w-7 h-7 mb-1 opacity-25" />
              <p className="text-xs">Trade history নেই</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className={`sticky top-0 ${dm ? 'bg-gray-900 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                <tr>{['Symbol','Type','Lots','Entry','Exit','P/L','Result','Closed At'].map(h => (
                  <th key={h} className="px-3 py-1.5 text-left text-[10px] font-medium whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map(t => (
                  <tr key={t.id} className={`border-b transition-colors ${dm ? 'border-gray-800 hover:bg-gray-800/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`px-3 py-2 font-semibold ${dm ? 'text-white' : 'text-gray-900'}`}>{t.symbol}</td>
                    <td className={`px-3 py-2 font-bold ${t.direction === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{t.direction}</td>
                    <td className={`px-3 py-2 ${dm ? 'text-gray-300' : 'text-gray-700'}`}>{t.lots}</td>
                    <td className={`px-3 py-2 font-mono ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{fmtPrice(t.symbol, t.entryPrice)}</td>
                    <td className={`px-3 py-2 font-mono ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{fmtPrice(t.symbol, t.exitPrice)}</td>
                    <td className={`px-3 py-2 font-bold ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPnl(t.pnl)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        t.pnl > 0 ? 'bg-green-500/20 text-green-400' : t.pnl < 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>{t.pnl > 0 ? 'WIN' : t.pnl < 0 ? 'LOSS' : 'BE'}</span>
                    </td>
                    <td className={`px-3 py-2 text-[10px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
                      {new Date(t.exitTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          {/* Overview */}
          {bottomTab === 'signals' && (
            <div className="p-4 grid grid-cols-5 gap-3">
              {[
                { icon: DollarSign, label: 'Balance',   val: `$${balance.toFixed(2)}`,   color: dm ? 'text-white' : 'text-gray-900' },
                { icon: TrendingUp, label: 'Equity',    val: `$${equity.toFixed(2)}`,    color: equity >= balance ? 'text-green-400' : 'text-red-400' },
                { icon: Trophy,     label: 'Win Rate',  val: `${winRate}%`,              color: winRate >= 50 ? 'text-green-400' : 'text-red-400' },
                { icon: BarChart2,  label: 'Trades',    val: String(history.length),     color: dm ? 'text-indigo-400' : 'text-indigo-600' },
                { icon: Activity,   label: 'Net P/L',   val: fmtPnl(totalPnl),          color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
              ].map(item => (
                <div key={item.label} className={`rounded-xl p-3 border text-center ${dm ? 'bg-gray-800/40 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                  <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
                  <p className={`text-[9px] ${dm ? 'text-gray-600' : 'text-gray-400'}`}>{item.label}</p>
                  <p className={`text-sm font-bold ${item.color}`}>{item.val}</p>
                </div>
              ))}
              <div className={`col-span-5 rounded-xl p-3 border text-[10px] ${dm ? 'bg-gray-800/30 border-gray-800 text-gray-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                <span className="font-bold">MT5 Real Account:</span> USTAD EA v3 → MetaTrader 5 → Expert Advisor → Signal Bot URL সেট করুন → Bot Connected দেখালে সংযোগ সফল
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
