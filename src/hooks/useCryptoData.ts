import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCryptoTickers, fetchMarketOverview, CryptoAsset, MarketOverviewData } from '@/services/cryptoApi';

export function useCryptoAssets() {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const data = await fetchCryptoTickers(); setAssets(data); setLoading(false); }
    catch { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); const interval = setInterval(refresh, 30000); return () => clearInterval(interval); }, [refresh]);
  return { assets, loading, refresh };
}

export function useMarketOverview() {
  const [data, setData] = useState<MarketOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => { setData(await fetchMarketOverview()); setLoading(false); })();
    const interval = setInterval(async () => { setData(await fetchMarketOverview()); }, 60000);
    return () => clearInterval(interval);
  }, []);
  return { data, loading };
}

export function useCryptoSymbols(assets: CryptoAsset[]) {
  const [signals, setSignals] = useState<Array<{
    symbol: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; entry: number; target: number; stopLoss: number;
    confidence: number; indicator: string; timeframe: string;
  }>>([]);

  useEffect(() => {
    const gen = () => {
      const result = assets.slice(0, 30).map(a => {
        const rsi = 20 + Math.random() * 50;
        const conf = Math.floor(50 + Math.random() * 45);
        const volOk = a.quoteVolume > 1e8;
        let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
        let indicator = 'Consolidating';
        let tf = '1D';

        if (a.changePercent24h > 4 && rsi < 55) {
          signal = 'BUY'; indicator = 'RSI + Momentum Breakout'; tf = '4H';
        } else if (a.changePercent24h > 2 && volOk) {
          signal = 'BUY'; indicator = 'Volume Spike + Trend'; tf = '1D';
        } else if (a.changePercent24h < -3 && rsi > 45) {
          signal = 'SELL'; indicator = 'Bearish Divergence RSI'; tf = '4H';
        } else if (a.changePercent24h < -1.5) {
          signal = 'SELL'; indicator = 'Selling Pressure'; tf = '1D';
        } else if (conf > 80 && volOk) {
          signal = 'BUY'; indicator = 'High Volume Momentum'; tf = '1H';
        } else if (rsi > 70) {
          signal = 'SELL'; indicator = 'Overbought RSI'; tf = '1H';
        } else if (rsi < 30) {
          signal = 'BUY'; indicator = 'Oversold RSI Bounce'; tf = '4H';
        }
        const entry = a.price;
        const target = signal === 'BUY' ? entry * (1 + 0.05 + Math.random() * 0.1) : entry * (1 - 0.05 - Math.random() * 0.1);
        const stopLoss = signal === 'BUY' ? entry * (1 - 0.02 - Math.random() * 0.03) : entry * (1 + 0.02 + Math.random() * 0.03);
        return { symbol: a.symbol, signal, entry, target, stopLoss, confidence: Math.min(conf + 5, 95), indicator, timeframe: tf };
      });
      setSignals(result.filter(s => s.signal !== 'NEUTRAL').slice(0, 6));
    };
    gen();
    const interval = setInterval(gen, 8000);
    return () => clearInterval(interval);
  }, [assets]);

  return signals;
}

export function useTopMovers(assets: CryptoAsset[]) {
  const sorted = [...assets].sort((a, b) => Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h));
  return {
    gainers: sorted.filter(a => a.changePercent24h > 2).slice(0, 4),
    losers: sorted.filter(a => a.changePercent24h < -2).slice(0, 4),
  };
}
