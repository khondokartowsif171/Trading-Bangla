/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  ColorType,
  IPriceLine,
} from 'lightweight-charts';
import { Candle, DrawingTool, PairConfig } from '../types';
import { parseTimeframeToMinutes } from '../utils/forexMath';
import { detectSMC, SMCData } from '../utils/forexSMC';

// ── Aggregate M1 candles into any higher TF ──────────────────────────────
function aggregateCandles(candles: Candle[], tfMinutes: number): Candle[] {
  if (tfMinutes <= 1) return candles;
  const periodMs = tfMinutes * 60 * 1000;
  const result: Candle[] = [];
  let current: Candle | null = null;
  for (const c of candles) {
    const periodStart = Math.floor(c.t / periodMs) * periodMs;
    if (!current || current.t !== periodStart) {
      if (current) result.push(current);
      current = { t: periodStart, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v };
    } else {
      current.h = Math.max(current.h, c.h);
      current.l = Math.min(current.l, c.l);
      current.c = c.c;
      current.v += c.v;
    }
  }
  if (current) result.push(current);
  return result;
}

function calcMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].c;
    return sum / period;
  });
}

// ── Theme ────────────────────────────────────────────────────────────────
const TV_BG = '#131722';
const TV_GRID = '#1e2433';
const TV_BORDER = '#2a2e39';
const TV_TEXT = '#d1d4dc';
const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';
const MA20_COLOR = '#2196f3';
const MA50_COLOR = '#ff9800';
const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'] as const;

// ── SMC overlay drawing ───────────────────────────────────────────────────
function drawSMCOverlay(
  canvas: HTMLCanvasElement,
  chart: IChartApi,
  candleSeries: ISeriesApi<'Candlestick'>,
  smc: SMCData,
  agg: Candle[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const timeToX = (t: number): number | null => {
    const ts = Math.floor(t / 1000) as UTCTimestamp;
    return chart.timeScale().timeToCoordinate(ts);
  };
  const priceToY = (p: number): number | null => candleSeries.priceToCoordinate(p);

  const lastCandle = agg[agg.length - 1];
  const nowX = timeToX(lastCandle.t);

  // ── Order Blocks ───────────────────────────────────────────────────────
  smc.orderBlocks.forEach(ob => {
    if (ob.mitigated) return;
    const startCandle = agg[Math.min(ob.startIndex, agg.length - 1)];
    const x0 = timeToX(startCandle.t);
    const x1 = nowX;
    const y0 = priceToY(ob.high);
    const y1 = priceToY(ob.low);
    if (x0 === null || x1 === null || y0 === null || y1 === null) return;
    const w = Math.max(x1 - x0, 2);
    const h = Math.abs(y1 - y0);
    const top = Math.min(y0, y1);

    ctx.fillStyle = ob.type === 'bullish'
      ? 'rgba(38,166,154,0.12)'
      : 'rgba(239,83,80,0.12)';
    ctx.fillRect(x0, top, w, h);
    ctx.strokeStyle = ob.type === 'bullish' ? '#26a69a' : '#ef5350';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(x0, top, w, h);

    // Label
    ctx.fillStyle = ob.type === 'bullish' ? '#26a69a' : '#ef5350';
    ctx.font = 'bold 9px Roboto, sans-serif';
    ctx.fillText(ob.type === 'bullish' ? 'OB+' : 'OB-', x0 + 3, top + 10);
  });

  // ── FVG Zones ─────────────────────────────────────────────────────────
  smc.fvgZones.forEach(fvg => {
    if (fvg.filled) return;
    const startCandle = agg[Math.min(fvg.startIndex, agg.length - 1)];
    const x0 = timeToX(startCandle.t);
    const x1 = nowX;
    const y0 = priceToY(fvg.top);
    const y1 = priceToY(fvg.bottom);
    if (x0 === null || x1 === null || y0 === null || y1 === null) return;
    const w = Math.max(x1 - x0, 2);
    const h = Math.abs(y1 - y0);
    const top = Math.min(y0, y1);

    ctx.fillStyle = fvg.type === 'bullish'
      ? 'rgba(38,166,154,0.08)'
      : 'rgba(239,83,80,0.08)';
    ctx.fillRect(x0, top, w, h);
    ctx.strokeStyle = fvg.type === 'bullish'
      ? 'rgba(38,166,154,0.5)'
      : 'rgba(239,83,80,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x0, top, w, h);
    ctx.setLineDash([]);

    ctx.fillStyle = fvg.type === 'bullish' ? 'rgba(38,166,154,0.8)' : 'rgba(239,83,80,0.8)';
    ctx.font = '8px Roboto, sans-serif';
    ctx.fillText('FVG', x0 + 3, top + 9);
  });

  // ── BOS / CHoCH Lines ─────────────────────────────────────────────────
  smc.structureBreaks.forEach(sb => {
    const y = priceToY(sb.price);
    if (y === null) return;
    const isBOS = sb.type === 'BOS';
    ctx.strokeStyle = isBOS
      ? (sb.direction === 'bullish' ? 'rgba(33,150,243,0.75)' : 'rgba(255,152,0,0.75)')
      : 'rgba(170,0,255,0.8)';
    ctx.lineWidth = isBOS ? 1 : 1.5;
    ctx.setLineDash(isBOS ? [4, 3] : [6, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label box
    const label = sb.type;
    ctx.font = 'bold 8px Roboto, sans-serif';
    const tw = ctx.measureText(label).width + 6;
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fillRect(2, y - 8, tw, 10);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, 5, y);
  });

  // ── Liquidity Levels ──────────────────────────────────────────────────
  smc.liquidityLevels.forEach(liq => {
    if (liq.swept) return;
    const y = priceToY(liq.price);
    if (y === null) return;
    ctx.strokeStyle = liq.type === 'BSL' ? 'rgba(251,191,36,0.7)' : 'rgba(251,191,36,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '8px Roboto, sans-serif';
    ctx.fillStyle = 'rgba(251,191,36,0.85)';
    const label = liq.type === 'BSL' ? `BSL ×${liq.count}` : `SSL ×${liq.count}`;
    ctx.fillText(label, canvas.width - 50, y - 2);
  });
}

// ── Props ─────────────────────────────────────────────────────────────────
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

export default function TradingViewChart({
  pair,
  candles,
  timeframe,
  onTimeframeChange,
  showSMC = false,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bosPriceLinesRef = useRef<IPriceLine[]>([]);

  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [smcEnabled, setSmcEnabled] = useState(showSMC);

  const tfMinutes = useMemo(() => parseTimeframeToMinutes(timeframe), [timeframe]);
  const aggregated = useMemo(() => aggregateCandles(candles, tfMinutes), [candles, tfMinutes]);

  // Compute SMC data (last 200 aggregated candles for performance)
  const smcData = useMemo((): SMCData | null => {
    if (!smcEnabled || aggregated.length < 15) return null;
    const slice = aggregated.slice(-200);
    return detectSMC(slice, Math.max(0, aggregated.length - 200));
  }, [aggregated, smcEnabled]);

  // Redraw SMC overlay whenever chart zooms/pans or data changes
  const redrawSMC = useCallback(() => {
    const canvas = overlayRef.current;
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!canvas || !chart || !series) return;
    if (!smcEnabled || !smcData) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    drawSMCOverlay(canvas, chart, series, smcData, aggregated);
  }, [smcEnabled, smcData, aggregated]);

  // ── Init chart once on mount ─────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: TV_BG },
        textColor: TV_TEXT,
        fontSize: 11,
        fontFamily: "'Trebuchet MS', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: TV_GRID, style: LineStyle.Solid },
        horzLines: { color: TV_GRID, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#9598a1', width: 1, style: LineStyle.Solid, labelBackgroundColor: TV_BORDER },
        horzLine: { color: '#9598a1', width: 1, style: LineStyle.Solid, labelBackgroundColor: TV_BORDER },
      },
      rightPriceScale: {
        borderColor: TV_BORDER,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: TV_BORDER,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
      },
      handleScroll: true,
      handleScale: true,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR, downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR, borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR, wickDownColor: DOWN_COLOR,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: UP_COLOR,
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });

    const ma20 = chart.addSeries(LineSeries, {
      color: MA20_COLOR, lineWidth: 1, title: 'MA20',
      lastValueVisible: false, priceLineVisible: false,
    });
    const ma50 = chart.addSeries(LineSeries, {
      color: MA50_COLOR, lineWidth: 1, title: 'MA50',
      lastValueVisible: false, priceLineVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ma20SeriesRef.current = ma20;
    ma50SeriesRef.current = ma50;

    // Sync overlay canvas size
    const syncCanvas = () => {
      const ov = overlayRef.current;
      if (!ov) return;
      ov.width = container.clientWidth;
      ov.height = container.clientHeight;
    };

    const ro = new ResizeObserver(() => {
      chart.resize(container.clientWidth, container.clientHeight);
      syncCanvas();
    });
    ro.observe(container);
    syncCanvas();

    // Redraw SMC on every scroll/zoom
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      // Use requestAnimationFrame to avoid tearing
      requestAnimationFrame(() => {
        const canvas = overlayRef.current;
        const cs = candleSeriesRef.current;
        if (!canvas || !cs) return;
        // We can't call state hooks here, so we dispatch a custom event
        container.dispatchEvent(new CustomEvent('smc-redraw'));
      });
    });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ma50SeriesRef.current = null;
    };
  }, []);

  // Listen to the custom redraw event
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = () => redrawSMC();
    container.addEventListener('smc-redraw', handler);
    return () => container.removeEventListener('smc-redraw', handler);
  }, [redrawSMC]);

  // ── Load data when pair/TF changes ───────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !ma20SeriesRef.current || !ma50SeriesRef.current) return;
    if (aggregated.length === 0) return;

    const lwCandles = aggregated.map(c => ({
      time: Math.floor(c.t / 1000) as UTCTimestamp,
      open: c.o, high: c.h, low: c.l, close: c.c,
    }));
    const lwVolume = aggregated.map(c => ({
      time: Math.floor(c.t / 1000) as UTCTimestamp,
      value: c.v,
      color: c.c >= c.o ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)',
    }));
    const ma20Values = calcMA(aggregated, 20);
    const ma50Values = calcMA(aggregated, 50);
    const lwMA20 = aggregated
      .map((c, i) => ma20Values[i] === null ? null : { time: Math.floor(c.t / 1000) as UTCTimestamp, value: ma20Values[i] as number })
      .filter((x): x is { time: UTCTimestamp; value: number } => x !== null);
    const lwMA50 = aggregated
      .map((c, i) => ma50Values[i] === null ? null : { time: Math.floor(c.t / 1000) as UTCTimestamp, value: ma50Values[i] as number })
      .filter((x): x is { time: UTCTimestamp; value: number } => x !== null);

    candleSeriesRef.current.setData(lwCandles);
    volumeSeriesRef.current.setData(lwVolume);
    ma20SeriesRef.current.setData(lwMA20);
    ma50SeriesRef.current.setData(lwMA50);
    chartRef.current?.timeScale().scrollToRealTime();

    chartRef.current?.applyOptions({
      watermark: {
        visible: true, fontSize: 26,
        horzAlign: 'left', vertAlign: 'top',
        color: 'rgba(255,255,255,0.05)',
        text: `${pair?.sym ?? ''} · ${timeframe}`,
      },
    } as Parameters<IChartApi['applyOptions']>[0]);
  }, [aggregated, pair?.sym, timeframe]);

  // ── Real-time tick update ────────────────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || aggregated.length === 0) return;
    const last = aggregated[aggregated.length - 1];
    const time = Math.floor(last.t / 1000) as UTCTimestamp;
    candleSeriesRef.current.update({ time, open: last.o, high: last.h, low: last.l, close: last.c });
    volumeSeriesRef.current.update({
      time, value: last.v,
      color: last.c >= last.o ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)',
    });
  }, [aggregated]);

  // ── Redraw SMC overlay whenever data or toggle changes ───────────────
  useEffect(() => {
    // Small delay so chart has settled after data load
    const id = requestAnimationFrame(redrawSMC);
    return () => cancelAnimationFrame(id);
  }, [redrawSMC]);

  // ── Indicator toggles ────────────────────────────────────────────────
  useEffect(() => { ma20SeriesRef.current?.applyOptions({ visible: showMA20 }); }, [showMA20]);
  useEffect(() => { ma50SeriesRef.current?.applyOptions({ visible: showMA50 }); }, [showMA50]);
  useEffect(() => { volumeSeriesRef.current?.applyOptions({ visible: showVolume }); }, [showVolume]);

  const handleResetZoom = useCallback(() => { chartRef.current?.timeScale().fitContent(); }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#131722] select-none">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#1e222d] border-b border-[#2a2e39] flex-shrink-0 flex-wrap">
        <span className="text-[#d1d4dc] text-xs font-bold mr-1 min-w-max">
          {pair?.label ?? '—'}
        </span>

        {/* TF buttons */}
        <div className="flex items-center gap-0.5 mr-2">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                timeframe === tf
                  ? 'bg-[#2962ff] text-white'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMA20(v => !v)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
              showMA20 ? 'bg-[#2196f3]/20 border-[#2196f3] text-[#2196f3]' : 'bg-transparent border-[#363a45] text-[#555]'
            }`}
          >MA20</button>
          <button
            onClick={() => setShowMA50(v => !v)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
              showMA50 ? 'bg-[#ff9800]/20 border-[#ff9800] text-[#ff9800]' : 'bg-transparent border-[#363a45] text-[#555]'
            }`}
          >MA50</button>
          <button
            onClick={() => setShowVolume(v => !v)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
              showVolume ? 'bg-[#26a69a]/20 border-[#26a69a] text-[#26a69a]' : 'bg-transparent border-[#363a45] text-[#555]'
            }`}
          >Vol</button>

          {/* SMC toggle */}
          <button
            onClick={() => setSmcEnabled(v => !v)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
              smcEnabled ? 'bg-[#a855f7]/20 border-[#a855f7] text-[#a855f7]' : 'bg-transparent border-[#363a45] text-[#555]'
            }`}
            title="Smart Money Concepts: Order Blocks, FVG, BOS/CHoCH, Liquidity"
          >SMC</button>
        </div>

        {/* SMC legend when active */}
        {smcEnabled && (
          <div className="flex items-center gap-2 ml-1">
            <span className="flex items-center gap-0.5 text-[9px] text-[#26a69a]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#26a69a]/30 border border-[#26a69a] inline-block" />OB+
            </span>
            <span className="flex items-center gap-0.5 text-[9px] text-[#ef5350]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef5350]/30 border border-[#ef5350] inline-block" />OB-
            </span>
            <span className="flex items-center gap-0.5 text-[9px] text-[#26a69a]/70">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#26a69a]/10 border border-[#26a69a]/50 border-dashed inline-block" />FVG
            </span>
            <span className="flex items-center gap-0.5 text-[9px] text-[#2196f3]/80">
              <span className="w-4 h-0.5 bg-[#2196f3]/70 inline-block" />BOS
            </span>
            <span className="flex items-center gap-0.5 text-[9px] text-[#fbbf24]/80">
              <span className="w-4 h-0.5 bg-[#fbbf24]/60 border-t border-dashed border-[#fbbf24] inline-block" />Liq
            </span>
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={handleResetZoom}
          title="Fit all bars"
          className="text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] px-1.5 py-0.5 rounded text-[10px] font-mono"
        >⤢</button>

        {onClose && (
          <button
            onClick={onClose}
            className="text-[#787b86] hover:text-[#ef5350] hover:bg-[#2a2e39] px-1.5 py-0.5 rounded text-xs transition-colors"
          >✕</button>
        )}
      </div>

      {/* ── Chart + SMC overlay ── */}
      <div className="flex-1 min-h-0 w-full relative">
        {/* lightweight-charts renders into this div */}
        <div ref={containerRef} className="absolute inset-0" />
        {/* Transparent canvas for SMC drawings on top */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10 }}
        />
      </div>
    </div>
  );
}
