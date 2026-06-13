// Vercel serverless — real OHLCV history proxy for chart-view MT5 Terminal
// Priority 1: OANDA REST historical candles (same source as TradingView/OANDA widget)
// Priority 2: TwelveData time_series (fallback when OANDA_TOKEN not set)
// Query: /api/oanda-candles?sym=XAUUSD&interval=1h&count=500

// Chart symbol → OANDA instrument name
const SYM_TO_OANDA: Record<string, string> = {
  EURUSD: 'EUR_USD',   GBPUSD: 'GBP_USD',   USDJPY: 'USD_JPY',  XAUUSD: 'XAU_USD',
  AUDUSD: 'AUD_USD',   USDCAD: 'USD_CAD',   BTCUSD: 'BTC_USD',  EURJPY: 'EUR_JPY',
  GBPJPY: 'GBP_JPY',  USDCHF: 'USD_CHF',   EURCHF: 'EUR_CHF',  GBPCHF: 'GBP_CHF',
  NZDUSD: 'NZD_USD',  EURCAD: 'EUR_CAD',   GBPCAD: 'GBP_CAD',  EURAUD: 'EUR_AUD',
  XAGUSD: 'XAG_USD',  US30:   'US30_USD',  NAS100: 'NAS100_USD', USOIL: 'WTICO_USD',
};

// TwelveData interval → OANDA granularity
const INTERVAL_TO_GRAN: Record<string, string> = {
  '1min': 'M1', '5min': 'M5', '15min': 'M15',
  '1h':   'H1', '4h':   'H4', '1day': 'D',
};

// Chart symbol → TwelveData symbol (fallback only)
const SYM_TO_TD: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY', XAUUSD: 'XAU/USD',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', BTCUSD: 'BTC/USD', EURJPY: 'EUR/JPY',
  GBPJPY: 'GBP/JPY', USDCHF: 'USD/CHF', EURCHF: 'EUR/CHF', GBPCHF: 'GBP/CHF',
  NZDUSD: 'NZD/USD', EURCAD: 'EUR/CAD', GBPCAD: 'GBP/CAD', EURAUD: 'EUR/AUD',
  XAGUSD: 'XAG/USD', US30: 'DJI', NAS100: 'NDX', USOIL: 'WTI/USD',
};

export default async function handler(req: any, res: any) {
  const sym      = (req.query.sym      as string | undefined) ?? '';
  const interval = (req.query.interval as string | undefined) ?? '1h';
  const count    = Math.min(parseInt((req.query.count as string) || '500', 10) || 500, 800);

  if (!sym) return res.status(400).json({ error: 'Missing sym parameter' });

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── Priority 1: OANDA Historical Candles (same source as TradingView OANDA widget) ──
  const oandaToken = process.env.OANDA_TOKEN;
  const oandaInst  = SYM_TO_OANDA[sym];
  const oandaGran  = INTERVAL_TO_GRAN[interval];

  if (oandaToken && oandaInst && oandaGran) {
    const base = process.env.OANDA_ENV === 'live'
      ? 'https://api-fxtrade.oanda.com'
      : 'https://api-fxpractice.oanda.com';
    const bearer = oandaToken.startsWith('Bearer ') ? oandaToken : `Bearer ${oandaToken}`;
    try {
      const url =
        `${base}/v3/instruments/${oandaInst}/candles` +
        `?count=${count}&granularity=${oandaGran}&price=M`;
      const r = await fetch(url, {
        headers: { Authorization: bearer },
        signal: AbortSignal.timeout(9000),
      });
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data.candles) && data.candles.length > 0) {
          const candles = data.candles.map((c: any) => ({
            t: new Date(c.time).getTime(),
            o: parseFloat(c.mid.o),
            h: parseFloat(c.mid.h),
            l: parseFloat(c.mid.l),
            c: parseFloat(c.mid.c),
            v: c.volume ?? 0,
          }));
          return res.json({ candles, provider: 'oanda', sym, interval });
        }
      }
    } catch { /* fall through to TwelveData */ }
  }

  // ── Priority 2: TwelveData time_series ────────────────────────────────────
  const tdSym = SYM_TO_TD[sym];
  if (!tdSym) return res.status(400).json({ error: `Unknown symbol: ${sym}` });

  const tdKey = process.env.TWELVEDATA_KEY || 'dd5f8e4e70e0445e96119e5182040118';
  try {
    const url =
      `https://api.twelvedata.com/time_series` +
      `?symbol=${encodeURIComponent(tdSym)}` +
      `&interval=${interval}` +
      `&outputsize=${count}` +
      `&apikey=${tdKey}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return res.status(502).json({ error: `TwelveData HTTP ${r.status}` });

    const data = await r.json();
    if (data.status === 'error' || !Array.isArray(data.values)) {
      return res.status(502).json({ error: data.message ?? 'No values array', raw: data });
    }

    // TwelveData returns newest-first; reverse to oldest-first for lightweight-charts
    const candles = (data.values as any[]).reverse().map((v) => ({
      t: new Date(v.datetime).getTime(),
      o: parseFloat(v.open),
      h: parseFloat(v.high),
      l: parseFloat(v.low),
      c: parseFloat(v.close),
      v: parseFloat(v.volume ?? '0'),
    }));
    return res.json({ candles, provider: 'twelvedata', sym, interval });
  } catch (e: any) {
    return res.status(503).json({ error: 'All providers failed', detail: e?.message ?? '' });
  }
}
