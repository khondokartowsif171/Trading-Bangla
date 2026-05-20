import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  LineStyle,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
  SeriesMarker,
  Time,
} from 'lightweight-charts';
import { BotSignal } from '@/hooks/useSignalBot';

interface ProChartProps {
  darkMode: boolean;
  latestSignal?: BotSignal | null;
  botStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
}

type SymbolKey = 'XAU/USD' | 'EUR/USD' | 'GBP/USD' | 'BTC/USD';
type Timeframe = 'M15' | 'H1' | 'H4' | 'D1';

interface OHLCV {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const SYMBOL_BASE: Record<SymbolKey, number> = {
  'XAU/USD': 2350,
  'EUR/USD': 1.082,
  'GBP/USD': 1.271,
  'BTC/USD': 67000,
};

const TF_SECONDS: Record<Timeframe, number> = {
  M15: 900,
  H1: 3600,
  H4: 14400,
  D1: 86400,
};

function generateCandles(symbol: SymbolKey, tf: Timeframe, count = 200): OHLCV[] {
  const base = SYMBOL_BASE[symbol];
  const now = Math.floor(Date.now() / 1000);
  const interval = TF_SECONDS[tf];
  let close = base;
  const result: OHLCV[] = [];
  for (let i = 0; i < count; i++) {
    const t = now - (count - i) * interval;
    const change = (Math.random() - 0.49) * base * 0.002;
    close = Math.max(close + change, base * 0.9);
    const open = close - change;
    const high = Math.max(open, close) + Math.random() * base * 0.001;
    const low = Math.min(open, close) - Math.random() * base * 0.001;
    const volume = Math.floor(1000 + Math.random() * 9000);
    result.push({ time: t as UTCTimestamp, open, high, low, close, volume });
  }
  return result;
}

function calcEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(period - 1).fill(null);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcBB(data: number[], period = 20, mult = 2): { upper: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    upper.push(mean + mult * std);
    lower.push(mean - mult * std);
  }
  return { upper, lower };
}

function calcRSI(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(period).fill(null);
  const changes = data.slice(1).map((v, i) => v - data[i]);
  let avgGain = changes.slice(0, period).filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  let avgLoss = changes.slice(0, period).filter(c => c < 0).reduce((a, b) => a + Math.abs(b), 0) / period;
  const rsi = (ag: number, al: number) => al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  result.push(rsi(avgGain, avgLoss));
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(rsi(avgGain, avgLoss));
  }
  return result;
}

function calcMACD(data: number[]): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdLine: (number | null)[] = ema12.map((v, i) => v != null && ema26[i] != null ? v - ema26[i]! : null);
  const macdValues = macdLine.filter((v): v is number => v != null);
  const signalRaw = calcEMA(macdValues, 9);
  const signal: (number | null)[] = new Array(macdLine.length).fill(null);
  let si = 0;
  let filled = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      if (filled >= signalRaw.length - macdValues.length + si) {
        signal[i] = signalRaw[si] ?? null;
        si++;
      }
      filled++;
    }
  }
  const adjustedSignal: (number | null)[] = new Array(macdLine.length).fill(null);
  let sIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      adjustedSignal[i] = signalRaw[sIdx] ?? null;
      sIdx++;
    }
  }
  const hist: (number | null)[] = macdLine.map((v, i) => v != null && adjustedSignal[i] != null ? v - adjustedSignal[i]! : null);
  return { macd: macdLine, signal: adjustedSignal, hist };
}

function calcATR(candles: OHLCV[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const { high, low } = candles[i];
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

const SYMBOLS: SymbolKey[] = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'BTC/USD'];
const TIMEFRAMES: Timeframe[] = ['M15', 'H1', 'H4', 'D1'];

type IndicatorToggle = 'EMA' | 'BB' | 'RSI' | 'MACD' | 'Vol';

export default function ProChart({ darkMode, latestSignal, botStatus }: ProChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markersRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);

  const [symbol, setSymbol] = useState<SymbolKey>('XAU/USD');
  const [timeframe, setTimeframe] = useState<Timeframe>('M15');
  const [indicators, setIndicators] = useState<Record<IndicatorToggle, boolean>>({
    EMA: true, BB: true, RSI: true, MACD: true, Vol: true,
  });
  const [atr, setAtr] = useState<number | null>(null);
  const [candles, setCandles] = useState<OHLCV[]>(() => generateCandles('XAU/USD', 'M15'));
  const [chartError, setChartError] = useState<string | null>(null);

  const toggleIndicator = (ind: IndicatorToggle) => {
    setIndicators(prev => ({ ...prev, [ind]: !prev[ind] }));
  };

  const getThemeColors = useCallback(() => ({
    bg: darkMode ? '#0f172a' : '#ffffff',
    grid: darkMode ? '#1e293b' : '#e2e8f0',
    text: darkMode ? '#94a3b8' : '#475569',
    border: darkMode ? '#1e293b' : '#cbd5e1',
    crosshair: darkMode ? '#475569' : '#94a3b8',
    upCandle: '#22c55e',
    downCandle: '#ef4444',
    upWick: '#22c55e',
    downWick: '#ef4444',
  }), [darkMode]);

  const buildChartOptions = useCallback((height: number) => {
    const c = getThemeColors();
    return {
      layout: {
        background: { type: ColorType.Solid, color: c.bg },
        textColor: c.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: c.grid, style: LineStyle.Solid },
        horzLines: { color: c.grid, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: c.crosshair, labelBackgroundColor: '#334155' },
        horzLine: { color: c.crosshair, labelBackgroundColor: '#334155' },
      },
      rightPriceScale: {
        borderColor: c.border,
        textColor: c.text,
      },
      timeScale: {
        borderColor: c.border,
        textColor: c.text,
        timeVisible: true,
        secondsVisible: false,
      },
      height,
      handleScroll: true,
      handleScale: true,
    };
  }, [getThemeColors]);

  const initCharts = useCallback(() => {
    try {
    if (!mainRef.current) return;

    mainChartRef.current?.remove();
    rsiChartRef.current?.remove();
    macdChartRef.current?.remove();

    const mainChart = createChart(mainRef.current, buildChartOptions(360));
    mainChartRef.current = mainChart;

    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = mainChart.addSeries(HistogramSeries, {
      color: '#334155',
      priceFormat: { type: 'volume' as const },
      priceScaleId: 'vol',
    });
    mainChart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    ema20Ref.current = mainChart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    ema50Ref.current = mainChart.addSeries(LineSeries, { color: '#f97316', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    ema200Ref.current = mainChart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    bbUpperRef.current = mainChart.addSeries(LineSeries, { color: '#64748b', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    bbLowerRef.current = mainChart.addSeries(LineSeries, { color: '#64748b', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });

    if (rsiRef.current) {
      const rsiChart = createChart(rsiRef.current, { ...buildChartOptions(120), timeScale: { visible: false } });
      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiChart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
    }

    if (!macdRef.current) return;
    const macdChart = createChart(macdRef.current, buildChartOptions(120));
    macdChartRef.current = macdChart;
    macdHistRef.current = macdChart.addSeries(HistogramSeries, { color: '#22c55e', priceLineVisible: false, lastValueVisible: false });
    macdLineRef.current = macdChart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    macdSignalRef.current = macdChart.addSeries(LineSeries, { color: '#f97316', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    const syncTimeScale = (src: IChartApi, targets: IChartApi[]) => {
      src.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) targets.forEach(t => t.timeScale().setVisibleLogicalRange(range));
      });
    };
    syncTimeScale(mainChart, [macdChart]);
    syncTimeScale(macdChart, [mainChart]);
    } catch (e) {
      setChartError(String(e));
    }
  }, [buildChartOptions]);

  const populateData = useCallback((data: OHLCV[]) => {
    const closes = data.map(d => d.close);

    candleSeriesRef.current?.setData(data.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));

    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);
    const bb = calcBB(closes);
    const rsiVals = calcRSI(closes);
    const { macd, signal, hist } = calcMACD(closes);

    const mapNonNull = (vals: (number | null)[]) =>
      data.filter((_, i) => vals[i] != null).map(d => ({ time: d.time, value: vals[data.indexOf(d)]! }));

    ema20Ref.current?.setData(mapNonNull(ema20));
    ema50Ref.current?.setData(mapNonNull(ema50));
    ema200Ref.current?.setData(mapNonNull(ema200));
    bbUpperRef.current?.setData(mapNonNull(bb.upper));
    bbLowerRef.current?.setData(mapNonNull(bb.lower));

    volSeriesRef.current?.setData(data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#22c55e44' : '#ef444444',
    })));

    const rsiMapped = data
      .filter((_, i) => rsiVals[i] != null)
      .map(d => {
        const i = data.indexOf(d);
        const v = rsiVals[i]!;
        return { time: d.time, value: v, color: v > 70 ? '#ef4444' : v < 30 ? '#22c55e' : '#a78bfa' };
      });
    rsiSeriesRef.current?.setData(rsiMapped.map(({ time, value }) => ({ time, value })));

    macdHistRef.current?.setData(
      data.filter((_, i) => hist[i] != null).map(d => {
        const i = data.indexOf(d);
        const v = hist[i]!;
        return { time: d.time, value: v, color: v >= 0 ? '#22c55e88' : '#ef444488' };
      })
    );
    macdLineRef.current?.setData(mapNonNull(macd));
    macdSignalRef.current?.setData(mapNonNull(signal));

    const atrVal = calcATR(data);
    setAtr(atrVal);

    mainChartRef.current?.timeScale().fitContent();
    macdChartRef.current?.timeScale().fitContent();
  }, []);

  useEffect(() => {
    initCharts();
    return () => {
      mainChartRef.current?.remove();
      rsiChartRef.current?.remove();
      macdChartRef.current?.remove();
    };
  }, [initCharts]);

  useEffect(() => {
    const data = generateCandles(symbol, timeframe);
    setCandles(data);
    populateData(data);
  }, [symbol, timeframe, populateData]);

  useEffect(() => {
    if (!mainChartRef.current) return;
    const c = getThemeColors();
    mainChartRef.current.applyOptions({
      layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    });
    rsiChartRef.current?.applyOptions({
      layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    });
    macdChartRef.current?.applyOptions({
      layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    });
  }, [darkMode, getThemeColors]);

  useEffect(() => {
    ema20Ref.current?.applyOptions({ visible: indicators.EMA });
    ema50Ref.current?.applyOptions({ visible: indicators.EMA });
    ema200Ref.current?.applyOptions({ visible: indicators.EMA });
    bbUpperRef.current?.applyOptions({ visible: indicators.BB });
    bbLowerRef.current?.applyOptions({ visible: indicators.BB });
    volSeriesRef.current?.applyOptions({ visible: indicators.Vol });
    rsiSeriesRef.current?.applyOptions({ visible: indicators.RSI });
    if (rsiRef.current) rsiRef.current.style.display = indicators.RSI ? 'block' : 'none';
    macdLineRef.current?.applyOptions({ visible: indicators.MACD });
    macdSignalRef.current?.applyOptions({ visible: indicators.MACD });
    macdHistRef.current?.applyOptions({ visible: indicators.MACD });
    if (macdRef.current) macdRef.current.style.display = indicators.MACD ? 'block' : 'none';
  }, [indicators]);

  useEffect(() => {
    if (!latestSignal || !candleSeriesRef.current || candles.length === 0) return;
    if (latestSignal.direction === 'NEUTRAL') return;

    const lastCandle = candles[candles.length - 1];
    const isBuy = latestSignal.direction === 'BUY';

    const marker: SeriesMarker<Time> = {
      time: lastCandle.time as Time,
      position: isBuy ? 'belowBar' : 'aboveBar',
      shape: isBuy ? 'arrowUp' : 'arrowDown',
      color: isBuy ? '#22c55e' : '#ef4444',
      text: `${latestSignal.direction} ${latestSignal.confidence}%`,
      size: 1,
    };

    if (markersRef.current) {
      markersRef.current.setMarkers([marker]);
    } else {
      markersRef.current = createSeriesMarkers(candleSeriesRef.current, [marker]);
    }
  }, [latestSignal, candles]);

  const formatPrice = (p: number) => p > 100 ? p.toFixed(2) : p.toFixed(5);

  const pillBase = 'px-2.5 py-1 rounded-full text-xs font-medium transition-all';
  const pillActive = (on: boolean) =>
    on
      ? 'bg-indigo-500 text-white'
      : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200';

  const containerBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const headerText = darkMode ? 'text-white' : 'text-gray-900';
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500';

  const botOnline = botStatus === 'connected';

  return (
    <div className={`rounded-xl border ${containerBg} overflow-hidden flex flex-col`}>
      <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} flex flex-wrap items-center gap-2`}>
        <div className="flex items-center gap-2 mr-2">
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value as SymbolKey)}
            className={`text-sm font-bold rounded-lg px-2 py-1 border-0 outline-none cursor-pointer ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
          >
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className={`text-xs ${subText}`}>{timeframe}</span>
        </div>

        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`${pillBase} ${timeframe === tf
                ? 'bg-indigo-500 text-white'
                : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto flex-wrap">
          {(['EMA', 'BB', 'RSI', 'MACD', 'Vol'] as IndicatorToggle[]).map(ind => (
            <button
              key={ind}
              onClick={() => toggleIndicator(ind)}
              className={`${pillBase} ${pillActive(indicators[ind])}`}
            >
              {ind}
            </button>
          ))}
        </div>

        {atr != null && (
          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
            ATR {formatPrice(atr)}
          </span>
        )}

        <span className={`text-xs px-2 py-1 rounded-full font-medium ${botOnline
          ? 'bg-green-500/20 text-green-400'
          : 'bg-red-500/20 text-red-400'}`}>
          {botOnline ? '● LIVE' : '○ OFFLINE'}
        </span>
      </div>

      <div ref={mainRef} className="w-full" style={{ minHeight: 360 }} />

      {indicators.RSI && (
        <div className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`px-3 py-0.5 text-xs font-medium ${subText}`}>RSI (14)</div>
          <div ref={rsiRef} className="w-full" style={{ height: 120 }} />
        </div>
      )}

      {indicators.MACD && (
        <div className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`px-3 py-0.5 text-xs font-medium ${subText}`}>MACD (12, 26, 9)</div>
          <div ref={macdRef} className="w-full" style={{ height: 120 }} />
        </div>
      )}

      {latestSignal && latestSignal.direction !== 'NEUTRAL' && (
        <div className={`border-t px-4 py-2 flex items-center gap-3 text-xs ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
          <span className={`font-bold px-2 py-0.5 rounded ${latestSignal.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {latestSignal.direction}
          </span>
          <span className={headerText}>{latestSignal.symbol}</span>
          <span className={subText}>Entry: {latestSignal.entry}</span>
          <span className="text-red-400">SL: {latestSignal.stopLoss}</span>
          <span className="text-green-400">TP: {latestSignal.takeProfit}</span>
          <span className={subText}>Conf: {latestSignal.confidence}%</span>
        </div>
      )}
    </div>
  );
}
