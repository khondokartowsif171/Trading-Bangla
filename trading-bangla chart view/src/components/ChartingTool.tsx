/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Candle,
  ChartType,
  DrawingTool,
  PairConfig,
  IndicatorDef,
} from '../types';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  calculateSuperTrend,
  calculateVWAP,
  calculateCCI,
  calculateStochastic,
  calculateParabolicSAR,
  calculateADX,
  calculateWilliamsR,
  calculatePivotPoints,
  calculateKeltnerChannel,
  calculateOBV,
  calculateMomentum,
  calculateAO,
  convertToHeikinAshi,
  parseTimeframeToMinutes,
} from '../utils/forexMath';
import {
  calculateDEMA, calculateTEMA, calculateHMA, calculateSMMA, calculateZLEMA,
  calculateMcGinley, calculateLRLine, calculateLRChannel, calculateDonchian,
  calculateIchimoku, calculateAlligator, calculateChandelierExit, calculateATRBands,
  calculateFractal, calculateVEMA, calculateStochRSI, calculateMFI, calculateCMF,
  calculateAroon, calculateCMO, calculatePPO, calculateBBPctB, calculateBBWidth,
  calculateVortex, calculateElderRay, calculateNormRSI, calculateKST, calculateQQE,
  calculateADLine, calculateForceIndex, calculateVolumeRSI, calculateHV,
  calculateATRPct, calculateUlcerIndex,
} from '../utils/forexIndicators';
import { detectSMC } from '../utils/forexSMC';
import { detectCandlePatterns } from '../utils/forexCandlePatterns';

// Pure deterministic pseudo-random number generator for consistent historical charts
function seededRandom(seedValue: number): number {
  const x = Math.sin(seedValue) * 10000;
  return x - Math.floor(x);
}

import {
  TrendingUp,
  LineChart,
  Eye,
  EyeOff,
  Trash2,
  Maximize2,
  MousePointer,
  Sparkles,
  Pin,
  Activity,
  Lock,
  Square,
  Percent,
  Minus,
  ChevronsUpDown,
  Palette,
  Layers,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  ArrowRight,
  ArrowUpDown,
  TrendingDown,
  GitMerge,
} from 'lucide-react';

// Sub-panel layout constants
const SUB_PANEL_H = 65;
const SUB_PANEL_GAP = 14;

// Ordered list of all possible sub-panels
const SUB_PANELS_ORDER = [
  'rsi','macd','cci','stoch','adx','willr','obv','mom','ao',
  'stochrsi','mfi','cmf','aroon','cmo','ppo','bbpctb','bbwidth',
  'vortex','elderray','normrsi','kst','qqe',
  'adline','forceindex','volumersi','hv','atrpct','ulcerindex',
];

const INDICATOR_REGISTRY: IndicatorDef[] = [
  // Trend / Overlay
  { id:'ma20', label:'MA 20', category:'trend', renderType:'overlay', defaultParams:{period:20}, color:'#00d4ff' },
  { id:'ma50', label:'MA 50', category:'trend', renderType:'overlay', defaultParams:{period:50}, color:'#ffc107' },
  { id:'ema9', label:'EMA 9', category:'trend', renderType:'overlay', defaultParams:{period:9}, color:'#ec4899' },
  { id:'ema21', label:'EMA 21', category:'trend', renderType:'overlay', defaultParams:{period:21}, color:'#a3e635' },
  { id:'ema50', label:'EMA 50', category:'trend', renderType:'overlay', defaultParams:{period:50}, color:'#f97316' },
  { id:'ema200', label:'EMA 200', category:'trend', renderType:'overlay', defaultParams:{period:200}, color:'#ef4444' },
  { id:'dema', label:'DEMA 21', category:'trend', renderType:'overlay', defaultParams:{period:21}, color:'#06b6d4' },
  { id:'tema', label:'TEMA 21', category:'trend', renderType:'overlay', defaultParams:{period:21}, color:'#8b5cf6' },
  { id:'hma', label:'HMA 20', category:'trend', renderType:'overlay', defaultParams:{period:20}, color:'#10b981' },
  { id:'smma', label:'SMMA 14', category:'trend', renderType:'overlay', defaultParams:{period:14}, color:'#f59e0b' },
  { id:'zlema', label:'ZLEMA 21', category:'trend', renderType:'overlay', defaultParams:{period:21}, color:'#84cc16' },
  { id:'mcginley', label:'McGinley 14', category:'trend', renderType:'overlay', defaultParams:{period:14}, color:'#e879f9' },
  { id:'lrline', label:'LR Line 20', category:'trend', renderType:'overlay', defaultParams:{period:20}, color:'#67e8f9' },
  { id:'lrchannel', label:'LR Channel 20', category:'trend', renderType:'overlay', defaultParams:{period:20}, color:'#67e8f9' },
  { id:'donchian', label:'Donchian 20', category:'trend', renderType:'overlay', defaultParams:{period:20}, color:'#60a5fa' },
  { id:'ichimoku', label:'Ichimoku', category:'trend', renderType:'overlay', defaultParams:{}, color:'#fbbf24' },
  { id:'alligator', label:'Alligator', category:'trend', renderType:'overlay', defaultParams:{}, color:'#f87171' },
  { id:'chandelier', label:'Chandelier Exit', category:'trend', renderType:'overlay', defaultParams:{period:22,mult:3}, color:'#34d399' },
  { id:'atrbands', label:'ATR Bands', category:'trend', renderType:'overlay', defaultParams:{period:14,mult:2}, color:'#a78bfa' },
  { id:'fractal', label:'Fractals', category:'trend', renderType:'overlay', defaultParams:{}, color:'#fbbf24' },
  { id:'vema', label:'Vol EMA 20', category:'trend', renderType:'overlay', defaultParams:{period:20}, color:'#6ee7b7' },
  { id:'supertrend', label:'SuperTrend', category:'trend', renderType:'overlay', defaultParams:{period:10,mult:3}, color:'#00e676' },
  { id:'vwap', label:'VWAP', category:'trend', renderType:'overlay', defaultParams:{}, color:'#818cf8' },
  { id:'bb', label:'Bollinger Bands', category:'trend', renderType:'overlay', defaultParams:{period:20,stddev:2}, color:'#7c3aed' },
  { id:'keltner', label:'Keltner Channel', category:'trend', renderType:'overlay', defaultParams:{period:20,mult:2}, color:'#a855f7' },
  { id:'pivots', label:'Pivot Points', category:'trend', renderType:'overlay', defaultParams:{}, color:'#e2e8f0' },
  { id:'sar', label:'Parabolic SAR', category:'trend', renderType:'overlay', defaultParams:{step:0.02,max:0.2}, color:'#f59e0b' },
  // Oscillators
  { id:'rsi', label:'RSI 14', category:'oscillator', renderType:'subpanel', defaultParams:{period:14}, color:'#a855f7' },
  { id:'macd', label:'MACD (12,26,9)', category:'oscillator', renderType:'subpanel', defaultParams:{fast:12,slow:26,signal:9}, color:'#00d4ff' },
  { id:'cci', label:'CCI 20', category:'oscillator', renderType:'subpanel', defaultParams:{period:20}, color:'#fbbf24' },
  { id:'stoch', label:'Stochastic (14,3)', category:'oscillator', renderType:'subpanel', defaultParams:{period:14,smooth:3}, color:'#a3e635' },
  { id:'adx', label:'ADX 14', category:'oscillator', renderType:'subpanel', defaultParams:{period:14}, color:'#f8fafc' },
  { id:'willr', label:'Williams %R 14', category:'oscillator', renderType:'subpanel', defaultParams:{period:14}, color:'#c084fc' },
  { id:'mom', label:'Momentum 10', category:'oscillator', renderType:'subpanel', defaultParams:{period:10}, color:'#22c55e' },
  { id:'ao', label:'Awesome Osc', category:'oscillator', renderType:'subpanel', defaultParams:{}, color:'#22c55e' },
  { id:'stochrsi', label:'StochRSI', category:'oscillator', renderType:'subpanel', defaultParams:{rsiPeriod:14,stochPeriod:14}, color:'#fb923c' },
  { id:'mfi', label:'MFI 14', category:'oscillator', renderType:'subpanel', defaultParams:{period:14}, color:'#38bdf8' },
  { id:'cmf', label:'CMF 20', category:'oscillator', renderType:'subpanel', defaultParams:{period:20}, color:'#4ade80' },
  { id:'aroon', label:'Aroon 25', category:'oscillator', renderType:'subpanel', defaultParams:{period:25}, color:'#f472b6' },
  { id:'cmo', label:'CMO 14', category:'oscillator', renderType:'subpanel', defaultParams:{period:14}, color:'#fb7185' },
  { id:'ppo', label:'PPO (12,26)', category:'oscillator', renderType:'subpanel', defaultParams:{fast:12,slow:26}, color:'#60a5fa' },
  { id:'bbpctb', label:'BB %B', category:'oscillator', renderType:'subpanel', defaultParams:{period:20}, color:'#a78bfa' },
  { id:'bbwidth', label:'BB Width', category:'oscillator', renderType:'subpanel', defaultParams:{period:20}, color:'#6ee7b7' },
  { id:'vortex', label:'Vortex 14', category:'oscillator', renderType:'subpanel', defaultParams:{period:14}, color:'#f87171' },
  { id:'elderray', label:'Elder Ray 13', category:'oscillator', renderType:'subpanel', defaultParams:{period:13}, color:'#4ade80' },
  { id:'normrsi', label:'Norm RSI 14', category:'oscillator', renderType:'subpanel', defaultParams:{period:14}, color:'#c084fc' },
  { id:'kst', label:'KST', category:'oscillator', renderType:'subpanel', defaultParams:{}, color:'#fbbf24' },
  { id:'qqe', label:'QQE', category:'oscillator', renderType:'subpanel', defaultParams:{rsiPeriod:14}, color:'#34d399' },
  // Volume
  { id:'vol', label:'Volume', category:'volume', renderType:'overlay', defaultParams:{}, color:'#00e676' },
  { id:'obv', label:'OBV', category:'volume', renderType:'subpanel', defaultParams:{}, color:'#38bdf8' },
  { id:'adline', label:'A/D Line', category:'volume', renderType:'subpanel', defaultParams:{}, color:'#34d399' },
  { id:'forceindex', label:'Force Index 13', category:'volume', renderType:'subpanel', defaultParams:{period:13}, color:'#fb923c' },
  { id:'volumersi', label:'Volume RSI 14', category:'volume', renderType:'subpanel', defaultParams:{period:14}, color:'#a78bfa' },
  // Volatility
  { id:'hv', label:'Hist Volatility 20', category:'volatility', renderType:'subpanel', defaultParams:{period:20}, color:'#f97316' },
  { id:'atrpct', label:'ATR % 14', category:'volatility', renderType:'subpanel', defaultParams:{period:14}, color:'#e879f9' },
  { id:'ulcerindex', label:'Ulcer Index 14', category:'volatility', renderType:'subpanel', defaultParams:{period:14}, color:'#fb7185' },
  // SMC / Patterns
  { id:'smc',       label:'SMC Suite (All)',          category:'smc', renderType:'overlay', defaultParams:{}, color:'#00e676' },
  { id:'fvg',       label:'Fair Value Gap (FVG)',      category:'smc', renderType:'overlay', defaultParams:{}, color:'#00e676' },
  { id:'ob',        label:'Order Blocks (OB)',          category:'smc', renderType:'overlay', defaultParams:{}, color:'#f97316' },
  { id:'bos',       label:'BOS / CHoCH Structure',     category:'smc', renderType:'overlay', defaultParams:{}, color:'#00d4ff' },
  { id:'liquidity', label:'Liquidity Pools (EQH/EQL)', category:'smc', renderType:'overlay', defaultParams:{}, color:'#fbbf24' },
  { id:'pdzone',    label:'Premium / Discount Zone',   category:'smc', renderType:'overlay', defaultParams:{}, color:'#a855f7' },
  { id:'sr',        label:'Support & Resistance',      category:'smc', renderType:'overlay', defaultParams:{}, color:'#34d399' },
  { id:'sd',        label:'Supply & Demand Zones',     category:'smc', renderType:'overlay', defaultParams:{}, color:'#f97316' },
  { id:'patterns',  label:'Candle Patterns',            category:'smc', renderType:'overlay', defaultParams:{}, color:'#fbbf24' },
];

const IND_CATEGORIES = [
  { id:'trend' as const, label:'TREND / OVERLAY' },
  { id:'oscillator' as const, label:'OSCILLATORS' },
  { id:'volume' as const, label:'VOLUME' },
  { id:'volatility' as const, label:'VOLATILITY' },
  { id:'smc' as const, label:'SMC / PATTERNS' },
];

interface ChartingToolProps {
  pair: PairConfig;
  candles: Candle[];
  timeframe: string;
  onTimeframeChange?: (tf: string) => void;
  drawings: DrawingTool[];
  setDrawings: React.Dispatch<React.SetStateAction<DrawingTool[]>>;
  showSMC: boolean; // Smart Money Concepts toggle
  onClose?: () => void;
}

export default function ChartingTool({
  pair,
  candles,
  timeframe,
  onTimeframeChange,
  drawings,
  setDrawings,
  showSMC,
  onClose,
}: ChartingToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Chart visual settings
  const [chartType, setChartType] = useState<ChartType>('candle');

  // Set-based indicator state — single source of truth for all 100+ indicators
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(
    () => new Set(['ma20','ma50','vol','patterns'])
  );

  // Indicator panel state
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(['trend','oscillator','volume','volatility','smc'])
  );

  // Favorites — persisted to localStorage
  const [favoriteIndicators, setFavoriteIndicators] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('tb_fav_indicators');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });
  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIndicators(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem('tb_fav_indicators', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const toggleIndicator = useCallback((id: string) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (id === 'smc') {
        const smcChildren = ['fvg', 'ob', 'bos', 'liquidity', 'pdzone'];
        if (next.has('smc')) {
          next.delete('smc');
          smcChildren.forEach(c => next.delete(c));
        } else {
          next.add('smc');
          smcChildren.forEach(c => next.add(c));
        }
      } else {
        next.has(id) ? next.delete(id) : next.add(id);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Derived booleans from Set (backward compat with render code)
  const showMA20 = activeIndicators.has('ma20');
  const showMA50 = activeIndicators.has('ma50');
  const showEMA9 = activeIndicators.has('ema9');
  const showEMA21 = activeIndicators.has('ema21');
  const showEMA50 = activeIndicators.has('ema50');
  const showEMA200 = activeIndicators.has('ema200');
  const showBB = activeIndicators.has('bb');
  const showRSI = activeIndicators.has('rsi');
  const showMACD = activeIndicators.has('macd');
  const showVol = activeIndicators.has('vol');
  const showSuperTrend = activeIndicators.has('supertrend');
  const showVWAP = activeIndicators.has('vwap');
  const showCCI = activeIndicators.has('cci');
  const showPatterns = activeIndicators.has('patterns');
  const showStoch = activeIndicators.has('stoch');
  const showParabolicSAR = activeIndicators.has('sar');
  const showADX = activeIndicators.has('adx');
  const showWilliamsR = activeIndicators.has('willr');
  const showKeltner = activeIndicators.has('keltner');
  const showPivots = activeIndicators.has('pivots');
  const showOBV = activeIndicators.has('obv');
  const showMomentum = activeIndicators.has('mom');
  const showAO = activeIndicators.has('ao');
  // New overlay indicators
  const showDEMA = activeIndicators.has('dema');
  const showTEMA = activeIndicators.has('tema');
  const showHMA = activeIndicators.has('hma');
  const showSMMA = activeIndicators.has('smma');
  const showZLEMA = activeIndicators.has('zlema');
  const showMcGinley = activeIndicators.has('mcginley');
  const showLRLine = activeIndicators.has('lrline');
  const showLRChannel = activeIndicators.has('lrchannel');
  const showDonchian = activeIndicators.has('donchian');
  const showIchimoku = activeIndicators.has('ichimoku');
  const showAlligator = activeIndicators.has('alligator');
  const showChandelier = activeIndicators.has('chandelier');
  const showATRBands = activeIndicators.has('atrbands');
  const showFractal = activeIndicators.has('fractal');
  const showVEMA = activeIndicators.has('vema');
  // New sub-panel indicators
  const showStochRSI = activeIndicators.has('stochrsi');
  const showMFI = activeIndicators.has('mfi');
  const showCMF = activeIndicators.has('cmf');
  const showAroon = activeIndicators.has('aroon');
  const showCMO = activeIndicators.has('cmo');
  const showPPO = activeIndicators.has('ppo');
  const showBBPctB = activeIndicators.has('bbpctb');
  const showBBWidth = activeIndicators.has('bbwidth');
  const showVortex = activeIndicators.has('vortex');
  const showElderRay = activeIndicators.has('elderray');
  const showNormRSI = activeIndicators.has('normrsi');
  const showKST = activeIndicators.has('kst');
  const showQQE = activeIndicators.has('qqe');
  const showADLine = activeIndicators.has('adline');
  const showForceIndex = activeIndicators.has('forceindex');
  const showVolumeRSI = activeIndicators.has('volumersi');
  const showHV = activeIndicators.has('hv');
  const showATRPct = activeIndicators.has('atrpct');
  const showUlcerIndex = activeIndicators.has('ulcerindex');

  // Individual SMC sub-indicator booleans (backward compat: showSMC prop still enables all)
  const showFVG       = activeIndicators.has('fvg')       || showSMC || activeIndicators.has('smc');
  const showOB        = activeIndicators.has('ob')         || showSMC || activeIndicators.has('smc');
  const showBOS       = activeIndicators.has('bos')        || showSMC || activeIndicators.has('smc');
  const showLiquidity = activeIndicators.has('liquidity')  || activeIndicators.has('smc');
  const showPDZone    = activeIndicators.has('pdzone')     || activeIndicators.has('smc');
  const showSR        = activeIndicators.has('sr');
  const showSD        = activeIndicators.has('sd');

  // Stable key for useEffect dependencies
  const activeIndicatorsKey = useMemo(() => [...activeIndicators].sort().join(','), [activeIndicators]);

  // Scrolling & zooming states
  const [candleW, setCandleW] = useState(10); // scale width of 1 candle in px
  const [offset, setOffset] = useState(0);    // count of candles scrolled right from newest
  const [customTFInput, setCustomTFInput] = useState('');
  const [force100, setForce100] = useState(true); // 100 real-time candles lock state

  // Interactive drawing state
  const [drawingType, setDrawingType] = useState<'none' | DrawingTool['type']>('none');
  const [drawProgress, setDrawProgress] = useState<{ index: number; price: number } | null>(null);

  // Mouse hover tracking for crosshair
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const dragStartRef = useRef<{ clientX: number; offset: number } | null>(null);

  // Frozen history cache — regenerated only on pair/TF change, NOT on every tick
  interface HistoryCache {
    sym: string;
    tf: string;
    path: Candle[];
  }
  const historyCache = useRef<HistoryCache | null>(null);

  // Touch panning/zooming gesture refs
  const touchStartRef = useRef<{
    clientX: number;
    offset: number;
    pinchDistance: number | null;
    pinchCandleW: number;
    centerX: number;
  } | null>(null);

  // Resize boundaries — simplified: all sub-panels same height
  const [charLayout, setCharLayout] = useState({
    W: 800, H: 450, priceW: 78, timeH: 24, chartH: 300,
  });

  // Calculate coordinates and ranges based on container sizes
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height - 48;
      const priceW = 78;
      const timeH = 24;
      const activeSubCount = SUB_PANELS_ORDER.filter(id => activeIndicators.has(id)).length;
      const totalSubH = activeSubCount * (SUB_PANEL_H + SUB_PANEL_GAP);
      const chartH = Math.max(120, H - timeH - totalSubH - 10);
      setCharLayout({ W, H, priceW, timeH, chartH });
    };
    handleResize();
    const obs = new ResizeObserver(handleResize);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [activeIndicatorsKey]);

  // Adjust canvas sizes
  useEffect(() => {
    const mainC = mainCanvasRef.current;
    const overC = overlayCanvasRef.current;
    if (!mainC || !overC) return;
    mainC.width = overC.width = charLayout.W;
    mainC.height = overC.height = charLayout.H;
  }, [charLayout]);

  // Dynamic Auto-scaling to scale exactly the last 100 candles inside viewport
  useEffect(() => {
    if (force100 && charLayout.W) {
      const targetW = Math.max(2.5, (charLayout.W - charLayout.priceW) / 100 - 2);
      setCandleW(targetW);
      setOffset(0); // Lock view on newly incoming candle ticks
    }
  }, [force100, charLayout.W, charLayout.priceW, candles.length]);

  // Transform raw 1-minute candles according to the selected timeframe, generating consistent deterministic history of up to 10 years back
  const aggregatedCandles = useMemo(() => {
    if (candles.length === 0) return [];

    const T = parseTimeframeToMinutes(timeframe);
    const intervalMs = T * 60 * 1000;
    const liveCandle = candles[candles.length - 1];
    const pip = pair.pip;
    const dec = pair.dec;

    // Compute current period boundary early (needed for needsRegen check)
    const nowRounded = Math.floor(liveCandle.t / intervalMs) * intervalMs;

    // Regenerate frozen history when: pair/TF changes, OR >50 periods elapsed (user was away)
    const needsRegen =
      !historyCache.current ||
      historyCache.current.sym !== pair.sym ||
      historyCache.current.tf !== timeframe ||
      (nowRounded - historyCache.current.path[historyCache.current.path.length - 1].t) / intervalMs > 50;

    if (needsRegen) {
      const anchorPrice = liveCandle.c;
      const nowRoundedAnchor = nowRounded;

      const tenYearsMinutes = 10 * 365 * 24 * 60;
      const rawCount = Math.floor(tenYearsMinutes / T);
      const count = Math.max(120, Math.min(500, rawCount));

      const genPath: Candle[] = [];

      let charSeed = 0;
      for (let c = 0; c < pair.sym.length; c++) {
        charSeed += pair.sym.charCodeAt(c) * (c + 1);
      }

      const tfScale = Math.sqrt(T);
      let lastClose = anchorPrice;

      for (let i = 0; i < count; i++) {
        const candleTime = nowRoundedAnchor - i * intervalMs;
        const idxSeed = charSeed + i * 37;
        const isUp = seededRandom(idxSeed) > 0.495;
        const bodyMultiplier = seededRandom(idxSeed + 1) * 6.5 + 1.2;
        const wickMultiplier = seededRandom(idxSeed + 2) * 5.0 + 0.5;
        const bodySize = bodyMultiplier * pip * tfScale;
        const wickSize = wickMultiplier * pip * tfScale;
        const c = lastClose;
        const o = isUp ? lastClose - bodySize : lastClose + bodySize;
        const h = Math.max(o, c) + wickSize;
        const l = Math.min(o, c) - wickSize;
        const v = Math.floor(seededRandom(idxSeed + 3) * 1600 + 150);
        genPath.push({
          t: candleTime,
          o: Number(o.toFixed(dec)),
          h: Number(h.toFixed(dec)),
          l: Number(l.toFixed(dec)),
          c: Number(c.toFixed(dec)),
          v,
        });
        lastClose = o;
      }

      genPath.reverse();
      historyCache.current = { sym: pair.sym, tf: timeframe, path: genPath };
    }

    const cache = historyCache.current!;

    // Period rollover: seal old forming candle, append new forming period
    const cachedLastTime = cache.path[cache.path.length - 1].t;
    if (nowRounded > cachedLastTime) {
      // Old forming candle at cache.path[last] already has running H/L from in-place updates
      cache.path.shift();  // drop oldest historical candle (keep array at fixed size)
      const newOpen = Number(cache.path[cache.path.length - 1].c.toFixed(dec));
      cache.path.push({
        t: nowRounded,
        o: newOpen,
        h: Number(Math.max(newOpen, liveCandle.h).toFixed(dec)),
        l: Number(Math.min(newOpen, liveCandle.l).toFixed(dec)),
        c: Number(liveCandle.c.toFixed(dec)),
        v: liveCandle.v,
      });
    }

    // Update forming candle IN-PLACE with running H/L on every tick
    const lastInCache = cache.path[cache.path.length - 1];
    const formingOpen = Number((cache.path.length > 1
      ? cache.path[cache.path.length - 2].c
      : liveCandle.c).toFixed(dec));

    // Accumulate running max/min since period start; reset if somehow period doesn't match
    const prevH = lastInCache.t === nowRounded ? lastInCache.h : formingOpen;
    const prevL = lastInCache.t === nowRounded ? lastInCache.l : formingOpen;

    cache.path[cache.path.length - 1] = {
      t: nowRounded,
      o: formingOpen,
      h: Number(Math.max(prevH, liveCandle.h, liveCandle.c).toFixed(dec)),
      l: Number(Math.min(prevL, liveCandle.l, liveCandle.c).toFixed(dec)),
      c: Number(liveCandle.c.toFixed(dec)),
      v: liveCandle.v,
    };

    return [...cache.path];  // new array reference so React re-renders
  }, [candles, timeframe, pair.sym, pair.pip, pair.dec]);

  // Derive transformed candle set based on chosen view
  const processedCandles = useMemo(() => {
    if (chartType === 'heikin') {
      return convertToHeikinAshi(aggregatedCandles);
    }
    return aggregatedCandles;
  }, [aggregatedCandles, chartType]);

  // Right-side empty space (like TradingView: ~5 candle slots of blank space after last candle)
  const RIGHT_MARGIN_CANDLES = 5;

  // Map indexes securely
  const totalCount = processedCandles.length;
  const maxVisibleCount = Math.floor((charLayout.W - charLayout.priceW) / (candleW + 2));
  
  // Calculate index offset clips
  const visibleStartIndex = Math.max(0, totalCount - offset - maxVisibleCount);
  const visibleEndIndex = Math.max(0, totalCount - offset);
  const visibleCandles = useMemo(() => {
    return processedCandles.slice(visibleStartIndex, visibleEndIndex);
  }, [processedCandles, visibleStartIndex, visibleEndIndex]);

  // Standard indicator vectors
  const ma20Line = useMemo(() => calculateSMA(processedCandles, 20), [processedCandles]);
  const ma50Line = useMemo(() => calculateSMA(processedCandles, 50), [processedCandles]);
  const ema9Line = useMemo(() => calculateEMA(processedCandles, 9), [processedCandles]);
  const ema21Line = useMemo(() => showEMA21 ? calculateEMA(processedCandles, 21) : [], [processedCandles, showEMA21]);
  const ema50Line = useMemo(() => showEMA50 ? calculateEMA(processedCandles, 50) : [], [processedCandles, showEMA50]);
  const ema200Line = useMemo(() => showEMA200 ? calculateEMA(processedCandles, 200) : [], [processedCandles, showEMA200]);
  const bbBands = useMemo(() => calculateBollingerBands(processedCandles, 20, 2), [processedCandles]);
  const rsiValues = useMemo(() => calculateRSI(processedCandles, 14), [processedCandles]);
  const macdData = useMemo(() => calculateMACD(processedCandles, 12, 26, 9), [processedCandles]);
  const superTrendData = useMemo(() => showSuperTrend ? calculateSuperTrend(processedCandles, 10, 3) : { value: [], direction: [] }, [processedCandles, showSuperTrend]);
  const vwapLine = useMemo(() => showVWAP ? calculateVWAP(processedCandles) : [], [processedCandles, showVWAP]);
  const cciValues = useMemo(() => showCCI ? calculateCCI(processedCandles, 20) : [], [processedCandles, showCCI]);

  // New indicators
  const stochData = useMemo(() => showStoch ? calculateStochastic(processedCandles, 14, 3) : { k: [], d: [] }, [processedCandles, showStoch]);
  const sarValues = useMemo(() => showParabolicSAR ? calculateParabolicSAR(processedCandles, 0.02, 0.2) : [], [processedCandles, showParabolicSAR]);
  const adxData = useMemo(() => showADX ? calculateADX(processedCandles, 14) : { adx: [], diPlus: [], diMinus: [] }, [processedCandles, showADX]);
  const wrValues = useMemo(() => showWilliamsR ? calculateWilliamsR(processedCandles, 14) : [], [processedCandles, showWilliamsR]);
  const pivotPoints = useMemo(() => showPivots ? calculatePivotPoints(processedCandles) : null, [processedCandles, showPivots]);
  const keltnerData = useMemo(() => showKeltner ? calculateKeltnerChannel(processedCandles, 20, 2) : { upper: [], middle: [], lower: [] }, [processedCandles, showKeltner]);
  const obvValues = useMemo(() => showOBV ? calculateOBV(processedCandles) : [], [processedCandles, showOBV]);
  const momentumValues = useMemo(() => showMomentum ? calculateMomentum(processedCandles, 10) : [], [processedCandles, showMomentum]);
  const aoValues = useMemo(() => showAO ? calculateAO(processedCandles) : [], [processedCandles, showAO]);

  // ── NEW OVERLAY INDICATORS ──────────────────────────────────────────────────
  const demaLine   = useMemo(() => showDEMA      ? calculateDEMA(processedCandles, 21)     : [], [processedCandles, showDEMA]);
  const temaLine   = useMemo(() => showTEMA      ? calculateTEMA(processedCandles, 21)     : [], [processedCandles, showTEMA]);
  const hmaLine    = useMemo(() => showHMA       ? calculateHMA(processedCandles, 20)      : [], [processedCandles, showHMA]);
  const smmaLine   = useMemo(() => showSMMA      ? calculateSMMA(processedCandles, 14)     : [], [processedCandles, showSMMA]);
  const zlemaLine  = useMemo(() => showZLEMA     ? calculateZLEMA(processedCandles, 21)    : [], [processedCandles, showZLEMA]);
  const mcginleyLine = useMemo(() => showMcGinley ? calculateMcGinley(processedCandles, 14) : [], [processedCandles, showMcGinley]);
  const lrLineLine  = useMemo(() => showLRLine   ? calculateLRLine(processedCandles, 20)   : [], [processedCandles, showLRLine]);
  const lrChannelData = useMemo(() => showLRChannel ? calculateLRChannel(processedCandles, 20) : { upper:[],mid:[],lower:[] }, [processedCandles, showLRChannel]);
  const donchianData  = useMemo(() => showDonchian  ? calculateDonchian(processedCandles, 20)  : { upper:[],mid:[],lower:[] }, [processedCandles, showDonchian]);
  const ichimokuData  = useMemo(() => showIchimoku  ? calculateIchimoku(processedCandles)      : null, [processedCandles, showIchimoku]);
  const alligatorData = useMemo(() => showAlligator ? calculateAlligator(processedCandles)     : null, [processedCandles, showAlligator]);
  const chandelierData = useMemo(() => showChandelier ? calculateChandelierExit(processedCandles, 22, 3) : null, [processedCandles, showChandelier]);
  const atrBandsData  = useMemo(() => showATRBands  ? calculateATRBands(processedCandles, 14, 2)  : null, [processedCandles, showATRBands]);
  const fractalData   = useMemo(() => showFractal   ? calculateFractal(processedCandles)           : null, [processedCandles, showFractal]);
  const vemaLine      = useMemo(() => showVEMA      ? calculateVEMA(processedCandles, 20)           : [], [processedCandles, showVEMA]);

  // ── NEW SUB-PANEL INDICATORS ────────────────────────────────────────────────
  const stochRSIData  = useMemo(() => showStochRSI   ? calculateStochRSI(processedCandles, 14, 14, 3, 3) : null, [processedCandles, showStochRSI]);
  const mfiValues     = useMemo(() => showMFI        ? calculateMFI(processedCandles, 14)          : [], [processedCandles, showMFI]);
  const cmfValues     = useMemo(() => showCMF        ? calculateCMF(processedCandles, 20)           : [], [processedCandles, showCMF]);
  const aroonData     = useMemo(() => showAroon      ? calculateAroon(processedCandles, 25)          : null, [processedCandles, showAroon]);
  const cmoValues     = useMemo(() => showCMO        ? calculateCMO(processedCandles, 14)            : [], [processedCandles, showCMO]);
  const ppoData       = useMemo(() => showPPO        ? calculatePPO(processedCandles, 12, 26)        : null, [processedCandles, showPPO]);
  const bbPctBValues  = useMemo(() => showBBPctB     ? calculateBBPctB(processedCandles, 20, 2)      : [], [processedCandles, showBBPctB]);
  const bbWidthValues = useMemo(() => showBBWidth    ? calculateBBWidth(processedCandles, 20, 2)     : [], [processedCandles, showBBWidth]);
  const vortexData    = useMemo(() => showVortex     ? calculateVortex(processedCandles, 14)         : null, [processedCandles, showVortex]);
  const elderRayData  = useMemo(() => showElderRay   ? calculateElderRay(processedCandles, 13)       : null, [processedCandles, showElderRay]);
  const normRSIValues = useMemo(() => showNormRSI    ? calculateNormRSI(processedCandles, 14)        : [], [processedCandles, showNormRSI]);
  const kstData       = useMemo(() => showKST        ? calculateKST(processedCandles)                : null, [processedCandles, showKST]);
  const qqeData       = useMemo(() => showQQE        ? calculateQQE(processedCandles, 14, 5)         : null, [processedCandles, showQQE]);
  const adLineValues  = useMemo(() => showADLine     ? calculateADLine(processedCandles)              : [], [processedCandles, showADLine]);
  const forceIndexValues = useMemo(() => showForceIndex ? calculateForceIndex(processedCandles, 13)  : [], [processedCandles, showForceIndex]);
  const volumeRSIValues  = useMemo(() => showVolumeRSI  ? calculateVolumeRSI(processedCandles, 14)  : [], [processedCandles, showVolumeRSI]);
  const hvValues      = useMemo(() => showHV         ? calculateHV(processedCandles, 20)             : [], [processedCandles, showHV]);
  const atrPctValues  = useMemo(() => showATRPct     ? calculateATRPct(processedCandles, 14)         : [], [processedCandles, showATRPct]);
  const ulcerValues   = useMemo(() => showUlcerIndex ? calculateUlcerIndex(processedCandles, 14)     : [], [processedCandles, showUlcerIndex]);

  // Real SMC analysis on visible candles
  const smcData = useMemo(() => {
    const needsSMC = showSMC || showFVG || showOB || showBOS || showLiquidity || showPDZone || showSR || showSD;
    if (!needsSMC || visibleCandles.length < 15) return null;
    return detectSMC(visibleCandles, visibleStartIndex);
  }, [visibleCandles, visibleStartIndex, showSMC, showFVG, showOB, showBOS, showLiquidity, showPDZone, showSR, showSD]);

  // Candlestick pattern markers on visible window
  const patternMarkers = useMemo(() => {
    if (!showPatterns || visibleCandles.length < 3) return [];
    return detectCandlePatterns(visibleCandles, 2);
  }, [visibleCandles, showPatterns]);

  // Canvas Coordinate mapping helper
  const getCoordinates = (index: number, price: number, minPrice: number, maxPrice: number) => {
    const step = candleW + 2;
    const chartW = charLayout.W - charLayout.priceW;

    // Map logical candle index to pixel x
    const idxInVisible = index - visibleStartIndex;
    const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idxInVisible) * step + candleW / 2;

    // Map logical price to pixel y
    const prRng = maxPrice - minPrice || 0.0001;
    const y = charLayout.chartH * (1 - (price - minPrice) / prRng);

    return { x, y };
  };

  // Convert pixel coordinates to logical values
  const getLogicalValues = (clientX: number, clientY: number, minPrice: number, maxPrice: number) => {
    const mainC = mainCanvasRef.current;
    if (!mainC) return null;
    const rect = mainC.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const chartW = charLayout.W - charLayout.priceW;
    const step = candleW + 2;

    // Calculate index (account for right margin so click coords match drawn positions)
    const totalVisW = (visibleCandles.length + RIGHT_MARGIN_CANDLES) * step;
    const startX = chartW - totalVisW;
    const localIdx = Math.floor((x - startX) / step);
    const index = Math.max(visibleStartIndex, Math.min(visibleEndIndex - 1, visibleStartIndex + localIdx));

    // Calculate price
    const prRng = maxPrice - minPrice || 0.0001;
    const price = minPrice + (1 - y / charLayout.chartH) * prRng;

    return { index, price, pxX: x, pxY: y };
  };

  // MAIN GRAPH RENDER ENGINE
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas || visibleCandles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, charLayout.W, charLayout.H);

    // 1. Plot standard high-end dark backgrounds
    ctx.fillStyle = '#070b12'; // deep slate
    ctx.fillRect(0, 0, charLayout.W, charLayout.H);

    // Right axes plate background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(charLayout.W - charLayout.priceW, 0, charLayout.priceW, charLayout.H);

    const chartW = charLayout.W - charLayout.priceW;
    const step = candleW + 2;

    // Get price range in visible slice
    const highs = visibleCandles.map((c) => c.h);
    const lows = visibleCandles.map((c) => c.l);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);
    const padding = (maxPrice - minPrice) * 0.08 || 0.0002;
    maxPrice += padding;
    minPrice -= padding;

    // Scale mapping shortcut
    const toY = (p: number) => {
      const rng = maxPrice - minPrice || 0.001;
      return charLayout.chartH * (1 - (p - minPrice) / rng);
    };

    // Symbol + timeframe watermark (MT5-style faint label in top-left)
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.font = 'bold 28px "DM Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`${pair.sym}  ${timeframe}`, 12, 40);
    ctx.restore();

    // 2. DRAW MAIN PRICE GRID LINES
    ctx.strokeStyle = 'rgba(99, 118, 175, 0.13)';
    ctx.lineWidth = 0.5;
    const gridRows = 6;
    for (let i = 0; i <= gridRows; i++) {
      const p = minPrice + ((maxPrice - minPrice) * i) / gridRows;
      const y = Math.round(toY(p)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      // Right Side Value Ticker Tags
      ctx.font = '10px "DM Mono", monospace';
      ctx.fillStyle = '#7986cb';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(pair.dec), chartW + 6, y + 4.5);
    }

    // Vertical grid ticks
    const verticalTicks = 6;
    const tickStep = Math.max(1, Math.floor(visibleCandles.length / verticalTicks));
    for (let i = 0; i < visibleCandles.length; i += tickStep) {
      const c = visibleCandles[i];
      const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -i) * step + candleW / 2;
      ctx.beginPath();
      ctx.moveTo(Math.round(posX) + 0.5, 0);
      ctx.lineTo(Math.round(posX) + 0.5, charLayout.chartH);
      ctx.stroke();

      // Time axis text
      const date = new Date(c.t);
      const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      ctx.fillStyle = '#7986cb';
      ctx.textAlign = 'center';
      ctx.fillText(label, posX, charLayout.chartH + 16);
    }

    // Day / session separators — vertical dotted lines where UTC date changes (MT5-style)
    {
      let lastDay = -1;
      visibleCandles.forEach((c, i) => {
        const d = Math.floor(c.t / 86400000);
        if (lastDay !== -1 && d !== lastDay) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES - i) * step + candleW / 2;
          ctx.save();
          ctx.strokeStyle = 'rgba(150, 170, 220, 0.28)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(Math.round(posX) + 0.5, 0);
          ctx.lineTo(Math.round(posX) + 0.5, charLayout.chartH);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        lastDay = d;
      });
    }

    // Separators for Price view and bottom scale zones
    ctx.strokeStyle = 'rgba(99,118,175,0.2)';
    ctx.beginPath();
    ctx.moveTo(0, charLayout.chartH);
    ctx.lineTo(charLayout.W, charLayout.chartH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chartW, 0);
    ctx.lineTo(chartW, charLayout.H);
    ctx.stroke();

    // 3. RENDER SMART MONEY CONCEPT (SMC) VISUAL OVERLAYS
    if (smcData) {
      ctx.font = '700 8px "DM Mono", monospace';

      // FVG Zones — enhanced: gradient fill, fill-% bar, extends to right edge
      if (showFVG) {
        smcData.fvgZones.forEach(fvg => {
          if (fvg.filled) return;
          const startX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -(fvg.startIndex - visibleStartIndex)) * step;
          const endX = chartW; // extend to right edge
          const topY = toY(fvg.top);
          const botY = toY(fvg.bottom);
          const zoneH = botY - topY;
          if (zoneH <= 0 || startX > chartW) return;

          // Gradient fill
          const grad = ctx.createLinearGradient(startX, 0, endX, 0);
          if (fvg.type === 'bullish') {
            grad.addColorStop(0, 'rgba(0,230,118,0.18)');
            grad.addColorStop(1, 'rgba(0,230,118,0.04)');
            ctx.strokeStyle = 'rgba(0,230,118,0.45)';
          } else {
            grad.addColorStop(0, 'rgba(255,61,87,0.18)');
            grad.addColorStop(1, 'rgba(255,61,87,0.04)');
            ctx.strokeStyle = 'rgba(255,61,87,0.45)';
          }
          ctx.fillStyle = grad;
          ctx.lineWidth = 0.8;
          ctx.fillRect(startX, topY, endX - startX, zoneH);
          ctx.strokeRect(startX, topY, endX - startX, zoneH);

          // Fill-% overlay bar
          if (fvg.fillPct > 0) {
            const fillH = zoneH * (fvg.fillPct / 100);
            ctx.fillStyle = fvg.type === 'bullish' ? 'rgba(0,230,118,0.12)' : 'rgba(255,61,87,0.12)';
            const fillY = fvg.type === 'bullish' ? botY - fillH : topY;
            ctx.fillRect(startX, fillY, endX - startX, fillH);
          }

          // Label: "FVG 45% ↑"
          ctx.fillStyle = fvg.type === 'bullish' ? '#00e676' : '#ff3d57';
          const arrow = fvg.type === 'bullish' ? '↑' : '↓';
          ctx.fillText(`FVG ${Math.round(fvg.fillPct)}% ${arrow}`, startX + 3, topY + 10);
        });
      }

      // Order Blocks
      if (showOB) {
        smcData.orderBlocks.forEach(ob => {
          const si = ob.startIndex - visibleStartIndex;
          const ei = ob.endIndex - visibleStartIndex;
          const startX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -si) * step;
          const endX = Math.min(chartW - 4, chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -Math.min(ei, visibleCandles.length)) * step);
          const topY = toY(ob.high);
          const botY = toY(ob.low);
          if (endX <= startX) return;
          if (ob.type === 'bullish') {
            ctx.fillStyle = ob.mitigated ? 'rgba(0,230,118,0.03)' : 'rgba(0,230,118,0.06)';
            ctx.strokeStyle = ob.mitigated ? 'rgba(0,230,118,0.15)' : 'rgba(0,230,118,0.4)';
          } else {
            ctx.fillStyle = ob.mitigated ? 'rgba(255,61,87,0.03)' : 'rgba(255,61,87,0.06)';
            ctx.strokeStyle = ob.mitigated ? 'rgba(255,61,87,0.15)' : 'rgba(255,61,87,0.4)';
          }
          ctx.lineWidth = ob.mitigated ? 0.5 : 1;
          ctx.fillRect(startX, topY, endX - startX, botY - topY);
          ctx.strokeRect(startX, topY, endX - startX, botY - topY);
          ctx.fillStyle = ob.type === 'bullish' ? '#00e676' : '#ff3d57';
          ctx.fillText(ob.type === 'bullish' ? '↑OB' : '↓OB', startX + 3, topY + 10);
        });
      }

      // BOS / CHoCH structure lines
      if (showBOS) {
        smcData.structureBreaks.forEach(sb => {
          const sbY = toY(sb.price);
          if (sbY < 0 || sbY > charLayout.chartH) return;
          const isCHoCH = sb.type === 'CHoCH';
          ctx.strokeStyle = isCHoCH ? 'rgba(255,193,7,0.7)' : 'rgba(0,212,255,0.7)';
          ctx.setLineDash(isCHoCH ? [3, 3] : [5, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(8, sbY);
          ctx.lineTo(chartW - 8, sbY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = isCHoCH ? '#ffc107' : '#00d4ff';
          ctx.fillText(`${sb.type} ${sb.direction === 'bullish' ? '↑' : '↓'}`, 10, sbY - 3);
        });
      }

      // Liquidity Pools — dotted horizontal lines at equal highs/lows
      if (showLiquidity && smcData.liquidityLevels) {
        smcData.liquidityLevels.forEach(liq => {
          const liqY = toY(liq.price);
          if (liqY < 0 || liqY > charLayout.chartH) return;
          const isBSL = liq.type === 'BSL';
          const alpha = liq.swept ? 0.3 : 0.75;
          ctx.strokeStyle = isBSL ? `rgba(251,191,36,${alpha})` : `rgba(168,85,247,${alpha})`;
          ctx.setLineDash([2, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(8, liqY);
          ctx.lineTo(chartW - 8, liqY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = isBSL ? '#fbbf24' : '#a855f7';
          ctx.fillText(`${liq.type}(${liq.count})${liq.swept ? ' ✓' : ''}`, 10, liqY - 3);
        });
      }

      // Premium / Discount Zone
      if (showPDZone && smcData.pdZone) {
        const pd = smcData.pdZone;
        const swingHighY   = toY(pd.swingHigh);
        const premiumY     = toY(pd.premium);
        const eqY          = toY(pd.equilibrium);
        const discountY    = toY(pd.discount);
        const swingLowY    = toY(pd.swingLow);

        // Red tint: premium zone (equilibrium → swing high)
        const premTop  = Math.max(0, swingHighY);
        const premBot  = Math.min(charLayout.chartH, premiumY);
        if (premBot > premTop) {
          ctx.fillStyle = 'rgba(255,61,87,0.04)';
          ctx.fillRect(0, premTop, chartW, premBot - premTop);
        }

        // Green tint: discount zone (swing low → equilibrium)
        const discTop = Math.max(0, discountY);
        const discBot = Math.min(charLayout.chartH, swingLowY);
        if (discBot > discTop) {
          ctx.fillStyle = 'rgba(0,230,118,0.04)';
          ctx.fillRect(0, discTop, chartW, discBot - discTop);
        }

        // EQ 50% line — purple dashed
        if (eqY >= 0 && eqY <= charLayout.chartH) {
          ctx.strokeStyle = 'rgba(168,85,247,0.6)';
          ctx.setLineDash([6, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(chartW, eqY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#a855f7';
          ctx.fillText('EQ 50%', chartW - 48, eqY - 3);
        }

        // PREM 75% line — red dashed
        if (premiumY >= 0 && premiumY <= charLayout.chartH) {
          ctx.strokeStyle = 'rgba(255,61,87,0.5)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, premiumY); ctx.lineTo(chartW, premiumY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ff3d57';
          ctx.fillText('PREM 75%', chartW - 58, premiumY - 3);
        }

        // DISC 25% line — green dashed
        if (discountY >= 0 && discountY <= charLayout.chartH) {
          ctx.strokeStyle = 'rgba(0,230,118,0.5)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, discountY); ctx.lineTo(chartW, discountY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#00e676';
          ctx.fillText('DISC 25%', chartW - 58, discountY - 3);
        }
      }

      // Support & Resistance — horizontal lines with strength-based styling
      if (showSR && smcData.srLevels) {
        smcData.srLevels.forEach(lvl => {
          const lY = toY(lvl.price);
          if (lY < 0 || lY > charLayout.chartH) return;
          const isRes = lvl.type === 'resistance';
          const alpha = lvl.broken ? 0.25 : (0.4 + lvl.strength * 0.1);
          const lineW = lvl.broken ? 0.5 : (0.6 + lvl.strength * 0.25);

          // Line
          ctx.strokeStyle = isRes ? `rgba(255,99,99,${alpha})` : `rgba(52,211,153,${alpha})`;
          ctx.setLineDash(lvl.broken ? [3, 5] : lvl.strength >= 3 ? [] : [6, 3]);
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(0, lY);
          ctx.lineTo(chartW, lY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Strength dots — filled circles proportional to strength
          for (let d = 0; d < lvl.strength; d++) {
            ctx.fillStyle = isRes ? `rgba(255,99,99,${alpha + 0.1})` : `rgba(52,211,153,${alpha + 0.1})`;
            ctx.beginPath();
            ctx.arc(chartW - 12 - d * 6, lY, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Label
          ctx.fillStyle = isRes ? '#ff6363' : '#34d399';
          const tag = `${isRes ? 'R' : 'S'}${lvl.strength > 1 ? `(${lvl.strength})` : ''}${lvl.broken ? ' ✗' : ''}`;
          ctx.fillText(tag, 6, lY - 3);
        });
      }

      // Supply & Demand Zones — shaded rectangles
      if (showSD && smcData.sdZones) {
        smcData.sdZones.forEach(zone => {
          const si = zone.startIndex - visibleStartIndex;
          const startX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -si) * step;
          const endX = chartW;
          const topY = toY(zone.high);
          const botY = toY(zone.low);
          const zoneH = botY - topY;
          if (zoneH <= 0 || startX > chartW) return;

          const isSupply = zone.type === 'supply';
          const baseAlpha = zone.tested ? 0.08 : 0.14;
          const borderAlpha = zone.tested ? 0.3 : 0.6;

          // Gradient fill
          const grad = ctx.createLinearGradient(startX, 0, endX, 0);
          if (isSupply) {
            grad.addColorStop(0, `rgba(249,115,22,${baseAlpha + 0.06})`);
            grad.addColorStop(1, `rgba(249,115,22,${baseAlpha})`);
            ctx.strokeStyle = `rgba(249,115,22,${borderAlpha})`;
          } else {
            grad.addColorStop(0, `rgba(34,197,94,${baseAlpha + 0.06})`);
            grad.addColorStop(1, `rgba(34,197,94,${baseAlpha})`);
            ctx.strokeStyle = `rgba(34,197,94,${borderAlpha})`;
          }
          ctx.fillStyle = grad;
          ctx.lineWidth = 1;
          ctx.fillRect(startX, topY, endX - startX, zoneH);
          ctx.strokeRect(startX, topY, endX - startX, zoneH);

          // Label
          ctx.fillStyle = isSupply ? '#fb923c' : '#4ade80';
          const tag = `${isSupply ? 'Supply' : 'Demand'}${zone.tested ? ' (tested)' : ''}`;
          ctx.fillText(tag, startX + 4, topY + 10);
        });
      }
    }

    // 4. BOLLINGER BANDS DRAW
    if (showBB) {
      ctx.fillStyle = 'rgba(124, 58, 237, 0.03)';
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.45)';
      ctx.lineWidth = 1.0;

      // Draw Upper Band
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const bVal = bbBands.upper[actualIdx];
        if (bVal !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!started) {
            ctx.moveTo(posX, toY(bVal));
            started = true;
          } else {
            ctx.lineTo(posX, toY(bVal));
          }
        }
      });
      ctx.stroke();

      // Lower band + trace closed channel fill
      ctx.beginPath();
      let hasLower = false;
      for (let idx = visibleCandles.length - 1; idx >= 0; idx--) {
        const actualIdx = visibleStartIndex + idx;
        const bVal = bbBands.lower[actualIdx];
        if (bVal !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!hasLower) {
            ctx.moveTo(posX, toY(bVal));
            hasLower = true;
          } else {
            ctx.lineTo(posX, toY(bVal));
          }
        }
      }
      for (let idx = 0; idx < visibleCandles.length; idx++) {
        const actualIdx = visibleStartIndex + idx;
        const bVal = bbBands.upper[actualIdx];
        if (bVal !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          ctx.lineTo(posX, toY(bVal));
        }
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(124, 58, 237, 0.04)';
      ctx.fill();

      // Bottom border alone
      ctx.beginPath();
      let bottomStarted = false;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const bVal = bbBands.lower[actualIdx];
        if (bVal !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!bottomStarted) {
            ctx.moveTo(posX, toY(bVal));
            bottomStarted = true;
          } else {
            ctx.lineTo(posX, toY(bVal));
          }
        }
      });
      ctx.stroke();
    }

    // 5. MOVING AVERAGES
    if (showMA20) {
      ctx.strokeStyle = '#00d4ff'; // neon cyan
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const val = ma20Line[actualIdx];
        if (val !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!started) {
            ctx.moveTo(posX, toY(val));
            started = true;
          } else {
            ctx.lineTo(posX, toY(val));
          }
        }
      });
      ctx.stroke();
    }

    if (showMA50) {
      ctx.strokeStyle = '#ffc107'; // amber
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const val = ma50Line[actualIdx];
        if (val !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!started) {
            ctx.moveTo(posX, toY(val));
            started = true;
          } else {
            ctx.lineTo(posX, toY(val));
          }
        }
      });
      ctx.stroke();
    }

    if (showEMA9) {
      ctx.strokeStyle = '#ec4899'; // pink
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const val = ema9Line[actualIdx];
        if (val !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!started) {
            ctx.moveTo(posX, toY(val));
            started = true;
          } else {
            ctx.lineTo(posX, toY(val));
          }
        }
      });
      ctx.stroke();
    }

    const drawLine = (values: (number | null)[], color: string, lw: number) => {
      if (!values.length) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      let s = false;
      visibleCandles.forEach((_c, idx) => {
        const val = values[visibleStartIndex + idx];
        if (val == null) return;
        const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
        if (!s) { ctx.moveTo(posX, toY(val)); s = true; } else { ctx.lineTo(posX, toY(val)); }
      });
      ctx.stroke();
    };

    if (showEMA21) drawLine(ema21Line, '#a3e635', 1.4);   // lime
    if (showEMA50) drawLine(ema50Line, '#f97316', 1.4);   // orange
    if (showEMA200) drawLine(ema200Line, '#ef4444', 1.8); // red (strong)
    if (showVWAP) drawLine(vwapLine, '#818cf8', 1.4);     // indigo

    // SuperTrend — color-coded line
    if (showSuperTrend && superTrendData.value.length) {
      ctx.lineWidth = 2;
      visibleCandles.forEach((_c, idx) => {
        if (idx === 0) return;
        const ai = visibleStartIndex + idx;
        const v1 = superTrendData.value[ai - 1], v2 = superTrendData.value[ai];
        const d2 = superTrendData.direction[ai];
        if (v1 == null || v2 == null || d2 == null) return;
        const x1 = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx + 1) * step + candleW / 2;
        const x2 = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
        ctx.strokeStyle = d2 ? 'rgba(0,230,118,0.85)' : 'rgba(255,61,87,0.85)';
        ctx.beginPath();
        ctx.moveTo(x1, toY(v1));
        ctx.lineTo(x2, toY(v2));
        ctx.stroke();
      });
    }

    // 5b. KELTNER CHANNEL
    if (showKeltner && keltnerData.upper.length) {
      ctx.save();
      const kUpper = keltnerData.upper.slice(visibleStartIndex, visibleEndIndex);
      const kLower = keltnerData.lower.slice(visibleStartIndex, visibleEndIndex);
      const kMid = keltnerData.middle.slice(visibleStartIndex, visibleEndIndex);
      ctx.beginPath();
      kUpper.forEach((v, i) => {
        if (v == null) return;
        const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -i) * step + candleW / 2;
        i === 0 || kUpper[i-1] == null ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v));
      });
      kLower.slice().reverse().forEach((v, i) => {
        const ri = kLower.length - 1 - i;
        if (v == null) return;
        const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -ri) * step + candleW / 2;
        ctx.lineTo(x, toY(v));
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(168,85,247,0.06)';
      ctx.fill();
      const drawKLine = (arr: (number|null)[], col: string) => {
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.2;
        arr.forEach((v, i) => {
          if (v == null) return;
          const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -i) * step + candleW / 2;
          i === 0 || arr[i-1] == null ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v));
        });
        ctx.stroke();
      };
      drawKLine(kUpper, 'rgba(168,85,247,0.8)');
      drawKLine(kLower, 'rgba(168,85,247,0.8)');
      drawKLine(kMid, 'rgba(168,85,247,0.45)');
      ctx.restore();
    }

    // 5c. PIVOT POINTS
    if (showPivots && pivotPoints) {
      const pivotLevels = [
        { v: pivotPoints.pp, label: 'PP', color: '#e2e8f0' },
        { v: pivotPoints.r1, label: 'R1', color: '#f87171' },
        { v: pivotPoints.r2, label: 'R2', color: '#ef4444' },
        { v: pivotPoints.r3, label: 'R3', color: '#dc2626' },
        { v: pivotPoints.s1, label: 'S1', color: '#4ade80' },
        { v: pivotPoints.s2, label: 'S2', color: '#22c55e' },
        { v: pivotPoints.s3, label: 'S3', color: '#16a34a' },
      ];
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      pivotLevels.forEach(({ v, label, color }) => {
        if (v < minPrice - (maxPrice - minPrice) || v > maxPrice + (maxPrice - minPrice)) return;
        const y = toY(v);
        ctx.strokeStyle = color + 'bb';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(label + ' ' + v.toFixed(pair.dec), chartW - 52, y - 2);
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 6. VOLUME OVERLAY TRACE (Bottom within main price graph)
    if (showVol) {
      const vHigh = Math.max(...visibleCandles.map((c) => c.v)) || 100;
      const volAreaH = charLayout.chartH * 0.16;

      visibleCandles.forEach((c, idx) => {
        const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step;
        const hVal = (c.v / vHigh) * volAreaH;
        const posY = charLayout.chartH - hVal;
        
        ctx.fillStyle = c.c >= c.o ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 61, 87, 0.15)';
        ctx.fillRect(posX + (candleW - Math.max(1, candleW * 0.72)) / 2, posY, Math.max(1, candleW * 0.72), hVal);
      });
    }

    // 7. RENDER PRIMARY BANDS / CANDLES / SHAPES
    visibleCandles.forEach((c, idx) => {
      const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step;
      const cx = posX + candleW / 2;
      const bW = Math.max(1.5, candleW * 0.75);

      const isUp = c.c >= c.o;
      const col = isUp ? '#26a69a' : '#ef5350';

      if (chartType === 'line') {
        const nextIdx = idx + 1;
        if (nextIdx < visibleCandles.length) {
          const nextCx = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -nextIdx) * step + candleW / 2;
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(cx, toY(c.c));
          ctx.lineTo(nextCx, toY(visibleCandles[nextIdx].c));
          ctx.stroke();
        }
      } else if (chartType === 'area') {
        const nextIdx = idx + 1;
        if (nextIdx < visibleCandles.length) {
          const nextCx = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -nextIdx) * step + candleW / 2;
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, toY(c.c));
          ctx.lineTo(nextCx, toY(visibleCandles[nextIdx].c));
          ctx.stroke();

          // Gradient fill
          ctx.beginPath();
          ctx.moveTo(cx, toY(c.c));
          ctx.lineTo(nextCx, toY(visibleCandles[nextIdx].c));
          ctx.lineTo(nextCx, charLayout.chartH);
          ctx.lineTo(cx, charLayout.chartH);
          ctx.closePath();
          
          const grad = ctx.createLinearGradient(0, 0, 0, charLayout.chartH);
          grad.addColorStop(0, 'rgba(0, 212, 255, 0.15)');
          grad.addColorStop(1, 'rgba(0, 212, 255, 0.00)');
          ctx.fillStyle = grad;
          ctx.fill();
        }
      } else if (chartType === 'bar') {
        // OHLC lines
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // High -> Low
        ctx.moveTo(cx, toY(c.h));
        ctx.lineTo(cx, toY(c.l));
        ctx.stroke();

        // Left open bar
        ctx.beginPath();
        ctx.moveTo(cx - bW / 2, toY(c.o));
        ctx.lineTo(cx, toY(c.o));
        ctx.stroke();

        // Right close bar
        ctx.beginPath();
        ctx.moveTo(cx, toY(c.c));
        ctx.lineTo(cx + bW / 2, toY(c.c));
        ctx.stroke();
      } else {
        // Standard (or Hollow) Candlestick
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, toY(c.h));
        ctx.lineTo(cx, toY(c.l));
        ctx.stroke();

        const bodyY = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(1, Math.abs(toY(c.c) - toY(c.o)));

        if (chartType === 'hollow') {
          if (isUp) {
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(posX + (candleW - bW) / 2, bodyY, bW, bodyH);
          } else {
            ctx.fillStyle = col;
            ctx.fillRect(posX + (candleW - bW) / 2, bodyY, bW, bodyH);
          }
        } else {
          // Standard filled candles
          ctx.fillStyle = col;
          ctx.fillRect(posX + (candleW - bW) / 2, bodyY, bW, bodyH);
        }
      }
    });

    // 7b. CANDLESTICK PATTERN MARKERS
    if (showPatterns && patternMarkers.length > 0) {
      ctx.font = 'bold 8px "DM Mono", monospace';
      patternMarkers.forEach(pm => {
        const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -pm.index) * step + candleW / 2;
        if (posX < 0 || posX > chartW) return;
        if (pm.type === 'bullish') {
          // Triangle below candle
          const baseY = toY(pm.price) + 10;
          ctx.fillStyle = '#00e676';
          ctx.beginPath();
          ctx.moveTo(posX, baseY - 6);
          ctx.lineTo(posX - 4, baseY);
          ctx.lineTo(posX + 4, baseY);
          ctx.closePath();
          ctx.fill();
          if (candleW >= 6) {
            ctx.fillStyle = '#00e676';
            ctx.textAlign = 'center';
            ctx.fillText(pm.name, posX, baseY + 9);
          }
        } else if (pm.type === 'bearish') {
          // Triangle above candle
          const tipY = toY(pm.price) - 10;
          ctx.fillStyle = '#ff3d57';
          ctx.beginPath();
          ctx.moveTo(posX, tipY + 6);
          ctx.lineTo(posX - 4, tipY);
          ctx.lineTo(posX + 4, tipY);
          ctx.closePath();
          ctx.fill();
          if (candleW >= 6) {
            ctx.fillStyle = '#ff3d57';
            ctx.textAlign = 'center';
            ctx.fillText(pm.name, posX, tipY - 3);
          }
        } else {
          ctx.fillStyle = '#fbbf24';
          ctx.textAlign = 'center';
          ctx.fillText('◆', posX, toY(pm.price) - 10);
        }
      });
      ctx.textAlign = 'left';
    }

    // 7c. PARABOLIC SAR DOTS
    if (showParabolicSAR && sarValues.length) {
      visibleCandles.forEach((c, idx) => {
        const ai = visibleStartIndex + idx;
        const sar = sarValues[ai];
        if (sar == null) return;
        const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
        const y = toY(sar);
        const isBull = sar < c.l;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(2, candleW * 0.18), 0, Math.PI * 2);
        ctx.fillStyle = isBull ? '#10b981' : '#f59e0b';
        ctx.fill();
      });
    }

    // 7d. NEW SINGLE-LINE OVERLAY INDICATORS
    const drawLineOverlay = (values: (number|null)[], color: string, lw = 1.4) => {
      if (!values.length) return;
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      let s = false;
      visibleCandles.forEach((_c, idx) => {
        const v = values[visibleStartIndex + idx];
        if (v == null) return;
        const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
        if (!s) { ctx.moveTo(x, toY(v)); s = true; } else { ctx.lineTo(x, toY(v)); }
      });
      ctx.stroke();
    };
    if (showDEMA)     drawLineOverlay(demaLine,     '#06b6d4', 1.4);
    if (showTEMA)     drawLineOverlay(temaLine,     '#8b5cf6', 1.4);
    if (showHMA)      drawLineOverlay(hmaLine,      '#10b981', 1.6);
    if (showSMMA)     drawLineOverlay(smmaLine,     '#f59e0b', 1.4);
    if (showZLEMA)    drawLineOverlay(zlemaLine,    '#84cc16', 1.4);
    if (showMcGinley) drawLineOverlay(mcginleyLine, '#e879f9', 1.4);
    if (showLRLine)   drawLineOverlay(lrLineLine,   '#67e8f9', 1.4);
    if (showVEMA)     drawLineOverlay(vemaLine,     '#6ee7b7', 1.4);

    // 7e. LR CHANNEL
    if (showLRChannel && lrChannelData.mid.length) {
      const lrSlice = (arr: (number|null)[]) => arr.slice(visibleStartIndex, visibleEndIndex);
      const drawCh = (arr: (number|null)[], col: string, lw = 1.1) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); let s = false;
        lrSlice(arr).forEach((v, i) => { if (v==null) return; const x = chartW-(visibleCandles.length-i)*step+candleW/2; if (!s){ctx.moveTo(x,toY(v));s=true;}else ctx.lineTo(x,toY(v)); });
        ctx.stroke();
      };
      // Fill between upper/lower
      ctx.beginPath(); let sf=false;
      lrSlice(lrChannelData.upper).forEach((v,i)=>{ if(v==null)return; const x=chartW-(visibleCandles.length-i)*step+candleW/2; if(!sf){ctx.moveTo(x,toY(v));sf=true;}else ctx.lineTo(x,toY(v)); });
      lrSlice(lrChannelData.lower).slice().reverse().forEach((v,ri)=>{ if(v==null)return; const i=lrChannelData.lower.slice(visibleStartIndex,visibleEndIndex).length-1-ri; const x=chartW-(visibleCandles.length-i)*step+candleW/2; ctx.lineTo(x,toY(v)); });
      ctx.closePath(); ctx.fillStyle='rgba(103,232,249,0.05)'; ctx.fill();
      drawCh(lrChannelData.upper,'rgba(103,232,249,0.7)');
      drawCh(lrChannelData.lower,'rgba(103,232,249,0.7)');
      drawCh(lrChannelData.mid,'rgba(103,232,249,0.4)');
    }

    // 7f. DONCHIAN CHANNEL
    if (showDonchian && donchianData.upper.length) {
      ctx.save();
      const donUpper = donchianData.upper.slice(visibleStartIndex, visibleEndIndex);
      const donLower = donchianData.lower.slice(visibleStartIndex, visibleEndIndex);
      const donMid   = donchianData.mid.slice(visibleStartIndex, visibleEndIndex);
      ctx.beginPath(); let sf2=false;
      donUpper.forEach((v,i)=>{ if(v==null)return; const x=chartW-(visibleCandles.length-i)*step+candleW/2; if(!sf2){ctx.moveTo(x,toY(v));sf2=true;}else ctx.lineTo(x,toY(v)); });
      donLower.slice().reverse().forEach((v,ri)=>{ if(v==null)return; const i=donLower.length-1-ri; const x=chartW-(visibleCandles.length-i)*step+candleW/2; ctx.lineTo(x,toY(v)); });
      ctx.closePath(); ctx.fillStyle='rgba(96,165,250,0.05)'; ctx.fill();
      const drawDL = (arr:(number|null)[],col:string) => { ctx.strokeStyle=col; ctx.lineWidth=1.1; ctx.beginPath(); let s=false; arr.forEach((v,i)=>{ if(v==null)return; const x=chartW-(visibleCandles.length-i)*step+candleW/2; if(!s){ctx.moveTo(x,toY(v));s=true;}else ctx.lineTo(x,toY(v)); }); ctx.stroke(); };
      drawDL(donUpper,'rgba(96,165,250,0.8)'); drawDL(donLower,'rgba(96,165,250,0.8)'); drawDL(donMid,'rgba(96,165,250,0.4)');
      ctx.restore();
    }

    // 7g. ICHIMOKU CLOUD
    if (showIchimoku && ichimokuData) {
      ctx.save();
      const ic = ichimokuData;
      // Cloud fill
      for (let idx=0; idx<visibleCandles.length-1; idx++) {
        const ai=visibleStartIndex+idx;
        const sA1=ic.senkouA[ai], sB1=ic.senkouB[ai], sA2=ic.senkouA[ai+1], sB2=ic.senkouB[ai+1];
        if (sA1==null||sB1==null||sA2==null||sB2==null) continue;
        const x1=chartW-(visibleCandles.length-idx)*step+candleW/2, x2=chartW-(visibleCandles.length-idx-1)*step+candleW/2;
        ctx.beginPath(); ctx.moveTo(x1,toY(sA1)); ctx.lineTo(x2,toY(sA2)); ctx.lineTo(x2,toY(sB2)); ctx.lineTo(x1,toY(sB1)); ctx.closePath();
        ctx.fillStyle = sA1>=sB1 ? 'rgba(0,230,118,0.08)' : 'rgba(255,61,87,0.08)'; ctx.fill();
      }
      // Lines
      const drawIL = (arr:(number|null)[],col:string,lw=1.1) => { ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); let s=false; visibleCandles.forEach((_,idx)=>{ const v=arr[visibleStartIndex+idx]; if(v==null)return; const x=chartW-(visibleCandles.length-idx)*step+candleW/2; if(!s){ctx.moveTo(x,toY(v));s=true;}else ctx.lineTo(x,toY(v)); }); ctx.stroke(); };
      drawIL(ic.tenkan,'#ef4444',1.3); drawIL(ic.kijun,'#3b82f6',1.3);
      drawIL(ic.senkouA,'rgba(0,230,118,0.6)'); drawIL(ic.senkouB,'rgba(255,61,87,0.6)');
      ctx.setLineDash([3,3]); drawIL(ic.chikou,'rgba(255,193,7,0.6)'); ctx.setLineDash([]);
      ctx.restore();
    }

    // 7h. ALLIGATOR
    if (showAlligator && alligatorData) {
      const drawAL = (arr:(number|null)[],col:string) => { ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.beginPath(); let s=false; visibleCandles.forEach((_,idx)=>{ const v=arr[visibleStartIndex+idx]; if(v==null)return; const x=chartW-(visibleCandles.length-idx)*step+candleW/2; if(!s){ctx.moveTo(x,toY(v));s=true;}else ctx.lineTo(x,toY(v)); }); ctx.stroke(); };
      drawAL(alligatorData.jaw,'#3b82f6'); drawAL(alligatorData.teeth,'#ef4444'); drawAL(alligatorData.lips,'#22c55e');
    }

    // 7i. CHANDELIER EXIT
    if (showChandelier && chandelierData) {
      ctx.save();
      visibleCandles.forEach((c,idx) => {
        const ai=visibleStartIndex+idx;
        const ls=chandelierData.longStop[ai], ss=chandelierData.shortStop[ai];
        const x=chartW-(visibleCandles.length-idx)*step+candleW/2;
        if(ls!=null){ ctx.beginPath(); ctx.arc(x,toY(ls),2.5,0,Math.PI*2); ctx.fillStyle='#34d399'; ctx.fill(); }
        if(ss!=null){ ctx.beginPath(); ctx.arc(x,toY(ss),2.5,0,Math.PI*2); ctx.fillStyle='#f87171'; ctx.fill(); }
      });
      ctx.restore();
    }

    // 7j. ATR BANDS
    if (showATRBands && atrBandsData) {
      ctx.save();
      const drawAB = (arr:(number|null)[],col:string) => { ctx.strokeStyle=col; ctx.lineWidth=1.1; ctx.setLineDash([4,3]); ctx.beginPath(); let s=false; visibleCandles.forEach((_,idx)=>{ const v=arr[visibleStartIndex+idx]; if(v==null)return; const x=chartW-(visibleCandles.length-idx)*step+candleW/2; if(!s){ctx.moveTo(x,toY(v));s=true;}else ctx.lineTo(x,toY(v)); }); ctx.stroke(); ctx.setLineDash([]); };
      drawAB(atrBandsData.upper,'rgba(167,139,250,0.8)'); drawAB(atrBandsData.lower,'rgba(167,139,250,0.8)'); drawAB(atrBandsData.mid,'rgba(167,139,250,0.4)');
      ctx.restore();
    }

    // 7k. BILL WILLIAMS FRACTALS
    if (showFractal && fractalData) {
      visibleCandles.forEach((c,idx) => {
        const ai=visibleStartIndex+idx;
        const x=chartW-(visibleCandles.length-idx)*step+candleW/2;
        if(fractalData.bullFractal[ai]){ ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.moveTo(x,toY(c.l)-8); ctx.lineTo(x-5,toY(c.l)-14); ctx.lineTo(x+5,toY(c.l)-14); ctx.closePath(); ctx.fill(); }
        if(fractalData.bearFractal[ai]){ ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.moveTo(x,toY(c.h)+8); ctx.lineTo(x-5,toY(c.h)+14); ctx.lineTo(x+5,toY(c.h)+14); ctx.closePath(); ctx.fill(); }
      });
    }

    // 8. RENDER ACTIVE SAVED CUSTOM DRAWINGS (Trendlines, Fibs, Shapes)
    drawings.forEach((d) => {
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineWidth = 1.5;

      if (d.type === 'vertical') {
        const pt = d.points[0];
        const screenCoords = getCoordinates(pt.index, pt.price, minPrice, maxPrice);
        ctx.beginPath();
        ctx.moveTo(screenCoords.x, 0);
        ctx.lineTo(screenCoords.x, charLayout.chartH);
        ctx.stroke();
        
        ctx.font = '9px sans-serif';
        ctx.fillText(d.label || 'V-Line', screenCoords.x + 4, 15);
      } else if (d.type === 'horizontal') {
        const pt = d.points[0];
        const screenCoords = getCoordinates(pt.index, pt.price, minPrice, maxPrice);
        ctx.beginPath();
        ctx.moveTo(0, screenCoords.y);
        ctx.lineTo(chartW, screenCoords.y);
        ctx.stroke();

        ctx.font = '9px sans-serif';
        ctx.fillText(pt.price.toFixed(pair.dec), chartW - 55, screenCoords.y - 4);
      } else if (d.type === 'trend' && d.points.length >= 2) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const p2 = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (d.type === 'rectangle' && d.points.length >= 2) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const p2 = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        
        ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
        ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      } else if (d.type === 'ray' && d.points.length >= 1) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(chartW + 9999, p1.y + (d.points.length >= 2 ? (getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice).y - p1.y) * 999 : 0));
        ctx.stroke();
        ctx.font = '9px sans-serif';
        ctx.fillText('→', p1.x + 4, p1.y - 3);
      } else if (d.type === 'channel' && d.points.length >= 2) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const p2 = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        const dy = p2.y - p1.y;
        const offset2 = d.points.length >= 3 ? (getCoordinates(d.points[2].index, d.points[2].price, minPrice, maxPrice).y - p1.y) : 30;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y + offset2); ctx.lineTo(p2.x, p2.y + offset2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = d.color + '18';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p2.x, p2.y + offset2); ctx.lineTo(p1.x, p1.y + offset2);
        ctx.closePath(); ctx.fill();
        void dy;
      } else if (d.type === 'extline' && d.points.length >= 2) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const p2 = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx*dx+dy*dy)||1;
        const ext = 9999;
        ctx.beginPath(); ctx.moveTo(p1.x - (dx/len)*ext, p1.y - (dy/len)*ext); ctx.lineTo(p2.x + (dx/len)*ext, p2.y + (dy/len)*ext); ctx.stroke();
      } else if (d.type === 'regression' && d.points.length >= 2) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const p2 = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        ctx.strokeStyle = d.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.setLineDash([3,3]); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y-20); ctx.lineTo(p2.x, p2.y-20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y+20); ctx.lineTo(p2.x, p2.y+20); ctx.stroke();
        ctx.setLineDash([]);
      } else if (d.type === 'pricerange' && d.points.length >= 2) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const p2 = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        const cx2 = (p1.x + p2.x)/2;
        ctx.strokeStyle = d.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p1.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p1.x,p2.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx2,p1.y); ctx.lineTo(cx2,p2.y); ctx.stroke();
        const pDiff = Math.abs(d.points[1].price - d.points[0].price);
        ctx.font='bold 9px monospace'; ctx.fillStyle=d.color; ctx.textAlign='center';
        ctx.fillText(`Δ${pDiff.toFixed(pair.dec)}`, cx2, (p1.y+p2.y)/2+4);
        ctx.textAlign='left';
      } else if (d.type === 'longpos' && d.points.length >= 2) {
        const entry = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const tp    = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        ctx.fillStyle='rgba(0,230,118,0.08)'; ctx.fillRect(entry.x, tp.y, chartW-entry.x, entry.y-tp.y);
        ctx.strokeStyle='rgba(0,230,118,0.7)'; ctx.lineWidth=1; ctx.strokeRect(entry.x, tp.y, chartW-entry.x, entry.y-tp.y);
        ctx.fillStyle='rgba(0,230,118,0.9)'; ctx.font='bold 9px monospace'; ctx.fillText('LONG ENTRY', entry.x+4, entry.y-4);
        ctx.fillText('TP', entry.x+4, tp.y+12);
      } else if (d.type === 'shortpos' && d.points.length >= 2) {
        const entry = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const sl    = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);
        ctx.fillStyle='rgba(255,61,87,0.08)'; ctx.fillRect(entry.x, entry.y, chartW-entry.x, sl.y-entry.y);
        ctx.strokeStyle='rgba(255,61,87,0.7)'; ctx.lineWidth=1; ctx.strokeRect(entry.x, entry.y, chartW-entry.x, sl.y-entry.y);
        ctx.fillStyle='rgba(255,61,87,0.9)'; ctx.font='bold 9px monospace'; ctx.fillText('SHORT ENTRY', entry.x+4, entry.y-4);
        ctx.fillText('SL', entry.x+4, sl.y+12);
      } else if (d.type === 'fib' && d.points.length >= 2) {
        const p1 = getCoordinates(d.points[0].index, d.points[0].price, minPrice, maxPrice);
        const p2 = getCoordinates(d.points[1].index, d.points[1].price, minPrice, maxPrice);

        const price1 = d.points[0].price;
        const price2 = d.points[1].price;
        const diff = price2 - price1;

        // Draw basic outer channel
        ctx.strokeStyle = 'rgba(99,118,175,0.25)';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p1.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.x, p2.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Standard fib levels: 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
        const levels = [
          { val: 0.0, label: '0.0%' },
          { val: 0.236, label: '23.6%' },
          { val: 0.382, label: '38.2%' },
          { val: 0.5, label: '50.0%' },
          { val: 0.618, label: '61.8%' },
          { val: 0.786, label: '78.6%' },
          { val: 1.0, label: '100.0%' },
        ];

        levels.forEach((lvl, stepIdx) => {
          const lPrice = price1 + diff * lvl.val;
          const lY = toY(lPrice);
          
          ctx.strokeStyle = `rgba(124, 58, 237, ${0.15 + (1 - lvl.val) * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(Math.min(p1.x, p2.x), lY);
          ctx.lineTo(Math.max(p1.x, p2.x), lY);
          ctx.stroke();

          ctx.font = '8.5px "DM Mono"';
          ctx.fillText(`Fib ${lvl.label} (${lPrice.toFixed(pair.dec)})`, Math.min(p1.x, p2.x) + 6, lY - 3);
        });
      }
    });

    // 9. DRAW RUNTIME BID/ASK PRICES AND TARGETS
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      const ly = toY(lastCandle.c);
      const isUp = lastCandle.c >= lastCandle.o;

      // Dashed actual line across entire chart window
      ctx.strokeStyle = isUp ? '#26a69a' : '#ef5350';
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(chartW, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating live current tag on right scale plate — price + candle-close countdown (TradingView style)
      const tfMs = parseTimeframeToMinutes(timeframe) * 60 * 1000;
      const remainSec = Math.floor(Math.max(0, tfMs - (Date.now() % tfMs)) / 1000);
      const cdH = Math.floor(remainSec / 3600);
      const cdM = Math.floor((remainSec % 3600) / 60);
      const cdS = remainSec % 60;
      const countdown = tfMs >= 3600000
        ? `${cdH}:${String(cdM).padStart(2, '0')}:${String(cdS).padStart(2, '0')}`
        : `${String(cdM).padStart(2, '0')}:${String(cdS).padStart(2, '0')}`;

      ctx.fillStyle = isUp ? '#26a69a' : '#ef5350';
      ctx.fillRect(chartW + 1, ly - 9, charLayout.priceW - 2, 29);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lastCandle.c.toFixed(pair.dec), chartW + charLayout.priceW / 2, ly + 3.5);
      ctx.font = '8.5px "DM Mono", monospace';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillText(countdown, chartW + charLayout.priceW / 2, ly + 15);
    }

    // Dynamic sub-panel Y position helpers (must be before first sub-panel usage)
    const activeSubs = SUB_PANELS_ORDER.filter(id => activeIndicators.has(id));
    const getPY = (id: string): number => {
      let y = charLayout.chartH + charLayout.timeH;
      for (const pid of activeSubs) {
        if (pid === id) return y;
        y += SUB_PANEL_H + SUB_PANEL_GAP;
      }
      return y;
    };
    const panelStart = (which: 'stoch' | 'adx' | 'obv' | 'wr' | 'mom') => {
      const map: Record<string, string> = { stoch:'stoch', adx:'adx', obv:'obv', wr:'willr', mom:'mom' };
      return getPY(map[which] || which);
    };
    void panelStart; // prevent unused warning if panelStart isn't referenced elsewhere

    // 10. RSI SUB-DRAWINGS
    if (showRSI) {
      const rsiYStart = getPY('rsi');
      const rsiH = SUB_PANEL_H;
      const rsiBottom = rsiYStart + rsiH;

      // Sub-axes background
      ctx.fillStyle = 'rgba(7, 11, 18, 0.4)';
      ctx.fillRect(0, rsiYStart, chartW, rsiH);

      // Horizontal oversold/overbought lines 30 and 70
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
      ctx.lineWidth = 0.5;

      const rsiToY = (val: number) => {
        return rsiBottom - (val / 100) * rsiH;
      };

      // Midline reference (50) and bounds (30,70)
      [30, 50, 70].forEach((level) => {
        const lvlY = rsiToY(level);
        ctx.beginPath();
        ctx.moveTo(0, lvlY);
        ctx.lineTo(chartW, lvlY);
        ctx.stroke();

        ctx.fillStyle = '#7986cb';
        ctx.font = '8.5px "DM Mono"';
        ctx.fillText(String(level), chartW + 6, lvlY + 3.5);
      });

      // Shaded central buffer
      ctx.fillStyle = 'rgba(124, 58, 237, 0.015)';
      ctx.fillRect(0, rsiToY(70), chartW, rsiToY(30) - rsiToY(70));

      // Draw the RSI Purple trend line
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      let rsiIdx = 0;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const val = rsiValues[actualIdx];
        if (val !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (rsiIdx === 0) {
            ctx.moveTo(posX, rsiToY(val));
          } else {
            ctx.lineTo(posX, rsiToY(val));
          }
          rsiIdx++;
        }
      });
      ctx.stroke();

      // Heading Label
      ctx.fillStyle = '#b3c5ff';
      ctx.font = 'bold 9px "Syne"';
      ctx.fillText(`RSI (14) - [${visibleCandles[visibleCandles.length - 1] ? (rsiValues[visibleStartIndex + visibleCandles.length - 1]?.toFixed(1) || 'N/A') : 'N/A'}]`, 12, rsiYStart + 12);
    }

    // 10b. CCI SUB-PANEL
    if (showCCI && cciValues.length) {
      const cciYStart = getPY('cci');
      const cciH = SUB_PANEL_H;
      const cciMid = cciYStart + cciH / 2;

      ctx.fillStyle = 'rgba(7,11,18,0.4)';
      ctx.fillRect(0, cciYStart, chartW, cciH);

      const maxCCIAbs = Math.max(100, ...visibleCandles.map((_, i) => Math.abs(cciValues[visibleStartIndex + i] ?? 0)));
      const cciToY = (v: number) => cciMid - (v / maxCCIAbs) * (cciH / 2);

      [-100, 0, 100].forEach(lv => {
        const ly = cciToY(lv);
        ctx.strokeStyle = lv === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,193,7,0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(chartW, ly); ctx.stroke();
        ctx.fillStyle = '#7986cb'; ctx.font = '8.5px "DM Mono"';
        ctx.fillText(String(lv), chartW + 6, ly + 3.5);
      });

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let cs = false;
      visibleCandles.forEach((_c, idx) => {
        const v = cciValues[visibleStartIndex + idx];
        if (v == null) return;
        const px = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
        if (!cs) { ctx.moveTo(px, cciToY(v)); cs = true; } else { ctx.lineTo(px, cciToY(v)); }
      });
      ctx.stroke();

      ctx.fillStyle = '#b3c5ff'; ctx.font = 'bold 9px "Syne"';
      ctx.fillText('CCI (20)', 12, cciYStart + 12);
    }

    // 11. MACD SUB-DRAWINGS
    if (showMACD) {
      const macdYStart = getPY('macd');
      const macdH = SUB_PANEL_H;
      const macdBottom = macdYStart + macdH;

      ctx.fillStyle = 'rgba(7, 11, 18, 0.4)';
      ctx.fillRect(0, macdYStart, chartW, macdH);

      // Find highest absolute macd value to scale histogram bounds dynamically
      let maxMacdAbs = 0.0001;
      const validMacds = macdData.macd.slice(visibleStartIndex, visibleEndIndex).filter((x) => x !== null) as number[];
      const validSignals = macdData.signal.slice(visibleStartIndex, visibleEndIndex).filter((x) => x !== null) as number[];
      const validHists = macdData.hist.slice(visibleStartIndex, visibleEndIndex).filter((x) => x !== null) as number[];
      
      const allVals = [...validMacds, ...validSignals, ...validHists];
      if (allVals.length > 0) {
        maxMacdAbs = Math.max(...allVals.map(Math.abs)) * 1.15;
      }

      const macdToY = (v: number) => {
        // center line represents 0
        const mid = macdYStart + macdH / 2;
        return mid - (v / maxMacdAbs) * (macdH / 2);
      };

      // Draw zero center line
      ctx.strokeStyle = 'rgba(99,118,175,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, macdToY(0));
      ctx.lineTo(chartW, macdToY(0));
      ctx.stroke();

      ctx.fillStyle = '#7986cb';
      ctx.font = '8.5px "DM Mono"';
      ctx.fillText('0.00', chartW + 6, macdToY(0) + 3.5);

      // Draw Histogram columns
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const val = macdData.hist[actualIdx];
        if (val !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step;
          const cx = posX + candleW / 2;
          const hW = Math.max(1, candleW * 0.6);
          
          const yZero = macdToY(0);
          const yVal = macdToY(val);

          ctx.fillStyle = val >= 0 ? 'rgba(0, 230, 118, 0.45)' : 'rgba(255, 61, 87, 0.45)';
          ctx.fillRect(cx - hW / 2, Math.min(yZero, yVal), hW, Math.abs(yZero - yVal));
        }
      });

      // Draw standard MACD lines
      // MACD Line (Cyan)
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let startedMacd = false;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const val = macdData.macd[actualIdx];
        if (val !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!startedMacd) {
            ctx.moveTo(posX, macdToY(val));
            startedMacd = true;
          } else {
            ctx.lineTo(posX, macdToY(val));
          }
        }
      });
      ctx.stroke();

      // Signal Line (Orange)
      ctx.strokeStyle = '#ff9100';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let startedSignal = false;
      visibleCandles.forEach((c, idx) => {
        const actualIdx = visibleStartIndex + idx;
        const val = macdData.signal[actualIdx];
        if (val !== null) {
          const posX = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
          if (!startedSignal) {
            ctx.moveTo(posX, macdToY(val));
            startedSignal = true;
          } else {
            ctx.lineTo(posX, macdToY(val));
          }
        }
      });
      ctx.stroke();

      // Heading Label
      ctx.fillStyle = '#b3c5ff';
      ctx.font = 'bold 9px "Syne"';
      ctx.fillText('MACD (12, 26, 9)', 12, macdYStart + 12);
    }

    // (getPY and panelStart already declared above, before RSI section)

    // Helper to draw a simple sub-panel line
    const drawSubLine = (vals: (number|null)[], yStart: number, pH: number, vMin: number, vMax: number, color: string, lw = 1.2) => {
      const vRange = vMax - vMin || 1;
      const toSubY = (v: number) => yStart + pH - ((v - vMin) / vRange) * pH;
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      let started = false;
      visibleCandles.forEach((_c, idx) => {
        const v = vals[visibleStartIndex + idx];
        if (v == null) return;
        const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
        if (!started) { ctx.moveTo(x, toSubY(v)); started = true; } else { ctx.lineTo(x, toSubY(v)); }
      });
      ctx.stroke();
    };

    // 11. STOCHASTIC SUB-PANEL
    if (showStoch && stochData.k.length) {
      const yS = panelStart('stoch');
      const pH = SUB_PANEL_H;
      ctx.fillStyle = 'rgba(7,11,18,0.5)';
      ctx.fillRect(0, yS, chartW, pH);
      ctx.strokeStyle = 'rgba(99,118,175,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, yS); ctx.lineTo(chartW, yS); ctx.stroke();
      // Overbought/oversold zones
      ctx.fillStyle = 'rgba(239,68,68,0.06)';
      ctx.fillRect(0, yS, chartW, pH * 0.2); // 80-100
      ctx.fillStyle = 'rgba(34,197,94,0.06)';
      ctx.fillRect(0, yS + pH * 0.8, chartW, pH * 0.2); // 0-20
      // Reference lines
      ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 0.7; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(0, yS + pH * 0.2); ctx.lineTo(chartW, yS + pH * 0.2); ctx.stroke();
      ctx.strokeStyle = 'rgba(34,197,94,0.3)';
      ctx.beginPath(); ctx.moveTo(0, yS + pH * 0.8); ctx.lineTo(chartW, yS + pH * 0.8); ctx.stroke();
      ctx.setLineDash([]);
      drawSubLine(stochData.k, yS, pH, 0, 100, '#a3e635', 1.3); // %K lime
      drawSubLine(stochData.d, yS, pH, 0, 100, '#fb923c', 1.1); // %D orange
      const curK = stochData.k[visibleStartIndex + visibleCandles.length - 1];
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px monospace';
      ctx.fillText(`Stoch(14,3) K:${curK?.toFixed(1) ?? '-'}`, 8, yS + 11);
    }

    // 12. ADX SUB-PANEL
    if (showADX && adxData.adx.length) {
      const yS = panelStart('adx');
      const pH = SUB_PANEL_H;
      ctx.fillStyle = 'rgba(7,11,18,0.5)';
      ctx.fillRect(0, yS, chartW, pH);
      ctx.strokeStyle = 'rgba(99,118,175,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, yS); ctx.lineTo(chartW, yS); ctx.stroke();
      // ADX 25 threshold
      const toAdxY = (v: number) => yS + pH - (v / 100) * pH;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(0, toAdxY(25)); ctx.lineTo(chartW, toAdxY(25)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '8px monospace';
      ctx.fillText('25', 2, toAdxY(25) - 2);
      drawSubLine(adxData.adx, yS, pH, 0, 100, '#f8fafc', 1.5);   // ADX white
      drawSubLine(adxData.diPlus, yS, pH, 0, 100, '#22c55e', 1.1); // +DI green
      drawSubLine(adxData.diMinus, yS, pH, 0, 100, '#ef4444', 1.1); // -DI red
      const curAdx = adxData.adx[visibleStartIndex + visibleCandles.length - 1];
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px monospace';
      ctx.fillText(`ADX(14): ${curAdx?.toFixed(1) ?? '-'}`, 8, yS + 11);
    }

    // 13. OBV SUB-PANEL
    if (showOBV && obvValues.length) {
      const yS = panelStart('obv');
      const pH = SUB_PANEL_H;
      const obvSlice = obvValues.slice(visibleStartIndex, visibleEndIndex) as number[];
      const obvMin = Math.min(...obvSlice.filter(v => v != null));
      const obvMax = Math.max(...obvSlice.filter(v => v != null));
      const obvRange = obvMax - obvMin || 1;
      ctx.fillStyle = 'rgba(7,11,18,0.5)';
      ctx.fillRect(0, yS, chartW, pH);
      ctx.strokeStyle = 'rgba(99,118,175,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, yS); ctx.lineTo(chartW, yS); ctx.stroke();
      drawSubLine(obvValues, yS, pH, obvMin, obvMax, '#38bdf8', 1.3);
      // Fill under OBV line
      ctx.fillStyle = 'rgba(56,189,248,0.08)';
      ctx.beginPath();
      let firstX2 = -1;
      visibleCandles.forEach((_c, idx) => {
        const v = obvValues[visibleStartIndex + idx] as number;
        if (v == null) return;
        const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step + candleW / 2;
        const y2 = yS + pH - ((v - obvMin) / obvRange) * pH;
        if (firstX2 < 0) { ctx.moveTo(x, yS + pH); ctx.lineTo(x, y2); firstX2 = x; } else { ctx.lineTo(x, y2); }
      });
      if (firstX2 >= 0) { ctx.lineTo(chartW - step/2, yS + pH); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px monospace';
      ctx.fillText('OBV', 8, yS + 11);
    }

    // 14. WILLIAMS %R SUB-PANEL
    if (showWilliamsR && wrValues.length) {
      const yS = panelStart('wr');
      const pH = SUB_PANEL_H;
      ctx.fillStyle = 'rgba(7,11,18,0.5)';
      ctx.fillRect(0, yS, chartW, pH);
      ctx.strokeStyle = 'rgba(99,118,175,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, yS); ctx.lineTo(chartW, yS); ctx.stroke();
      const toWrY = (v: number) => yS + ((v + 100) / 100) * pH;
      // Overbought (-20) / oversold (-80)
      [[-20, 'rgba(239,68,68,0.3)'], [-80, 'rgba(34,197,94,0.3)']].forEach(([lvl, col]) => {
        ctx.strokeStyle = col as string; ctx.setLineDash([3,3]); ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0, toWrY(lvl as number)); ctx.lineTo(chartW, toWrY(lvl as number)); ctx.stroke();
      });
      ctx.setLineDash([]);
      drawSubLine(wrValues, yS, pH, -100, 0, '#c084fc', 1.3);
      const curWr = wrValues[visibleStartIndex + visibleCandles.length - 1];
      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px monospace';
      ctx.fillText(`Williams %R(14): ${curWr?.toFixed(1) ?? '-'}`, 8, yS + 11);
    }

    // 15. MOMENTUM / AO SUB-PANEL
    if ((showMomentum || showAO) && (momentumValues.length || aoValues.length)) {
      const yS = panelStart('mom');
      const pH = SUB_PANEL_H;
      ctx.fillStyle = 'rgba(7,11,18,0.5)';
      ctx.fillRect(0, yS, chartW, pH);
      ctx.strokeStyle = 'rgba(99,118,175,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, yS); ctx.lineTo(chartW, yS); ctx.stroke();
      const vals = showMomentum ? momentumValues : aoValues;
      const slice = vals.slice(visibleStartIndex, visibleEndIndex).filter((v): v is number => v != null);
      if (slice.length) {
        const vMin = Math.min(...slice), vMax = Math.max(...slice);
        const absMax = Math.max(Math.abs(vMin), Math.abs(vMax)) || 1;
        // Zero line
        const zeroY = yS + pH / 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(chartW, zeroY); ctx.stroke();
        // Histogram
        visibleCandles.forEach((_c, idx) => {
          const v = vals[visibleStartIndex + idx];
          if (v == null) return;
          const x = chartW - (visibleCandles.length + RIGHT_MARGIN_CANDLES -idx) * step;
          const barH = (Math.abs(v) / absMax) * (pH / 2);
          const barY = v >= 0 ? zeroY - barH : zeroY;
          ctx.fillStyle = v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)';
          ctx.fillRect(x + 1, barY, Math.max(1, candleW - 2), barH);
        });
        ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px monospace';
        ctx.fillText(showMomentum ? 'Momentum(10)' : 'Awesome Osc', 8, yS + 11);
      }
    }

    // ── GENERIC SUB-PANEL HELPER ─────────────────────────────────────────────
    const renderSPBg = (yS: number) => {
      ctx.fillStyle='rgba(7,11,18,0.5)'; ctx.fillRect(0,yS,chartW,SUB_PANEL_H);
      ctx.strokeStyle='rgba(99,118,175,0.15)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,yS); ctx.lineTo(chartW,yS); ctx.stroke();
    };
    const drawSPLine = (vals:(number|null)[],yS:number,vMin:number,vMax:number,col:string,lw=1.2) => {
      const vR=vMax-vMin||1; const toSY=(v:number)=>yS+SUB_PANEL_H-((v-vMin)/vR)*SUB_PANEL_H;
      ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); let s=false;
      visibleCandles.forEach((_,idx)=>{ const v=vals[visibleStartIndex+idx]; if(v==null)return; const x=chartW-(visibleCandles.length-idx)*step+candleW/2; if(!s){ctx.moveTo(x,toSY(v));s=true;}else ctx.lineTo(x,toSY(v)); }); ctx.stroke();
    };
    const spLabel = (yS:number,txt:string) => { ctx.fillStyle='#94a3b8'; ctx.font='bold 9px monospace'; ctx.fillText(txt,8,yS+11); };
    const spRefLine = (yS:number,val:number,vMin:number,vMax:number,col:string) => {
      const vR=vMax-vMin||1; const y=yS+SUB_PANEL_H-((val-vMin)/vR)*SUB_PANEL_H;
      ctx.strokeStyle=col; ctx.lineWidth=0.7; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(chartW,y); ctx.stroke(); ctx.setLineDash([]);
    };

    // 16. STOCHRSI
    if (showStochRSI && stochRSIData) {
      const yS=getPY('stochrsi'); renderSPBg(yS);
      spRefLine(yS,80,0,100,'rgba(239,68,68,0.4)'); spRefLine(yS,20,0,100,'rgba(34,197,94,0.4)');
      drawSPLine(stochRSIData.k,yS,0,100,'#fb923c',1.3);
      drawSPLine(stochRSIData.d,yS,0,100,'#38bdf8',1.1);
      const curK=stochRSIData.k[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`StochRSI K:${curK?.toFixed(1)??'-'}`);
    }

    // 17. MFI
    if (showMFI && mfiValues.length) {
      const yS=getPY('mfi'); renderSPBg(yS);
      spRefLine(yS,80,0,100,'rgba(239,68,68,0.4)'); spRefLine(yS,20,0,100,'rgba(34,197,94,0.4)');
      drawSPLine(mfiValues,yS,0,100,'#38bdf8',1.3);
      const cur=mfiValues[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`MFI(14): ${cur?.toFixed(1)??'-'}`);
    }

    // 18. CMF
    if (showCMF && cmfValues.length) {
      const yS=getPY('cmf'); renderSPBg(yS);
      const zY=yS+SUB_PANEL_H/2;
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(0,zY); ctx.lineTo(chartW,zY); ctx.stroke();
      visibleCandles.forEach((_,idx)=>{ const v=cmfValues[visibleStartIndex+idx]; if(v==null)return; const x=chartW-(visibleCandles.length-idx)*step; const bH=Math.abs(v)*(SUB_PANEL_H/2); const bY=v>=0?zY-bH:zY; ctx.fillStyle=v>=0?'rgba(74,222,128,0.7)':'rgba(248,113,113,0.7)'; ctx.fillRect(x+1,bY,Math.max(1,candleW-1),bH); });
      spLabel(yS,'CMF(20)');
    }

    // 19. AROON
    if (showAroon && aroonData) {
      const yS=getPY('aroon'); renderSPBg(yS);
      spRefLine(yS,50,0,100,'rgba(255,255,255,0.15)');
      drawSPLine(aroonData.aroonUp,yS,0,100,'#34d399',1.3);
      drawSPLine(aroonData.aroonDown,yS,0,100,'#f87171',1.3);
      const cur=aroonData.aroonUp[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`Aroon(25) Up:${cur?.toFixed(0)??'-'}`);
    }

    // 20. CMO
    if (showCMO && cmoValues.length) {
      const yS=getPY('cmo'); renderSPBg(yS);
      spRefLine(yS,50,-100,100,'rgba(239,68,68,0.3)'); spRefLine(yS,-50,-100,100,'rgba(34,197,94,0.3)'); spRefLine(yS,0,-100,100,'rgba(255,255,255,0.15)');
      drawSPLine(cmoValues,yS,-100,100,'#fb7185',1.3);
      const cur=cmoValues[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`CMO(14): ${cur?.toFixed(1)??'-'}`);
    }

    // 21. PPO
    if (showPPO && ppoData) {
      const yS=getPY('ppo'); renderSPBg(yS);
      const sl=ppoData.ppo.slice(visibleStartIndex,visibleEndIndex).filter((v):v is number=>v!=null);
      const absMax=sl.length?Math.max(...sl.map(Math.abs))*1.2||0.01:0.01;
      const zY=yS+SUB_PANEL_H/2;
      visibleCandles.forEach((_,idx)=>{ const v=ppoData.hist[visibleStartIndex+idx]; if(v==null)return; const x=chartW-(visibleCandles.length-idx)*step; const bH=Math.abs(v)/absMax*(SUB_PANEL_H/2); const bY=v>=0?zY-bH:zY; ctx.fillStyle=v>=0?'rgba(96,165,250,0.5)':'rgba(248,113,113,0.5)'; ctx.fillRect(x+1,bY,Math.max(1,candleW-1),bH); });
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(0,zY); ctx.lineTo(chartW,zY); ctx.stroke();
      drawSPLine(ppoData.ppo,yS,-absMax,absMax,'#60a5fa',1.3);
      drawSPLine(ppoData.signal,yS,-absMax,absMax,'#fb923c',1.1);
      spLabel(yS,'PPO(12,26)');
    }

    // 22. BB %B
    if (showBBPctB && bbPctBValues.length) {
      const yS=getPY('bbpctb'); renderSPBg(yS);
      spRefLine(yS,1,0,1.2,'rgba(239,68,68,0.3)'); spRefLine(yS,0,0,1.2,'rgba(34,197,94,0.3)'); spRefLine(yS,0.5,0,1.2,'rgba(255,255,255,0.15)');
      drawSPLine(bbPctBValues,yS,0,1.2,'#a78bfa',1.3);
      const cur=bbPctBValues[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`BB %B: ${cur?.toFixed(2)??'-'}`);
    }

    // 23. BB WIDTH
    if (showBBWidth && bbWidthValues.length) {
      const sl=bbWidthValues.slice(visibleStartIndex,visibleEndIndex).filter((v):v is number=>v!=null);
      const vMax=sl.length?Math.max(...sl)*1.1:1;
      const yS=getPY('bbwidth'); renderSPBg(yS);
      drawSPLine(bbWidthValues,yS,0,vMax,'#6ee7b7',1.3);
      spLabel(yS,'BB Width');
    }

    // 24. VORTEX
    if (showVortex && vortexData) {
      const yS=getPY('vortex'); renderSPBg(yS);
      spRefLine(yS,1,0,2.5,'rgba(255,255,255,0.15)');
      drawSPLine(vortexData.viPlus,yS,0,2.5,'#4ade80',1.3);
      drawSPLine(vortexData.viMinus,yS,0,2.5,'#f87171',1.3);
      spLabel(yS,'Vortex(14)');
    }

    // 25. ELDER RAY
    if (showElderRay && elderRayData) {
      const yS=getPY('elderray'); renderSPBg(yS);
      const sl=[...elderRayData.bullPower,...elderRayData.bearPower].filter((v):v is number=>v!=null);
      const absMax=sl.length?Math.max(...sl.map(Math.abs))*1.2||0.001:0.001;
      const zY=yS+SUB_PANEL_H/2;
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(0,zY); ctx.lineTo(chartW,zY); ctx.stroke();
      visibleCandles.forEach((_,idx)=>{ const b=elderRayData.bullPower[visibleStartIndex+idx]; if(b==null)return; const x=chartW-(visibleCandles.length-idx)*step; const bH=Math.abs(b)/absMax*(SUB_PANEL_H/2); const bY=b>=0?zY-bH:zY; ctx.fillStyle='rgba(74,222,128,0.6)'; ctx.fillRect(x+1,bY,Math.max(1,candleW-1),bH); });
      visibleCandles.forEach((_,idx)=>{ const b=elderRayData.bearPower[visibleStartIndex+idx]; if(b==null)return; const x=chartW-(visibleCandles.length-idx)*step; const bH=Math.abs(b)/absMax*(SUB_PANEL_H/2); const bY=b>=0?zY-bH:zY; ctx.fillStyle='rgba(248,113,113,0.6)'; ctx.fillRect(x+1,bY,Math.max(1,candleW-1),bH); });
      spLabel(yS,'Elder Ray');
    }

    // 26. NORM RSI
    if (showNormRSI && normRSIValues.length) {
      const yS=getPY('normrsi'); renderSPBg(yS);
      spRefLine(yS,70,-100,100,'rgba(239,68,68,0.3)'); spRefLine(yS,-70,-100,100,'rgba(34,197,94,0.3)'); spRefLine(yS,0,-100,100,'rgba(255,255,255,0.15)');
      drawSPLine(normRSIValues,yS,-100,100,'#c084fc',1.3);
      const cur=normRSIValues[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`NormRSI: ${cur?.toFixed(1)??'-'}`);
    }

    // 27. KST
    if (showKST && kstData) {
      const yS=getPY('kst'); renderSPBg(yS);
      const sl=[...kstData.kst,...kstData.signal].filter((v):v is number=>v!=null);
      const absMax=sl.length?Math.max(...sl.map(Math.abs))*1.2||1:1;
      const zY=yS+SUB_PANEL_H/2;
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(0,zY); ctx.lineTo(chartW,zY); ctx.stroke();
      drawSPLine(kstData.kst,yS,-absMax,absMax,'#fbbf24',1.3);
      drawSPLine(kstData.signal,yS,-absMax,absMax,'#f87171',1.1);
      spLabel(yS,'KST');
    }

    // 28. QQE
    if (showQQE && qqeData) {
      const yS=getPY('qqe'); renderSPBg(yS);
      const sl=[...qqeData.qqe,...qqeData.signal].filter((v):v is number=>v!=null);
      const absMax=sl.length?Math.max(...sl.map(Math.abs))*1.2||1:1;
      const zY=yS+SUB_PANEL_H/2;
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(0,zY); ctx.lineTo(chartW,zY); ctx.stroke();
      drawSPLine(qqeData.qqe,yS,-absMax,absMax,'#34d399',1.3);
      drawSPLine(qqeData.signal,yS,-absMax,absMax,'#fb923c',1.1);
      spLabel(yS,'QQE');
    }

    // 29. A/D LINE
    if (showADLine && adLineValues.length) {
      const sl=adLineValues.slice(visibleStartIndex,visibleEndIndex).filter((v):v is number=>v!=null);
      const vMin=sl.length?Math.min(...sl):0; const vMax=sl.length?Math.max(...sl):1;
      const yS=getPY('adline'); renderSPBg(yS);
      drawSPLine(adLineValues,yS,vMin,vMax,'#34d399',1.3);
      spLabel(yS,'A/D Line');
    }

    // 30. FORCE INDEX
    if (showForceIndex && forceIndexValues.length) {
      const sl=forceIndexValues.slice(visibleStartIndex,visibleEndIndex).filter((v):v is number=>v!=null);
      const absMax=sl.length?Math.max(...sl.map(Math.abs))*1.2||1:1;
      const yS=getPY('forceindex'); renderSPBg(yS);
      const zY=yS+SUB_PANEL_H/2;
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(0,zY); ctx.lineTo(chartW,zY); ctx.stroke();
      visibleCandles.forEach((_,idx)=>{ const v=forceIndexValues[visibleStartIndex+idx]; if(v==null)return; const x=chartW-(visibleCandles.length-idx)*step; const bH=Math.abs(v)/absMax*(SUB_PANEL_H/2); const bY=v>=0?zY-bH:zY; ctx.fillStyle=v>=0?'rgba(251,146,60,0.7)':'rgba(251,146,60,0.3)'; ctx.fillRect(x+1,bY,Math.max(1,candleW-1),bH); });
      spLabel(yS,'Force Index(13)');
    }

    // 31. VOLUME RSI
    if (showVolumeRSI && volumeRSIValues.length) {
      const yS=getPY('volumersi'); renderSPBg(yS);
      spRefLine(yS,70,0,100,'rgba(239,68,68,0.3)'); spRefLine(yS,30,0,100,'rgba(34,197,94,0.3)'); spRefLine(yS,50,0,100,'rgba(255,255,255,0.15)');
      drawSPLine(volumeRSIValues,yS,0,100,'#a78bfa',1.3);
      const cur=volumeRSIValues[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`Vol RSI: ${cur?.toFixed(1)??'-'}`);
    }

    // 32. HISTORICAL VOLATILITY
    if (showHV && hvValues.length) {
      const sl=hvValues.slice(visibleStartIndex,visibleEndIndex).filter((v):v is number=>v!=null);
      const vMax=sl.length?Math.max(...sl)*1.1:100;
      const yS=getPY('hv'); renderSPBg(yS);
      drawSPLine(hvValues,yS,0,vMax,'#f97316',1.3);
      const cur=hvValues[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`HV(20): ${cur?.toFixed(1)??'-'}%`);
    }

    // 33. ATR %
    if (showATRPct && atrPctValues.length) {
      const sl=atrPctValues.slice(visibleStartIndex,visibleEndIndex).filter((v):v is number=>v!=null);
      const vMax=sl.length?Math.max(...sl)*1.1:1;
      const yS=getPY('atrpct'); renderSPBg(yS);
      drawSPLine(atrPctValues,yS,0,vMax,'#e879f9',1.3);
      const cur=atrPctValues[visibleStartIndex+visibleCandles.length-1];
      spLabel(yS,`ATR%(14): ${cur?.toFixed(3)??'-'}`);
    }

    // 34. ULCER INDEX
    if (showUlcerIndex && ulcerValues.length) {
      const sl=ulcerValues.slice(visibleStartIndex,visibleEndIndex).filter((v):v is number=>v!=null);
      const vMax=sl.length?Math.max(...sl)*1.1:10;
      const yS=getPY('ulcerindex'); renderSPBg(yS);
      drawSPLine(ulcerValues,yS,0,vMax,'#fb7185',1.3);
      spLabel(yS,'Ulcer Index(14)');
    }

  }, [charLayout, visibleCandles, visibleStartIndex, pair, activeIndicatorsKey, drawings, chartType,
      showSMC, smcData, candles,
      ma20Line, ma50Line, ema9Line, ema21Line, ema50Line, ema200Line,
      bbBands, superTrendData, vwapLine, cciValues, patternMarkers,
      stochData, sarValues, adxData, wrValues, pivotPoints, keltnerData, obvValues, momentumValues, aoValues,
      demaLine, temaLine, hmaLine, smmaLine, zlemaLine, mcginleyLine, lrLineLine, lrChannelData,
      donchianData, ichimokuData, alligatorData, chandelierData, atrBandsData, fractalData, vemaLine,
      stochRSIData, mfiValues, cmfValues, aroonData, cmoValues, ppoData, bbPctBValues, bbWidthValues,
      vortexData, elderRayData, normRSIValues, kstData, qqeData,
      adLineValues, forceIndexValues, volumeRSIValues, hvValues, atrPctValues, ulcerValues]);

  // EFFECT TO HANDLE INTERACTIVE CROSSHAIR AND OVERLAY
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, charLayout.W, charLayout.H);

    if (!hoverCoord) return;
    const { x, y } = hoverCoord;

    const chartW = charLayout.W - charLayout.priceW;
    if (x < 0 || x > chartW) return;

    // Get current visible price boundaries
    const highs = visibleCandles.map((c) => c.h);
    const lows = visibleCandles.map((c) => c.l);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);
    const prPadding = (maxPrice - minPrice) * 0.08 || 0.0002;
    maxPrice += prPadding;
    minPrice -= prPadding;

    // Standard crosshair tracing wires
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, charLayout.H);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(charLayout.W, y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Extract current matched hovered candle block
    const step = candleW + 2;
    const totalVisW = visibleCandles.length * step;
    const startX = chartW - totalVisW;
    const localIdx = Math.floor((x - startX) / step);

    if (localIdx >= 0 && localIdx < visibleCandles.length) {
      const c = visibleCandles[localIdx];
      // Display current values on upper toolbar indicator state
      const ohlcText = `O:${c.o.toFixed(pair.dec)}  H:${c.h.toFixed(pair.dec)}  L:${c.l.toFixed(pair.dec)}  C:${c.c.toFixed(pair.dec)}  Vol:${Math.round(c.v)}`;
      
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(8, 8, ctx.measureText(ohlcText).width + 16, 18);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.strokeRect(8, 8, ctx.measureText(ohlcText).width + 16, 18);

      ctx.fillStyle = '#00d4ff';
      ctx.font = '500 9.5px "DM Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ohlcText, 16, 21);

      // Display floating time ticker tag at the bottom axis
      const date = new Date(c.t);
      const dayStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const hourStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const timeFmt = `${dayStr} ${hourStr}`;

      const tTagW = ctx.measureText(timeFmt).width + 14;
      const tTagX = Math.max(0, Math.min(x - tTagW / 2, chartW - tTagW));
      ctx.fillStyle = '#5c6bc0';
      ctx.fillRect(tTagX, charLayout.chartH + 2, tTagW, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '9.5px "DM Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(timeFmt, tTagX + tTagW / 2, charLayout.chartH + 13);
    }

    // Floating actual hover price tag on right axes plate
    const priceRng = maxPrice - minPrice || 0.001;
    const hoverVal = minPrice + (1 - y / charLayout.chartH) * priceRng;

    if (y >= 0 && y <= charLayout.chartH) {
      const pTagY = y;
      const pTagText = hoverVal.toFixed(pair.dec);
      ctx.fillStyle = '#263238';
      ctx.fillRect(chartW + 1, pTagY - 8, charLayout.priceW - 2, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.strokeRect(chartW + 1, pTagY - 8, charLayout.priceW - 2, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = '500 9.5px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pTagText, chartW + charLayout.priceW / 2, pTagY + 3.5);
    }

    // Trace prospective drawing shape in real-time
    if (drawingType !== 'none' && drawProgress) {
      const p1 = getCoordinates(drawProgress.index, drawProgress.price, minPrice, maxPrice);
      const prLogical = getLogicalValues(hoverCoord.x + overlayCanvasRef.current.getBoundingClientRect().left, hoverCoord.y + overlayCanvasRef.current.getBoundingClientRect().top, minPrice, maxPrice);
      
      if (prLogical) {
        ctx.strokeStyle = '#00d4ff';
        ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
        ctx.lineWidth = 1.5;

        if (drawingType === 'trend') {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (drawingType === 'rectangle') {
          ctx.fillRect(p1.x, p1.y, x - p1.x, y - p1.y);
          ctx.strokeRect(p1.x, p1.y, x - p1.x, y - p1.y);
        } else if (drawingType === 'fib') {
          // outer bounds mock
          ctx.strokeRect(p1.x, p1.y, x - p1.x, y - p1.y);
          ctx.font = '9px sans-serif';
          ctx.fillStyle = '#00d4ff';
          ctx.fillText('Fib Retracement', p1.x + 6, p1.y + 12);
        }
      }
    }

  }, [hoverCoord, charLayout, visibleCandles, candleW, visibleStartIndex, pair, drawingType, drawProgress, drawings]);

  // OVERLAY ACTIONS (MOUSE DOWN, MOUSE MOVE, MOUSE UP)
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Left-click captures
    const highs = visibleCandles.map((c) => c.h);
    const lows = visibleCandles.map((c) => c.l);
    let maxPrice = Math.max(...highs);
    let minPrice = Math.min(...lows);
    const prPadding = (maxPrice - minPrice) * 0.08 || 0.0002;
    maxPrice += prPadding;
    minPrice -= prPadding;

    const logical = getLogicalValues(e.clientX, e.clientY, minPrice, maxPrice);
    if (!logical) return;

    if (drawingType !== 'none') {
      // Placing drawing points
      if (!drawProgress) {
        // Step 1: Capture first anchor point
        setDrawProgress({ index: logical.index, price: logical.price });

        // Fast static paths (e.g. horizontal, vertical lines) resolve immediately
        if (drawingType === 'horizontal') {
          const newTool: DrawingTool = {
            id: `draw-${Date.now()}`,
            type: 'horizontal',
            points: [{ index: logical.index, price: logical.price }],
            color: '#ffa726',
            label: `Horizontal @ ${logical.price.toFixed(pair.dec)}`,
          };
          setDrawings((prev) => [...prev, newTool]);
          setDrawingType('none');
          setDrawProgress(null);
        } else if (drawingType === 'vertical') {
          const newTool: DrawingTool = {
            id: `draw-${Date.now()}`,
            type: 'vertical',
            points: [{ index: logical.index, price: logical.price }],
            color: '#26a69a',
            label: `Vertical Anchor Line`,
          };
          setDrawings((prev) => [...prev, newTool]);
          setDrawingType('none');
          setDrawProgress(null);
        }
      } else {
        // Step 2: Create complete complex lines (Trend, Fib channels, Rectangles)
        const newTool: DrawingTool = {
          id: `draw-${Date.now()}`,
          type: drawingType as DrawingTool['type'],
          points: [
            { index: drawProgress.index, price: drawProgress.price },
            { index: logical.index, price: logical.price },
          ],
          color: drawingType === 'trend' ? '#26c6da' : drawingType === 'fib' ? '#ab47bc' : drawingType === 'ray' ? '#22d3ee' : drawingType === 'channel' ? '#a78bfa' : '#ff7043',
          label: `${drawingType.toUpperCase()} - Interactive`,
        };
        setDrawings((prev) => [...prev, newTool]);
        setDrawingType('none');
        setDrawProgress(null);
      }
    } else {
      // Standard Drag offset chart window
      setIsHolding(true);
      dragStartRef.current = {
        clientX: e.clientX,
        offset: offset,
      };
    }
  };

  // Premium, cursor-relative zoom helper for ultra-smooth scrolling
  const zoomAtX = (zoomIn: boolean, clientX: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || processedCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const hoverX = clientX - rect.left;

    const chartW = charLayout.W - charLayout.priceW;
    // Do not zoom if mouse hover is off the main price chart region
    if (hoverX < 0 || hoverX > chartW) return;

    setForce100(false); // Disable auto-scaling when manually zooming

    // TradingView-style percentage zoom multiplier for ultra-smooth scrolling
    const zoomFactor = 1.10;
    const prevCandleW = candleW;
    let nextCandleW = prevCandleW;

    if (zoomIn) {
      nextCandleW = Math.min(60, prevCandleW * zoomFactor);
    } else {
      nextCandleW = Math.max(1.8, prevCandleW / zoomFactor);
    }

    if (Math.abs(nextCandleW - prevCandleW) < 0.01) return;

    // Identify standard logical candle index directly under mouse pointer
    const step = prevCandleW + 2;
    const totalVisW = visibleCandles.length * step;
    const startX = chartW - totalVisW;
    const localIdx = Math.floor((hoverX - startX) / step);
    const index = Math.max(visibleStartIndex, Math.min(visibleEndIndex - 1, visibleStartIndex + localIdx));

    // Calculate new candle offset so the same logical index stays perfectly pinned under hoverX
    const newStep = nextCandleW + 2;
    let nextOffset = processedCandles.length - index - (chartW + nextCandleW / 2 - hoverX) / newStep;
    nextOffset = Math.max(0, Math.min(processedCandles.length - 5, Math.round(nextOffset)));

    setCandleW(nextCandleW);
    setOffset(nextOffset);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverCoord({ x, y });

    // Handle viewport sliding drag
    if (isHolding && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.clientX;
      if (Math.abs(dx) > 1) {
        setForce100(false); // Disable auto-scaling when dragging
      }
      const step = candleW + 2;
      const moveCount = Math.round(dx / step);
      const nextOffset = Math.max(0, Math.min(processedCandles.length - 5, dragStartRef.current.offset + moveCount));
      setOffset(nextOffset);
    }
  };

  const handleOverlayMouseUp = () => {
    setIsHolding(false);
    dragStartRef.current = null;
  };

  const handleOverlayWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomIn = e.deltaY < 0;
    zoomAtX(zoomIn, e.clientX);
  };

  // Touch gesture support for mobile & tablets (pan and pinch zoom)
  const handleOverlayTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        clientX: touch.clientX,
        offset: offset,
        pinchDistance: null,
        pinchCandleW: candleW,
        centerX: touch.clientX,
      };

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setHoverCoord({ x, y });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const cx = (t1.clientX + t2.clientX) / 2;

      touchStartRef.current = {
        clientX: cx,
        offset: offset,
        pinchDistance: dist,
        pinchCandleW: candleW,
        centerX: cx,
      };
    }
  };

  const handleOverlayTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !touchStartRef.current || processedCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1 && touchStartRef.current.pinchDistance === null) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.clientX;
      if (Math.abs(dx) > 1) {
        setForce100(false); // Disable auto-scaling when dragging via touch
      }
      const step = candleW + 2;
      const moveCount = Math.round(dx / step);
      const nextOffset = Math.max(0, Math.min(processedCandles.length - 5, touchStartRef.current.offset + moveCount));
      setOffset(nextOffset);

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setHoverCoord({ x, y });
    } else if (e.touches.length === 2 && touchStartRef.current.pinchDistance !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const startDist = touchStartRef.current.pinchDistance;
      if (startDist > 0) {
        const ratio = dist / startDist;
        const targetCandleW = Math.max(1.8, Math.min(60, touchStartRef.current.pinchCandleW * ratio));

        const hoverX = touchStartRef.current.centerX - rect.left;
        const chartW = charLayout.W - charLayout.priceW;

        if (hoverX >= 0 && hoverX <= chartW) {
          setForce100(false); // Disable auto-scaling when zooming via touch pinch
          const step = candleW + 2;
          const totalVisW = visibleCandles.length * step;
          const startX = chartW - totalVisW;
          const localIdx = Math.floor((hoverX - startX) / step);
          const index = Math.max(visibleStartIndex, Math.min(visibleEndIndex - 1, visibleStartIndex + localIdx));

          const newStep = targetCandleW + 2;
          let nextOffset = processedCandles.length - index - (chartW + targetCandleW / 2 - hoverX) / newStep;
          nextOffset = Math.max(0, Math.min(processedCandles.length - 5, Math.round(nextOffset)));

          setCandleW(targetCandleW);
          setOffset(nextOffset);
        }
      }
    }
  };

  const handleOverlayTouchEnd = () => {
    touchStartRef.current = null;
    setHoverCoord(null);
  };

  const discardDrawing = (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0d14] overflow-hidden" ref={containerRef} id="forexChartRoot">
      {/* 1. TOP BAR CONTROL ACTIONS */}
      <div className="h-12 bg-[#0e1321] border-b border-[#1b253b] px-4 flex items-center justify-between overflow-x-auto shrink-0 gap-3">
        {/* Visual representation types */}
        <div className="flex items-center space-x-1 shrink-0">
          {(['candle', 'heikin', 'bar', 'line', 'area', 'hollow'] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-2 py-1 text-[10px] font-bold tracking-wider uppercase rounded-sm transition ${
                chartType === type
                  ? 'bg-cyan-950/80 text-[#00d4ff] border border-cyan-800/40 font-extrabold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
              {type === 'heikin' ? 'H.Ashi' : type}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-800 shrink-0" />

        {/* Interactive Timeframe Granularity with 10 Years Forex History capability */}
        <div className="flex items-center space-x-1 shrink-0">
          {(['M1', 'M5', 'M15', 'H1', 'H4', 'D1'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange?.(tf)}
              className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-sm border transition ${
                timeframe === tf
                  ? 'bg-purple-950/60 text-[#d085ff] border-purple-800/50 font-extrabold'
                  : 'text-gray-400 border-transparent hover:bg-gray-800/40'
              }`}
              title={tf === 'D1' || tf === 'H4' ? '10-Year Forex Historical Trend view' : `View ${tf} interval`}
            >
              {tf}
            </button>
          ))}

          {/* Active Custom Badge */}
          {!['M1', 'M5', 'M15', 'H1', 'H4', 'D1'].includes(timeframe) && (
            <button
              className="px-2.5 py-1 text-[10px] bg-purple-950/80 text-[#d085ff] border border-purple-800/50 font-extrabold rounded-sm transition cursor-default flex items-center gap-1 shrink-0"
              title="Active Custom Timeframe"
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-400 animate-pulse" />
              কাস্টম: {timeframe}
            </button>
          )}

          {/* Custom Timeframe input box */}
          <div className="flex items-center bg-[#070b12] border border-[#1b253b] rounded h-[26px] ml-1.5 p-0.5">
            <input
              type="text"
              placeholder="কাস্টম (যেমন: 3m, 2h, daily)"
              value={customTFInput}
              onChange={(e) => setCustomTFInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTFInput.trim()) {
                  onTimeframeChange?.(customTFInput.trim());
                  setCustomTFInput('');
                }
              }}
              className="bg-transparent border-none text-[9.5px] text-[#F0F0F0] font-medium placeholder-gray-500 focus:ring-0 focus:outline-none px-2 w-[130px] h-full"
            />
            <button
              onClick={() => {
                if (customTFInput.trim()) {
                  onTimeframeChange?.(customTFInput.trim());
                  setCustomTFInput('');
                }
              }}
              className="px-2 py-0.5 h-full text-[9px] bg-purple-950/70 hover:bg-purple-900 text-[#d085ff] border border-purple-800/40 rounded-sm font-bold tracking-wider"
            >
              প্রয়োগ
            </button>
          </div>
        </div>

        <div className="h-4 w-px bg-gray-800 shrink-0" />

        {/* ⊞ Indicators button — opens TradingView-style indicator panel */}
        <button
          onClick={() => setShowIndicatorPanel(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold border transition shrink-0 ${
            showIndicatorPanel
              ? 'bg-blue-950/70 text-blue-300 border-blue-700/50'
              : 'text-gray-300 border-gray-700/50 hover:bg-[#1b253b] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Indicators ({activeIndicators.size})</span>
        </button>

        {/* Quick-access active indicator chips */}
        <div className="flex items-center space-x-1 shrink-0 select-none overflow-x-auto max-w-xs">
          {[...activeIndicators].filter(id => {
            const def = INDICATOR_REGISTRY.find(r => r.id === id);
            return def && def.renderType === 'overlay' && !['smc','patterns','vol'].includes(id);
          }).slice(0,6).map(id => {
            const def = INDICATOR_REGISTRY.find(r => r.id === id)!;
            return (
              <button key={id} onClick={() => toggleIndicator(id)}
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold border flex items-center gap-1"
                style={{ borderColor: def.color+'60', color: def.color, background: def.color+'15' }}>
                {def.label}
                <X className="w-2.5 h-2.5 opacity-70" />
              </button>
            );
          })}
        </div>

        {/* Zoom Out & reset visual anchors */}
        <button
          onClick={() => {
            setOffset(0);
            setCandleW(10);
            setDrawings([]);
          }}
          className="ml-auto text-gray-400 hover:text-[#ff3d57] transition text-[10px] flex items-center gap-1.5 px-2 py-1 hover:bg-[#1c2436] rounded"
          title="Clear Layout Drawings"
        >
          <Trash2 className="w-3 height-3 shrink-0" /> Clear Draw
        </button>

        {onClose && (
          <>
            <div className="h-4 w-px bg-gray-800 shrink-0" />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 border border-transparent hover:border-[#00d4ff]/20 transition text-[9.5px] font-sans font-black uppercase flex items-center gap-1 px-2.5 py-1.5 rounded"
              title="প্যানেল মিনিমাইজ বা লুকান (Minimize/Hide Main Chart Panel)"
            >
              <span>মিনিমাইজ</span>
              <span>➖</span>
            </button>
          </>
        )}
      </div>

      {/* 2. CHOOSE CORRESPONDING DRAWING LAYOUT & MAIN CANVAS CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Vertical Micro toolbar for shape creations */}
        <div className="w-16 bg-[#0a0d14] border-r border-[#1b253b] flex flex-col items-center py-3 space-y-3.5 shrink-0 overflow-y-auto select-none scrollbar-none">
          
          <div className="text-[8px] text-gray-500 font-sans tracking-[0.15em] font-black uppercase">
            Tools
          </div>

          <div className="flex flex-col items-center space-y-2 w-full px-1">
            {/* Crosshair Button */}
            <button
              onClick={() => setDrawingType('none')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'none'
                  ? 'bg-[#1b253b] text-[#00d4ff] border-cyan-800/50 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-[#00d4ff] hover:bg-[#1b253b]/30'
              }`}
              title="Crosshair pointing mode"
            >
              <MousePointer className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Point</span>
            </button>

            {/* Trendline Button */}
            <button
              onClick={() => setDrawingType('trend')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'trend'
                  ? 'bg-cyan-950/80 text-[#00d4ff] border-cyan-800/60 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="Trend Line — Click Start and End"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Trend</span>
              {drawingType === 'trend' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
            </button>

            {/* Horizontal Line Button */}
            <button
              onClick={() => setDrawingType('horizontal')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'horizontal'
                  ? 'bg-amber-950/80 text-[#ffc107] border-amber-800/60 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="Horizontal Line — Support/Resistance anchor"
            >
              <Minus className="w-4 h-4 rotate-180" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">H-Line</span>
              {drawingType === 'horizontal' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />}
            </button>

            {/* Vertical Line Button */}
            <button
              onClick={() => setDrawingType('vertical')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'vertical'
                  ? 'bg-emerald-950/80 text-[#00e676] border-emerald-800/60 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="Vertical Time Grid Anchor"
            >
              <ChevronsUpDown className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">V-Line</span>
              {drawingType === 'vertical' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            </button>

            {/* Fibonacci Button */}
            <button
              onClick={() => setDrawingType('fib')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'fib'
                  ? 'bg-purple-950/80 text-[#ab47bc] border-purple-800/60 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="Fibonacci Retracement Grid"
            >
              <Percent className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Fib</span>
              {drawingType === 'fib' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-400 rounded-full" />}
            </button>

            {/* Order Block Rectangle Button */}
            <button
              onClick={() => setDrawingType('rectangle')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'rectangle'
                  ? 'bg-pink-950/80 text-[#ec4899] border-pink-800/60 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="SMC Decision Block Rectangle Zone"
            >
              <Square className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Block</span>
              {drawingType === 'rectangle' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-pink-400 rounded-full" />}
            </button>

            {/* Ray Tool Button */}
            <button
              onClick={() => setDrawingType('ray')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'ray'
                  ? 'bg-cyan-950/80 text-[#22d3ee] border-cyan-800/60 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="Horizontal Ray — extends right from anchor"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="3" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                <line x1="4.5" y1="8" x2="14" y2="8"/>
                <polyline points="11,5 14,8 11,11"/>
              </svg>
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Ray</span>
              {drawingType === 'ray' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
            </button>

            {/* Channel Tool Button */}
            <button
              onClick={() => setDrawingType('channel')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${
                drawingType === 'channel'
                  ? 'bg-violet-950/80 text-[#a78bfa] border-violet-800/60 shadow-md font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="Price Channel — parallel trendlines"
            >
              <Layers className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Channel</span>
              {drawingType === 'channel' && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-violet-400 rounded-full" />}
            </button>

            {/* Extended Line */}
            <button onClick={() => setDrawingType('extline')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${drawingType==='extline'?'bg-cyan-950/80 text-[#67e8f9] border-cyan-800/60 shadow-md':'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'}`}
              title="Extended Line — infinite both directions">
              <ArrowRight className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">ExtLine</span>
              {drawingType==='extline'&&<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full"/>}
            </button>

            {/* Regression Channel */}
            <button onClick={() => setDrawingType('regression')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${drawingType==='regression'?'bg-indigo-950/80 text-indigo-300 border-indigo-800/60 shadow-md':'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'}`}
              title="Regression Channel">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Regress</span>
              {drawingType==='regression'&&<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-400 rounded-full"/>}
            </button>

            {/* Price Range */}
            <button onClick={() => setDrawingType('pricerange')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${drawingType==='pricerange'?'bg-yellow-950/80 text-yellow-300 border-yellow-800/60 shadow-md':'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'}`}
              title="Price Range — shows price delta">
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">PRange</span>
              {drawingType==='pricerange'&&<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full"/>}
            </button>

            {/* Long Position */}
            <button onClick={() => setDrawingType('longpos')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${drawingType==='longpos'?'bg-green-950/80 text-green-300 border-green-800/60 shadow-md':'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'}`}
              title="Long Position — Entry/TP box">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Long</span>
              {drawingType==='longpos'&&<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-400 rounded-full"/>}
            </button>

            {/* Short Position */}
            <button onClick={() => setDrawingType('shortpos')}
              className={`w-12 h-12 rounded flex flex-col items-center justify-center transition p-1 relative border ${drawingType==='shortpos'?'bg-red-950/80 text-red-300 border-red-800/60 shadow-md':'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'}`}
              title="Short Position — Entry/SL box">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[7.5px] tracking-tight mt-1 leading-none uppercase font-bold text-center">Short</span>
              {drawingType==='shortpos'&&<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full"/>}
            </button>
          </div>

          <div className="h-px bg-gray-800/60 w-11 shrink-0" />

          {/* SENSORY Placed Objects List container */}
          <div className="text-[8px] text-gray-500 font-sans tracking-[0.12em] font-black uppercase shrink-0">
            Objects ({drawings.length})
          </div>

          <div className="flex-1 w-full overflow-y-auto px-1 space-y-1.5 scrollbar-thin flex flex-col items-center min-h-[80px]">
            {drawings.length === 0 ? (
              <span className="text-[8.5px] text-gray-600 font-medium text-center font-sans tracking-tight leading-snug px-1">চার্টে কোনো ড্রয়িং নেই</span>
            ) : (
              drawings.map((d, idx) => (
                <div 
                  key={d.id} 
                  className="flex flex-col items-center p-1 bg-[#121620]/60 border border-[#1b253b]/50 rounded w-12 hover:border-[#313c59]/80 transition text-center relative group"
                >
                  {/* Abbreviation for type */}
                  <span className="text-[7.5px] font-black text-gray-400 uppercase tracking-tighter">
                    {({'trend':'Trend','horizontal':'H-Line','vertical':'V-Line','fib':'Fib','rectangle':'Block','ray':'Ray','channel':'Chan','extline':'ExtL','regression':'Regr','pricerange':'PΔ','daterange':'DΔ','longpos':'Long','shortpos':'Short','pitchfork':'Fork','fibext':'FibEx'} as Record<string,string>)[d.type] || d.type}
                  </span>
                  
                  {/* Object sequence label */}
                  <span className="text-[6.5px] font-bold text-gray-500 opacity-80 mt-0.5">
                    #{idx + 1}
                  </span>

                  {/* Actions row for each object color and delete control buttons */}
                  <div className="flex items-center justify-around w-full mt-1.5 space-x-0.5">
                    {/* Circle to change colors */}
                    <button
                      onClick={() => {
                        const colors = ['#00FF41', '#FF3131', '#00d4ff', '#ab47bc', '#ffc107', '#ec4899'];
                        const curIdx = colors.indexOf(d.color);
                        const nextColor = colors[(curIdx + 1) % colors.length];
                        setDrawings((prev) =>
                          prev.map((item) => (item.id === d.id ? { ...item, color: nextColor } : item))
                        );
                      }}
                      className="w-3.5 h-3.5 rounded-full border border-[#1b253b] hover:scale-110 active:scale-95 transition-transform"
                      style={{ backgroundColor: d.color }}
                      title="কালার পরিবর্তন করুন (Tap to Change Color)"
                    />
                    
                    {/* Individual direct delete button */}
                    <button
                      onClick={() => discardDrawing(d.id)}
                      className="p-0.5 text-gray-500 hover:text-red-500 transition-colors"
                      title="মুছুন (Delete)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="h-px bg-gray-800/60 w-11 shrink-0" />

          {/* 100 Real-Time Candles Auto-Scale Lock Button */}
          <div className="flex flex-col items-center space-y-1.5 shrink-0 select-none pb-1">
            <button
              onClick={() => {
                const nextState = !force100;
                setForce100(nextState);
                if (nextState && charLayout.W) {
                  const targetW = Math.max(2.5, (charLayout.W - charLayout.priceW) / 100 - 2);
                  setCandleW(targetW);
                  setOffset(0);
                }
              }}
              className={`w-12 h-11 rounded flex flex-col items-center justify-center transition relative border ${
                force100
                  ? 'bg-purple-950/80 text-[#d085ff] border-purple-800/60 shadow-md shadow-purple-950/40 font-extrabold'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b253b]/40'
              }`}
              title="Lock 100 Real-Time Candles (১০০টি রিয়েল-টাইম ক্যান্ডেল লক করুন)"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[8px] font-black tracking-tight leading-none mt-1">100 C</span>
              {force100 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
              )}
            </button>
            
            <div className="text-[7.5px] font-black tracking-wide uppercase">
              {force100 ? (
                <span className="text-[#d085ff]">LOCKED</span>
              ) : (
                <span className="text-gray-500">FREE</span>
              )}
            </div>
          </div>
        </div>

        {/* INDICATOR PANEL — TradingView-style collapsible overlay */}
        {showIndicatorPanel && (
          <div className="absolute left-16 top-0 z-50 w-72 h-full bg-[#0e1321]/98 border-r border-[#1b253b] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-2 border-b border-[#1b253b] flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 bg-[#070b12] border border-[#1b253b] rounded px-2 py-1">
                <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <input type="text" placeholder="Search indicators..." value={indicatorSearch}
                  onChange={e => setIndicatorSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[11px] text-white focus:outline-none placeholder-gray-500 min-w-0" />
                {indicatorSearch && <button onClick={() => setIndicatorSearch('')}><X className="w-3 h-3 text-gray-400 hover:text-white" /></button>}
              </div>
              <button onClick={() => setShowIndicatorPanel(false)} className="text-gray-500 hover:text-white transition p-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* ⭐ Favorites section */}
              {favoriteIndicators.size > 0 && (
                <div>
                  <div className="w-full flex items-center justify-between px-3 py-2 text-[9px] font-black uppercase tracking-widest text-amber-400">
                    <span>⭐ Favorites ({favoriteIndicators.size})</span>
                  </div>
                  <div className="pb-1">
                    {INDICATOR_REGISTRY
                      .filter(ind => favoriteIndicators.has(ind.id) &&
                        (indicatorSearch === '' || ind.label.toLowerCase().includes(indicatorSearch.toLowerCase()) || ind.id.includes(indicatorSearch.toLowerCase())))
                      .map(ind => (
                        <div key={`fav-${ind.id}`}
                          className={`flex items-center px-3 py-1.5 cursor-pointer transition group ${activeIndicators.has(ind.id) ? 'bg-[#1b253b]/40' : 'hover:bg-[#1b253b]/20'}`}
                          onClick={() => toggleIndicator(ind.id)}>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center mr-2 flex-shrink-0 transition ${
                            activeIndicators.has(ind.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                            {activeIndicators.has(ind.id) && <span className="text-white text-[8px] font-black">✓</span>}
                          </div>
                          <span className={`text-[11px] flex-1 truncate ${activeIndicators.has(ind.id) ? 'text-white font-medium' : 'text-gray-400'}`}>{ind.label}</span>
                          <span className="w-2 h-2 rounded-full flex-shrink-0 ml-1" style={{ backgroundColor: ind.color }} />
                          <button onClick={(e) => toggleFavorite(ind.id, e)} className="ml-1.5 text-[10px] text-amber-400 shrink-0">★</button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {IND_CATEGORIES.map(cat => {
                const catInds = INDICATOR_REGISTRY.filter(r =>
                  r.category === cat.id &&
                  (indicatorSearch === '' || r.label.toLowerCase().includes(indicatorSearch.toLowerCase()) || r.id.includes(indicatorSearch.toLowerCase()))
                );
                if (catInds.length === 0) return null;
                const isExpanded = expandedCategories.has(cat.id) || indicatorSearch !== '';
                return (
                  <div key={cat.id}>
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-[#1b253b]/50 transition"
                      onClick={() => toggleCategory(cat.id)}>
                      <span>{cat.label} ({catInds.filter(r => activeIndicators.has(r.id)).length}/{catInds.length})</span>
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {isExpanded && (
                      <div className="pb-1">
                        {catInds.map(ind => (
                          <div key={ind.id}
                            className={`flex items-center px-3 py-1.5 cursor-pointer transition group ${activeIndicators.has(ind.id) ? 'bg-[#1b253b]/40' : 'hover:bg-[#1b253b]/20'}`}
                            onClick={() => toggleIndicator(ind.id)}>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center mr-2 flex-shrink-0 transition ${
                              activeIndicators.has(ind.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                              {activeIndicators.has(ind.id) && <span className="text-white text-[8px] font-black">✓</span>}
                            </div>
                            <span className={`text-[11px] flex-1 truncate ${activeIndicators.has(ind.id) ? 'text-white font-medium' : 'text-gray-400'}`}>{ind.label}</span>
                            <span className="w-2 h-2 rounded-full flex-shrink-0 ml-1" style={{ backgroundColor: ind.color }} />
                            <button
                              onClick={(e) => toggleFavorite(ind.id, e)}
                              className={`ml-1.5 text-[10px] shrink-0 transition ${favoriteIndicators.has(ind.id) ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}
                              title="Favorite">
                              {favoriteIndicators.has(ind.id) ? '★' : '☆'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t border-[#1b253b] flex justify-between items-center">
              <span className="text-[9px] text-gray-500">{activeIndicators.size} active</span>
              <button onClick={() => setActiveIndicators(new Set(['ma20','ma50','vol','patterns']))}
                className="text-[9px] text-gray-500 hover:text-red-400 transition">Reset All</button>
            </div>
          </div>
        )}

        {/* Viewport Charts Frame */}
        <div className="flex-1 h-full relative" id="chartsCanvasFrame">
          {drawingType !== 'none' && (
            <div className="absolute top-12 left-4 z-20 px-3 py-1.5 bg-cyan-950/90 text-[10px] font-semibold text-[#00d4ff] border border-cyan-800/50 rounded shadow-md pointer-events-none flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span>
                {drawingType === 'trend' && 'অঙ্কন মোড: চার্টে প্রথম পয়েন্টে ক্লিক করে টেনে নিয়ে দ্বিতীয় পয়েন্টে ক্লিক করুন।'}
                {drawingType === 'horizontal' && 'অঙ্কন মোড: চার্টের যেকোনো জায়গায় সাপোর্ট/রেজিস্ট্যান্স আকতে ক্লিক করুন।'}
                {drawingType === 'vertical' && 'অঙ্কন মোড: যেকোনো ক্যান্ডেল স্লাইড বরাবর ক্লিক করুন।'}
                {drawingType === 'fib' && 'Fibonacci মোড: সুয়িং হাই থেকে সুইং লো বরাবর ড্র্যাগিং সম্পন্ন করুন।'}
                {drawingType === 'rectangle' && 'রেকট্যাঙ্গেল মোড: বায়ার বা সেলার ডিসিশন ব্লক হাইলাইট করতে ক্লিক-ড্র্যাগ করুন।'}
                {drawingType === 'ray' && 'Ray মোড: যেকোনো বিন্দুতে ক্লিক করুন — ডানদিকে অসীম রেখা আঁকা হবে।'}
                {drawingType === 'channel' && 'Channel: Click 2 points → parallel channel.'}
                {drawingType === 'extline' && 'Extended Line: Click 2 points → extends infinitely both ways.'}
                {drawingType === 'regression' && 'Regression Channel: Click 2 points → auto regression.'}
                {drawingType === 'pricerange' && 'Price Range: Click 2 price levels → shows Δ price.'}
                {drawingType === 'longpos' && 'Long Position: Click entry → click TP target.'}
                {drawingType === 'shortpos' && 'Short Position: Click entry → click SL level.'}
              </span>
            </div>
          )}

          <canvas
            ref={mainCanvasRef}
            className="absolute top-0 left-0 w-full h-full block"
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute top-0 left-0 w-full h-full block cursor-crosshair"
            onMouseDown={handleOverlayMouseDown}
            onMouseMove={handleOverlayMouseMove}
            onMouseUp={handleOverlayMouseUp}
            onMouseLeave={handleOverlayMouseUp}
            onWheel={handleOverlayWheel}
            onTouchStart={handleOverlayTouchStart}
            onTouchMove={handleOverlayTouchMove}
            onTouchEnd={handleOverlayTouchEnd}
            onTouchCancel={handleOverlayTouchEnd}
          />

        </div>

        {/* Quick sidebar containing list of drawings */}
        {drawings.length > 0 && (
          <div className="w-56 bg-[#0e1321]/95 border-l border-[#1b253b] flex flex-col p-3 text-xs shrink-0 select-none overflow-y-auto">
            <h4 className="font-bold text-gray-300 mb-2 font-sans tracking-wide uppercase text-[9px] flex items-center justify-between">
              <span>সক্রিয় অঙ্কনসমূহ ({drawings.length})</span>
            </h4>
            <div className="space-y-1.5">
              {drawings.map((draw) => (
                <div
                  key={draw.id}
                  className="flex items-center justify-between p-2 rounded bg-[#161d30]/70 border border-[#1f2b48]/50 text-gray-400 group hover:border-[#00d4ff]/20 transition"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: draw.color }} />
                    <span className="truncate text-[10px] font-mono text-gray-300 capitalize">{draw.type} Tool</span>
                  </div>
                  <button
                    onClick={() => discardDrawing(draw.id)}
                    className="p-1 text-gray-500 hover:text-[#ff3d57] hover:bg-gray-800/40 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
