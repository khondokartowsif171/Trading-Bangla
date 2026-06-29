// Vercel serverless price proxy
// Priority 1: OANDA v20 REST (if OANDA_TOKEN + OANDA_ACCOUNT_ID set)
// Priority 2: VPS price-proxy (8 forex majors + BTC, clean IP) + gold-api (XAU/XAG)
//             + cross pairs computed from the majors → full accurate coverage, free.
// Priority 3: Frankfurter (free, daily) as last-resort fallback.
// All return the same OANDA-like JSON so the frontend needs no changes.

const VPS_PRICES = process.env.PRICE_PROXY_URL || 'http://prices.auraajenticai.cloud';

const OANDA_INSTRUMENTS =
  'XAU_USD,EUR_USD,GBP_USD,USD_JPY,AUD_USD,USD_CAD,NZD_USD,USD_CHF,' +
  'GBP_JPY,EUR_JPY,EUR_GBP,EUR_CHF,EUR_CAD,EUR_AUD,GBP_CHF,GBP_CAD';

const FRANK_TO_OANDA: Record<string, string> = {
  EUR: 'EUR_USD', GBP: 'GBP_USD', JPY: 'USD_JPY',
  AUD: 'AUD_USD', CAD: 'USD_CAD', CHF: 'USD_CHF', NZD: 'NZD_USD',
};

const t = (ms: number) => AbortSignal.timeout(ms);
const mk = (inst: string, price: number, digits: number, spread: number) => ({
  instrument: inst,
  bids: [{ price: price.toFixed(digits) }],
  asks: [{ price: (price + spread).toFixed(digits) }],
});

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
  }

  // ── Priority 2: VPS proxy (majors + BTC) + gold-api (XAU/XAG) + computed crosses ──
  try {
    const [vpsR, goldR, silverR] = await Promise.allSettled([
      fetch(`${VPS_PRICES}/prices`, { signal: t(8000) }),
      fetch('https://api.gold-api.com/price/XAU', { signal: t(7000) }),
      fetch('https://api.gold-api.com/price/XAG', { signal: t(7000) }),
    ]);

    const prices: any[] = [];
    const mid: Record<string, number> = {};

    if (vpsR.status === 'fulfilled' && vpsR.value.ok) {
      const d = await vpsR.value.json();
      for (const p of (d?.prices ?? [])) {
        prices.push(p);
        const px = parseFloat(p?.bids?.[0]?.price ?? '0');
        if (px) mid[p.instrument] = px;
      }
    }

    if (goldR.status === 'fulfilled' && goldR.value.ok) {
      const g = parseFloat((await goldR.value.json())?.price ?? '0');
      if (g > 500) prices.push(mk('XAU_USD', g, 2, 0.5));
    }
    if (silverR.status === 'fulfilled' && silverR.value.ok) {
      const s = parseFloat((await silverR.value.json())?.price ?? '0');
      if (s > 5) prices.push(mk('XAG_USD', s, 3, 0.03));
    }

    const have = new Set(prices.map(p => p.instrument));
    const add = (inst: string, val: number | null, digits: number, spread: number) => {
      if (val && !have.has(inst)) { prices.push(mk(inst, val, digits, spread)); have.add(inst); }
    };
    const EU = mid['EUR_USD'], GU = mid['GBP_USD'], UJ = mid['USD_JPY'],
          UC = mid['USD_CHF'], AU = mid['AUD_USD'], UCAD = mid['USD_CAD'];
    add('EUR_GBP', EU && GU ? EU / GU : null, 5, 0.0001);
    add('GBP_JPY', GU && UJ ? GU * UJ : null, 3, 0.02);
    add('EUR_CHF', EU && UC ? EU * UC : null, 5, 0.0001);
    add('EUR_CAD', EU && UCAD ? EU * UCAD : null, 5, 0.0001);
    add('EUR_AUD', EU && AU ? EU / AU : null, 5, 0.0001);
    add('GBP_CHF', GU && UC ? GU * UC : null, 5, 0.0001);
    add('GBP_CAD', GU && UCAD ? GU * UCAD : null, 5, 0.0001);

    if (prices.length >= 5) {
      return res.json({ prices, provider: 'vps+gold' });
    }
  } catch {}

  // ── Priority 3: Frankfurter (free, no key — daily rates, last resort) ──────
  try {
    const fRes = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD,CAD,CHF,NZD');
    if (fRes.ok) {
      const fData = await fRes.json();
      const rates = fData?.rates as Record<string, number> | undefined;
      if (rates) {
        const prices: any[] = [];
        for (const [ccy, inst] of Object.entries(FRANK_TO_OANDA)) {
          const rate = rates[ccy];
          if (!rate) continue;
          const isJpy = ccy === 'JPY';
          const price = isJpy ? rate : (1 / rate);
          prices.push(mk(inst, price, isJpy ? 3 : 5, isJpy ? 0.02 : 0.0001));
          if (ccy === 'CAD') prices.push(mk('USD_CAD', rate, 5, 0.0001));
        }
        if (prices.length > 0) return res.json({ prices, provider: 'frankfurter' });
      }
    }
  } catch {}

  return res.status(503).json({ error: 'All price providers failed.' });
}
