import { useEffect, useRef } from 'react';
import { useAllPrices } from '@/hooks/useMarketData';
import { useApp } from '@/context/AppContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

const TICKER_SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD', 'GBP/JPY', 'EUR/GBP', 'NZD/USD'];

function formatTickerPrice(symbol: string, price: number) {
  if (symbol.includes('XAU')) return price.toFixed(2);
  if (symbol.includes('JPY')) return price.toFixed(3);
  return price.toFixed(5);
}

// Fallback static prices for symbols not yet loaded
const FALLBACK: Record<string, { bid: number; changePercent: number }> = {
  'XAU/USD': { bid: 3315.00, changePercent: 0.23 },
  'EUR/USD': { bid: 1.08523, changePercent: -0.12 },
  'GBP/USD': { bid: 1.27456, changePercent: 0.08 },
  'USD/JPY': { bid: 151.234, changePercent: 0.15 },
  'AUD/USD': { bid: 0.64821, changePercent: -0.06 },
  'USD/CHF': { bid: 0.91234, changePercent: 0.04 },
  'USD/CAD': { bid: 1.35678, changePercent: -0.09 },
  'GBP/JPY': { bid: 192.345, changePercent: 0.21 },
  'EUR/GBP': { bid: 0.85234, changePercent: -0.03 },
  'NZD/USD': { bid: 0.59123, changePercent: 0.11 },
};

export default function LivePriceTicker() {
  const { darkMode } = useApp();
  const livePrices = useAllPrices();
  const trackRef = useRef<HTMLDivElement>(null);

  // Auto-scroll animation
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let pos = 0;
    let animId: number;
    const step = () => {
      pos += 0.5;
      const half = el.scrollWidth / 2;
      if (pos >= half) pos = 0;
      el.style.transform = `translateX(-${pos}px)`;
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  const items = TICKER_SYMBOLS.map(sym => {
    const live = livePrices[sym];
    const bid = live?.bid ?? FALLBACK[sym]?.bid ?? 0;
    const pct = live?.changePercent ?? FALLBACK[sym]?.changePercent ?? 0;
    const isLive = !!live;
    return { sym, bid, pct, isLive };
  });

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className={`overflow-hidden border-b ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div ref={trackRef} className="flex items-center will-change-transform py-1.5" style={{ width: 'max-content' }}>
        {doubled.map((item, idx) => {
          const isPos = item.pct >= 0;
          return (
            <div
              key={`${item.sym}-${idx}`}
              className={`flex items-center gap-2 px-6 border-r shrink-0 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}
            >
              {/* Live dot */}
              {item.isLive && <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse shrink-0" />}

              {/* Symbol */}
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.sym}</span>

              {/* Price */}
              <span className={`text-xs font-semibold tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatTickerPrice(item.sym, item.bid)}
              </span>

              {/* Change */}
              <span className={`flex items-center gap-0.5 text-[10px] font-medium ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                {isPos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {isPos ? '+' : ''}{item.pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
