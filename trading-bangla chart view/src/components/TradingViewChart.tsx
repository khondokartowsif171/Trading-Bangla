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
} from 'lightweight-charts';
import { Candle, DrawingTool, PairConfig } from '../types';
import { parseTimeframeToMinutes } from '../utils/forexMath';

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

// ── Simple MA calculator ─────────────────────────────────────────────────
function calcMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].c;
    return sum / period;
  });
}

// ── Chart theme constants ────────────────────────────────────────────────
const TV_BG = '#131722';
const TV_GRID = '#1e2433';
const TV_BORDER = '#2a2e39';
const TV_TEXT = '#d1d4dc';
const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';
const MA20_COLOR = '#2196f3';
const MA50_COLOR = '#ff9800';

const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'] as const;

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
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Aggregate candles for current timeframe
  const tfMinutes = useMemo(() => parseTimeframeToMinutes(timeframe), [timeframe]);
  const aggregated = useMemo(() => aggregateCandles(candles, tfMinutes), [candles, tfMinutes]);

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

    // v5 API: chart.addSeries(SeriesType, options)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: UP_COLOR,
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    });

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

    const ro = new ResizeObserver(() => {
      chart.resize(container.clientWidth, container.clientHeight);
    });
    ro.observe(container);

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

  // ── Load full dataset when pair or timeframe changes ─────────────────
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

    // Watermark via applyOptions (lightweight-charts v5 compatible)
    if (chartRef.current) {
      (chartRef.current as IChartApi).applyOptions({
        watermark: {
          visible: true,
          fontSize: 26,
          horzAlign: 'left',
          vertAlign: 'top',
          color: 'rgba(255,255,255,0.05)',
          text: `${pair?.sym ?? ''} · ${timeframe}`,
        },
      } as Parameters<IChartApi['applyOptions']>[0]);
    }
  }, [aggregated, pair?.sym, timeframe]);

  // ── Real-time update: push last candle on each 500ms tick ────────────
  const prevLastTime = useRef<number>(0);
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || aggregated.length === 0) return;
    const last = aggregated[aggregated.length - 1];
    const time = Math.floor(last.t / 1000) as UTCTimestamp;
    prevLastTime.current = time;

    candleSeriesRef.current.update({
      time, open: last.o, high: last.h, low: last.l, close: last.c,
    });
    volumeSeriesRef.current.update({
      time, value: last.v,
      color: last.c >= last.o ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)',
    });
  }, [aggregated]);

  // ── Indicator visibility toggles ─────────────────────────────────────
  useEffect(() => { ma20SeriesRef.current?.applyOptions({ visible: showMA20 }); }, [showMA20]);
  useEffect(() => { ma50SeriesRef.current?.applyOptions({ visible: showMA50 }); }, [showMA50]);
  useEffect(() => { volumeSeriesRef.current?.applyOptions({ visible: showVolume }); }, [showVolume]);

  const handleResetZoom = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#131722] select-none">
      {/* ── Header toolbar ── */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#1e222d] border-b border-[#2a2e39] flex-shrink-0 flex-wrap">
        <span className="text-[#d1d4dc] text-xs font-bold mr-1 min-w-max">
          {pair?.label ?? '—'}
        </span>

        {/* Timeframe buttons */}
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

        {/* Indicator toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMA20(v => !v)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
              showMA20
                ? 'bg-[#2196f3]/20 border-[#2196f3] text-[#2196f3]'
                : 'bg-transparent border-[#363a45] text-[#555]'
            }`}
          >MA20</button>
          <button
            onClick={() => setShowMA50(v => !v)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
              showMA50
                ? 'bg-[#ff9800]/20 border-[#ff9800] text-[#ff9800]'
                : 'bg-transparent border-[#363a45] text-[#555]'
            }`}
          >MA50</button>
          <button
            onClick={() => setShowVolume(v => !v)}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
              showVolume
                ? 'bg-[#26a69a]/20 border-[#26a69a] text-[#26a69a]'
                : 'bg-transparent border-[#363a45] text-[#555]'
            }`}
          >Vol</button>
        </div>

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

      {/* ── Chart container ── */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full" />
    </div>
  );
}
