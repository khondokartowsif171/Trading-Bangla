// Vercel serverless price proxy
// Priority 1: OANDA v20 REST API (set OANDA_TOKEN + OANDA_ACCOUNT_ID)
// Priority 2: TwelveData (forex) + gold-api.com (XAU/XAG) + Binance (BTC)
// Priority 3: Frankfurter.app (completely free, no key needed)
// All sources return the same normalised OANDA-like JSON so frontends need no changes.

const OANDA_INSTRUMENTS =
  'XAU_USD,EUR_USD,GBP_USD,USD_JPY,AUD_USD,USD_CAD,NZD_USD,USD_CHF,' +
  'GBP_JPY,EUR_JPY,EUR_GBP,EUR_CHF,EUR_CAD,EUR_AUD,GBP_CHF,GBP_CAD';

// TwelveData symbol → OANDA instrument key
const TD_TO_OANDA: Record<string, string> = {
  'EUR/USD': 'EUR_USD', 'GBP/USD': 'GBP_USD', 'USD/JPY': 'USD_JPY',
  'USD/CHF': 'USD_CHF', 'AUD/USD': 'AUD_USD', 'USD/CAD': 'USD_CAD',
  'NZD/USD': 'NZD_USD', 'GBP/JPY': 'GBP_JPY', 'EUR/JPY': 'EUR_JPY',
  'EUR/GBP': 'EUR_GBP', 'EUR/CHF': 'EUR_CHF', 'EUR/CAD': 'EUR_CAD',
  'EUR/AUD': 'EUR_AUD', 'GBP/CHF': 'GBP_CHF', 'GBP/CAD': 'GBP_CAD',
};
const TD_SYMBOLS = Object.keys(TD_TO_OANDA).join(',');

// Frankfurter currency → USD-base rate (USD/XXX = 1/rate)
const FRANK_TO_OANDA: Record<string, string> = {
  EUR: 'EUR_USD', GBP: 'GBP_USD', JPY: 'USD_JPY',
  AUD: 'AUD_USD', CAD: 'USD_CAD', CHF: 'USD_CHF', NZD: 'NZD_USD',
};

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

  // ── Priority 2: TwelveData (forex) + gold-api.com (XAU/XAG) + Binance (BTC) ──
  // Use env var key if set, else fall back to embedded free-tier key
  const tdKey = process.env.TWELVEDATA_KEY || 'dd5f8e4e70e0445e96119e5182040118';
  try {
    const [tdRes, goldRes, silverRes, btcRes] = await Promise.all([
      fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(TD_SYMBOLS)}&apikey=${tdKey}`),
      fetch('https://api.gold-api.com/price/XAU'),
      fetch('https://api.gold-api.com/price/XAG'),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
    ]);

    const tdData    = tdRes.ok     ? await tdRes.json()    : {};
    const goldRaw   = goldRes.ok   ? await goldRes.json()  : {};
    const silverRaw = silverRes.ok ? await silverRes.json(): {};
    const btcRaw    = btcRes.ok    ? await btcRes.json()   : {};

    const goldPrice   = parseFloat(goldRaw.price   ?? '0');
    const silverPrice = parseFloat(silverRaw.price ?? '0');
    const btcPrice    = parseFloat(btcRaw.price    ?? '0');

    const prices: any[] = [];

    // Gold
    if (goldPrice > 500) {
      prices.push({
        instrument: 'XAU_USD',
        bids: [{ price: goldPrice.toFixed(2) }],
        asks: [{ price: (goldPrice + 0.50).toFixed(2) }],
      });
    }

    // Silver
    if (silverPrice > 5) {
      prices.push({
        instrument: 'XAG_USD',
        bids: [{ price: silverPrice.toFixed(3) }],
        asks: [{ price: (silverPrice + 0.03).toFixed(3) }],
      });
    }

    // Bitcoin
    if (btcPrice > 1000) {
      prices.push({
        instrument: 'BTC_USD',
        bids: [{ price: btcPrice.toFixed(2) }],
        asks: [{ price: (btcPrice + 50).toFixed(2) }],
      });
    }

    // All forex pairs from TwelveData
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

    if (prices.length > 0) {
      return res.json({ prices, provider: 'twelvedata' });
    }
  } catch {}

  // ── Priority 3: Frankfurter (completely free, no API key needed) ──────────
  try {
    const fRes = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD,CAD,CHF,NZD'
    );
    if (fRes.ok) {
      const fData = await fRes.json();
      const rates = fData?.rates as Record<string, number> | undefined;
      if (rates) {
        const prices: any[] = [];
        for (const [ccy, inst] of Object.entries(FRANK_TO_OANDA)) {
          const rate = rates[ccy];
          if (!rate) continue;
          const isJpy = ccy === 'JPY';
          // Frankfurter gives USD/XXX rates; we need XXX/USD for non-JPY
          const price = isJpy ? rate : (1 / rate);
          const digits = isJpy ? 3 : 5;
          const spread = isJpy ? 0.020 : 0.00010;
          prices.push({
            instrument: inst,
            bids: [{ price: price.toFixed(digits) }],
            asks: [{ price: (price + spread).toFixed(digits) }],
          });
          // Also add USD/CAD (Frankfurter gives USD→CAD directly)
          if (ccy === 'CAD') {
            prices.push({
              instrument: 'USD_CAD',
              bids: [{ price: rate.toFixed(5) }],
              asks: [{ price: (rate + 0.00010).toFixed(5) }],
            });
          }
        }
        if (prices.length > 0) {
          return res.json({ prices, provider: 'frankfurter' });
        }
      }
    }
  } catch {}

  // ── No provider available ─────────────────────────────────────────────────
  return res.status(503).json({
    error: 'All price providers failed.',
    hint: 'Set TWELVEDATA_KEY or OANDA_TOKEN+OANDA_ACCOUNT_ID in Vercel env vars.',
  });
}
