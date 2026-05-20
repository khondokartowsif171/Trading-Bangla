import { useEffect, useRef, memo } from 'react';
import { useApp } from '@/context/AppContext';

// App symbol → TradingView symbol map
export const TV_SYMBOL_MAP: Record<string, string> = {
  'XAU/USD': 'OANDA:XAUUSD',
  'XAUUSD': 'OANDA:XAUUSD',
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'AUD/USD': 'FX:AUDUSD',
  'USD/CHF': 'FX:USDCHF',
  'USD/CAD': 'FX:USDCAD',
  'NZD/USD': 'FX:NZDUSD',
  'GBP/JPY': 'FX:GBPJPY',
  'EUR/JPY': 'FX:EURJPY',
  'EUR/GBP': 'FX:EURGBP',
  'BTC/USD': 'BINANCE:BTCUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
  'BTC/USDT': 'BINANCE:BTCUSDT',
  'ETH/USDT': 'BINANCE:ETHUSDT',
};

export function toTvSymbol(symbol: string): string {
  return TV_SYMBOL_MAP[symbol] ?? `FX:${symbol.replace('/', '')}`;
}

// Module-level stable default — must NOT be recreated per render (would thrash the widget)
const DEFAULT_STUDIES = ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'];

interface Props {
  symbol: string;          // app symbol e.g. 'XAU/USD'
  interval?: string;       // TradingView interval e.g. '60', '15', 'D'
  height?: number | string;
  studies?: string[];      // preloaded indicators
}

function AdvancedChartBase({
  symbol,
  interval = '60',
  height = 480,
  studies = DEFAULT_STUDIES,
}: Props) {
  const { darkMode } = useApp();
  const container = useRef<HTMLDivElement>(null);
  const studiesKey = studies.join(',');

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const tvSymbol = toTvSymbol(symbol);
    host.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = 'calc(100% - 24px)';
    widget.style.width = '100%';
    host.appendChild(widget);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: 'Asia/Dhaka',
      theme: darkMode ? 'dark' : 'light',
      style: '1',                 // candlestick
      locale: 'en',
      enable_publishing: false,
      backgroundColor: darkMode ? '#0a0a0a' : '#ffffff',
      gridColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      withdateranges: true,
      hide_side_toolbar: false,   // KEEP drawing tools (Fibonacci, trendline, Gann...)
      allow_symbol_change: false, // symbol controlled by our selector
      save_image: true,
      details: false,
      calendar: false,
      studies: studies.slice(),
      support_host: 'https://www.tradingview.com',
    });
    host.appendChild(script);

    return () => { host.innerHTML = ''; };
    // studiesKey (string) keeps deps stable — array identity must NOT be a dep
  }, [symbol, interval, darkMode, studiesKey]);

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height, width: '100%' }}
    />
  );
}

// memo: only re-mount the widget when its actual props change, not on every parent render
const AdvancedChart = memo(AdvancedChartBase);
export default AdvancedChart;
