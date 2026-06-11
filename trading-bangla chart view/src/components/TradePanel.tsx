/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { detectSMC } from '../utils/forexSMC';
import {
  PairConfig,
  Position,
  TradeHistory,
  AccountState,
} from '../types';
import {
  PlaySquare,
  TrendingUp,
  TrendingDown,
  XCircle,
  Briefcase,
  History,
  AlertCircle,
  Percent,
  ChevronRight,
  Download,
  Calculator,
} from 'lucide-react';

// Backtest types
type BacktestStrategy = 'fvg_bounce' | 'ob_rejection' | 'bos_pullback';
interface BacktestTrade {
  entryIndex: number; exitIndex: number;
  type: 'BUY' | 'SELL';
  entryPrice: number; exitPrice: number; pnl: number;
}
interface BacktestResult {
  trades: BacktestTrade[];
  totalTrades: number; winRate: number;
  profitFactor: number; maxDrawdown: number; netPnL: number;
  equityCurve: number[];
}

// Stat box sub-component
const StatBox = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="bg-gray-950/60 rounded p-1.5 text-center border border-gray-800/40">
    <div className="text-[7.5px] text-gray-500 uppercase font-bold">{label}</div>
    <div className={`text-xs font-mono font-bold ${positive === undefined ? 'text-gray-200' : positive ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>{value}</div>
  </div>
);

// Mini SVG equity curve sub-component
const EquityCurveChart = ({ curve }: { curve: number[] }) => {
  if (curve.length < 2) return null;
  const W = 260, H = 50;
  const min = Math.min(...curve);
  const max = Math.max(...curve);
  const rng = max - min || 1;
  const pts = curve.map((v, i) => {
    const x = (i / (curve.length - 1)) * W;
    const y = H - ((v - min) / rng) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isPos = curve[curve.length - 1] >= curve[0];
  return (
    <div className="bg-gray-950/40 rounded border border-gray-800/30 p-2">
      <div className="text-[8px] text-gray-500 uppercase font-bold mb-1">ইকুইটি কার্ভ</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
        <polyline points={pts} fill="none" stroke={isPos ? '#00e676' : '#ff3d57'} strokeWidth="1.5" />
      </svg>
    </div>
  );
};

interface TradePanelProps {
  pair: PairConfig;
  currentPrice: number;
  positions: Position[];
  history: TradeHistory[];
  account: AccountState;
  onOpenPosition: (type: 'BUY' | 'SELL', lots: number, leverage: number, slPrice?: number, tpPrice?: number) => void;
  onClosePosition: (id: string) => void;
  onResetAccount: () => void;
  onCloseAllPositions?: () => void;
  onClose?: () => void;
  currentWidth?: number;
  onWidthChange?: (newWidth: number) => void;
  onSetBalance?: (amount: number) => void;
}

export default function TradePanel({
  pair,
  currentPrice,
  positions,
  history,
  account,
  onOpenPosition,
  onClosePosition,
  onResetAccount,
  onCloseAllPositions,
  onClose,
  currentWidth,
  onWidthChange,
  onSetBalance,
}: TradePanelProps) {
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState<number>(1.0);
  const [leverage, setLeverage] = useState<number>(200);
  const [riskPct, setRiskPct] = useState<number>(1);

  // Take Profit / Stop Loss toggles & entries
  const [useSL, setUseSL] = useState(false);
  const [slValue, setSlValue] = useState<string>('');
  const [useTP, setUseTP] = useState(false);
  const [tpValue, setTpValue] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'backtest'>('positions');
  const [orderFormHeight, setOrderFormHeight] = useState(260);

  // Backtest state
  const [backtestStrategy, setBacktestStrategy] = useState<BacktestStrategy>('fvg_bounce');
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Multiplier helper for PnL calculation
  const getMultiplier = (symbolName: string) => {
    if (symbolName.includes('JPY')) return 1000;
    if (symbolName.includes('Gold') || symbolName.includes('XAU')) return 100;
    if (symbolName.includes('BTC') || symbolName.includes('Bitcoin')) return 1;
    return 100000; // standard Forex pair
  };

  const getPositionPnL = (pos: Position) => {
    const mult = getMultiplier(pos.sym);
    const priceDiff = pos.type === 'BUY' ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    return priceDiff * mult * pos.lots;
  };

  const marginLevelPercent = account.usedMargin > 0 ? (account.equity / account.usedMargin) * 100 : 0;

  // Stats derived from history
  const winCount = history.filter(h => h.pnl > 0).length;
  const winRate = history.length > 0 ? Math.round((winCount / history.length) * 100) : 0;
  const netPnL = history.reduce((s, h) => s + h.pnl, 0);

  // Pip distance helper
  const pipDist = (priceStr: string) => {
    const val = parseFloat(priceStr);
    if (!val || !currentPrice || !pair?.pip) return null;
    return Math.abs(Math.round((val - currentPrice) / pair.pip));
  };

  // Pip value per standard lot in USD (approximate)
  const pipValuePerLot = useMemo(() => {
    const sym = pair?.label || '';
    if (sym.includes('JPY')) return (10 / currentPrice) * 100;
    if (sym.includes('XAU') || sym.includes('Gold')) return 10;
    if (sym.includes('BTC') || sym.includes('Bitcoin')) return 1;
    if (sym.includes('US30') || sym.includes('Dow') || sym.includes('NAS100') || sym.includes('Nasdaq')) return 1;
    return 10;
  }, [pair, currentPrice]);

  // Position sizing: risk $ / (slPips × pipValue per lot)
  const slPipsNum = useSL ? pipDist(slValue) : null;
  const riskAmount = account.balance * riskPct / 100;
  const suggestedLots = slPipsNum && slPipsNum > 0 && pipValuePerLot > 0
    ? Math.max(0.01, Math.min(10, riskAmount / (slPipsNum * pipValuePerLot)))
    : 0;

  // CSV export
  const exportCSV = () => {
    const rows = ['Symbol,Type,Lots,Entry Price,Exit Price,PnL (USD),Exit Time,Status'];
    history.forEach(h => {
      rows.push(`${h.sym},${h.type},${h.lots},${h.entryPrice},${h.exitPrice},${h.pnl.toFixed(2)},${new Date(h.exitTime).toISOString()},${h.status}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tb-trades-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Backtest engine
  const runBacktest = useCallback(() => {
    const candles = pair.sparkline;
    if (!candles || candles.length < 30) return;
    setIsRunning(true);
    setBacktestResult(null);

    const trades: BacktestTrade[] = [];
    const windowSize = 30;

    for (let i = windowSize; i < candles.length - 5; i++) {
      const window = candles.slice(i - windowSize, i);
      const smc = detectSMC(window, i - windowSize);

      if (backtestStrategy === 'fvg_bounce') {
        for (const fvg of smc.fvgZones) {
          if (fvg.filled) continue;
          const next = candles[i];
          if (fvg.type === 'bullish' && next.l <= fvg.top && next.c > fvg.bottom) {
            const entry = next.c;
            const risk = entry - fvg.bottom;
            if (risk <= 0) continue;
            const tp = entry + risk * 2;
            const sl = fvg.bottom - risk * 0.5;
            for (let j = i + 1; j < Math.min(i + 12, candles.length); j++) {
              if (candles[j].h >= tp) { trades.push({ entryIndex: i, exitIndex: j, type: 'BUY', entryPrice: entry, exitPrice: tp, pnl: risk * 2 }); break; }
              if (candles[j].l <= sl) { trades.push({ entryIndex: i, exitIndex: j, type: 'BUY', entryPrice: entry, exitPrice: sl, pnl: -(risk * 0.5) }); break; }
            }
            break;
          }
          if (fvg.type === 'bearish' && next.h >= fvg.bottom && next.c < fvg.top) {
            const entry = next.c;
            const risk = fvg.top - entry;
            if (risk <= 0) continue;
            const tp = entry - risk * 2;
            const sl = fvg.top + risk * 0.5;
            for (let j = i + 1; j < Math.min(i + 12, candles.length); j++) {
              if (candles[j].l <= tp) { trades.push({ entryIndex: i, exitIndex: j, type: 'SELL', entryPrice: entry, exitPrice: tp, pnl: risk * 2 }); break; }
              if (candles[j].h >= sl) { trades.push({ entryIndex: i, exitIndex: j, type: 'SELL', entryPrice: entry, exitPrice: sl, pnl: -(risk * 0.5) }); break; }
            }
            break;
          }
        }
      } else if (backtestStrategy === 'ob_rejection') {
        for (const ob of smc.orderBlocks) {
          if (ob.mitigated) continue;
          const next = candles[i];
          if (ob.type === 'bullish' && next.l <= ob.high && next.c > ob.low) {
            const entry = next.c;
            const risk = entry - ob.low;
            if (risk <= 0) continue;
            const tp = entry + risk * 2;
            const sl = ob.low * 0.9995;
            for (let j = i + 1; j < Math.min(i + 12, candles.length); j++) {
              if (candles[j].h >= tp) { trades.push({ entryIndex: i, exitIndex: j, type: 'BUY', entryPrice: entry, exitPrice: tp, pnl: risk * 2 }); break; }
              if (candles[j].l <= sl) { trades.push({ entryIndex: i, exitIndex: j, type: 'BUY', entryPrice: entry, exitPrice: sl, pnl: -(risk) }); break; }
            }
            break;
          }
          if (ob.type === 'bearish' && next.h >= ob.low && next.c < ob.high) {
            const entry = next.c;
            const risk = ob.high - entry;
            if (risk <= 0) continue;
            const tp = entry - risk * 2;
            const sl = ob.high * 1.0005;
            for (let j = i + 1; j < Math.min(i + 12, candles.length); j++) {
              if (candles[j].l <= tp) { trades.push({ entryIndex: i, exitIndex: j, type: 'SELL', entryPrice: entry, exitPrice: tp, pnl: risk * 2 }); break; }
              if (candles[j].h >= sl) { trades.push({ entryIndex: i, exitIndex: j, type: 'SELL', entryPrice: entry, exitPrice: sl, pnl: -(risk) }); break; }
            }
            break;
          }
        }
      } else if (backtestStrategy === 'bos_pullback') {
        const breaks = smc.structureBreaks;
        if (breaks.length > 0) {
          const lastBreak = breaks[breaks.length - 1];
          if (lastBreak.direction === 'bullish') {
            const next = candles[i];
            if (next.c < next.o) { // pullback candle
              const entry = next.c;
              const risk = entry - (entry * 0.999);
              const tp = entry + risk * 3;
              const sl = entry - risk;
              for (let j = i + 1; j < Math.min(i + 8, candles.length); j++) {
                if (candles[j].h >= tp) { trades.push({ entryIndex: i, exitIndex: j, type: 'BUY', entryPrice: entry, exitPrice: tp, pnl: risk * 3 }); break; }
                if (candles[j].l <= sl) { trades.push({ entryIndex: i, exitIndex: j, type: 'BUY', entryPrice: entry, exitPrice: sl, pnl: -(risk) }); break; }
              }
            }
          }
        }
      }
    }

    const wins = trades.filter(t => t.pnl > 0).length;
    const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const netPnLraw = trades.reduce((s, t) => s + t.pnl, 0);
    const pipVal = pair.pip > 0 ? pair.pip : 0.0001;

    let equity = 1000;
    const equityCurve = [equity];
    for (const t of trades) {
      equity += (t.pnl / pipVal) * 0.01;
      equityCurve.push(equity);
    }

    let peak = -Infinity, maxDD = 0;
    for (const e of equityCurve) {
      if (e > peak) peak = e;
      const dd = peak - e;
      if (dd > maxDD) maxDD = dd;
    }

    setBacktestResult({
      trades,
      totalTrades: trades.length,
      winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0,
      profitFactor: grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 99 : 0,
      maxDrawdown: +maxDD.toFixed(2),
      netPnL: +(netPnLraw / pipVal * 0.01).toFixed(2),
      equityCurve,
    });
    setIsRunning(false);
  }, [pair.sparkline, pair.pip, backtestStrategy]);

  // Quick preset SL and TP rates
  const setPresets = (type: 'conservative' | 'aggressive') => {
    const slPips = type === 'conservative' ? 20 : 50;
    const tpPips = type === 'conservative' ? 40 : 120;
    
    // 1 pip value in raw price context
    const pipVal = pair.pip;
    
    if (tradeType === 'BUY') {
      setSlValue((currentPrice - slPips * pipVal).toFixed(pair.dec));
      setTpValue((currentPrice + tpPips * pipVal).toFixed(pair.dec));
    } else {
      setSlValue((currentPrice + slPips * pipVal).toFixed(pair.dec));
      setTpValue((currentPrice - tpPips * pipVal).toFixed(pair.dec));
    }
    setUseSL(true);
    setUseTP(true);
  };

  const handlePlaceOrder = () => {
    const slPrice = useSL && slValue ? parseFloat(slValue) : undefined;
    const tpPrice = useTP && tpValue ? parseFloat(tpValue) : undefined;

    // Validate size
    if (lots <= 0 || isNaN(lots)) return;

    onOpenPosition(tradeType, lots, leverage, slPrice, tpPrice);

    // Reset inputs
    setUseSL(false);
    setUseTP(false);
    setSlValue('');
    setTpValue('');
  };

  return (
    <div className="w-full h-full bg-[#0d1117] flex flex-col select-none border-l border-[#1e273d]">
      
      {/* TRADE SIMULATOR HEADER BAR */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/30 shrink-0">
        <span className="font-extrabold text-[11px] font-sans text-white/50 uppercase tracking-widest flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-[#ffc107]" /> ট্রেড ও ট্রানজ্যাকশন সিমুলেশন
        </span>
        <div className="flex items-center space-x-2">
          {currentWidth && onWidthChange && (
            <div className="flex items-center space-x-0.5 bg-black/40 border border-white/10 rounded overflow-hidden">
              <button
                onClick={() => onWidthChange(Math.max(180, currentWidth - 30))}
                className="w-5 h-5 flex items-center justify-center text-[10px] text-gray-400 hover:text-white hover:bg-white/5 font-bold transition-colors"
                title="সাইজ ছোট করুন (Make narrower)"
              >
                ➖
              </button>
              <span className="text-[8.5px] text-white/40 font-mono px-1">
                {currentWidth}
              </span>
              <button
                onClick={() => onWidthChange(Math.min(600, currentWidth + 30))}
                className="w-5 h-5 flex items-center justify-center text-[10px] text-gray-400 hover:text-white hover:bg-white/5 font-bold transition-colors"
                title="সাইজ বড় করুন (Make wider)"
              >
                ➕
              </button>
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition"
              title="মিনিমাইজ করুন (Collapse Trade Panel)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. BROKERAGE BALANCES STATUS TABLE */}
      <div className="bg-[#0e1424] p-3 border-b border-[#1b253b] grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500 font-sans text-[9px] uppercase tracking-wider block">সিমুলেশন ব্যালেন্স (USD)</span>
          <span className="font-mono text-[13.5px] font-bold text-gray-100">${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-gray-500 font-sans text-[9px] uppercase tracking-wider block font-bold">মার্কেট ইকুইটি (Equity)</span>
          <span className="font-mono text-[13.5px] font-bold text-[#00d4ff]">${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="col-span-2 h-px bg-gray-800 my-1" />
        <div>
          <span className="text-gray-500 font-sans text-[9px] uppercase tracking-wider block">ইউজড মার্জিন (Margin)</span>
          <span className="font-mono text-xs font-semibold text-gray-300">${account.usedMargin.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500 font-sans text-[9px] uppercase tracking-wider block">ফ্রি মার্জিন (Free Margin)</span>
          <span className="font-mono text-xs font-semibold text-emerald-400">${account.freeMargin.toFixed(2)}</span>
        </div>
        <div className="col-span-2 mt-1 bg-gray-950/40 p-1.5 rounded space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500 font-bold uppercase tracking-wide flex items-center gap-1">
              <Percent className="w-3 h-3" /> মার্জিন লেভেল %
            </span>
            <span className={`font-mono font-bold ${marginLevelPercent >= 200 || marginLevelPercent === 0 ? 'text-[#00e676]' : marginLevelPercent >= 100 ? 'text-[#ffc107]' : 'text-[#ff3d57]'}`}>
              {marginLevelPercent === 0 ? '—' : marginLevelPercent.toFixed(0) + '%'}
            </span>
          </div>
          {account.usedMargin > 0 && (
            <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${marginLevelPercent >= 200 ? 'bg-[#00e676]' : marginLevelPercent >= 100 ? 'bg-[#ffc107]' : 'bg-[#ff3d57]'}`}
                style={{ width: `${Math.min(marginLevelPercent / 5, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* BALANCE CUSTOM INPUT */}
      {onSetBalance && (
        <div className="bg-[#0e1424] px-3 py-2 border-b border-[#1b253b]">
          <div className="text-[9px] text-gray-500 mb-1.5 uppercase tracking-wider font-bold">ব্যালেন্স পরিবর্তন করুন</div>
          <div className="flex gap-1.5 mb-1.5">
            <input
              type="number"
              min={100}
              max={10000000}
              step={100}
              defaultValue={Math.round(account.balance)}
              key={Math.round(account.balance)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = parseFloat((e.target as HTMLInputElement).value);
                  if (v > 0) onSetBalance(v);
                }
              }}
              className="flex-1 bg-[#070b12] border border-[#1b253b] rounded px-2 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-indigo-500 min-w-0"
              placeholder="যেকোনো পরিমাণ..."
            />
            <button
              onClick={e => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                const v = parseFloat(input.value);
                if (v > 0) onSetBalance(v);
              }}
              className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-500 text-white text-[9px] font-bold rounded border border-indigo-700/50 transition shrink-0"
            >
              SET
            </button>
          </div>
          <div className="flex gap-1">
            {[1000, 5000, 10000, 50000].map(amt => (
              <button key={amt} onClick={() => onSetBalance(amt)}
                className="flex-1 text-[8px] py-0.5 rounded border border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-200 font-mono transition">
                ${amt >= 1000 ? (amt / 1000) + 'K' : amt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. ORDER PLACEMENT PANEL */}
      <div className="bg-[#111625]/50 border-b border-[#1e273d] overflow-y-auto shrink-0" style={{ height: orderFormHeight }}>
      <div className="p-3.5 space-y-3">
        <div className="flex bg-gray-900/60 p-1 rounded-lg">
          <button
            onClick={() => setTradeType('BUY')}
            className={`flex-1 py-1.5 rounded text-xs font-bold font-sans uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
              tradeType === 'BUY'
                ? 'bg-[#00e676] text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Buy / Long
          </button>
          <button
            onClick={() => setTradeType('SELL')}
            className={`flex-1 py-1.5 rounded text-xs font-bold font-sans uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
              tradeType === 'SELL'
                ? 'bg-[#ff3d57] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Sell / Short
          </button>
        </div>

        {/* Lots input selection */}
        <div>
          <label className="text-gray-500 font-sans text-[9.5px] uppercase tracking-wider block font-bold mb-1.5">
            ট্রেডিং লট সাইজ (Lots)
          </label>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setLots((prev) => Math.max(0.01, Number((prev - 0.1).toFixed(2))))}
              className="px-2.5 py-1 bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs rounded font-mono font-bold"
            >
              -0.10
            </button>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="10.0"
              value={lots}
              onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              className="flex-1 bg-gray-950 border border-gray-800/80 rounded px-2 py-1 text-center font-mono text-xs font-bold text-gray-100 focus:outline-none focus:border-[#00d4ff]"
            />
            <button
              onClick={() => setLots((prev) => Number((prev + 0.1).toFixed(2)))}
              className="px-2.5 py-1 bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs rounded font-mono font-bold"
            >
              +0.10
            </button>
          </div>
          <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-mono">
            <span>মিনিমাম: 0.01 লট</span>
            <span>১ লট = ১,০০,০০০ কন্ট্রাক্ট</span>
          </div>
        </div>

        {/* Leverage config */}
        <div>
          <label className="text-gray-500 font-sans text-[9.5px] uppercase tracking-wider block font-bold mb-1.5">
            লেভারেজ (Leverage Multipliers)
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[100, 200, 500].map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`py-1 text-xs rounded font-mono font-bold border transition ${
                  leverage === lev
                    ? 'bg-cyan-950/80 border-[#00d4ff]/40 text-[#00d4ff]'
                    : 'bg-gray-800/40 border-transparent text-gray-400 hover:bg-[#1f273d]'
                }`}
              >
                1:{lev}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Stop Loss & Take Profit configs */}
        <div className="space-y-2 border-t border-gray-800/40 pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider">রিস্ক প্রিকলশন (SL / TP)</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPresets('conservative')}
                className="text-[8.5px] font-sans text-[#00e676] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/20"
              >
                কন্সসারভেডিভ
              </button>
              <button
                onClick={() => setPresets('aggressive')}
                className="text-[8.5px] font-sans text-[#ff3d57] bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/20"
              >
                অ্যাগ্রেসিভ
              </button>
            </div>
          </div>

          {/* SL Check trigger */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-2 text-[10px] text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={useSL}
                onChange={() => setUseSL(!useSL)}
                className="rounded text-indigo-505 bg-gray-950 border-gray-800"
              />
              <span className="font-bold">স্টপ লস (Stop Loss - SL)</span>
              {useSL && slValue && pipDist(slValue) !== null && (
                <span className="ml-auto text-[9px] text-[#ff3d57] font-mono font-bold">≈{pipDist(slValue)} pips</span>
              )}
            </label>
            {useSL && (
              <input
                type="number"
                step={pair.pip}
                placeholder={`যেমন: ${currentPrice.toFixed(pair.dec)}`}
                value={slValue}
                onChange={(e) => setSlValue(e.target.value)}
                className="w-full bg-gray-950 border border-[#ff3d57]/40 rounded px-2.5 py-1.5 font-mono text-xs text-gray-200 focus:outline-none focus:border-[#ff3d57]"
              />
            )}
          </div>

          {/* TP Check trigger */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-2 text-[10px] text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={useTP}
                onChange={() => setUseTP(!useTP)}
                className="rounded text-indigo-505 bg-gray-950 border-gray-800"
              />
              <span className="font-bold">টেক প্রফিট (Take Profit - TP)</span>
              {useTP && tpValue && pipDist(tpValue) !== null && (
                <span className="ml-auto text-[9px] text-[#00e676] font-mono font-bold">≈{pipDist(tpValue)} pips</span>
              )}
            </label>
            {useTP && (
              <input
                type="number"
                step={pair.pip}
                placeholder={`যেমন: ${currentPrice.toFixed(pair.dec)}`}
                value={tpValue}
                onChange={(e) => setTpValue(e.target.value)}
                className="w-full bg-gray-950 border border-[#00e676]/40 rounded px-2.5 py-1.5 font-mono text-xs text-gray-200 focus:outline-none focus:border-[#00e676]"
              />
            )}
          </div>
        </div>

        {/* RISK CALCULATOR */}
        <div className="bg-[#0a0f1c] border border-[#1a2540] rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Calculator className="w-3 h-3" /> রিস্ক ক্যালকুলেটর
            </span>
            <div className="flex gap-0.5">
              {[0.5, 1, 2, 3].map(r => (
                <button
                  key={r}
                  onClick={() => setRiskPct(r)}
                  className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold transition ${riskPct === r ? 'bg-cyan-900/80 text-cyan-300 border border-cyan-700/40' : 'bg-gray-800/60 text-gray-500 hover:text-gray-300'}`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-gray-950/60 rounded p-1.5">
              <div className="text-[7.5px] text-gray-500 uppercase font-bold">ঝুঁকি পরিমাণ</div>
              <div className="text-amber-300 font-mono font-bold text-xs">${riskAmount.toFixed(0)}</div>
            </div>
            <button
              onClick={() => suggestedLots > 0 && setLots(Number(suggestedLots.toFixed(2)))}
              className={`bg-gray-950/60 rounded p-1.5 text-left transition ${suggestedLots > 0 ? 'hover:bg-cyan-950/40 cursor-pointer' : 'cursor-default'}`}
              title="ক্লিক করে লট সেট করুন"
            >
              <div className="text-[7.5px] text-gray-500 uppercase font-bold">প্রস্তাবিত লট {suggestedLots > 0 ? '↩' : ''}</div>
              <div className={`font-mono font-bold text-xs ${suggestedLots > 0 ? 'text-cyan-300' : 'text-gray-600'}`}>
                {suggestedLots > 0 ? suggestedLots.toFixed(2) : 'SL দিন'}
              </div>
            </button>
          </div>
          {suggestedLots > 0 && (
            <div className="text-[8px] text-gray-600 text-center">SL ({slPipsNum} pips) ভিত্তিক গণনা · ক্লিক করে লট সেট করুন</div>
          )}
        </div>

        {/* CORE SEND TRANSACTION TRIGGER BUTTON */}
        <button
          onClick={handlePlaceOrder}
          className={`w-full py-3 rounded-lg font-black font-sans uppercase tracking-widest transition-all active:scale-95 shadow-lg flex flex-col items-center justify-center gap-0.5 ${
            tradeType === 'BUY'
              ? 'bg-[#00e676] hover:bg-emerald-400 text-black shadow-[#00e676]/20'
              : 'bg-[#ff3d57] hover:bg-red-400 text-white shadow-[#ff3d57]/20'
          }`}
        >
          <div className="flex items-center gap-1.5 text-sm">
            <PlaySquare className="w-4 h-4 shrink-0" />
            <span>{tradeType === 'BUY' ? '▲ BUY / LONG' : '▼ SELL / SHORT'}</span>
          </div>
          <span className="text-[10px] font-mono opacity-75 tracking-widest">
            @ {currentPrice.toFixed(pair?.dec || 5)} · {lots} lot · 1:{leverage}
          </span>
        </button>
      </div>
      </div>

      {/* Vertical resize handle — drag to adjust order form vs. positions heights */}
      <div
        className="h-2 bg-[#1b253b] hover:bg-indigo-500/50 cursor-row-resize shrink-0 flex items-center justify-center group transition-colors select-none"
        onMouseDown={e => {
          const startY = e.clientY;
          const startH = orderFormHeight;
          const onMove = (ev: MouseEvent) => {
            const delta = ev.clientY - startY;
            setOrderFormHeight(Math.max(160, Math.min(520, startH + delta)));
          };
          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
          e.preventDefault();
        }}
        title="Drag to resize"
      >
        <div className="w-10 h-0.5 rounded-full bg-gray-600 group-hover:bg-indigo-400 transition-colors" />
      </div>

      {/* 3. SIMULATED OPEN POSITIONS & RECENT CLOSED POSITIONS TRACE */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        
        {/* Tab selector */}
        <div className="flex border-b border-[#1b253b] text-[10px] uppercase font-bold tracking-wider shrink-0 bg-gray-950/20">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-2 border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'positions'
                ? 'border-[#00d4ff] text-white bg-[#101625]'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> ওপেন পজিশন ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 border-b-2 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'border-[#26c6da] text-white bg-[#101625]'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <History className="w-3.5 h-3.5" /> ক্লোজড হিস্ট্রি ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('backtest')}
            className={`flex-1 py-2 border-b-2 flex items-center justify-center gap-1 transition ${
              activeTab === 'backtest'
                ? 'border-[#a855f7] text-white bg-[#101625]'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            📊 ব্যাকটেস্ট
          </button>
        </div>

        {/* Tab view outcomes */}
        <div className="flex-1 overflow-y-auto p-2">
          {activeTab === 'positions' ? (
            positions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <AlertCircle className="w-6 h-6 text-gray-600 mb-1.5" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-sans font-bold">কোনো ট্রেড ওপেন নেই!</span>
                <span className="text-[9.5px] text-gray-600 max-w-[150px] mt-1 line-clamp-2">উপরের প্যানেল দিয়ে BUY অথবা SELL ডেমো ট্রেড করুন</span>
              </div>
            ) : (
              <div className="space-y-2">
                {positions.length > 0 && onCloseAllPositions && (
                  <button
                    onClick={onCloseAllPositions}
                    className="w-full py-1.5 rounded text-xs font-bold bg-red-900/60 hover:bg-red-800/80 text-red-300 hover:text-white border border-red-700/40 transition"
                  >
                    সব পজিশন বন্ধ করুন · Close All ({positions.length})
                  </button>
                )}
                {positions.map((pos) => {
                  const pnl = getPositionPnL(pos);
                  const isProfit = pnl >= 0;

                  return (
                    <div
                      key={pos.id}
                      className="p-2.5 rounded-lg bg-[#141b2c] border border-[#1f2b48]/60 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            pos.type === 'BUY' ? 'bg-emerald-950 text-[#00e676]' : 'bg-red-950 text-[#ff3d57]'
                          }`}>
                            {pos.type}
                          </span>
                          <span className="font-bold text-xs text-gray-200">{pos.sym}</span>
                          <span className="font-mono text-[10px] text-gray-500">{pos.lots} lots</span>
                        </div>
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="text-gray-500 hover:text-red-400 transition"
                          title="ট্রেড ক্লোজ করুন"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-y-1 text-[10.5px] font-mono border-t border-gray-800/40 pt-1.5">
                        <div className="flex justify-between pr-2 border-r border-gray-805">
                          <span className="text-gray-500">এন্ট্রি:</span>
                          <span className="text-gray-300 font-semibold">{pos.entryPrice.toFixed(pair.dec)}</span>
                        </div>
                        <div className="flex justify-between pl-2">
                          <span className="text-gray-500">কারেন্ট:</span>
                          <span className="text-[#00d4ff] font-semibold">{currentPrice.toFixed(pair.dec)}</span>
                        </div>
                        
                        {pos.sl && (
                          <div className="col-span-1 text-[9.5px]">
                            <span className="text-red-500 mr-1.5 font-sans font-bold">SL:</span>
                            <span className="text-gray-400">{pos.sl.toFixed(pair.dec)}</span>
                          </div>
                        )}
                        {pos.tp && (
                          <div className="col-span-1 text-[9.5px]">
                            <span className="text-[#00e676] mr-1.5 font-sans font-bold">TP:</span>
                            <span className="text-gray-400">{pos.tp.toFixed(pair.dec)}</span>
                          </div>
                        )}
                        
                        <div className="col-span-2 flex items-center justify-between text-xs mt-1.5 bg-gray-950/30 p-1.5 rounded">
                          <span className="text-gray-400 text-[10px]">আইসি পিনাল (PnL):</span>
                          <strong className={`font-bold ${isProfit ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>
                            ${isProfit ? '+' : ''}{pnl.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'history' ? (
            history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <History className="w-6 h-6 text-gray-600 mb-1.5" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-sans font-bold text-center">ইতিহাস খালি!</span>
                <span className="text-[9.5px] text-gray-600 mt-1 max-w-[150px]">কোনো সম্পন্ন লেনদেন পাওয়া যায়নি। পজিশন ক্লোজ করলে সেভ হবে।</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Win Rate + Net P/L stats */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <div className="bg-gray-950/60 rounded p-1.5 text-center border border-gray-800/40">
                    <div className="text-[8px] text-gray-500 uppercase font-bold">Trades</div>
                    <div className="text-xs font-mono font-bold text-gray-200">{history.length}</div>
                  </div>
                  <div className="bg-gray-950/60 rounded p-1.5 text-center border border-gray-800/40">
                    <div className="text-[8px] text-gray-500 uppercase font-bold">Win Rate</div>
                    <div className={`text-xs font-mono font-bold ${winRate >= 50 ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>{winRate}%</div>
                  </div>
                  <div className="bg-gray-950/60 rounded p-1.5 text-center border border-gray-800/40">
                    <div className="text-[8px] text-gray-500 uppercase font-bold">Net P/L</div>
                    <div className={`text-xs font-mono font-bold ${netPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>
                      {netPnL >= 0 ? '+' : ''}${netPnL.toFixed(0)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center px-1 mb-1.5">
                  <span className="text-[9px] font-sans text-gray-500 font-bold uppercase tracking-wider">লেনদেনের রেকর্ড</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportCSV}
                      className="flex items-center gap-1 text-[8.5px] font-sans text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-800/20 transition"
                      title="CSV হিসেবে ডাউনলোড করুন"
                    >
                      <Download className="w-2.5 h-2.5" /> CSV
                    </button>
                    <button
                      onClick={onResetAccount}
                      className="text-[9px] font-sans text-[#ff3d57] underline hover:no-underline"
                    >
                      রিসেট
                    </button>
                  </div>
                </div>
                {history.map((hist) => {
                  const isProfit = hist.pnl >= 0;
                  return (
                    <div
                      key={hist.id}
                      className="p-2 rounded bg-gray-950/40 border border-[#1f2b48]/35 flex justify-between items-center text-[10.5px] font-mono"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1">
                          <span className={`text-[8.5px] p-0.5 rounded font-bold ${
                            hist.type === 'BUY' ? 'bg-emerald-950/60 text-[#00e676]' : 'bg-red-950/60 text-[#ff3d57]'
                          }`}>
                            {hist.type}
                          </span>
                          <strong className="text-gray-300">{hist.sym}</strong>
                          <span className="text-[9.5px] text-gray-500">{hist.lots} lot</span>
                        </div>
                        <span className="text-[8.5px] text-gray-500 mt-1">Status: {hist.status}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-bold ${isProfit ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>
                          ${isProfit ? '+' : ''}{hist.pnl.toFixed(2)}
                        </span>
                        <span className="text-[8px] text-gray-600 text-right mt-1">
                          {new Date(hist.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'backtest' ? (
            <div className="space-y-3 pb-2">
              {/* Strategy picker */}
              <div>
                <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block mb-1.5">স্ট্র্যাটেজি বেছে নিন</label>
                <div className="space-y-1">
                  {(['fvg_bounce', 'ob_rejection', 'bos_pullback'] as BacktestStrategy[]).map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-800/40">
                      <input type="radio" name="btStrategy" checked={backtestStrategy === s}
                        onChange={() => { setBacktestStrategy(s); setBacktestResult(null); }}
                        className="accent-purple-500" />
                      <span className="text-[10px] text-gray-300 font-medium">
                        {s === 'fvg_bounce' ? '↩ FVG Bounce' : s === 'ob_rejection' ? '🔷 OB Rejection' : '📈 BOS Pullback'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Run button */}
              <button
                onClick={runBacktest}
                disabled={isRunning}
                className="w-full py-2 rounded bg-purple-900/60 border border-purple-700/40 text-[#d085ff] text-[10px] font-bold uppercase tracking-wider hover:bg-purple-900 transition disabled:opacity-50"
              >
                {isRunning ? '⏳ চলছে...' : '▶ ব্যাকটেস্ট রান করুন'}
              </button>

              {/* Results */}
              {backtestResult && backtestResult.totalTrades > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    <StatBox label="মোট ট্রেড" value={String(backtestResult.totalTrades)} />
                    <StatBox label="জয় হার" value={`${backtestResult.winRate}%`} positive={backtestResult.winRate >= 50} />
                    <StatBox label="Profit Factor" value={String(backtestResult.profitFactor)} positive={backtestResult.profitFactor >= 1} />
                    <StatBox label="Max Drawdown" value={`$${backtestResult.maxDrawdown.toFixed(1)}`} positive={false} />
                    <div className="col-span-2 bg-gray-950/60 rounded p-1.5 text-center border border-gray-800/40">
                      <div className="text-[8px] text-gray-500 uppercase font-bold">নেট P&L ($)</div>
                      <div className={`text-sm font-mono font-bold ${backtestResult.netPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff3d57]'}`}>
                        {backtestResult.netPnL >= 0 ? '+' : ''}{backtestResult.netPnL.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <EquityCurveChart curve={backtestResult.equityCurve} />

                  <div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">ট্রেড লগ (শেষ ২০)</div>
                    <div className="space-y-0.5 max-h-36 overflow-y-auto">
                      {backtestResult.trades.slice(-20).map((t, i) => (
                        <div key={i} className="grid grid-cols-4 text-[9px] font-mono p-1 bg-gray-950/40 rounded border border-gray-800/30">
                          <span className={t.type === 'BUY' ? 'text-[#00e676]' : 'text-[#ff3d57]'}>{t.type}</span>
                          <span className="text-gray-400">{t.entryPrice.toFixed(pair.dec)}</span>
                          <span className="text-gray-400">{t.exitPrice.toFixed(pair.dec)}</span>
                          <span className={t.pnl >= 0 ? 'text-[#00e676]' : 'text-[#ff3d57]'}>{t.pnl >= 0 ? '+' : ''}{(t.pnl / (pair.pip > 0 ? pair.pip : 0.0001) * 0.01).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : backtestResult && backtestResult.totalTrades === 0 ? (
                <div className="text-center text-[10px] text-gray-500 py-4">
                  এই কৌশলে কোনো সিগন্যাল পাওয়া যায়নি। ভিন্ন কৌশল বেছে নিন।
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
