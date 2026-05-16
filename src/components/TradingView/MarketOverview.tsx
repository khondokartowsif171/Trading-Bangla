import { useEffect, useRef } from 'react';

interface Props {
  width?: number;
  height?: number;
  showChart?: boolean;
}

const DEFAULT_TABS = [
  {
    title: 'Forex',
    symbols: [
      { s: 'FX:EURUSD', d: 'EUR to USD' },
      { s: 'FX:GBPUSD', d: 'GBP to USD' },
      { s: 'FX:USDJPY', d: 'USD to JPY' },
      { s: 'FX:USDCHF', d: 'USD to CHF' },
      { s: 'FX:AUDUSD', d: 'AUD to USD' },
      { s: 'FX:USDCAD', d: 'USD to CAD' },
    ],
  },
  {
    title: 'Indices',
    symbols: [
      { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
      { s: 'FOREXCOM:NSXUSD', d: 'US 100 Cash CFD' },
      { s: 'FOREXCOM:DJI', d: 'Dow Jones' },
      { s: 'INDEX:NKY', d: 'Japan 225' },
      { s: 'INDEX:DEU40', d: 'DAX Index' },
      { s: 'FOREXCOM:UKXGBP', d: 'FTSE 100' },
    ],
  },
  {
    title: 'Commodities',
    symbols: [
      { s: 'CMCMARKETS:GOLD', d: 'Gold' },
      { s: 'PYTH:WTI3!', d: 'WTI Crude Oil' },
      { s: 'BMFBOVESPA:CCM1!', d: 'Corn' },
      { s: 'BMFBOVESPA:ISP1!', d: 'S&P 500' },
    ],
  },
];

export default function MarketOverview({ width = 400, height = 400, showChart = true }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '12M',
      locale: 'en',
      largeChartUrl: '',
      isTransparent: false,
      showFloatingTooltip: false,
      plotLineColorGrowing: 'rgba(34,197,94,1)',
      plotLineColorFalling: 'rgba(239,68,68,1)',
      gridLineColor: 'rgba(240,243,250,0)',
      scaleFontColor: '#d1d5db',
      belowLineFillColorGrowing: 'rgba(34,197,94,0.12)',
      belowLineFillColorFalling: 'rgba(239,68,68,0.12)',
      belowLineFillColorGrowingBottom: 'rgba(34,197,94,0)',
      belowLineFillColorFallingBottom: 'rgba(239,68,68,0)',
      symbolActiveColor: 'rgba(34,197,94,0.12)',
      tabs: DEFAULT_TABS.map(t => ({ ...t, originalTitle: t.title })),
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#0f0f0f',
      width: String(width),
      height: String(height),
      showSymbolLogo: true,
      showChart,
    });
    container.current.appendChild(script);
    return () => {
      if (container.current) container.current.innerHTML = '';
    };
  }, [width, height, showChart]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}
