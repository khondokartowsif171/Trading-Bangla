/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  createChart, CrosshairMode, LineStyle,
  CandlestickSeries, HistogramSeries, LineSeries,
  IChartApi, ISeriesApi, UTCTimestamp, ColorType, SeriesType,
} from 'lightweight-charts';
import { Candle, PairConfig, DrawingTool } from '../types';
import {
  calculateSMA, calculateEMA, calculateBollingerBands, calculateRSI,
  calculateMACD, calculateSuperTrend, calculateStochastic, calculateVWAP,
  calculateCCI, calculateParabolicSAR, calculateADX, calculateWilliamsR,
  calculatePivotPoints, calculateKeltnerChannel, calculateOBV, calculateMomentum,
  calculateATR, parseTimeframeToMinutes,
} from '../utils/forexMath';
import {
  calculateDEMA, calculateTEMA, calculateHMA,
  calculateDonchian, calculateIchimoku, calculateAlligator,
  calculateChandelierExit, calculateLRLine, calculateATRBands,
  calculateStochRSI, calculateMFI, calculateAroon, calculateCMO,
  calculateElderRay, calculatePPO,
} from '../utils/forexIndicators';
import { detectSMC, SMCData } from '../utils/forexSMC';

// ── Types ──────────────────────────────────────────────────────────────────
interface ChartDrawing {
  id: string;
  type: 'trend' | 'hline' | 'vline' | 'fib' | 'rect' | 'ray';
  color: string;
  pts: { time: number; price: number }[];
}

interface SmcToggles {
  ob: boolean; fvg: boolean; bos: boolean; liq: boolean;
  sr: boolean; sd: boolean; pd: boolean;
}

// ── Theme ──────────────────────────────────────────────────────────────────
const TV_BG = '#131722'; const TV_GRID = '#1e2433'; const TV_BORDER = '#2a2e39';
const TV_TEXT = '#d1d4dc'; const UP = '#26a69a'; const DN = '#ef5350';
const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'] as const;
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
const FIB_COLORS = ['#ef5350','#ff9800','#ffeb3b','#26a69a','#2196f3','#9c27b0','#ef5350'];

// ── Indicator catalog ──────────────────────────────────────────────────────
const OVERLAY_INDS = [
  { id:'ma20',  label:'MA 20',          color:'#00d4ff', cat:'Trend' },
  { id:'ma50',  label:'MA 50',          color:'#ffc107', cat:'Trend' },
  { id:'ma200', label:'MA 200',         color:'#ef4444', cat:'Trend' },
  { id:'ema9',  label:'EMA 9',          color:'#ec4899', cat:'Trend' },
  { id:'ema21', label:'EMA 21',         color:'#a3e635', cat:'Trend' },
  { id:'ema50', label:'EMA 50',         color:'#f97316', cat:'Trend' },
  { id:'ema200',label:'EMA 200',        color:'#dc2626', cat:'Trend' },
  { id:'dema',  label:'DEMA 21',        color:'#06b6d4', cat:'Trend' },
  { id:'tema',  label:'TEMA 21',        color:'#8b5cf6', cat:'Trend' },
  { id:'hma',   label:'HMA 20',         color:'#10b981', cat:'Trend' },
  { id:'bb',    label:'Bollinger Bands',color:'#7c3aed', cat:'Trend' },
  { id:'st',    label:'SuperTrend',     color:'#00e676', cat:'Trend' },
  { id:'vwap',  label:'VWAP',           color:'#818cf8', cat:'Trend' },
  { id:'kc',    label:'Keltner Channel',color:'#a855f7', cat:'Trend' },
  { id:'sar',   label:'Parabolic SAR',  color:'#f59e0b', cat:'Trend' },
  { id:'dc',    label:'Donchian 20',    color:'#60a5fa', cat:'Trend' },
  { id:'ich',   label:'Ichimoku',       color:'#fbbf24', cat:'Trend' },
  { id:'alg',   label:'Alligator',      color:'#f87171', cat:'Trend' },
  { id:'ce',    label:'Chandelier Exit',color:'#34d399', cat:'Trend' },
  { id:'lr',    label:'LR Line 20',     color:'#67e8f9', cat:'Trend' },
  { id:'atb',   label:'ATR Bands',      color:'#c084fc', cat:'Trend' },
];

const SUB_INDS = [
  { id:'rsi',    label:'RSI 14',           color:'#a855f7' },
  { id:'macd',   label:'MACD (12,26,9)',   color:'#00d4ff' },
  { id:'stoch',  label:'Stochastic (14,3)',color:'#a3e635' },
  { id:'cci',    label:'CCI 20',           color:'#fbbf24' },
  { id:'willr',  label:'Williams %R 14',   color:'#c084fc' },
  { id:'adx',    label:'ADX 14',           color:'#f8fafc' },
  { id:'obv',    label:'OBV',              color:'#38bdf8' },
  { id:'mom',    label:'Momentum 10',      color:'#22c55e' },
  { id:'srsi',   label:'StochRSI',         color:'#fb923c' },
  { id:'mfi',    label:'MFI 14',           color:'#38bdf8' },
  { id:'aroon',  label:'Aroon 25',         color:'#f472b6' },
  { id:'cmo',    label:'CMO 14',           color:'#fb7185' },
  { id:'elder',  label:'Elder Ray 13',     color:'#4ade80' },
  { id:'ppo',    label:'PPO (12,26)',      color:'#60a5fa' },
];

const SMC_OPTS = [
  { id:'ob',  label:'Order Blocks',      color:'#26a69a' },
  { id:'fvg', label:'Fair Value Gap',    color:'#2196f3' },
  { id:'bos', label:'BOS / CHoCH',       color:'#818cf8' },
  { id:'liq', label:'Liquidity (BSL/SSL)',color:'#fbbf24' },
  { id:'sr',  label:'Support & Resistance',color:'#4ade80' },
  { id:'sd',  label:'Supply & Demand',   color:'#f97316' },
  { id:'pd',  label:'Premium / Discount',color:'#a855f7' },
];

// ── Candle aggregation ──────────────────────────────────────────────────────
function aggregateCandles(candles: Candle[], tfMin: number): Candle[] {
  if (tfMin <= 1) return candles;
  const ms = tfMin * 60000;
  const out: Candle[] = [];
  let cur: Candle | null = null;
  for (const c of candles) {
    const ps = Math.floor(c.t / ms) * ms;
    if (!cur || cur.t !== ps) {
      if (cur) out.push(cur);
      cur = { t: ps, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v };
    } else {
      cur.h = Math.max(cur.h, c.h); cur.l = Math.min(cur.l, c.l);
      cur.c = c.c; cur.v += c.v;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// ── Synthetic TF-level history for higher timeframes ──────────────────────
// Builds backwards from lastPrice so newest bar closes at the live price.
// Returns ascending time order (oldest first) as required by lightweight-charts.
function generateTFHistory(lastPrice: number, pip: number, count: number, tfMin: number): Candle[] {
  const rev: Candle[] = [];
  let price = lastPrice;
  const msPerBar = tfMin * 60 * 1000;
  const now = Date.now();
  const vf = tfMin <= 15 ? 1 : tfMin <= 60 ? 3 : tfMin <= 240 ? 8 : 20;
  for (let i = 0; i < count; i++) {         // i=0 → newest bar, i=count-1 → oldest
    const isUp = Math.random() > 0.49;
    const body = (Math.random() * 3 + 0.5) * vf * pip;
    const wick = (Math.random() * 2 + 0.3) * vf * pip;
    const cl = price;                        // close = current traversal price
    const op = isUp ? price - body : price + body;
    rev.push({
      t: now - i * msPerBar,
      o: +op.toFixed(5), h: +(Math.max(op, cl) + wick).toFixed(5),
      l: +(Math.min(op, cl) - wick).toFixed(5), c: +cl.toFixed(5),
      v: Math.floor(Math.random() * 10000 + 1000),
    });
    price = op;
  }
  return rev.reverse(); // ascending: oldest first, newest last (close === lastPrice)
}

// ── Lightweight-charts data helpers ────────────────────────────────────────
type LWPt = { time: UTCTimestamp; value: number };
function toLW(agg: Candle[], data: (number|null)[]): LWPt[] {
  const pts: LWPt[] = [];
  for (let i = 0; i < agg.length; i++) {
    if (data[i] !== null) pts.push({ time: Math.floor(agg[i].t/1000) as UTCTimestamp, value: data[i] as number });
  }
  return pts;
}
function toHist(agg: Candle[], data: (number|null)[], colorFn: (v:number)=>string): { time:UTCTimestamp; value:number; color:string }[] {
  const pts: { time:UTCTimestamp; value:number; color:string }[] = [];
  for (let i = 0; i < agg.length; i++) {
    if (data[i] !== null) pts.push({ time: Math.floor(agg[i].t/1000) as UTCTimestamp, value: data[i] as number, color: colorFn(data[i] as number) });
  }
  return pts;
}
function flatLine(agg: Candle[], price: number): LWPt[] {
  if (agg.length === 0) return [];
  return [
    { time: Math.floor(agg[0].t/1000) as UTCTimestamp, value: price },
    { time: Math.floor(agg[agg.length-1].t/1000) as UTCTimestamp, value: price },
  ];
}

// ── SMC canvas overlay ──────────────────────────────────────────────────────
function drawSMCOverlay(
  ctx: CanvasRenderingContext2D,
  chart: IChartApi,
  series: ISeriesApi<'Candlestick'>,
  smc: SMCData,
  agg: Candle[],
  tog: SmcToggles,
  w: number,
  h: number,
) {
  const tX = (tMs: number) => chart.timeScale().timeToCoordinate(Math.floor(tMs/1000) as UTCTimestamp);
  const pY = (p: number) => series.priceToCoordinate(p);
  const nowX = tX(agg[agg.length-1]?.t ?? 0) ?? w;

  if (tog.ob) {
    smc.orderBlocks.forEach(ob => {
      const sc = agg[Math.min(ob.startIndex, agg.length-1)];
      const x0 = tX(sc.t); const x1 = nowX;
      const y0 = pY(ob.high); const y1 = pY(ob.low);
      if (x0===null||y0===null||y1===null) return;
      const top = Math.min(y0,y1); const ht = Math.abs(y1-y0);
      ctx.fillStyle = ob.type==='bullish' ? 'rgba(38,166,154,0.13)' : 'rgba(239,83,80,0.13)';
      ctx.fillRect(x0, top, Math.max(x1-x0,2), ht);
      ctx.strokeStyle = ob.type==='bullish' ? '#26a69a' : '#ef5350';
      ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.strokeRect(x0, top, Math.max(x1-x0,2), ht);
      ctx.fillStyle = ob.type==='bullish' ? '#26a69a' : '#ef5350';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(ob.type==='bullish'?'OB+':'OB-', x0+3, top+11);
    });
  }

  if (tog.fvg) {
    smc.fvgZones.forEach(fvg => {
      const sc = agg[Math.min(fvg.startIndex, agg.length-1)];
      const x0 = tX(sc.t); const x1 = nowX;
      const y0 = pY(fvg.top); const y1 = pY(fvg.bottom);
      if (x0===null||y0===null||y1===null) return;
      const top = Math.min(y0,y1); const ht = Math.abs(y1-y0);
      ctx.fillStyle = fvg.type==='bullish' ? 'rgba(38,166,154,0.08)' : 'rgba(239,83,80,0.08)';
      ctx.fillRect(x0, top, Math.max(x1-x0,2), ht);
      ctx.strokeStyle = fvg.type==='bullish' ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)';
      ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.strokeRect(x0, top, Math.max(x1-x0,2), ht);
      ctx.setLineDash([]);
      ctx.fillStyle = fvg.type==='bullish' ? 'rgba(38,166,154,0.9)' : 'rgba(239,83,80,0.9)';
      ctx.font='8px sans-serif'; ctx.fillText('FVG', x0+3, top+9);
    });
  }

  if (tog.bos) {
    smc.structureBreaks.forEach(sb => {
      const y = pY(sb.price); if (y===null) return;
      const isBOS = sb.type==='BOS';
      ctx.strokeStyle = isBOS
        ? (sb.direction==='bullish' ? 'rgba(129,140,248,0.8)' : 'rgba(251,146,60,0.8)')
        : 'rgba(192,132,252,0.9)';
      ctx.lineWidth = isBOS ? 1 : 1.5;
      ctx.setLineDash(isBOS ? [4,3] : [6,3]);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
      ctx.setLineDash([]);
      const lbl = sb.type;
      ctx.font='bold 8px sans-serif';
      const tw = ctx.measureText(lbl).width+6;
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.fillRect(2, y-9, tw, 11);
      ctx.fillStyle='#fff'; ctx.fillText(lbl, 5, y);
    });
  }

  if (tog.liq) {
    smc.liquidityLevels.forEach(liq => {
      const y = pY(liq.price); if (y===null) return;
      ctx.strokeStyle = 'rgba(251,191,36,0.7)';
      ctx.lineWidth=1; ctx.setLineDash([2,4]);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font='8px sans-serif'; ctx.fillStyle='rgba(251,191,36,0.9)';
      ctx.fillText(`${liq.type} ×${liq.count}`, w-54, y-2);
    });
  }

  if (tog.sr) {
    smc.srLevels.forEach(sr => {
      const y = pY(sr.price); if (y===null) return;
      ctx.strokeStyle = sr.type==='support' ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)';
      ctx.lineWidth = 1 + Math.min(sr.strength-1, 2)*0.5;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
      ctx.font='8px sans-serif'; ctx.fillStyle=ctx.strokeStyle as string;
      ctx.fillText(`${sr.type==='support'?'S':'R'}${sr.strength>2?'★':''}`, 4, y-2);
    });
  }

  if (tog.sd) {
    smc.sdZones.forEach(sd => {
      const y0 = pY(sd.high); const y1 = pY(sd.low);
      if (y0===null||y1===null) return;
      const top = Math.min(y0,y1); const ht = Math.abs(y1-y0);
      ctx.fillStyle = sd.type==='supply' ? 'rgba(249,115,22,0.12)' : 'rgba(20,184,166,0.12)';
      ctx.fillRect(0, top, w, ht);
      ctx.strokeStyle = sd.type==='supply' ? 'rgba(249,115,22,0.5)' : 'rgba(20,184,166,0.5)';
      ctx.lineWidth=1; ctx.setLineDash([4,2]);
      ctx.strokeRect(0, top, w, ht);
      ctx.setLineDash([]);
      ctx.fillStyle = sd.type==='supply' ? 'rgba(249,115,22,0.9)' : 'rgba(20,184,166,0.9)';
      ctx.font='bold 8px sans-serif';
      ctx.fillText(sd.type==='supply'?'Supply':'Demand', 6, top+11);
    });
  }

  if (tog.pd && smc.pdZone) {
    const pd = smc.pdZone;
    const levels = [
      { p: pd.premium,     label:'Premium',     color:'rgba(239,83,80,0.6)' },
      { p: pd.equilibrium, label:'Equilibrium', color:'rgba(251,191,36,0.6)' },
      { p: pd.discount,    label:'Discount',    color:'rgba(38,166,154,0.6)' },
    ];
    levels.forEach(({ p, label, color }) => {
      const y = pY(p); if (y===null) return;
      ctx.strokeStyle = color; ctx.lineWidth=1; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font='8px sans-serif'; ctx.fillStyle=color;
      ctx.fillText(label, w-60, y-2);
    });
  }
}

// ── Drawing tool canvas functions ───────────────────────────────────────────
function renderDrawing(
  ctx: CanvasRenderingContext2D,
  d: ChartDrawing,
  chart: IChartApi,
  series: ISeriesApi<'Candlestick'>,
  w: number, h: number,
  alpha = 1,
) {
  const tX = (t: number) => chart.timeScale().timeToCoordinate(t as UTCTimestamp) ?? null;
  const pY = (p: number) => series.priceToCoordinate(p) ?? null;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = d.color; ctx.fillStyle = d.color;
  ctx.lineWidth = 1.5; ctx.setLineDash([]);

  if (d.type === 'hline') {
    const y = pY(d.pts[0].price); if (y===null) return;
    ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='9px sans-serif';
    ctx.fillText(d.pts[0].price.toFixed(5), w-70, y-3);
  } else if (d.type === 'vline') {
    const x = tX(d.pts[0].time); if (x===null) return;
    ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
    ctx.setLineDash([]);
  } else if (d.type === 'trend' || d.type === 'ray') {
    if (d.pts.length < 2) return;
    const x1=tX(d.pts[0].time); const y1=pY(d.pts[0].price);
    const x2=tX(d.pts[1].time); const y2=pY(d.pts[1].price);
    if (x1===null||y1===null||x2===null||y2===null) return;
    ctx.beginPath(); ctx.moveTo(x1,y1);
    if (d.type === 'ray') {
      const dx=x2-x1; const dy=y2-y1;
      const t = dx!==0 ? (w-x1)/dx : 9999;
      ctx.lineTo(x1+dx*t, y1+dy*t);
    } else { ctx.lineTo(x2,y2); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x1,y1,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x2,y2,3,0,Math.PI*2); ctx.fill();
  } else if (d.type === 'rect') {
    if (d.pts.length < 2) return;
    const x1=tX(d.pts[0].time); const y1=pY(d.pts[0].price);
    const x2=tX(d.pts[1].time); const y2=pY(d.pts[1].price);
    if (x1===null||y1===null||x2===null||y2===null) return;
    const rx=Math.min(x1,x2); const ry=Math.min(y1,y2);
    const rw=Math.abs(x2-x1); const rh=Math.abs(y2-y1);
    ctx.globalAlpha = alpha*0.12; ctx.fillRect(rx,ry,rw,rh);
    ctx.globalAlpha = alpha; ctx.strokeRect(rx,ry,rw,rh);
  } else if (d.type === 'fib') {
    if (d.pts.length < 2) return;
    const y1=pY(d.pts[0].price); const y2=pY(d.pts[1].price);
    if (y1===null||y2===null) return;
    const priceRange = d.pts[0].price - d.pts[1].price;
    FIB_LEVELS.forEach((lvl, i) => {
      const price = d.pts[1].price + priceRange*lvl;
      const y = pY(price); if (y===null) return;
      ctx.strokeStyle = FIB_COLORS[i]; ctx.globalAlpha = alpha*0.8;
      ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = FIB_COLORS[i]; ctx.font='8px sans-serif';
      ctx.fillText(`${(lvl*100).toFixed(1)}% ${price.toFixed(5)}`, 4, y-2);
    });
  }
  ctx.globalAlpha = 1;
}

// ── Props ───────────────────────────────────────────────────────────────────
interface Props {
  pair: PairConfig | undefined;
  candles: Candle[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  drawings?: DrawingTool[];
  setDrawings?: React.Dispatch<React.SetStateAction<DrawingTool[]>>;
  showSMC?: boolean;
  onClose?: () => void;
}

// Synthetic history cache — persists across ticks, only regenerated on TF/pair change
const syntheticCache = { key: '', bars: [] as Candle[] };

// ── Main component ──────────────────────────────────────────────────────────
export default function TradingViewChart({
  pair, candles, timeframe, onTimeframeChange, showSMC = false, onClose,
}: Props) {
  // Chart refs
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef   = useRef<HTMLCanvasElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volRef       = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indRef       = useRef<Map<string, ISeriesApi<SeriesType>[]>>(new Map());
  const volDataRef   = useRef<{ time: UTCTimestamp; value: number; color: string }[]>([]);
  const showVolRef   = useRef(true); // shadows showVol for use inside effects without dep

  // Indicator state
  const [activeOvl,  setActiveOvl]  = useState<Set<string>>(new Set<string>());
  const [activeSub,  setActiveSub]  = useState<string | null>(null);
  const [indOpen,    setIndOpen]    = useState(false);
  const [smcOpen,    setSmcOpen]    = useState(false);
  const [smcTog,     setSmcTog]     = useState<SmcToggles>({
    ob:false, fvg:false, bos:false, liq:false, sr:false, sd:false, pd:false,
  });

  // Volume visibility
  const [showVol, setShowVol] = useState(true);

  // Drawing tool state
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [myDrawings, setMyDrawings] = useState<ChartDrawing[]>([]);
  const [pendingPts, setPendingPts] = useState<{time:number;price:number}[]>([]);
  const [hoverPos,   setHoverPos]   = useState<{x:number;y:number}|null>(null);
  const [drawColor,  setDrawColor]  = useState('#facc15');

  // For smart indicator rebuild tracking
  const prevPairRef = useRef('');
  const prevTfRef   = useRef('');
  const prevLenRef  = useRef(0);

  // Timeframe aggregation — fall back to stable synthetic TF history when M1 seed is too sparse
  const tfMin     = useMemo(() => parseTimeframeToMinutes(timeframe), [timeframe]);
  const aggregated = useMemo(() => {
    const agg = aggregateCandles(candles, tfMin);
    if (agg.length >= 100 || tfMin <= 1 || !pair) return agg;

    const lastPrice = candles.length > 0 ? candles[candles.length - 1].c : pair.base;
    const cacheKey  = `${pair.sym}-${tfMin}`;

    // Regenerate ONLY when TF or pair changes — not every 500ms tick
    if (syntheticCache.key !== cacheKey) {
      syntheticCache.key  = cacheKey;
      syntheticCache.bars = generateTFHistory(lastPrice, pair.pip, 200, tfMin);
    }

    // Update last bar: stable TF-period boundary timestamp + live close price
    const msPerBar = tfMin * 60 * 1000;
    const periodT  = Math.floor(Date.now() / msPerBar) * msPerBar;
    const base     = syntheticCache.bars;
    const last     = { ...base[base.length - 1], t: periodT, c: lastPrice };
    last.h = Math.max(last.h, lastPrice);
    last.l = Math.min(last.l, lastPrice);
    return [...base.slice(0, -1), last];
  }, [candles, tfMin, pair]);

  // SMC data (last 200 bars)
  const anySmc = Object.values(smcTog).some(Boolean);
  const smcData = useMemo((): SMCData | null => {
    if (!anySmc || aggregated.length < 15) return null;
    return detectSMC(aggregated.slice(-200), Math.max(0, aggregated.length - 200));
  }, [aggregated, anySmc]);

  // ── Init chart once ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: TV_BG }, textColor: TV_TEXT, fontSize: 11 },
      grid: { vertLines: { color: TV_GRID }, horzLines: { color: TV_GRID } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#9598a1', width: 1, labelBackgroundColor: TV_BORDER },
        horzLine: { color: '#9598a1', width: 1, labelBackgroundColor: TV_BORDER },
      },
      rightPriceScale: { borderColor: TV_BORDER, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderColor: TV_BORDER, timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 8 },
      handleScroll: true, handleScale: true,
      width: el.clientWidth, height: el.clientHeight,
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: UP, downColor: DN, borderUpColor: UP, borderDownColor: DN, wickUpColor: UP, wickDownColor: DN,
    });
    const vs = chart.addSeries(HistogramSeries, { color: UP, priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });

    chartRef.current = chart; candleRef.current = cs; volRef.current = vs;

    const syncCanvas = () => {
      const ov = overlayRef.current; if (!ov) return;
      ov.width = el.clientWidth; ov.height = el.clientHeight;
    };
    const ro = new ResizeObserver(() => { chart.resize(el.clientWidth, el.clientHeight); syncCanvas(); });
    ro.observe(el); syncCanvas();
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      requestAnimationFrame(() => el.dispatchEvent(new CustomEvent('chart-redraw')));
    });
    return () => { ro.disconnect(); chart.remove(); chartRef.current=null; candleRef.current=null; volRef.current=null; };
  }, []);

  // ── Helper: add a line series to a pane ────────────────────────────────
  const addLine = useCallback((id: string, color: string, data: LWPt[], pane=0, title='', lw=1) => {
    const chart = chartRef.current; if (!chart || data.length===0) return;
    const s = chart.addSeries(LineSeries, { color, lineWidth: lw as 1|2|3|4, title, lastValueVisible: false, priceLineVisible: false }, pane);
    s.setData(data);
    indRef.current.set(id, [...(indRef.current.get(id)||[]), s]);
  }, []);

  const addHist = useCallback((id: string, data: {time:UTCTimestamp;value:number;color:string}[], pane=1) => {
    const chart = chartRef.current; if (!chart || data.length===0) return;
    const s = chart.addSeries(HistogramSeries, { priceFormat:{type:'price',precision:4,minMove:0.0001}, priceScaleId:'sub', lastValueVisible: false, priceLineVisible: false }, pane);
    s.setData(data);
    indRef.current.set(id, [...(indRef.current.get(id)||[]), s]);
  }, []);

  // ── Rebuild all indicators ─────────────────────────────────────────────
  const rebuildIndicators = useCallback(() => {
    const chart = chartRef.current; const agg = aggregated;
    if (!chart || agg.length === 0) return;

    // Remove old indicator series
    indRef.current.forEach(list => list.forEach(s => { try { chart.removeSeries(s); } catch {} }));
    indRef.current.clear();

    // ─── OVERLAY INDICATORS ──────────────────────────────────────────────
    if (activeOvl.has('ma20'))  addLine('ma20',  '#00d4ff', toLW(agg, calculateSMA(agg,20)));
    if (activeOvl.has('ma50'))  addLine('ma50',  '#ffc107', toLW(agg, calculateSMA(agg,50)));
    if (activeOvl.has('ma200')) addLine('ma200', '#ef4444', toLW(agg, calculateSMA(agg,200)));
    if (activeOvl.has('ema9'))  addLine('ema9',  '#ec4899', toLW(agg, calculateEMA(agg,9)));
    if (activeOvl.has('ema21')) addLine('ema21', '#a3e635', toLW(agg, calculateEMA(agg,21)));
    if (activeOvl.has('ema50')) addLine('ema50', '#f97316', toLW(agg, calculateEMA(agg,50)));
    if (activeOvl.has('ema200'))addLine('ema200','#dc2626', toLW(agg, calculateEMA(agg,200)));
    if (activeOvl.has('dema'))  addLine('dema',  '#06b6d4', toLW(agg, calculateDEMA(agg,21)));
    if (activeOvl.has('tema'))  addLine('tema',  '#8b5cf6', toLW(agg, calculateTEMA(agg,21)));
    if (activeOvl.has('hma'))   addLine('hma',   '#10b981', toLW(agg, calculateHMA(agg,20)));
    if (activeOvl.has('vwap'))  addLine('vwap',  '#818cf8', toLW(agg, calculateVWAP(agg)));
    if (activeOvl.has('lr'))    addLine('lr',    '#67e8f9', toLW(agg, calculateLRLine(agg,20)));
    if (activeOvl.has('sar'))   addLine('sar',   '#f59e0b', toLW(agg, calculateParabolicSAR(agg)));

    if (activeOvl.has('bb')) {
      const bb = calculateBollingerBands(agg,20,2);
      addLine('bb_u','#7c3aed', toLW(agg,bb.upper)); addLine('bb_m','#9b59b6', toLW(agg,bb.middle)); addLine('bb_l','#7c3aed', toLW(agg,bb.lower));
    }
    if (activeOvl.has('kc')) {
      const kc = calculateKeltnerChannel(agg,20,2);
      addLine('kc_u','#a855f7', toLW(agg,kc.upper)); addLine('kc_m','#c084fc', toLW(agg,kc.middle)); addLine('kc_l','#a855f7', toLW(agg,kc.lower));
    }
    if (activeOvl.has('dc')) {
      const dc = calculateDonchian(agg,20);
      addLine('dc_u','#60a5fa', toLW(agg,dc.upper)); addLine('dc_m','#93c5fd', toLW(agg,dc.mid)); addLine('dc_l','#60a5fa', toLW(agg,dc.lower));
    }
    if (activeOvl.has('st')) {
      const st = calculateSuperTrend(agg,10,3);
      const upPts = toLW(agg, st.value.map((v,i) => st.direction[i]===true ? v : null));
      const dnPts = toLW(agg, st.value.map((v,i) => st.direction[i]===false ? v : null));
      addLine('st_up','#26a69a', upPts); addLine('st_dn','#ef5350', dnPts);
    }
    if (activeOvl.has('ich')) {
      const ic = calculateIchimoku(agg);
      addLine('ich_t','#26a69a',  toLW(agg,ic.tenkan));
      addLine('ich_k','#ef5350',  toLW(agg,ic.kijun));
      addLine('ich_a','#2196f3',  toLW(agg,ic.senkouA));
      addLine('ich_b','#ff9800',  toLW(agg,ic.senkouB));
      addLine('ich_c','rgba(255,255,255,0.3)', toLW(agg,ic.chikou));
    }
    if (activeOvl.has('alg')) {
      const al = calculateAlligator(agg);
      addLine('alg_j','#2196f3', toLW(agg,al.jaw)); addLine('alg_t','#f44336', toLW(agg,al.teeth)); addLine('alg_l','#4caf50', toLW(agg,al.lips));
    }
    if (activeOvl.has('ce')) {
      const ce = calculateChandelierExit(agg,22,3);
      addLine('ce_l','#26a69a', toLW(agg,ce.longStop)); addLine('ce_s','#ef5350', toLW(agg,ce.shortStop));
    }
    if (activeOvl.has('atb')) {
      const ab = calculateATRBands(agg,14,2);
      addLine('atb_u','#c084fc', toLW(agg,ab.upper)); addLine('atb_m','#a855f7', toLW(agg,ab.mid)); addLine('atb_l','#c084fc', toLW(agg,ab.lower));
    }

    // Pivot Points — flat horizontal lines
    if (activeOvl.has('piv')) {
      const piv = calculatePivotPoints(agg);
      if (piv) {
        const pts: Record<string,{color:string;v:number}> = {
          R3:{color:'#ef5350',v:piv.r3}, R2:{color:'#ef9a9a',v:piv.r2}, R1:{color:'#ffcdd2',v:piv.r1},
          PP:{color:'#facc15',v:piv.pp},
          S1:{color:'#c8e6c9',v:piv.s1}, S2:{color:'#81c784',v:piv.s2}, S3:{color:'#26a69a',v:piv.s3},
        };
        Object.entries(pts).forEach(([lbl,{color,v}]) => addLine(`piv_${lbl}`, color, flatLine(agg,v), 0, lbl));
      }
    }

    // ─── SUBPANEL INDICATORS ─────────────────────────────────────────────
    if (!activeSub) return;

    const refLine = (val: number) => flatLine(agg, val);

    if (activeSub === 'rsi') {
      addLine('rsi', '#a855f7', toLW(agg, calculateRSI(agg,14)), 1, 'RSI');
      addLine('rsi_ob','rgba(239,83,80,0.35)', refLine(70), 1);
      addLine('rsi_os','rgba(38,166,154,0.35)', refLine(30), 1);
      addLine('rsi_mid','rgba(255,255,255,0.15)', refLine(50), 1);
    }
    if (activeSub === 'macd') {
      const m = calculateMACD(agg);
      addLine('macd_l', '#00d4ff', toLW(agg, m.macd), 1, 'MACD');
      addLine('macd_s', '#ef5350', toLW(agg, m.signal), 1, 'Signal');
      addHist('macd_h', toHist(agg, m.hist, v => v>=0 ? 'rgba(38,166,154,0.6)':'rgba(239,83,80,0.6)'));
    }
    if (activeSub === 'stoch') {
      const st = calculateStochastic(agg,14,3);
      addLine('stoch_k','#a3e635', toLW(agg,st.k), 1, '%K');
      addLine('stoch_d','#f97316', toLW(agg,st.d), 1, '%D');
      addLine('stoch_ob','rgba(239,83,80,0.3)', refLine(80), 1);
      addLine('stoch_os','rgba(38,166,154,0.3)', refLine(20), 1);
    }
    if (activeSub === 'cci') {
      addLine('cci', '#fbbf24', toLW(agg, calculateCCI(agg,20)), 1, 'CCI');
      addLine('cci_ob','rgba(239,83,80,0.35)', refLine(100), 1);
      addLine('cci_os','rgba(38,166,154,0.35)', refLine(-100), 1);
    }
    if (activeSub === 'willr') {
      addLine('willr','#c084fc', toLW(agg, calculateWilliamsR(agg,14)), 1, '%R');
      addLine('willr_ob','rgba(239,83,80,0.35)', refLine(-20), 1);
      addLine('willr_os','rgba(38,166,154,0.35)', refLine(-80), 1);
    }
    if (activeSub === 'adx') {
      const adx = calculateADX(agg,14);
      addLine('adx_adx','#f8fafc', toLW(agg,adx.adx), 1, 'ADX');
      addLine('adx_dip','#26a69a',  toLW(agg,adx.diPlus), 1, 'DI+');
      addLine('adx_dim','#ef5350',  toLW(agg,adx.diMinus), 1, 'DI-');
    }
    if (activeSub === 'obv')   addLine('obv',   '#38bdf8', toLW(agg, calculateOBV(agg)), 1, 'OBV');
    if (activeSub === 'mom')   addLine('mom',   '#22c55e', toLW(agg, calculateMomentum(agg,10)), 1, 'Mom');
    if (activeSub === 'srsi') {
      const sr = calculateStochRSI(agg);
      addLine('srsi_k','#fb923c', toLW(agg,sr.k), 1, 'K'); addLine('srsi_d','#facc15', toLW(agg,sr.d), 1, 'D');
    }
    if (activeSub === 'mfi') {
      addLine('mfi','#38bdf8', toLW(agg, calculateMFI(agg,14)), 1, 'MFI');
      addLine('mfi_ob','rgba(239,83,80,0.35)', refLine(80), 1);
      addLine('mfi_os','rgba(38,166,154,0.35)', refLine(20), 1);
    }
    if (activeSub === 'aroon') {
      const ar = calculateAroon(agg,25);
      addLine('aroon_u','#f472b6', toLW(agg,ar.aroonUp), 1, 'Up'); addLine('aroon_d','#818cf8', toLW(agg,ar.aroonDown), 1, 'Down');
    }
    if (activeSub === 'cmo')
      addHist('cmo', toHist(agg, calculateCMO(agg,14), v => v>=0?'rgba(38,166,154,0.7)':'rgba(239,83,80,0.7)'));
    if (activeSub === 'elder') {
      const er = calculateElderRay(agg,13);
      addHist('elder_b', toHist(agg, er.bullPower, v => v>=0?'rgba(38,166,154,0.7)':'rgba(239,83,80,0.4)'));
      addHist('elder_r', toHist(agg, er.bearPower, v => v>=0?'rgba(38,166,154,0.4)':'rgba(239,83,80,0.7)'));
    }
    if (activeSub === 'ppo') {
      const pp = calculatePPO(agg);
      addLine('ppo_l','#60a5fa', toLW(agg,pp.ppo), 1, 'PPO'); addLine('ppo_s','#ef5350', toLW(agg,pp.signal), 1, 'Signal');
      addHist('ppo_h', toHist(agg, pp.hist, v => v>=0?'rgba(38,166,154,0.6)':'rgba(239,83,80,0.6)'));
    }
  }, [aggregated, activeOvl, activeSub, addLine, addHist]);

  // ── Trigger indicator rebuild on data/active set change ─────────────────
  useEffect(() => {
    const chart = chartRef.current; const cs = candleRef.current; const vs = volRef.current;
    if (!chart || !cs || !vs || aggregated.length === 0) return;

    const pairChanged = pair?.sym !== prevPairRef.current;
    const tfChanged   = timeframe !== prevTfRef.current;
    const lenChanged  = aggregated.length !== prevLenRef.current;
    const needFull    = pairChanged || tfChanged || lenChanged;

    const agg = aggregated;
    const lwCandles = agg.map(c => ({ time: Math.floor(c.t/1000) as UTCTimestamp, open:c.o, high:c.h, low:c.l, close:c.c }));
    const lwVol     = agg.map(c => ({ time: Math.floor(c.t/1000) as UTCTimestamp, value:c.v, color:c.c>=c.o?'rgba(38,166,154,0.4)':'rgba(239,83,80,0.4)' }));

    if (needFull) {
      cs.setData(lwCandles);
      volDataRef.current = lwVol;
      vs.setData(showVolRef.current ? lwVol : []);
      rebuildIndicators();
      chart.timeScale().scrollToRealTime();
      chart.applyOptions({ watermark: { visible:true, fontSize:26, horzAlign:'left', vertAlign:'top', color:'rgba(255,255,255,0.05)', text:`${pair?.sym??''} · ${timeframe}` } } as Parameters<typeof chart.applyOptions>[0]);
      prevPairRef.current = pair?.sym ?? ''; prevTfRef.current = timeframe; prevLenRef.current = agg.length;
    } else {
      const last = agg[agg.length-1];
      const t = Math.floor(last.t/1000) as UTCTimestamp;
      const volPt = { time:t, value:last.v, color:last.c>=last.o?'rgba(38,166,154,0.4)':'rgba(239,83,80,0.4)' };
      cs.update({ time:t, open:last.o, high:last.h, low:last.l, close:last.c });
      if (volDataRef.current.length > 0) volDataRef.current[volDataRef.current.length-1] = volPt;
      if (showVolRef.current) vs.update(volPt);
    }
  }, [aggregated, pair?.sym, timeframe, rebuildIndicators]);

  // Rebuild when indicator selection changes
  useEffect(() => { rebuildIndicators(); }, [activeOvl, activeSub, rebuildIndicators]);

  // Volume visibility toggle — uses setData([]) / setData(full) instead of priceScale visibility
  useEffect(() => {
    showVolRef.current = showVol;
    const vs = volRef.current; if (!vs) return;
    if (showVol && volDataRef.current.length > 0) vs.setData(volDataRef.current);
    else vs.setData([]);
  }, [showVol]);

  // ── Canvas redraw ──────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = overlayRef.current; const chart = chartRef.current; const cs = candleRef.current;
    if (!canvas || !chart || !cs) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (anySmc && smcData && aggregated.length > 0) drawSMCOverlay(ctx, chart, cs, smcData, aggregated, smcTog, w, h);
    myDrawings.forEach(d => renderDrawing(ctx, d, chart, cs, w, h));
    if (pendingPts.length > 0 && hoverPos && activeTool) {
      const previewPts = [...pendingPts, { time: (chart.timeScale().coordinateToTime(hoverPos.x) as number) ?? 0, price: cs.coordinateToPrice(hoverPos.y) ?? 0 }];
      const preview: ChartDrawing = { id:'preview', type: activeTool as ChartDrawing['type'], color: drawColor, pts: previewPts };
      renderDrawing(ctx, preview, chart, cs, w, h, 0.6);
    }
  }, [anySmc, smcData, aggregated, smcTog, myDrawings, pendingPts, hoverPos, activeTool, drawColor]);

  useEffect(() => { requestAnimationFrame(redraw); }, [redraw]);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const handler = () => requestAnimationFrame(redraw);
    el.addEventListener('chart-redraw', handler);
    return () => el.removeEventListener('chart-redraw', handler);
  }, [redraw]);

  // Sync overlay canvas size on window resize
  useEffect(() => {
    const ov = overlayRef.current; const el = containerRef.current;
    if (!ov || !el) return;
    ov.width = el.clientWidth; ov.height = el.clientHeight;
  });

  // ── Canvas mouse handlers (drawing tools) ──────────────────────────────
  const needsClicks: Record<string,number> = { hline:1, vline:1, trend:2, ray:2, rect:2, fib:2 };

  const handleCanvasDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool || activeTool==='eraser') return;
    const chart = chartRef.current; const cs = candleRef.current; const canvas = overlayRef.current;
    if (!chart || !cs || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const rawTime = chart.timeScale().coordinateToTime(x);
    const price = cs.coordinateToPrice(y);
    if (rawTime === null || price === null) return;
    const pt = { time: rawTime as number, price };
    const newPts = [...pendingPts, pt];
    if (newPts.length >= (needsClicks[activeTool] ?? 2)) {
      setMyDrawings(prev => [...prev, { id:`d${Date.now()}`, type: activeTool as ChartDrawing['type'], color: drawColor, pts: newPts }]);
      setPendingPts([]);
    } else {
      setPendingPts(newPts);
    }
  }, [activeTool, pendingPts, drawColor]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTool) return;
    const canvas = overlayRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setHoverPos({ x: e.clientX-rect.left, y: e.clientY-rect.top });
  }, [activeTool]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'eraser') return;
    const chart = chartRef.current; const cs = candleRef.current; const canvas = overlayRef.current;
    if (!chart || !cs || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX-rect.left; const my = e.clientY-rect.top;
    setMyDrawings(prev => prev.filter(d => {
      if (d.pts.length === 0) return true;
      const tX = (t:number) => chart.timeScale().timeToCoordinate(t as UTCTimestamp) ?? 9999;
      const pY = (p:number) => cs.priceToCoordinate(p) ?? 9999;
      const dx = Math.abs(tX(d.pts[0].time) - mx);
      const dy = Math.abs(pY(d.pts[0].price) - my);
      return !(dx < 12 && dy < 12);
    }));
  }, [activeTool]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setActiveTool(null); setPendingPts([]); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleOverlay = (id: string) => setActiveOvl(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleTool = (tool: string) => { setActiveTool(prev => prev===tool ? null : tool); setPendingPts([]); };

  // ── Render ──────────────────────────────────────────────────────────────
  const DRAW_TOOLS = [
    { id:'hline', icon:'─', title:'Horizontal Line' },
    { id:'vline', icon:'│', title:'Vertical Line' },
    { id:'trend', icon:'╱', title:'Trend Line' },
    { id:'ray',   icon:'→', title:'Ray' },
    { id:'rect',  icon:'□', title:'Rectangle' },
    { id:'fib',   icon:'φ', title:'Fibonacci Retracement' },
    { id:'eraser',icon:'✕', title:'Delete Drawing (click near start point)' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#131722] select-none" style={{ fontFamily: 'Roboto,sans-serif' }}>

      {/* ── TOOLBAR ROW 1: Symbol + TF + Panels ── */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#1e222d] border-b border-[#2a2e39] flex-shrink-0 flex-wrap relative z-20">
        <span className="text-[#d1d4dc] text-xs font-bold mr-1 shrink-0">{pair?.label ?? '—'}</span>

        {/* TF */}
        <div className="flex items-center gap-0.5 mr-2">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${timeframe===tf ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'}`}>
              {tf}
            </button>
          ))}
        </div>

        {/* Volume toggle */}
        <button
          onClick={() => setShowVol(v => !v)}
          className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${showVol ? 'bg-[#26a69a]/20 border-[#26a69a] text-[#26a69a]' : 'border-[#363a45] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'}`}>
          Vol
        </button>

        {/* Indicators button */}
        <div className="relative">
          <button onClick={() => { setIndOpen(v=>!v); setSmcOpen(false); }}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${indOpen||activeOvl.size>0||activeSub ? 'bg-[#2962ff]/20 border-[#2962ff] text-[#2962ff]' : 'border-[#363a45] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'}`}>
            📊 Indicators {activeOvl.size > 0 ? `(${activeOvl.size})` : ''} {activeSub ? '+1' : ''}
          </button>
          {/* Indicator Panel */}
          {indOpen && (
            <div className="absolute left-0 top-full mt-1 w-72 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#2a2e39] flex items-center justify-between">
                <span className="text-xs font-bold text-[#d1d4dc]">Indicators</span>
                <button onClick={() => setIndOpen(false)} className="text-[#555] hover:text-white text-xs">✕</button>
              </div>
              <div className="overflow-y-auto max-h-72">
                {/* Overlay indicators */}
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[9px] font-bold text-[#555] uppercase tracking-wider mb-1">Overlay</p>
                  <div className="flex flex-wrap gap-1">
                    {OVERLAY_INDS.map(ind => (
                      <button key={ind.id} onClick={() => toggleOverlay(ind.id)}
                        style={{ borderColor: activeOvl.has(ind.id) ? ind.color : '#363a45', color: activeOvl.has(ind.id) ? ind.color : '#787b86', backgroundColor: activeOvl.has(ind.id) ? ind.color+'22' : 'transparent' }}
                        className="px-1.5 py-0.5 text-[9px] font-semibold rounded border transition-all hover:opacity-90">
                        {ind.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Sub-panel indicators */}
                <div className="px-3 pt-2 pb-3">
                  <p className="text-[9px] font-bold text-[#555] uppercase tracking-wider mb-1">Sub-Panel (one at a time)</p>
                  <div className="flex flex-wrap gap-1">
                    {SUB_INDS.map(ind => (
                      <button key={ind.id} onClick={() => setActiveSub(prev => prev===ind.id ? null : ind.id)}
                        style={{ borderColor: activeSub===ind.id ? ind.color : '#363a45', color: activeSub===ind.id ? ind.color : '#787b86', backgroundColor: activeSub===ind.id ? ind.color+'22' : 'transparent' }}
                        className="px-1.5 py-0.5 text-[9px] font-semibold rounded border transition-all hover:opacity-90">
                        {ind.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {(activeOvl.size > 0 || activeSub) && (
                <div className="px-3 py-2 border-t border-[#2a2e39]">
                  <button onClick={() => { setActiveOvl(new Set()); setActiveSub(null); }}
                    className="text-[9px] text-red-400 hover:text-red-300 transition-colors">
                    ✕ Clear all indicators
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SMC button */}
        <div className="relative">
          <button onClick={() => { setSmcOpen(v=>!v); setIndOpen(false); }}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${smcOpen||anySmc ? 'bg-[#a855f7]/20 border-[#a855f7] text-[#a855f7]' : 'border-[#363a45] text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'}`}>
            🔮 SMC {anySmc ? `(${Object.values(smcTog).filter(Boolean).length})` : ''}
          </button>
          {smcOpen && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#2a2e39] flex items-center justify-between">
                <span className="text-xs font-bold text-[#d1d4dc]">Smart Money Concepts</span>
                <button onClick={() => setSmcOpen(false)} className="text-[#555] hover:text-white text-xs">✕</button>
              </div>
              <div className="py-1">
                {SMC_OPTS.map(opt => (
                  <button key={opt.id} onClick={() => setSmcTog(prev => ({ ...prev, [opt.id]: !prev[opt.id as keyof SmcToggles] }))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2e39] transition-colors">
                    <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold transition-colors"
                      style={{ backgroundColor: smcTog[opt.id as keyof SmcToggles] ? opt.color : 'transparent', border: `1px solid ${opt.color}`, color: smcTog[opt.id as keyof SmcToggles] ? '#000' : opt.color }}>
                      {smcTog[opt.id as keyof SmcToggles] ? '✓' : ''}
                    </span>
                    <span className="text-[10px] text-[#d1d4dc]">{opt.label}</span>
                  </button>
                ))}
              </div>
              {anySmc && (
                <div className="px-3 py-2 border-t border-[#2a2e39]">
                  <button onClick={() => setSmcTog({ ob:false,fvg:false,bos:false,liq:false,sr:false,sd:false,pd:false })}
                    className="text-[9px] text-red-400 hover:text-red-300">✕ Clear all</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1" />
        <button onClick={() => chartRef.current?.timeScale().fitContent()} title="Fit" className="text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] px-1.5 py-0.5 rounded text-[10px] font-mono">⤢</button>
        {onClose && <button onClick={onClose} className="text-[#787b86] hover:text-[#ef5350] hover:bg-[#2a2e39] px-1.5 py-0.5 rounded text-xs">✕</button>}
      </div>

      {/* ── TOOLBAR ROW 2: Drawing Tools ── */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#161b27] border-b border-[#2a2e39] flex-shrink-0">
        <span className="text-[9px] text-[#555] mr-1 shrink-0">Draw:</span>
        {DRAW_TOOLS.map(t => (
          <button key={t.id} title={t.title} onClick={() => toggleTool(t.id)}
            className={`w-6 h-6 flex items-center justify-center text-[11px] rounded transition-colors ${activeTool===t.id ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'}`}>
            {t.icon}
          </button>
        ))}
        {myDrawings.length > 0 && (
          <button title="Clear all drawings" onClick={() => { setMyDrawings([]); setPendingPts([]); }}
            className="ml-1 px-1.5 py-0.5 text-[9px] text-red-400 hover:text-red-300 hover:bg-[#2a2e39] rounded transition-colors">
            Clear drawings
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[9px] text-[#555]">Color:</span>
          <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0" />
        </div>
        {activeTool && activeTool !== 'eraser' && (
          <span className="text-[9px] text-[#2962ff] ml-1 animate-pulse">
            {pendingPts.length === 0 ? 'Click to place first point' : 'Click to place second point'}
          </span>
        )}
      </div>

      {/* ── CHART + CANVAS ── */}
      <div className="flex-1 min-h-0 w-full relative" onClick={() => { if (indOpen) setIndOpen(false); if (smcOpen) setSmcOpen(false); }}>
        <div ref={containerRef} className="absolute inset-0" />
        <canvas
          ref={overlayRef}
          className="absolute inset-0"
          style={{ zIndex: 10, pointerEvents: activeTool ? 'auto' : 'none', cursor: activeTool ? 'crosshair' : 'default' }}
          onMouseDown={handleCanvasDown}
          onMouseMove={handleCanvasMove}
          onClick={handleCanvasClick}
        />
      </div>
    </div>
  );
}
