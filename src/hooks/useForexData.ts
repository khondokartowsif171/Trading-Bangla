import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ForexRate,
  ForexTimeSeries,
  FOREX_PAIRS,
  fetchPairRate,
  fetchHistoricalRates,
} from '@/services/forexApi';

export interface ForexAsset {
  symbol: string;
  name: string;
  rate: number;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  prevClose: number;
  volume: string;
}

export interface ForexCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

function generateCandlesFromRates(rates: { date: string; rate: number }[]): ForexCandle[] {
  return rates.map((r, i) => {
    const prev = rates[i - 1]?.rate || r.rate;
    const volatility = r.rate * 0.003;
    const open = prev;
    const close = r.rate;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    return { time: r.date, open, high, low, close, volume: Math.floor(Math.random() * 10000) + 1000 };
  });
}

export function useForexRates() {
  const [rates, setRates] = useState<Record<string, ForexAsset>>({});
  const [loading, setLoading] = useState(true);
  const prevRates = useRef<Record<string, number>>({});

  const updateRates = useCallback(async () => {
    try {
      const results = await Promise.allSettled(
        FOREX_PAIRS.slice(0, 15).map(p => fetchPairRate(p.base, p.target))
      );
      const updates: Record<string, ForexAsset> = {};
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          const r = res.value;
          const pair = FOREX_PAIRS.find(p => p.base === r.base && p.target === r.target);
          if (!pair) return;
          const prev = prevRates.current[pair.symbol] || r.rate;
          const change = r.rate - prev;
          updates[pair.symbol] = {
            symbol: pair.symbol,
            name: pair.name,
            rate: r.rate,
            bid: r.bid,
            ask: r.ask,
            spread: r.spread,
            change: Math.round(change * 10000) / 10000,
            changePercent: Math.round((change / prev) * 10000) / 100,
            high: r.rate + r.rate * 0.002,
            low: r.rate - r.rate * 0.002,
            prevClose: prev,
            volume: `${(Math.random() * 100 + 50).toFixed(1)}B`,
          };
          prevRates.current[pair.symbol] = r.rate;
        }
      });
      setRates(updates);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    updateRates();
    const interval = setInterval(updateRates, 30000);
    return () => clearInterval(interval);
  }, [updateRates]);

  return { rates, loading, refresh: updateRates };
}

export function useForexHistorical(symbol: string, days = 30) {
  const [candles, setCandles] = useState<ForexCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const pair = FOREX_PAIRS.find(p => p.symbol === symbol);

  useEffect(() => {
    if (!pair) return;
    let mounted = true;
    setLoading(true);

    fetchHistoricalRates(pair.base, pair.target, days).then((data: ForexTimeSeries) => {
      if (!mounted) return;
      setCandles(generateCandlesFromRates(data.rates));
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [symbol, days]);

  return { candles, loading };
}
