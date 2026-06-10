import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
} from 'lightweight-charts';
import type { OHLCV } from '@/services/smcEngine';
import type { SMCAnalysis } from '@/services/smcEngine';

interface Props {
  symbol: string;
  candles: OHLCV[];
  smc: SMCAnalysis | null;
  activeIndicators: Set<string>;
  darkMode: boolean;
  height?: string | number;
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawZoneRect(
  ctx: CanvasRenderingContext2D,
  x1: number | null,
  y1: number | null,
  x2: number,
  y2: number | null,
  color: string,
  label: string,
  alpha = 0.12,
  dashed = false,
) {
  if (y1 === null || y2 === null || x1 === null) return;
  const top = Math.min(y1, y2);
  const bot = Math.max(y1, y2);
  if (bot - top < 1) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x1, top, x2 - x1, bot - top);

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (dashed) ctx.setLineDash([4, 3]);
  ctx.strokeRect(x1, top, x2 - x1, bot - top);
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.font = 'bold 9px monospace';
  ctx.fillText(label, x1 + 4, top + 10);
  ctx.restore();
}

function drawHLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number | null,
  color: string,
  style: 'solid' | 'dashed' | 'dotted' = 'solid',
  label?: string,
) {
  if (y === null) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;
  if (style === 'dashed') ctx.setLineDash([6, 4]);
  else if (style === 'dotted') ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(label, x2 - 60, y - 3);
  }
  ctx.restore();
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  up: boolean,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  if (up) {
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x - 5, y);
    ctx.lineTo(x + 5, y);
  } else {
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x - 5, y);
    ctx.lineTo(x + 5, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Main SMC overlay draw ────────────────────────────────────────────────────

function drawSMCOverlay(
  chart: IChartApi,
  series: ISeriesApi<'Candlestick'>,
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  smc: SMCAnalysis | null,
  active: Set<string>,
) {
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!smc) return;

  const RIGHT = canvas.width - 60; // leave right margin for price axis
  const toX = (time: number): number | null => {
    try {
      const x = chart.timeScale().timeToCoordinate(time as UTCTimestamp);
      return x === null ? null : x as unknown as number;
    } catch { return null; }
  };
  const toY = (price: number): number | null => {
    try {
      const y = series.priceToCoordinate(price);
      return y === null ? null : y as unknown as number;
    } catch { return null; }
  };

  // ── Order Blocks ─────────────────────────────────────────────────────────
  if (active.has('SMC_OB')) {
    for (const ob of smc.orderBlocks.filter(b => !b.mitigated)) {
      const x1 = toX(ob.time);
      const y1 = toY(ob.high);
      const y2 = toY(ob.low);
      const color = ob.type === 'bullish' ? '#00c864' : '#ff3232';
      drawZoneRect(ctx, x1, y1, RIGHT, y2, color,
        `${ob.type === 'bullish' ? '▲' : '▼'} OB ${ob.strength}%`, 0.13);
    }
  }

  // ── Mitigation Blocks ─────────────────────────────────────────────────────
  if (active.has('SMC_MITIGATION')) {
    for (const mb of smc.mitigationBlocks) {
      const x1 = toX(mb.time);
      const y1 = toY(mb.high);
      const y2 = toY(mb.low);
      drawZoneRect(ctx, x1, y1, RIGHT, y2, '#a855f7', `Mit. OB`, 0.08, true);
    }
  }

  // ── Fair Value Gaps ───────────────────────────────────────────────────────
  if (active.has('SMC_FVG')) {
    for (const fvg of smc.fairValueGaps.filter(f => !f.filled)) {
      const x1 = toX(fvg.time);
      const y1 = toY(fvg.top);
      const y2 = toY(fvg.bottom);
      const color = fvg.type === 'bullish' ? '#00d4ff' : '#ff9900';
      drawZoneRect(ctx, x1, y1, RIGHT, y2, color,
        `FVG ${fvg.fillPercent}%`, 0.11);
    }
  }

  // ── Propulsion Blocks ─────────────────────────────────────────────────────
  if (active.has('SMC_PROPULSION')) {
    for (const pb of smc.propulsionBlocks) {
      const x1 = toX(pb.time);
      const y1 = toY(pb.high);
      const y2 = toY(pb.low);
      drawZoneRect(ctx, x1, y1, RIGHT, y2, '#00ffff', `Prop`, 0.07, true);
    }
  }

  // ── Breaker Blocks ────────────────────────────────────────────────────────
  if (active.has('SMC_BREAKER')) {
    for (const bb of smc.breakerBlocks) {
      const x1 = toX(bb.time);
      const y1 = toY(bb.high);
      const y2 = toY(bb.low);
      const label = bb.flipDirection === 'now-resistance' ? 'Res. Brk' : 'Sup. Brk';
      drawZoneRect(ctx, x1, y1, RIGHT, y2, '#f97316', label, 0.08, true);
    }
  }

  // ── BOS / CHoCH ───────────────────────────────────────────────────────────
  if (active.has('SMC_BOS')) {
    for (const sp of smc.structurePoints) {
      const x1 = toX(sp.time);
      const y = toY(sp.price);
      if (x1 === null || y === null) continue;
      const color = sp.type === 'CHoCH'
        ? '#fbbf24'
        : sp.direction === 'bullish' ? '#34d399' : '#f87171';
      const style: 'dashed' | 'dotted' = sp.type === 'CHoCH' ? 'dotted' : 'dashed';
      drawHLine(ctx, x1, RIGHT, y, color, style, sp.type);
    }
  }

  // ── Liquidity Zones ───────────────────────────────────────────────────────
  if (active.has('SMC_LIQ')) {
    for (const z of smc.liquidityZones.filter(z => !z.swept)) {
      const x1 = toX(z.time);
      const y = toY(z.price);
      if (x1 === null || y === null) continue;
      const color = z.type === 'buy-side' ? '#c084fc' : '#fb923c';
      drawHLine(ctx, x1, RIGHT, y, color, 'dotted',
        z.type === 'buy-side' ? 'BSL' : 'SSL');
    }
  }

  // ── Inducement ────────────────────────────────────────────────────────────
  if (active.has('SMC_INDUCEMENT')) {
    for (const ind of smc.inducementLevels) {
      const x1 = toX(ind.time);
      const y = toY(ind.price);
      if (x1 === null || y === null) continue;
      const up = ind.type === 'buy-side';
      drawTriangle(ctx, x1, y, up, '#e879f9');
      ctx.save();
      ctx.fillStyle = '#e879f9';
      ctx.globalAlpha = 0.7;
      ctx.font = 'bold 8px monospace';
      ctx.fillText('IND', x1 + 7, y + 3);
      ctx.restore();
    }
  }

  // ── Displacement ──────────────────────────────────────────────────────────
  if (active.has('SMC_DISPLACEMENT')) {
    for (const dc of smc.displacementCandles) {
      const x = toX(dc.time);
      const yHigh = toY(dc.high);
      const yLow = toY(dc.low);
      const yOpen = toY(dc.open);
      const yClose = toY(dc.close);
      if (x === null || yHigh === null || yLow === null || yOpen === null || yClose === null) continue;

      const color = dc.type === 'bullish' ? '#4ade80' : '#f87171';
      const barW = Math.max(6, RIGHT / 120);

      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      const top = Math.min(yOpen, yClose);
      const bot = Math.max(yOpen, yClose);
      ctx.fillRect(x - barW / 2, top, barW, bot - top);

      // Arrow above/below
      ctx.globalAlpha = 0.9;
      const arrowX = x;
      if (dc.type === 'bullish') {
        drawTriangle(ctx, arrowX, yHigh - 6, true, color);
      } else {
        drawTriangle(ctx, arrowX, yLow + 6, false, color);
      }

      ctx.fillStyle = color;
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`×${dc.bodyRatio.toFixed(1)}`, x + barW / 2 + 2, top + 8);
      ctx.restore();
    }
  }

  // ── Premium / Discount ────────────────────────────────────────────────────
  if (active.has('SMC_PD') && smc.premiumDiscount) {
    const { premium, discount, equilibrium } = smc.premiumDiscount;
    const yPrem = toY(premium);
    const yDisc = toY(discount);
    const yEq = toY(equilibrium);

    if (yPrem !== null && yDisc !== null) {
      ctx.save();
      // Premium zone (above equilibrium)
      const yTop = Math.min(yPrem, 0);
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, yTop, RIGHT, Math.max(0, yPrem) - yTop);

      // Discount zone (below equilibrium)
      const yBot = Math.max(yDisc, canvas.height);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, yDisc ?? 0, RIGHT, yBot - (yDisc ?? 0));
      ctx.restore();
    }

    drawHLine(ctx, 0, RIGHT, yPrem, '#ef4444', 'dashed', 'PREM');
    drawHLine(ctx, 0, RIGHT, yEq, '#facc15', 'dashed', 'EQ');
    drawHLine(ctx, 0, RIGHT, yDisc, '#22c55e', 'dashed', 'DISC');
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SMCLiveChart({ symbol, candles, smc, activeIndicators, darkMode, height = '100%' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redrawOverlay = useCallback(() => {
    if (!chartRef.current || !seriesRef.current || !canvasRef.current || !containerRef.current) return;
    drawSMCOverlay(chartRef.current, seriesRef.current, canvasRef.current, containerRef.current, smc, activeIndicators);
  }, [smc, activeIndicators]);

  // Mount chart
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#050a0e' : '#ffffff' },
        textColor: darkMode ? '#9ca3af' : '#374151',
      },
      grid: {
        vertLines: { color: darkMode ? '#1f2937' : '#f3f4f6', style: LineStyle.Dotted },
        horzLines: { color: darkMode ? '#1f2937' : '#f3f4f6', style: LineStyle.Dotted },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: darkMode ? '#374151' : '#d1d5db' },
      timeScale: { borderColor: darkMode ? '#374151' : '#d1d5db', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    });

    chart.timeScale().fitContent();

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Canvas overlay
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
    }

    // Redraw on zoom/scroll
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => redrawOverlay());

    const ro = new ResizeObserver(() => {
      chart.resize(container.clientWidth, container.clientHeight);
      redrawOverlay();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]);

  // Update candle data
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || candles.length === 0) return;
    const data = candles.map(c => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    series.setData(data);
    chartRef.current?.timeScale().fitContent();
    redrawOverlay();
  }, [candles, redrawOverlay]);

  // Redraw SMC overlay when smc/indicators change
  useEffect(() => {
    redrawOverlay();
  }, [redrawOverlay]);

  return (
    <div style={{ position: 'relative', width: '100%', height }} ref={containerRef}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 2 }} />
      {(!candles || candles.length === 0) && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: darkMode ? '#6b7280' : '#9ca3af', fontSize: 13, fontFamily: 'monospace', zIndex: 3,
        }}>
          {symbol} — loading candles…
        </div>
      )}
    </div>
  );
}
