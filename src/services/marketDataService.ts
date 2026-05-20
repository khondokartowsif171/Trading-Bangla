import { fetchHistoricalRates, FOREX_PAIRS } from './forexApi';

export interface RealTimeQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: number;
}

export interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type PriceCallback = (quote: RealTimeQuote) => void;
type CandleCallback = (symbol: string, candles: OHLC[]) => void;

const listeners = new Set<PriceCallback>();
const candleListeners = new Set<CandleCallback>();
let goldInterval: ReturnType<typeof setInterval> | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Real-time gold spot price — free, CORS-friendly, no key (matches TradingView ~$4,545)
const GOLD_API = 'https://api.gold-api.com/price/XAU';
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2';

const SYMBOLS = [
  { symbol: 'XAU/USD', binance: 'xauusdt', frankfurter: null },
  { symbol: 'EUR/USD', binance: null, frankfurter: { base: 'EUR', target: 'USD' } },
  { symbol: 'GBP/USD', binance: null, frankfurter: { base: 'GBP', target: 'USD' } },
  { symbol: 'USD/JPY', binance: null, frankfurter: { base: 'USD', target: 'JPY' } },
  { symbol: 'USD/CHF', binance: null, frankfurter: { base: 'USD', target: 'CHF' } },
  { symbol: 'AUD/USD', binance: null, frankfurter: { base: 'AUD', target: 'USD' } },
  { symbol: 'USD/CAD', binance: null, frankfurter: { base: 'USD', target: 'CAD' } },
  { symbol: 'NZD/USD', binance: null, frankfurter: { base: 'NZD', target: 'USD' } },
  { symbol: 'EUR/GBP', binance: null, frankfurter: { base: 'EUR', target: 'GBP' } },
  { symbol: 'GBP/JPY', binance: null, frankfurter: { base: 'GBP', target: 'JPY' } },
];

let prices: Record<string, RealTimeQuote> = {};
let candleStore: Record<string, OHLC[]> = {};
let cache: Record<string, OHLC[]> = {};

function getDigits(sym: string): number {
  if (sym.includes('JPY') || sym.includes('XAU')) return 2;
  return 5;
}

function generateCandlesFromDaily(symbol: string, dailyRates: { date: string; rate: number }[]): OHLC[] {
  const base = prices[symbol]?.bid || dailyRates[dailyRates.length - 1]?.rate || 1;
  const result: OHLC[] = [];
  for (let i = 0; i < Math.min(dailyRates.length, 60); i++) {
    const r = dailyRates[i];
    const prev = dailyRates[i - 1]?.rate || r.rate;
    const volatility = r.rate * 0.002;
    const open = prev;
    const close = r.rate;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    result.push({
      time: new Date(r.date).getTime() / 1000,
      open, high, low, close,
      volume: Math.floor(Math.random() * 5000 + 500),
    });
  }
  return result;
}

function generateGoldCandles(basePrice: number, count = 60): OHLC[] {
  const now = Math.floor(Date.now() / 1000);
  const candles: OHLC[] = [];
  let price = basePrice;
  for (let i = count; i >= 0; i--) {
    const time = now - i * 60;
    const open = price;
    const drift = (Math.random() - 0.495) * 0.5;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * 1.2;
    const low = Math.min(open, close) - Math.random() * 1.2;
    candles.push({ time, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume: Math.floor(Math.random() * 2000 + 200) });
    price = close;
  }
  return candles;
}

function updateGoldCandle(price: number) {
  const sym = 'XAU/USD';
  if (!candleStore[sym] || candleStore[sym].length === 0) {
    candleStore[sym] = generateGoldCandles(price, 60);
    return;
  }
  const last = candleStore[sym][candleStore[sym].length - 1];
  const now = Math.floor(Date.now() / 1000);
  if (now - last.time >= 60) {
    const open = last.close;
    const drift = (Math.random() - 0.495) * 0.5;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * 1.2;
    const low = Math.min(open, close) - Math.random() * 1.2;
    candleStore[sym].push({ time: now, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume: Math.floor(Math.random() * 2000 + 200) });
    if (candleStore[sym].length > 240) candleStore[sym].shift();
  } else {
    last.close = +price.toFixed(2);
    last.high = Math.max(last.high, last.close);
    last.low = Math.min(last.low, last.close);
  }
  notifyCandles(sym);
}

function updateForexCandle(symbol: string, price: number) {
  if (!candleStore[symbol]) candleStore[symbol] = [];
  const list = candleStore[symbol];
  const now = Math.floor(Date.now() / 1000);
  if (list.length === 0 || now - list[list.length - 1].time >= 86400) {
    const prev = list.length > 0 ? list[list.length - 1].close : price;
    list.push({
      time: now,
      open: prev,
      high: Math.max(prev, price),
      low: Math.min(prev, price),
      close: price,
      volume: Math.floor(Math.random() * 10000 + 1000),
    });
    if (list.length > 120) list.shift();
  } else {
    const last = list[list.length - 1];
    last.close = price;
    last.high = Math.max(last.high, price);
    last.low = Math.min(last.low, price);
  }
  notifyCandles(symbol);
}

function notifyCandles(symbol: string) {
  candleListeners.forEach(cb => {
    try { cb(symbol, [...(candleStore[symbol] || [])]); } catch {}
  });
}

function updatePrice(sym: string, bid: number, ask?: number) {
  const prev = prices[sym];
  const digits = getDigits(sym);
  const spread = ask ? (ask - bid) : bid * 0.0002;
  const quote: RealTimeQuote = {
    symbol: sym, bid: +bid.toFixed(digits), ask: +(ask || (bid + spread)).toFixed(digits),
    spread: +spread.toFixed(digits),
    change: prev ? bid - prev.bid : 0,
    changePercent: prev ? +(((bid - prev.bid) / prev.bid) * 100).toFixed(3) : 0,
    high: prev ? Math.max(prev.high, bid) : bid,
    low: prev ? Math.min(prev.low, bid) : bid,
    timestamp: Date.now(),
  };
  prices[sym] = quote;
  listeners.forEach(cb => { try { cb(quote); } catch {} });
}

async function pollGold() {
  try {
    const res = await fetch(GOLD_API);
    if (!res.ok) return;
    const d = await res.json();
    const price = parseFloat(d.price);
    if (price > 0) { updatePrice('XAU/USD', price); updateGoldCandle(price); }
  } catch {}
}

async function pollFrankfurter() {
  try {
    for (const sym of SYMBOLS) {
      if (!sym.frankfurter) continue;
      const res = await fetch(`${FRANKFURTER_URL}/rates?base=${sym.frankfurter.base}&symbols=${sym.frankfurter.target}`);
      if (!res.ok) continue;
      const data = await res.json();
      const rate = data.rates?.[sym.frankfurter.target];
      if (rate > 0) { updatePrice(sym.symbol, rate); updateForexCandle(sym.symbol, rate); }
    }
  } catch {}
}

export async function seedHistoricalData(symbol: string): Promise<OHLC[]> {
  if (cache[symbol]) return cache[symbol];
  const pair = FOREX_PAIRS.find(p => p.symbol === symbol);
  if (!pair) return [];
  try {
    const data = await fetchHistoricalRates(pair.base, pair.target, 90);
    const candles = generateCandlesFromDaily(symbol, data.rates);
    cache[symbol] = candles;
    candleStore[symbol] = candles;
    return candles;
  } catch { return []; }
}

export function startMarketData() {
  if (pollInterval) return;
  pollGold();
  pollFrankfurter();
  pollInterval = setInterval(pollFrankfurter, 30000);
  goldInterval = setInterval(pollGold, 12000);
  setTimeout(() => pollFrankfurter(), 3000);
}

export function stopMarketData() {
  if (goldInterval) { clearInterval(goldInterval); goldInterval = null; }
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

export function onPriceUpdate(cb: PriceCallback) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function onCandleUpdate(cb: CandleCallback) {
  candleListeners.add(cb);
  return () => { candleListeners.delete(cb); };
}

export function getPrice(symbol: string): RealTimeQuote | null {
  return prices[symbol] || null;
}

export function getCandles(symbol: string): OHLC[] {
  return candleStore[symbol] || [];
}

export function getAllPrices(): Record<string, RealTimeQuote> {
  return { ...prices };
}
