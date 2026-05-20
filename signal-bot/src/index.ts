import 'dotenv/config';
import { MetaApiClient } from './metaApiClient';
import { generateSignal } from './signalEngine';
import { RiskManager } from './riskManager';
import { WsPublisher } from './wsPublisher';
import { Candle } from './indicators';

// ── Config ────────────────────────────────────────────────────────────────────
const METAAPI_TOKEN = process.env.METAAPI_TOKEN!;
const MT5_ACCOUNT_ID = process.env.MT5_ACCOUNT_ID!;
const WS_PORT = parseInt(process.env.WS_PORT ?? '8080');
const SYMBOL = 'XAUUSD'; // MT5 uses no slash

const RISK_CONFIG = {
  startingBalance: 10000,
  maxDrawdownPercent: parseFloat(process.env.MAX_DRAWDOWN_PERCENT ?? '20'),
  dailyDrawdownLimit: parseFloat(process.env.DAILY_DRAWDOWN_LIMIT ?? '3'),
  riskPerTrade: parseFloat(process.env.RISK_PER_TRADE ?? '1'),
  maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES ?? '2'),
};

// ── State ─────────────────────────────────────────────────────────────────────
const publisher = new WsPublisher();
const riskManager = new RiskManager(RISK_CONFIG);
let metaApi: MetaApiClient;

// Candle buffers — we keep 300 candles per timeframe
const candles: { m15: Candle[]; h1: Candle[]; h4: Candle[] } = { m15: [], h1: [], h4: [] };

let lastSignalTime = 0;
const SIGNAL_COOLDOWN = 15 * 60 * 1000; // 15 min between signals

// ── Signal Loop ───────────────────────────────────────────────────────────────
async function refreshCandles(): Promise<void> {
  try {
    const [m15, h1, h4] = await Promise.all([
      metaApi.getCandles(SYMBOL, '15m', 300),
      metaApi.getCandles(SYMBOL, '1h', 300),
      metaApi.getCandles(SYMBOL, '4h', 300),
    ]);
    if (m15.length > 0) candles.m15 = m15;
    if (h1.length > 0) candles.h1 = h1;
    if (h4.length > 0) candles.h4 = h4;
  } catch (err) {
    console.error('[Bot] Failed to refresh candles:', err);
  }
}

async function runSignalCycle(): Promise<void> {
  await refreshCandles();

  const accountInfo = await metaApi.getAccountInfo();
  if (accountInfo) {
    riskManager.updateBalance(accountInfo.balance);
    publisher.broadcastStats(riskManager.getStats());
  }

  const { allowed, reason } = riskManager.canTrade();
  if (!allowed) {
    console.log(`[Bot] Trading paused: ${reason}`);
    return;
  }

  const now = Date.now();
  if (now - lastSignalTime < SIGNAL_COOLDOWN) return;

  if (candles.m15.length < 200 || candles.h1.length < 200 || candles.h4.length < 200) {
    console.log('[Bot] Not enough candle data yet, waiting...');
    return;
  }

  const signal = generateSignal(candles.m15, candles.h1, candles.h4, 'XAU/USD');

  // XAU/USD: minimum 80% confidence — only the strongest setups get published
  if (signal && signal.direction !== 'NEUTRAL' && signal.confidence >= 80) {
    lastSignalTime = now;
    publisher.broadcastSignal(signal);
    console.log(`[Bot] ✅ Signal: ${signal.direction} @ ${signal.entry} | SL: ${signal.stopLoss} | TP: ${signal.takeProfit} | Conf: ${signal.confidence}%`);
  } else {
    console.log(`[Bot] No high-confidence signal (${signal?.confidence ?? 0}% — minimum 60%)`);
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!METAAPI_TOKEN || !MT5_ACCOUNT_ID) {
    console.error('[Bot] ERROR: METAAPI_TOKEN and MT5_ACCOUNT_ID are required in .env');
    process.exit(1);
  }

  console.log('🚀 Trading Bangla Signal Bot starting...');
  publisher.start(WS_PORT);

  metaApi = new MetaApiClient(METAAPI_TOKEN);

  // Connect with retry
  let retries = 0;
  while (retries < 5) {
    try {
      await metaApi.connect(MT5_ACCOUNT_ID);
      break;
    } catch (err) {
      retries++;
      console.error(`[Bot] Connection failed (attempt ${retries}/5):`, err);
      if (retries < 5) await sleep(10_000);
      else { console.error('[Bot] Could not connect to MetaAPI. Exiting.'); process.exit(1); }
    }
  }

  // Initial candle load
  await refreshCandles();
  console.log(`[Bot] Candles loaded — M15: ${candles.m15.length}, H1: ${candles.h1.length}, H4: ${candles.h4.length}`);

  // Run signal cycle every 5 minutes
  console.log('[Bot] ✅ Signal bot running — checking every 5 minutes');
  await runSignalCycle();
  setInterval(runSignalCycle, 5 * 60 * 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(): Promise<void> {
  console.log('\n[Bot] Shutting down...');
  publisher.stop();
  if (metaApi) await metaApi.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  console.error('[Bot] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Bot] Unhandled rejection:', reason);
});

main().catch(console.error);
