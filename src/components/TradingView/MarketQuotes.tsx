import { useEffect, useRef } from 'react';

interface Props {
  width?: number;
  height?: number;
}

const DEFAULT_GROUPS = [
  {
    name: 'Forex',
    symbols: [
      { name: 'FX:EURUSD', displayName: 'EUR/USD' },
      { name: 'FX:GBPUSD', displayName: 'GBP/USD' },
      { name: 'FX:USDJPY', displayName: 'USD/JPY' },
      { name: 'FX:USDCHF', displayName: 'USD/CHF' },
      { name: 'FX:AUDUSD', displayName: 'AUD/USD' },
      { name: 'FX:USDCAD', displayName: 'USD/CAD' },
    ],
  },
  {
    name: 'Indices',
    symbols: [
      { name: 'FOREXCOM:SPXUSD', displayName: 'S&P 500' },
      { name: 'FOREXCOM:NSXUSD', displayName: 'US 100' },
      { name: 'FOREXCOM:DJI', displayName: 'Dow Jones' },
      { name: 'INDEX:NKY', displayName: 'Japan 225' },
      { name: 'INDEX:DEU40', displayName: 'DAX' },
    ],
  },
  {
    name: 'Cryptocurrencies',
    symbols: [
      { name: 'BINANCE:BTCUSDT', displayName: 'Bitcoin' },
      { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum' },
      { name: 'BINANCE:SOLUSDT', displayName: 'Solana' },
      { name: 'BINANCE:XRPUSDT', displayName: 'XRP' },
    ],
  },
];

export default function MarketQuotes({ width = 400, height = 400 }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      locale: 'en',
      largeChartUrl: '',
      isTransparent: false,
      showSymbolLogo: true,
      backgroundColor: '#0f0f0f',
      support_host: 'https://www.tradingview.com',
      width,
      height,
      symbolsGroups: DEFAULT_GROUPS,
    });
    container.current.appendChild(script);
    return () => {
      if (container.current) container.current.innerHTML = '';
    };
  }, [width, height]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}
