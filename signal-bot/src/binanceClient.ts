import { Candle } from './indicators';
import * as https from 'https';

// Yahoo Finance chart API — free, no key needed
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Symbol mapping: internal symbol → Yahoo Finance ticker
const YAHOO_SYMBOLS: Record<string, string> = {
  'XAUUSDT': 'GC%3DF',       // Gold Futures (GC=F)
  'EURUSD':  'EURUSD%3DX',   // EUR/USD Forex
  'GBPUSD':  'GBPUSD%3DX',   // GBP/USD Forex
  'USDJPY':  'USDJPY%3DX',   // USD/JPY Forex
  'GBPJPY':  'GBPJPY%3DX',   // GBP/JPY Forex
  'AUDUSD':  'AUDUSD%3DX',   // AUD/USD Forex
  'USDCHF':  'USDCHF%3DX',   // USD/CHF Forex
};

// Display name map for logging
const DISPLAY_NAMES: Record<string, string> = {
  'XAUUSDT': 'XAU/USD',
  'EURUSD':  'EUR/USD',
  'GBPUSD':  'GBP/USD',
  'USDJPY':  'USD/JPY',
  'GBPJPY':  'GBP/JPY',
  'AUDUSD':  'AUD/USD',
  'USDCHF':  'USD/CHF',
};

const INTERVAL_MAP: Record<string, { interval: string; range: string }> = {
  '15m': { interval: '15m', range: '5d' },
  '1h':  { interval: '1h',  range: '30d' },
  '4h':  { interval: '1h',  range: '60d' }, // Yahoo has no 4h; downsample 1h → 4h
};

function yahooGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (d: Buffer) => { data += d.toString(); });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downsampleTo4h(h1Candles: Candle[]): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < h1Candles.length; i += 4) {
    const slice = h1Candles.slice(i, i + 4);
    if (slice.length === 0) continue;
    result.push({
      time: slice[0].time,
      open: slice[0].open,
      high: Math.max(...slice.map(c => c.high)),
      low: Math.min(...slice.map(c => c.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((s, c) => s + (c.volume ?? 0), 0),
    });
  }
  return result;
}

export async function fetchHistoricalKlines(
  symbol: string,
  interval: string,
  limit = 300
): Promise<Candle[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol] ?? YAHOO_SYMBOLS['XAUUSDT'];
  const cfg = INTERVAL_MAP[interval] ?? INTERVAL_MAP['1h'];

  // For 4h, fetch 1h data then downsample
  const actualInterval = interval === '4h' ? '1h' : cfg.interval;
  const actualRange    = interval === '4h' ? '60d' : cfg.range;
  const url = `${YAHOO_BASE}/${yahooSymbol}?interval=${actualInterval}&range=${actualRange}`;

  const raw  = await yahooGet(url);
  const json = JSON.parse(raw);
  const chart = json.chart?.result?.[0];
  if (!chart?.timestamp) throw new Error(`Yahoo Finance: no data for ${symbol}`);

  const ts: number[] = chart.timestamp;
  const q  = chart.indicators.quote[0];
  const candles: Candle[] = [];

  for (let i = 0; i < ts.length; i++) {
    if (!q.close[i] || !q.open[i]) continue;
    candles.push({
      time:   ts[i] * 1000,
      open:   q.open[i],
      high:   q.high[i]   ?? q.close[i],
      low:    q.low[i]    ?? q.close[i],
      close:  q.close[i],
      volume: q.volume[i] ?? 0,
    });
  }

  const result = interval === '4h' ? downsampleTo4h(candles) : candles;
  return result.slice(-limit);
}

// Polling-based live updater — polls Yahoo Finance every 30s for latest price
export class BinanceKlineStream {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private onCandleCb: ((symbol: string, interval: string, candle: Candle, isFinal: boolean) => void) | null = null;

  subscribeAll(
    symbols: string[],
    intervals: string[],
    onCandle: (symbol: string, interval: string, candle: Candle, isFinal: boolean) => void
  ): void {
    this.onCandleCb = onCandle;

    for (const symbol of symbols) {
      const yahooSymbol = YAHOO_SYMBOLS[symbol] ?? YAHOO_SYMBOLS['XAUUSDT'];
      const displayName = DISPLAY_NAMES[symbol] ?? symbol;
      console.log(`[YahooFeed] Subscribing to ${displayName} (${yahooSymbol}) — polling every 30s`);

      const poll = async () => {
        try {
          const url = `${YAHOO_BASE}/${yahooSymbol}?interval=1m&range=1d`;
          const raw  = await yahooGet(url);
          const json = JSON.parse(raw);
          const chart = json.chart?.result?.[0];
          if (!chart?.timestamp) return;

          const ts: number[] = chart.timestamp;
          const q  = chart.indicators.quote[0];
          const len = ts.length;
          if (len < 1) return;

          // Find last valid candle
          let lastIdx = len - 1;
          while (lastIdx >= 0 && (!q.close[lastIdx] || !q.open[lastIdx])) lastIdx--;
          if (lastIdx < 0) return;

          const last: Candle = {
            time:   ts[lastIdx] * 1000,
            open:   q.open[lastIdx]   ?? q.close[lastIdx],
            high:   q.high[lastIdx]   ?? q.close[lastIdx],
            low:    q.low[lastIdx]    ?? q.close[lastIdx],
            close:  q.close[lastIdx],
            volume: q.volume[lastIdx] ?? 0,
          };

          const price = last.close;
          const isGold = symbol === 'XAUUSDT';
          const priceStr = isGold ? `$${price?.toFixed(2) ?? 'N/A'}` : (price?.toFixed(5) ?? 'N/A');
          console.log(`[YahooFeed] ${displayName} @ ${priceStr}`);

          if (last.close && this.onCandleCb) {
            for (const interval of intervals) {
              this.onCandleCb(symbol, interval, last, false);
            }
          }
        } catch (err: any) {
          console.error(`[YahooFeed] Poll error (${symbol}):`, err.message);
        }
      };

      // Poll immediately then every 30s (stagger starts to avoid rate limits)
      const delay = symbols.indexOf(symbol) * 3000;
      setTimeout(() => {
        poll();
        const timer = setInterval(poll, 30_000);
        this.timers.set(symbol, timer);
      }, delay);
    }
  }

  // Legacy single-symbol subscribe (kept for backward compatibility)
  subscribe(
    symbol: string,
    intervals: string[],
    onCandle: (interval: string, candle: Candle, isFinal: boolean) => void
  ): void {
    this.subscribeAll([symbol], intervals, (_sym, interval, candle, isFinal) => {
      onCandle(interval, candle, isFinal);
    });
  }

  close(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
