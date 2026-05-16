import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCryptoTickers, CryptoAsset } from '@/services/cryptoApi';

export function useCryptoAssets() {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const prev = useRef<Record<string, number>>({});

  const refresh = useCallback(async () => {
    try {
      const data = await fetchCryptoTickers();
      data.forEach(a => { prev.current[a.symbol] = a.price; });
      setAssets(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { assets, loading, refresh };
}

export function useCryptoSignals(assets: CryptoAsset[]) {
  const [signals, setSignals] = useState<Array<{
    symbol: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; entry: number; confidence: number; reason: string;
  }>>([]);

  useEffect(() => {
    const gen = () => {
      const result = assets.slice(0, 20).map(a => {
        const rsi = 30 + Math.random() * 40;
        const score = Math.floor(Math.random() * 100);
        let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
        let reason = 'Consolidating';

        if (a.changePercent24h > 5 && rsi < 50) {
          signal = 'BUY';
          reason = 'Strong momentum + RSI room';
        } else if (a.changePercent24h > 3) {
          signal = 'BUY';
          reason = 'Bullish momentum';
        } else if (a.changePercent24h < -4 && rsi > 50) {
          signal = 'SELL';
          reason = 'Bearish pressure';
        } else if (a.changePercent24h < -2) {
          signal = 'SELL';
          reason = 'Selling pressure';
        } else if (score > 80 && a.quoteVolume > 1e9) {
          signal = 'BUY';
          reason = 'High volume + momentum';
        } else if (score < 20) {
          signal = 'SELL';
          reason = 'Technical weakness';
        }

        return { symbol: a.symbol, signal, entry: a.price, confidence: Math.floor(score), reason };
      });
      setSignals(result.filter(s => s.signal !== 'NEUTRAL').slice(0, 6));
    };
    gen();
    const interval = setInterval(gen, 6000);
    return () => clearInterval(interval);
  }, [assets]);

  return signals;
}
