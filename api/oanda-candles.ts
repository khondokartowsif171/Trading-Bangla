// Vercel serverless — real OHLCV history proxy for chart-view MT5 Terminal
// Source: TwelveData time_series (same key already used for WebSocket live prices)
// Query: /api/oanda-candles?sym=XAUUSD&interval=1h&count=500

const SYM_MAP: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY', XAUUSD: 'XAU/USD',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', BTCUSD: 'BTC/USD', EURJPY: 'EUR/JPY',
  GBPJPY: 'GBP/JPY', USDCHF: 'USD/CHF', EURCHF: 'EUR/CHF', GBPCHF: 'GBP/CHF',
  NZDUSD: 'NZD/USD', EURCAD: 'EUR/CAD', GBPCAD: 'GBP/CAD', EURAUD: 'EUR/AUD',
  XAGUSD: 'XAG/USD', US30: 'DJI', NAS100: 'NDX', USOIL: 'WTI/USD',
};

export default async function handler(req: any, res: any) {
  const sym      = (req.query.sym as string | undefined) ?? '';
  const interval = (req.query.interval as string | undefined) ?? '1min';
  const count    = Math.min(parseInt((req.query.count as string) || '500', 10) || 500, 800);

  const tdSym = SYM_MAP[sym];
  if (!tdSym) {
    return res.status(400).json({ error: `Unknown symbol: ${sym}` });
  }

  const tdKey = process.env.TWELVEDATA_KEY || 'dd5f8e4e70e0445e96119e5182040118';

  try {
    const url =
      `https://api.twelvedata.com/time_series` +
      `?symbol=${encodeURIComponent(tdSym)}` +
      `&interval=${interval}` +
      `&outputsize=${count}` +
      `&apikey=${tdKey}`;

    const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) {
      return res.status(502).json({ error: `TwelveData HTTP ${r.status}` });
    }

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

    // Edge-cache for 60 s to reduce TwelveData API credit usage
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json({ candles, provider: 'twelvedata', sym, interval });
  } catch (e: any) {
    return res.status(503).json({ error: 'TwelveData request failed', detail: e?.message ?? '' });
  }
}
