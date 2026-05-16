import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { useApp } from '@/context/AppContext';
import { CandleData } from '@/data/marketData';
import { BarChart3 } from 'lucide-react';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const;

function toCandlestickData(candles: CandleData[]): CandlestickData[] {
  return candles.map(c => ({
    time: c.time as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

function toVolumeData(candles: CandleData[], darkMode: boolean): HistogramData[] {
  return candles.map(c => ({
    time: c.time as Time,
    value: c.volume || 0,
    color: c.close >= c.open
      ? darkMode ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.4)'
      : darkMode ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.4)',
  }));
}

export default function TradingChart() {
  const { darkMode, selectedAsset, candles, t } = useApp();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [timeframe, setTimeframe] = useState<string>('5m');

  const bgColor = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? '#1e293b' : '#e2e8f0';
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 380 : 520;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: darkMode ? '#6366f1' : '#4f46e5', width: 1, style: 2 },
        horzLine: { color: darkMode ? '#6366f1' : '#4f46e5', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false, horzTouchDrag: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: darkMode ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [darkMode]);

  // Update data when candles change
  useEffect(() => {
    if (candleSeriesRef.current && volumeSeriesRef.current) {
      candleSeriesRef.current.setData(toCandlestickData(candles));
      volumeSeriesRef.current.setData(toVolumeData(candles, darkMode));
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [candles, darkMode]);

  if (!selectedAsset) return null;

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
    }`}>
      {/* Chart Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <BarChart3 className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <div>
            <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedAsset.symbol}
            </span>
            <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {selectedAsset.name}
            </span>
          </div>
        </div>

        {/* Timeframes */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                timeframe === tf
                  ? darkMode
                    ? 'bg-indigo-500/30 text-indigo-400'
                    : 'bg-indigo-100 text-indigo-700'
                  : darkMode
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t(tf as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Current Price Info */}
      <div className={`flex flex-wrap items-center gap-4 px-4 py-2 border-b ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          ${selectedAsset.price.toLocaleString()}
        </span>
        <span className={`text-sm font-semibold ${
          selectedAsset.changePercent >= 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {selectedAsset.changePercent >= 0 ? '+' : ''}{selectedAsset.changePercent}%
        </span>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          H: ${selectedAsset.high.toLocaleString()} L: ${selectedAsset.low.toLocaleString()}
        </span>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Vol: {selectedAsset.volume}
        </span>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
