import { Candle, IndicatorSet, SRLevel, calcIndicators, findSupportResistance } from './indicators';

export type SignalDirection = 'BUY' | 'SELL' | 'NEUTRAL';

export interface TimeframeAnalysis {
  timeframe: string;
  indicators: IndicatorSet;
  direction: SignalDirection;
  score: number;
  reasons: string[];
}

export interface Signal {
  id: string;
  symbol: string;
  direction: SignalDirection;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  riskReward: number;
  reasons: string[];
  timeframes: string[];
  indicators: IndicatorSet;
  srLevels: SRLevel[];
  timestamp: number;
  expiresAt: number;
}

// ─── Per-timeframe analysis (max 130 points) ──────────────────────────────────
function analyzeTimeframe(candles: Candle[], timeframe: string): TimeframeAnalysis {
  const ind = calcIndicators(candles);
  const {
    rsi, macd, macdSignal, macdHistogram, currentPrice,
    ema9, ema21, ema20, ema50, ema200,
    bbUpper, bbLower, bbWidth, trend,
    goldenCross, deathCross,
    volumeSpike, nearSupport, nearResistance,
  } = ind;

  let buyScore  = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  // ── 1. EMA trend — 30 points ──────────────────────────────────────────────
  if (trend === 'UP') {
    buyScore += 30;
    reasons.push(`[${timeframe}] EMA20>EMA50>EMA200 uptrend`);
  } else if (trend === 'DOWN') {
    sellScore += 30;
    reasons.push(`[${timeframe}] EMA20<EMA50<EMA200 downtrend`);
  } else if (ema20 > ema50) {
    buyScore += 15;
    reasons.push(`[${timeframe}] EMA20>EMA50 mild uptrend`);
  } else if (ema20 < ema50) {
    sellScore += 15;
    reasons.push(`[${timeframe}] EMA20<EMA50 mild downtrend`);
  }

  // ── 2. EMA9/EMA21 Golden/Death Cross — 20 bonus points ───────────────────
  if (goldenCross) {
    buyScore += 20;
    reasons.push(`[${timeframe}] 🔔 GOLDEN CROSS — EMA9 crossed above EMA21`);
  } else if (deathCross) {
    sellScore += 20;
    reasons.push(`[${timeframe}] 🔔 DEATH CROSS — EMA9 crossed below EMA21`);
  } else if (ema9 > ema21) {
    buyScore += 10;
    reasons.push(`[${timeframe}] EMA9>EMA21 bullish momentum`);
  } else if (ema9 < ema21) {
    sellScore += 10;
    reasons.push(`[${timeframe}] EMA9<EMA21 bearish momentum`);
  }

  // ── 3. RSI — 20 points ───────────────────────────────────────────────────
  if (rsi >= 40 && rsi <= 55 && trend === 'UP') {
    buyScore += 20;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — healthy buy zone`);
  } else if (rsi >= 45 && rsi <= 60 && trend === 'DOWN') {
    sellScore += 20;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — healthy sell zone`);
  } else if (rsi < 35) {
    buyScore += 15;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — oversold`);
  } else if (rsi > 65) {
    sellScore += 15;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — overbought`);
  } else if (rsi > 50) {
    buyScore += 5;
  } else {
    sellScore += 5;
  }

  // ── 4. MACD — 20 points ──────────────────────────────────────────────────
  if (macd > macdSignal && macdHistogram > 0) {
    buyScore += 20;
    reasons.push(`[${timeframe}] MACD bullish crossover`);
  } else if (macd < macdSignal && macdHistogram < 0) {
    sellScore += 20;
    reasons.push(`[${timeframe}] MACD bearish crossover`);
  } else if (macd > macdSignal) {
    buyScore += 10;
  } else if (macd < macdSignal) {
    sellScore += 10;
  }

  // ── 5. Bollinger Bands — 15 points ───────────────────────────────────────
  const bbRange = bbUpper - bbLower;
  if (bbRange > 0) {
    const pricePos = (currentPrice - bbLower) / bbRange;
    if (pricePos < 0.2) {
      buyScore += 15;
      reasons.push(`[${timeframe}] Price near BB lower band`);
    } else if (pricePos > 0.8) {
      sellScore += 15;
      reasons.push(`[${timeframe}] Price near BB upper band`);
    } else if (pricePos < 0.35) {
      buyScore += 8;
    } else if (pricePos > 0.65) {
      sellScore += 8;
    }
  }

  // ── 6. BB squeeze — 5 points ─────────────────────────────────────────────
  if (bbWidth < 0.015) {
    buyScore += 5; sellScore += 5;
    reasons.push(`[${timeframe}] BB squeeze — breakout imminent`);
  }

  // ── 7. Price vs EMA200 — 5 points ────────────────────────────────────────
  if (currentPrice > ema200) {
    buyScore += 5;
  } else {
    sellScore += 5;
  }

  // ── 8. Volume spike confirmation — 10 bonus points ───────────────────────
  if (volumeSpike) {
    buyScore += 5; sellScore += 5;
    reasons.push(`[${timeframe}] Volume spike — strong conviction`);
  }

  // ── 9. Support/Resistance proximity — 10 bonus points ───────────────────
  if (nearSupport) {
    buyScore += 10;
    reasons.push(`[${timeframe}] Price at support level — bounce zone`);
  }
  if (nearResistance) {
    sellScore += 10;
    reasons.push(`[${timeframe}] Price at resistance level — rejection zone`);
  }

  // ── Direction & Score (max 130 points possible) ───────────────────────────
  const maxScore = 130;
  let direction: SignalDirection = 'NEUTRAL';
  let score = 0;

  if (buyScore > sellScore && buyScore >= 45) {
    direction = 'BUY';
    score = Math.min((buyScore / maxScore) * 100, 100);
  } else if (sellScore > buyScore && sellScore >= 45) {
    direction = 'SELL';
    score = Math.min((sellScore / maxScore) * 100, 100);
  } else {
    score = Math.max(buyScore, sellScore);
  }

  return { timeframe, indicators: ind, direction, score, reasons };
}

// ─── Main signal generator ────────────────────────────────────────────────────
export function generateSignal(
  m15Candles: Candle[],
  h1Candles: Candle[],
  h4Candles: Candle[],
  symbol: string
): Signal | null {
  if (m15Candles.length < 50 || h1Candles.length < 50 || h4Candles.length < 30) {
    return null;
  }

  const m15 = analyzeTimeframe(m15Candles, 'M15');
  const h1  = analyzeTimeframe(h1Candles,  'H1');
  const h4  = analyzeTimeframe(h4Candles,  'H4');

  const directions = [m15.direction, h1.direction, h4.direction];
  const allBuy  = directions.every(d => d === 'BUY');
  const allSell = directions.every(d => d === 'SELL');

  // Allow 2/3 confluence when a Golden/Death Cross just fired
  const crossoverEvent =
    m15.indicators.goldenCross || h1.indicators.goldenCross ||
    m15.indicators.deathCross  || h1.indicators.deathCross;

  const buyCount  = directions.filter(d => d === 'BUY').length;
  const sellCount = directions.filter(d => d === 'SELL').length;
  const twoBuy    = crossoverEvent && buyCount  >= 2;
  const twoSell   = crossoverEvent && sellCount >= 2;

  if (!allBuy && !allSell && !twoBuy && !twoSell) return null;

  const direction: SignalDirection = (allBuy || twoBuy) ? 'BUY' : 'SELL';

  const entry = m15.indicators.currentPrice;
  const atr   = h4.indicators.atr || m15.indicators.atr;

  const isGold      = symbol.toUpperCase().includes('XAU') || symbol.toUpperCase().includes('GC');
  const slMultiplier = isGold ? 2.0 : 1.5;
  const slDistance   = atr * slMultiplier;
  const tpDistance   = slDistance * 2.5;

  const stopLoss = direction === 'BUY'
    ? parseFloat((entry - slDistance).toFixed(isGold ? 2 : 5))
    : parseFloat((entry + slDistance).toFixed(isGold ? 2 : 5));

  const takeProfit = direction === 'BUY'
    ? parseFloat((entry + tpDistance).toFixed(isGold ? 2 : 5))
    : parseFloat((entry - tpDistance).toFixed(isGold ? 2 : 5));

  // Weighted confidence — H4 dominant for 3/3, balanced for 2/3 crossover
  const weightedScore = (allBuy || allSell)
    ? (h4.score * 0.55 + h1.score * 0.30 + m15.score * 0.15)
    : (h4.score * 0.45 + h1.score * 0.35 + m15.score * 0.20);

  const cap        = (allBuy || allSell) ? 92 : 82;
  const confidence = Math.min(Math.round(weightedScore), cap);

  const h4Rsi       = h4.indicators.rsi;
  const rsiPenalty  = (h4Rsi > 75 && direction === 'BUY') || (h4Rsi < 25 && direction === 'SELL') ? 10 : 0;
  const finalConf   = Math.max(confidence - rsiPenalty, 45);

  const crossoverNote: string[] = [];
  if (m15.indicators.goldenCross || h1.indicators.goldenCross) crossoverNote.push('🔔 MA Golden Cross confirmed');
  if (m15.indicators.deathCross  || h1.indicators.deathCross)  crossoverNote.push('🔔 MA Death Cross confirmed');

  const allReasons = [
    ...crossoverNote,
    ...h4.reasons.slice(0, 3),
    ...h1.reasons.slice(0, 2),
    ...m15.reasons.slice(0, 2),
  ];

  const srLevels = findSupportResistance(h4Candles.slice(-100));
  const now      = Date.now();

  return {
    id: `${symbol}_${direction}_${now}`,
    symbol,
    direction,
    entry: parseFloat(entry.toFixed(isGold ? 2 : 5)),
    stopLoss,
    takeProfit,
    confidence: finalConf,
    riskReward: 2.5,
    reasons: allReasons,
    timeframes: directions
      .map((d, i) => ['M15', 'H1', 'H4'][i])
      .filter((_, i) => [m15, h1, h4][i].direction === direction),
    indicators: m15.indicators,
    srLevels,
    timestamp: now,
    expiresAt: now + 4 * 60 * 60 * 1000,
  };
}
