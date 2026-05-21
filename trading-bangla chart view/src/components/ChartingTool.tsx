/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Candle,
  ChartType,
  DrawingTool,
  PairConfig,
} from '../types';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  convertToHeikinAshi,
  parseTimeframeToMinutes,
} from '../utils/forexMath';

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
} from 'lucide-react';

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
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showVol, setShowVol] = useState(true);

  // Scrolling & zooming states
  const [candleW, setCandleW] = useState(10); // scale width of 1 candle in px
  const [offset, setOffset] = useState(0);    // count of candles scrolled right from newest
  const [customTFInput, setCustomTFInput] = useState('');
  const [force100, setForce100] = useState(true); // 100 real-time candles lock state

  // Interactive drawing state
  const [drawingType, setDrawingType] = useState<'none' | 'trend' | 'horizontal' | 'vertical' | 'fib' | 'rectangle'>('none');
  const [drawProgress, setDrawProgress] = useState<{ index: number; price: number } | null>(null);

  // Mouse hover tracking for crosshair
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const dragStartRef = useRef<{ clientX: number; offset: number } | null>(null);

  // Touch panning/zooming gesture refs
  const touchStartRef = useRef<{
    clientX: number;
    offset: number;
    pinchDistance: number | null;
    pinchCandleW: number;
    centerX: number;
  } | null>(null);

  // Resize boundaries
  const [charLayout, setCharLayout] = useState({
    W: 800,
    H: 450,
    priceW: 78,
    timeH: 24,
    rsiH: 70,
    macdH: 70,
    chartH: 300,
  });

  // Calculate coordinates and ranges based on container sizes
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height - 48; // compensate toolbar

      const priceW = 78;
      const timeH = 24;
      const rsiH = showRSI ? 70 : 0;
      const macdH = showMACD ? 70 : 0;
      const padding = (showRSI ? 14 : 0) + (showMACD ? 14 : 0);
      const chartH = Math.max(150, H - timeH - rsiH - macdH - padding - 10);

      setCharLayout({
        W,
        H,
        priceW,
        timeH,
        rsiH,
        macdH,
        chartH,
         });
    };

    handleResize();
    const obs = new ResizeObserver(handleResize);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [showRSI, showMACD]);

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

    // Parse standard or custom timeframe string into minutes
    const T = parseTimeframeToMinutes(timeframe);
    const intervalMs = T * 60 * 1000;

    // We want up to 10 years of historical data
    // 10 years = 10 * 365 * 24 * 60 = 5,256,000 minutes
    const tenYearsMinutes = 10 * 365 * 24 * 60;
    const rawCount = Math.floor(tenYearsMinutes / T);
    // Limit to maximum 3000 candles to maintain excellent canvas performance and smooth interaction
    const count = Math.max(120, Math.min(3000, rawCount));

    const path: Candle[] = [];
    const pip = pair.pip;
    const dec = pair.dec;

    // Get the latest real-time broker live tick price
    const liveCandle = candles[candles.length - 1];
    const currentPrice = liveCandle.c;
    const nowRounded = Math.floor(liveCandle.t / intervalMs) * intervalMs;

    // Derive a unique stable character seed for this pair to keep chart wave outlines consistent
    let charSeed = 0;
    for (let c = 0; c < pair.sym.length; c++) {
      charSeed += pair.sym.charCodeAt(c) * (c + 1);
    }

    // Accumulator for reverse random walk starting at current live price
    let lastClose = currentPrice;

    for (let i = 0; i < count; i++) {
      const candleTime = nowRounded - i * intervalMs;

      // Seed for this specific candle's walk parameters
      const idxSeed = charSeed + i * 37;

      // Deterministic pseudo-random generation
      const isUp = seededRandom(idxSeed) > 0.495;
      
      // Scaling volatilies based on pair pip values to keep charts looking extremely realistic
      const bodyMultiplier = (seededRandom(idxSeed + 1) * 6.5 + 1.2); // body size in pips
      const wickMultiplier = (seededRandom(idxSeed + 2) * 5.0 + 0.5); // wick size in pips

      const bodySize = bodyMultiplier * pip;
      const wickSize = wickMultiplier * pip;

      const c = lastClose;
      const o = isUp ? lastClose - bodySize : lastClose + bodySize;
      const h = Math.max(o, c) + wickSize;
      const l = Math.min(o, c) - wickSize;
      const v = Math.floor(seededRandom(idxSeed + 3) * 1600 + 150);

      path.push({
        t: candleTime,
        o: Number(o.toFixed(dec)),
        h: Number(h.toFixed(dec)),
        l: Number(l.toFixed(dec)),
        c: Number(c.toFixed(dec)),
        v: v,
      });

      // Walk backward (the open of this candle will be the close of the previous older candle)
      lastClose = o;
    }

    // Since we created history going backwards, reverse it to chronological order (oldest to newest)
    path.reverse();

    // Overwrite the last candle with live dynamic ticks from parent to connect smoothly
    if (path.length > 0) {
      const lastIdx = path.length - 1;
      path[lastIdx] = {
        ...path[lastIdx],
        c: liveCandle.c,
        h: Math.max(path[lastIdx].h, liveCandle.h),
        l: Math.min(path[lastIdx].l, liveCandle.l),
        v: path[lastIdx].v + liveCandle.v,
      };
    }

    return path;
  }, [candles, timeframe, pair]);

  // Derive transformed candle set based on chosen view
  const processedCandles = useMemo(() => {
    if (chartType === 'heikin') {
      return convertToHeikinAshi(aggregatedCandles);
    }
    return aggregatedCandles;
  }, [aggregatedCandles, chartType]);

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
  const bbBands = useMemo(() => calculateBollingerBands(processedCandles, 20, 2), [processedCandles]);
  const rsiValues = useMemo(() => calculateRSI(processedCandles, 14), [processedCandles]);
  const macdData = useMemo(() => calculateMACD(processedCandles, 12, 26, 9), [processedCandles]);

  // Detect local Smart Money Structures in the visible timeframe
  const smcMarkers = useMemo(() => {
    if (!showSMC || visibleCandles.length < 15) return null;

    // Detect Order Blocks (OB), BOS, and CHoCH
    // A Bullish OB is often the last bearish candles before a strong push up
    // A Bearish OB is the last bullish candles before a strong push down
    // BOS is broken local high or low
    let keyHigh = -Infinity;
    let keyLow = Infinity;
    let highIdx = 0;
    let lowIdx = 0;

    visibleCandles.forEach((c, idx) => {
      const actualIdx = visibleStartIndex + idx;
      if (c.h > keyHigh) {
        keyHigh = c.h;
        highIdx = actualIdx;
      }
      if (c.l < keyLow) {
        keyLow = c.l;
        lowIdx = actualIdx;
      }
    });

    // Simulated SMC regions matching current visible peaks
    const bullishOB = {
      top: keyLow + (keyHigh - keyLow) * 0.12,
      bottom: keyLow,
      startIndex: Math.max(visibleStartIndex, lowIdx - 3),
      endIndex: Math.min(visibleEndIndex, lowIdx + 12),
    };

    const bearishOB = {
      top: keyHigh,
      bottom: keyHigh - (keyHigh - keyLow) * 0.12,
      startIndex: Math.max(visibleStartIndex, highIdx - 3),
      endIndex: Math.min(visibleEndIndex, highIdx + 12),
    };

    return {
      bullishOB,
      bearishOB,
      bosPrice: keyHigh - (keyHigh - keyLow) * 0.3,
      chochPrice: keyLow + (keyHigh - keyLow) * 0.35,
    };
  }, [visibleCandles, visibleStartIndex, visibleEndIndex, showSMC]);

  // Canvas Coordinate mapping helper
  const getCoordinates = (index: number, price: number, minPrice: number, maxPrice: number) => {
    const step = candleW + 2;
    const chartW = charLayout.W - charLayout.priceW;

    // Map logical candle index to pixel x
    const idxInVisible = index - visibleStartIndex;
    const x = chartW - (visibleCandles.length - idxInVisible) * step + candleW / 2;

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

    // Calculate index
    const totalVisW = visibleCandles.length * step;
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

    // 2. DRAW MAIN PRICE GRID LINES
    ctx.strokeStyle = 'rgba(99, 118, 175, 0.08)';
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
      const posX = chartW - (visibleCandles.length - i) * step + candleW / 2;
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
    if (showSMC && smcMarkers) {
      // Bullish OB
      const obStart = getCoordinates(smcMarkers.bullishOB.startIndex, smcMarkers.bullishOB.top, minPrice, maxPrice);
      const obEnd = getCoordinates(smcMarkers.bullishOB.endIndex, smcMarkers.bullishOB.bottom, minPrice, maxPrice);
      const obW = obEnd.x - obStart.x;
      const obH = obEnd.y - obStart.y;

      if (obW > 0 && obH > 0) {
        ctx.fillStyle = 'rgba(0, 230, 118, 0.05)';
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.25)';
        ctx.lineWidth = 1;
        ctx.fillRect(obStart.x, obStart.y, obW, obH);
        ctx.strokeRect(obStart.x, obStart.y, obW, obH);
        ctx.fillStyle = '#00e676';
        ctx.font = '8px "Syne", sans-serif';
        ctx.fillText('Bullish OB', obStart.x + 4, obStart.y + 12);
      }

      // Bearish OB
      const bearOBStart = getCoordinates(smcMarkers.bearishOB.startIndex, smcMarkers.bearishOB.top, minPrice, maxPrice);
      const bearOBEnd = getCoordinates(smcMarkers.bearishOB.endIndex, smcMarkers.bearishOB.bottom, minPrice, maxPrice);
      const bearW = bearOBEnd.x - bearOBStart.x;
      const bearH = bearOBEnd.y - bearOBStart.y;

      if (bearW > 0 && bearH > 0) {
        ctx.fillStyle = 'rgba(255, 61, 87, 0.05)';
        ctx.strokeStyle = 'rgba(255, 61, 87, 0.25)';
        ctx.lineWidth = 1;
        ctx.fillRect(bearOBStart.x, bearOBStart.y, bearW, bearH);
        ctx.strokeRect(bearOBStart.x, bearOBStart.y, bearW, bearH);
        ctx.fillStyle = '#ff3d57';
        ctx.font = '8px "Syne", sans-serif';
        ctx.fillText('Bearish OB', bearOBStart.x + 4, bearOBStart.y + 12);
      }

      // BOS line
      const bosY = toY(smcMarkers.bosPrice);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, bosY);
      ctx.lineTo(chartW - 20, bosY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#00d4ff';
      ctx.font = '700 8.5px "DM Mono", monospace';
      ctx.fillText('BOS ➔', 22, bosY - 4);

      // CHoCH line
      const chochY = toY(smcMarkers.chochPrice);
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, chochY);
      ctx.lineTo(chartW - 20, chochY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffc107';
      ctx.font = '700 8.5px "DM Mono", monospace';
      ctx.fillText('CHoCH ➔', 22, chochY - 4);
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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

    // 6. VOLUME OVERLAY TRACE (Bottom within main price graph)
    if (showVol) {
      const vHigh = Math.max(...visibleCandles.map((c) => c.v)) || 100;
      const volAreaH = charLayout.chartH * 0.16;

      visibleCandles.forEach((c, idx) => {
        const posX = chartW - (visibleCandles.length - idx) * step;
        const hVal = (c.v / vHigh) * volAreaH;
        const posY = charLayout.chartH - hVal;
        
        ctx.fillStyle = c.c >= c.o ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 61, 87, 0.15)';
        ctx.fillRect(posX + (candleW - Math.max(1, candleW * 0.72)) / 2, posY, Math.max(1, candleW * 0.72), hVal);
      });
    }

    // 7. RENDER PRIMARY BANDS / CANDLES / SHAPES
    visibleCandles.forEach((c, idx) => {
      const posX = chartW - (visibleCandles.length - idx) * step;
      const cx = posX + candleW / 2;
      const bW = Math.max(1.5, candleW * 0.75);

      const isUp = c.c >= c.o;
      const col = isUp ? '#00e676' : '#ff3d57';

      if (chartType === 'line') {
        const nextIdx = idx + 1;
        if (nextIdx < visibleCandles.length) {
          const nextCx = chartW - (visibleCandles.length - nextIdx) * step + candleW / 2;
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
          const nextCx = chartW - (visibleCandles.length - nextIdx) * step + candleW / 2;
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
      ctx.strokeStyle = isUp ? '#00e676' : '#ff3d57';
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(chartW, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating live current tag on right scale plate
      ctx.fillStyle = isUp ? '#00e676' : '#ff3d57';
      ctx.fillRect(chartW + 1, ly - 9, charLayout.priceW - 2, 18);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lastCandle.c.toFixed(pair.dec), chartW + charLayout.priceW / 2, ly + 3.5);
    }

    // 10. RSI SUB-DRAWINGS
    if (showRSI) {
      const rsiYStart = charLayout.chartH + 24;
      const rsiH = charLayout.rsiH;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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

    // 11. MACD SUB-DRAWINGS
    if (showMACD) {
      const macdYStart = charLayout.chartH + 24 + (showRSI ? charLayout.rsiH + 14 : 0);
      const macdH = charLayout.macdH;
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
          const posX = chartW - (visibleCandles.length - idx) * step;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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
          const posX = chartW - (visibleCandles.length - idx) * step + candleW / 2;
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

  }, [charLayout, visibleCandles, visibleStartIndex, pair, showMA20, showMA50, showEMA9, showBB, showRSI, showMACD, showVol, drawings, chartType, showSMC, smcMarkers, candles]);

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
          type: drawingType,
          points: [
            { index: drawProgress.index, price: drawProgress.price },
            { index: logical.index, price: logical.price },
          ],
          color: drawingType === 'trend' ? '#26c6da' : drawingType === 'fib' ? '#ab47bc' : '#ff7043',
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

        {/* Dynamic Overlay Checkboxes */}
        <div className="flex items-center space-x-1.5 shrink-0 select-none">
          <button
            onClick={() => setShowMA20(!showMA20)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition ${
              showMA20
                ? 'bg-cyan-950/60 text-[#00d4ff] border-cyan-700/40'
                : 'text-gray-400 border-transparent hover:bg-[#1b253b]'
            }`}
          >
            MA 20
          </button>
          <button
            onClick={() => setShowMA50(!showMA50)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition ${
              showMA50
                ? 'bg-amber-950/60 text-[#ffc107] border-amber-700/40'
                : 'text-gray-400 border-transparent hover:bg-[#1b253b]'
            }`}
          >
            MA 50
          </button>
          <button
            onClick={() => setShowEMA9(!showEMA9)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition ${
              showEMA9
                ? 'bg-pink-950/60 text-[#ec4899] border-pink-700/40'
                : 'text-gray-400 border-transparent hover:bg-[#1b253b]'
            }`}
          >
            EMA 9
          </button>
          <button
            onClick={() => setShowBB(!showBB)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition ${
              showBB
                ? 'bg-purple-950/60 text-[#ab47bc] border-purple-700/40'
                : 'text-gray-400 border-transparent hover:bg-[#1b253b]'
            }`}
          >
            Bands
          </button>
          <button
            onClick={() => setShowVol(!showVol)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition ${
              showVol
                ? 'bg-emerald-950/60 text-[#00e676] border-emerald-700/40'
                : 'text-gray-400 border-transparent hover:bg-[#1b253b]'
            }`}
          >
            Vol
          </button>
        </div>

        <div className="h-4 w-px bg-gray-800 shrink-0" />

        {/* Sub-panels triggers */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center transition ${
              showRSI
                ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            RSI
          </button>
          <button
            onClick={() => setShowMACD(!showMACD)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center transition ${
              showMACD
                ? 'bg-[#311b92]/30 text-[#ab47bc] border border-fuchsia-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            MACD
          </button>
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
                    {d.type === 'trend' && 'Trend'}
                    {d.type === 'horizontal' && 'H-Line'}
                    {d.type === 'vertical' && 'V-Line'}
                    {d.type === 'fib' && 'Fib'}
                    {d.type === 'rectangle' && 'Block'}
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
