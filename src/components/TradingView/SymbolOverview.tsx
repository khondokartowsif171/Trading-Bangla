import { useEffect, useRef } from 'react';

interface Props {
  symbols: { s: string; d: string }[];
  width?: string | number;
  height?: string | number;
}

export default function SymbolOverview({ symbols, width = '100%', height = '100%' }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      lineWidth: 2,
      lineType: 0,
      chartType: 'area',
      fontColor: '#6b7280',
      gridLineColor: 'rgba(242,242,242,0.06)',
      volumeUpColor: 'rgba(34,197,94,0.5)',
      volumeDownColor: 'rgba(239,68,68,0.5)',
      backgroundColor: '#0f0f0f',
      widgetFontColor: '#d1d5db',
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      colorTheme: 'dark',
      isTransparent: false,
      locale: 'en',
      chartOnly: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      symbols: symbols.map(s => [s.d, `${s.s}|1D`]),
      dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
      fontSize: '10',
      headerFontSize: 'medium',
      autosize: true,
      width: '100%',
      height: '100%',
      noTimeScale: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
    });
    container.current.appendChild(script);
    return () => {
      if (container.current) container.current.innerHTML = '';
    };
  }, [symbols]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ width, height }}>
      <div className="tradingview-widget-container__widget" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
