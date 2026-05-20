import { useState, useEffect, useCallback } from 'react';
import {
  startMarketData,
  onPriceUpdate,
  onCandleUpdate,
  getPrice,
  getCandles,
  seedHistoricalData,
  RealTimeQuote,
  OHLC,
} from '@/services/marketDataService';

export type { RealTimeQuote, OHLC };

let started = false;

function ensureStarted() {
  if (!started) { startMarketData(); started = true; }
}

export function useMarketData(symbol: string) {
  const [price, setPrice] = useState<RealTimeQuote | null>(getPrice(symbol));
  const [candles, setCandles] = useState<OHLC[]>(getCandles(symbol));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureStarted();
    // Seed historical data
    seedHistoricalData(symbol).then(historical => {
      if (historical.length > 0) {
        setCandles(historical);
      }
      setReady(true);
    });

    const unsubPrice = onPriceUpdate(q => {
      if (q.symbol === symbol) setPrice({ ...q });
    });
    const unsubCandle = onCandleUpdate((sym, c) => {
      if (sym === symbol) setCandles([...c]);
    });

    return () => { unsubPrice(); unsubCandle(); };
  }, [symbol]);

  return { price, candles, ready };
}

export function useAllPrices() {
  const [prices, setPrices] = useState<Record<string, RealTimeQuote>>({});

  useEffect(() => {
    ensureStarted();
    const unsub = onPriceUpdate(q => {
      setPrices(prev => ({ ...prev, [q.symbol]: q }));
    });
    return () => unsub();
  }, []);

  return prices;
}
