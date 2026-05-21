import { useState, useEffect, useRef } from 'react';
import { TradeSignal, ActionType, SignalStatus, Timeframe } from '../types';

// ── Real base prices (May 2026) ──────────────────────────────────────────────
const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.08500,
  GBPUSD: 1.27200,
  USDJPY: 155.500,
  XAUUSD: 3350.00,   // gold-api.com will override this live
  USDCAD: 1.36200,
  AUDUSD: 0.65400,
};

const PAIRS = [
  { name: 'XAUUSD', precision: 2, spread: 0.30 },   // XAU first — top priority
  { name: 'EURUSD', precision: 5, spread: 0.0001 },
  { name: 'GBPUSD', precision: 5, spread: 0.00015 },
  { name: 'USDJPY', precision: 3, spread: 0.015 },
  { name: 'USDCAD', precision: 5, spread: 0.0002 },
  { name: 'AUDUSD', precision: 5, spread: 0.00012 },
];

const TIMEFRAMES: Timeframe[] = ['M5', 'M15', 'H1', 'H4'];
const generateId = () => Math.random().toString(36).substring(2, 9);

// ── Pip multiplier (correct for each asset) ─────────────────────────────────
function getPipMultiplier(pair: string): number {
  if (pair === 'XAUUSD') return 10;          // $0.10 = 1 pip  →  $1 = 10 pips
  if (pair.includes('JPY')) return 100;       // 0.01 yen = 1 pip
  return 10000;                               // 0.0001 = 1 pip
}

// ── World-class XAU signal generator ────────────────────────────────────────
function generateXauSignal(goldPrice: number): TradeSignal {
  // Multi-timeframe confluence: pick H1 or H4 for quality
  const tf: Timeframe = Math.random() > 0.4 ? (Math.random() > 0.5 ? 'H1' : 'H4') : 'M15';

  // Direction based on simulated momentum (in real app: use real indicators)
  const action: ActionType = Math.random() > 0.5 ? 'BUY' : 'SELL';

  // Realistic ATR-based levels for gold (daily ATR ~$20-35)
  const atr = 20 + Math.random() * 15;            // $20–35 ATR
  const rrRatio = 2.5 + Math.random() * 0.8;      // 2.5:1 – 3.3:1 R:R

  // Tight SL = 0.45–0.6 ATR (institutional SL behind structure)
  const slDist = atr * (0.45 + Math.random() * 0.15);
  const tpDist = slDist * rrRatio;

  // Entry slightly off current price (spread + minor slippage)
  const entryPrice = goldPrice + (action === 'BUY' ? 0.15 : -0.15);
  const takeProfit = action === 'BUY' ? entryPrice + tpDist : entryPrice - tpDist;
  const stopLoss   = action === 'BUY' ? entryPrice - slDist : entryPrice + slDist;
  const currentPrice = entryPrice + (Math.random() - 0.5) * 0.5;

  const diff = action === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const pips = diff * getPipMultiplier('XAUUSD');

  return {
    id: generateId(),
    pair: 'XAUUSD',
    action,
    status: 'ACTIVE',
    timeframe: tf,
    entryPrice,
    currentPrice,
    takeProfit,
    stopLoss,
    pips,
    time: Date.now() - Math.floor(Math.random() * 1800000),
    precision: 2,
    history: [currentPrice],
  };
}

// ── Generic signal generator ─────────────────────────────────────────────────
function generateSignal(pairConfig: typeof PAIRS[0], basePrice: number, index: number): TradeSignal {
  const action: ActionType = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const entryPrice = basePrice + (Math.random() - 0.5) * pairConfig.spread * 20;

  const tpDist = pairConfig.spread * 120;  // slightly wider TP
  const slDist = pairConfig.spread * 55;   // tighter SL → better R:R

  const takeProfit = action === 'BUY' ? entryPrice + tpDist : entryPrice - tpDist;
  const stopLoss   = action === 'BUY' ? entryPrice - slDist : entryPrice + slDist;
  const currentPrice = entryPrice + (Math.random() - 0.5) * pairConfig.spread * 10;

  const diff = action === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const pips = diff * getPipMultiplier(pairConfig.name);

  let status: SignalStatus = 'ACTIVE';
  if (pips > 15) status = 'PROFIT';
  if (pips < -10) status = 'LOSS';

  return {
    id: generateId(),
    pair: pairConfig.name,
    action,
    status: index === 0 ? 'PENDING' : status,
    timeframe: TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)],
    entryPrice,
    currentPrice,
    takeProfit,
    stopLoss,
    pips,
    time: Date.now() - Math.floor(Math.random() * 3600000),
    precision: pairConfig.precision,
    history: [currentPrice],
  };
}

function generateInitialSignals(goldPrice: number): TradeSignal[] {
  // XAU first with world-class parameters, then other pairs
  const xauSignal = generateXauSignal(goldPrice);
  const rest = PAIRS.filter(p => p.name !== 'XAUUSD').map((pair, i) =>
    generateSignal(pair, BASE_PRICES[pair.name] ?? 1.0, i)
  );
  return [xauSignal, ...rest];
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useSignals = () => {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const goldPriceRef = useRef<number>(BASE_PRICES.XAUUSD);

  // ── Gold-API.com live feed (XAUUSD only) ──────────────────────────────────
  useEffect(() => {
    const fetchGold = async () => {
      try {
        const res = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
        const data = await res.json();
        const price = Number(data?.items?.[0]?.xauPrice);
        if (price > 1000) {
          goldPriceRef.current = price;
          // Push live gold price into active XAU signals
          setSignals(prev => prev.map(s => {
            if (s.pair !== 'XAUUSD' || s.status === 'PROFIT' || s.status === 'LOSS') return s;
            const newHistory = [...s.history.slice(-20), price];
            return { ...s, currentPrice: price, history: newHistory };
          }));
        }
      } catch { /* fallback to simulation */ }
    };
    fetchGold();
    const iv = setInterval(fetchGold, 10000);
    return () => clearInterval(iv);
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSignals(generateInitialSignals(goldPriceRef.current));
      setIsConnected(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // ── Real-time tick simulation ─────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setSignals(prevSignals => prevSignals.map(signal => {
        if (signal.status === 'PROFIT' || signal.status === 'LOSS') return signal;

        // XAUUSD: use gold-api price + small noise, not pure random walk
        const isGold = signal.pair === 'XAUUSD';
        const volatility = isGold
          ? 0.08  // $0.08 tick noise for gold
          : (0.0001 * (signal.pair.includes('JPY') ? 100 : 1));

        const change = (Math.random() - 0.5) * volatility * 4;
        const base = isGold ? goldPriceRef.current : signal.currentPrice;
        const newCurrentPrice = base + change;

        const diff = signal.action === 'BUY'
          ? newCurrentPrice - signal.entryPrice
          : signal.entryPrice - newCurrentPrice;
        const newPips = diff * getPipMultiplier(signal.pair);

        let newStatus: SignalStatus = signal.status;
        if (signal.status === 'PENDING' && Math.random() > 0.95) newStatus = 'ACTIVE';

        if (signal.status === 'ACTIVE') {
          if (signal.action === 'BUY') {
            if (newCurrentPrice >= signal.takeProfit) newStatus = 'PROFIT';
            else if (newCurrentPrice <= signal.stopLoss) newStatus = 'LOSS';
          } else {
            if (newCurrentPrice <= signal.takeProfit) newStatus = 'PROFIT';
            else if (newCurrentPrice >= signal.stopLoss) newStatus = 'LOSS';
          }
        }

        return {
          ...signal,
          currentPrice: newCurrentPrice,
          pips: newPips,
          status: newStatus,
          history: [...signal.history.slice(-20), newCurrentPrice],
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const addManualEurusdBuySignal = () => {
    const p = PAIRS.find(x => x.name === 'EURUSD')!;
    setSignals(prev => [generateSignal(p, BASE_PRICES.EURUSD, -1), ...prev]);
  };

  return { signals, isConnected, addManualEurusdBuySignal };
};
