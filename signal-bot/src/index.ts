import 'dotenv/config';
import { generateSignal, generateLiveSignal } from './signalEngine';
import { RiskManager } from './riskManager';
import { WsPublisher } from './wsPublisher';
import { Candle } from './indicators';
import { fetchHistoricalKlines, BinanceKlineStream } from './binanceClient';

const WS_PORT = parseInt(process.env.WS_PORT ?? '9001');

// Active symbols — XAU/USD + major forex pairs
const SYMBOLS = ['XAUUSDT', 'EURUSD', 'GBPUSD', 'USDJPY'];

const DISPLAY_NAMES: Record<string, string> = {
  'XAUUSDT': 'XAU/USD',
  'EURUSD':  'EUR/USD',
  'GBPUSD':  'GBP/USD',
  'USDJPY':  'USD/JPY',
};

const RISK_CONFIG = {
  startingBalance: 10000,
  maxDrawdownPercent: parseFloat(process.env.MAX_DRAWDOWN_PERCENT ?? '20'),
  dailyDrawdownLimit: parseFloat(process.env.DAILY_DRAWDOWN_LIMIT ?? '3'),
  riskPerTrade: parseFloat(process.env.RISK_PER_TRADE ?? '1'),
  maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES ?? '3'),
};

const publisher = new WsPublisher();
const riskManager = new RiskManager(RISK_CONFIG);
const stream = new BinanceKlineStream();

// Per-symbol candle buffers
const allCandles: Record<string, { '15m': Candle[]; '1h': Candle[]; '4h': Candle[] }> = {};
for (const sym of SYMBOLS) {
  allCandles[sym] = { '15m': [], '1h': [], '4h': [] };
}

// Per-symbol last signal time (15 min cooldown per symbol)
const lastSignalTime: Record<string, number> = {};
const SIGNAL_COOLDOWN = 15 * 60 * 1000;

function upsertCandle(list: Candle[], candle: Candle, isFinal: boolean): void {
  const last = list[list.length - 1];
  if (last && last.time === candle.time) {
    last.high = Math.max(last.high, candle.high);
    last.low = Math.min(last.low, candle.low);
    last.close = candle.close;
    last.volume = candle.volume;
  } else if (isFinal || !last) {
    list.push(candle);
    if (list.length > 300) list.shift();
  }
}

// Continuous real-time read — broadcast every poll, even when not a strong 3/3 alert
function runLiveCycle(symbol: string): void {
  const buf = allCandles[symbol];
  if (!buf || buf['15m'].length < 50 || buf['1h'].length < 50 || buf['4h'].length < 30) return;
  const live = generateLiveSignal(buf['15m'], buf['1h'], buf['4h'], DISPLAY_NAMES[symbol] ?? symbol);
  if (live) publisher.broadcastLive(live);
}

function runSignalCycle(symbol: string): void {
  const { allowed, reason } = riskManager.canTrade();
  if (!allowed) {
    console.log(`[Bot] Trading paused: ${reason}`);
    return;
  }

  const now = Date.now();
  if (now - (lastSignalTime[symbol] ?? 0) < SIGNAL_COOLDOWN) return;

  const buf = allCandles[symbol];
  const name = DISPLAY_NAMES[symbol] ?? symbol;

  if (buf['15m'].length < 50 || buf['1h'].length < 50 || buf['4h'].length < 20) {
    console.log(`[Bot] ${name} warming up... M15:${buf['15m'].length} H1:${buf['1h'].length} H4:${buf['4h'].length}`);
    return;
  }

  const signal = generateSignal(buf['15m'], buf['1h'], buf['4h'], name);

  if (signal && signal.direction !== 'NEUTRAL' && signal.confidence >= 60) {
    lastSignalTime[symbol] = now;
    publisher.broadcastSignal(signal);
    console.log(`[Bot] ✅ ${name} ${signal.direction} @ ${signal.entry} | SL:${signal.stopLoss} | TP:${signal.takeProfit} | Conf:${signal.confidence}%`);
  } else {
    console.log(`[Bot] ${name} — No signal (${signal?.confidence ?? 0}%) | Waiting...`);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Trading Bangla Signal Bot starting...');
  console.log(`[Bot] Symbols: ${SYMBOLS.join(', ')}`);
  publisher.start(WS_PORT);

  // Load historical candles for all symbols
  console.log('[Bot] Loading historical candles from Yahoo Finance...');
  for (const symbol of SYMBOLS) {
    const name = DISPLAY_NAMES[symbol] ?? symbol;
    try {
      const [m15, h1, h4] = await Promise.all([
        fetchHistoricalKlines(symbol, '15m', 300),
        fetchHistoricalKlines(symbol, '1h', 300),
        fetchHistoricalKlines(symbol, '4h', 200),
      ]);
      allCandles[symbol]['15m'] = m15;
      allCandles[symbol]['1h'] = h1;
      allCandles[symbol]['4h'] = h4;
      console.log(`[Bot] ${name} loaded — M15:${m15.length} H1:${h1.length} H4:${h4.length}`);
    } catch (err: any) {
      console.error(`[Bot] Failed to load ${name} candles:`, err.message);
    }
    // Stagger requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  // Subscribe to live updates for all symbols
  stream.subscribeAll(SYMBOLS, ['15m', '1h', '4h'], (symbol, interval, candle, isFinal) => {
    const key = interval as '15m' | '1h' | '4h';
    const buf = allCandles[symbol]?.[key];
    if (buf) {
      const last = buf[buf.length - 1];
      if (isFinal || !last || last.time === candle.time) {
        upsertCandle(buf, candle, isFinal);
      } else {
        // Live tick: fold the latest price into the forming candle so indicators move in real time
        last.close = candle.close;
        last.high = Math.max(last.high, candle.close);
        last.low = Math.min(last.low, candle.close);
      }
    }
    // Real-time read broadcast — once per poll per symbol (1h fires once per poll)
    if (interval === '1h') {
      runLiveCycle(symbol);
    }
    if (interval === '15m' && isFinal) {
      const name = DISPLAY_NAMES[symbol] ?? symbol;
      console.log(`[Bot] ${name} M15 candle @ ${candle.close} — analyzing...`);
      runSignalCycle(symbol);
    }
  });

  // Initial cycles for all symbols (staggered)
  for (let i = 0; i < SYMBOLS.length; i++) {
    setTimeout(() => { runLiveCycle(SYMBOLS[i]); runSignalCycle(SYMBOLS[i]); }, 4000 + i * 1500);
  }

  // Continuous real-time read — every 20s (guarantees live stream regardless of poll timing)
  setInterval(() => {
    for (const symbol of SYMBOLS) runLiveCycle(symbol);
  }, 20 * 1000);

  // Strong trade-alert cycle every 5 minutes
  setInterval(() => {
    for (const symbol of SYMBOLS) runSignalCycle(symbol);
  }, 5 * 60 * 1000);

  console.log(`[Bot] ✅ Live on WebSocket port ${WS_PORT} — monitoring ${SYMBOLS.length} pairs`);
}

async function shutdown(): Promise<void> {
  console.log('\n[Bot] Shutting down...');
  publisher.stop();
  stream.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => console.error('[Bot] Uncaught:', err));
process.on('unhandledRejection', (reason) => console.error('[Bot] Rejection:', reason));

main().catch(console.error);
