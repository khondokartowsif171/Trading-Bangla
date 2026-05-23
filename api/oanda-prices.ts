// Vercel serverless price proxy
// Priority 1: OANDA v20 REST API (set OANDA_TOKEN + OANDA_ACCOUNT_ID)
// Priority 2: TwelveData + gold-api.com (set TWELVEDATA_KEY) ← active now
// All sources return the same normalised OANDA-like JSON so frontends need no changes.

const OANDA_INSTRUMENTS = 'XAU_USD,EUR_USD,GBP_USD,USD_JPY,AUD_USD,USD_CAD,NZD_USD,USD_CHF,GBP_JPY,EUR_GBP';

// TwelveData symbol → OANDA instrument key
const TD_TO_OANDA: Record<string, string> = {
  'EUR/USD': 'EUR_USD', 'GBP/USD': 'GBP_USD', 'USD/JPY': 'USD_JPY',
  'USD/CHF': 'USD_CHF', 'AUD/USD': 'AUD_USD', 'USD/CAD': 'USD_CAD',
  'NZD/USD': 'NZD_USD', 'GBP/JPY': 'GBP_JPY', 'EUR/GBP': 'EUR_GBP',
};
const TD_SYMBOLS = Object.keys(TD_TO_OANDA).join(',');

export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=3');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── Priority 1: OANDA ─────────────────────────────────────────────────────
  const oandaToken = process.env.OANDA_TOKEN;
  const oandaAccountId = process.env.OANDA_ACCOUNT_ID;
  if (oandaToken && oandaAccountId) {
    const base = process.env.OANDA_ENV === 'live'
      ? 'https://api-fxtrade.oanda.com'
      : 'https://api-fxpractice.oanda.com';
    try {
      const r = await fetch(
        `${base}/v3/accounts/${oandaAccountId}/pricing?instruments=${OANDA_INSTRUMENTS}`,
        { headers: { Authorization: oandaToken.startsWith('Bearer ') ? oandaToken : `Bearer ${oandaToken}` } }
      );
      if (r.ok) return res.json(await r.json());
    } catch {}
    // fall through to TwelveData if OANDA fails
  }

  // ── Priority 2: TwelveData (forex) + gold-api.com (XAU) ──────────────────
  const tdKey = process.env.TWELVEDATA_KEY;
  if (tdKey) {
    try {
      const [tdRes, goldRes] = await Promise.all([
        fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(TD_SYMBOLS)}&apikey=${tdKey}`),
        fetch('https://api.gold-api.com/price/XAU'),
      ]);

      const tdData  = tdRes.ok   ? await tdRes.json()   : {};
      const goldRaw = goldRes.ok ? await goldRes.json() : {};
      const goldPrice = parseFloat(goldRaw.price ?? '0');

      const prices: any[] = [];

      // Gold from gold-api.com (real-time spot)
      if (goldPrice > 0) {
        prices.push({
          instrument: 'XAU_USD',
          bids: [{ price: goldPrice.toFixed(2) }],
          asks: [{ price: (goldPrice + 0.50).toFixed(2) }],
        });
      }

      // Forex from TwelveData (real-time bid/ask ~5s updates)
      for (const [tdSym, inst] of Object.entries(TD_TO_OANDA)) {
        const entry = tdData[tdSym];
        const price = parseFloat(entry?.price ?? '0');
        if (!price) continue;
        const isJpy = tdSym.includes('JPY');
        const digits = isJpy ? 3 : 5;
        const spread = isJpy ? 0.020 : 0.00010;
        prices.push({
          instrument: inst,
          bids: [{ price: price.toFixed(digits) }],
          asks: [{ price: (price + spread).toFixed(digits) }],
        });
      }

      return res.json({ prices, provider: 'twelvedata' });
    } catch {}
  }

  // ── No provider configured ────────────────────────────────────────────────
  return res.status(503).json({
    error: 'No price provider configured.',
    hint: 'Set TWELVEDATA_KEY (free at twelvedata.com) or OANDA_TOKEN+OANDA_ACCOUNT_ID in Vercel env vars.',
  });
}
