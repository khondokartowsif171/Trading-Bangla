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

function analyzeTimeframe(candles: Candle[], timeframe: string): TimeframeAnalysis {
  const ind = calcIndicators(candles);
  const { rsi, macd, macdSignal, macdHistogram, currentPrice, ema20, ema50, ema200, bbUpper, bbLower, bbWidth, trend } = ind;

  let buyScore = 0;
  let sellScore = 0;
  const reasons: string[] = [];

  // EMA trend — highest weight (30 points)
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

  // RSI — filtered range for clean entries (20 points)
  if (rsi >= 40 && rsi <= 55 && trend === 'UP') {
    buyScore += 20;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — healthy buy zone`);
  } else if (rsi >= 45 && rsi <= 60 && trend === 'DOWN') {
    sellScore += 20;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — healthy sell zone`);
  } else if (rsi < 30) {
    buyScore += 15;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — oversold`);
  } else if (rsi > 70) {
    sellScore += 15;
    reasons.push(`[${timeframe}] RSI ${rsi.toFixed(1)} — overbought`);
  }

  // MACD — momentum confirmation (20 points)
  if (macd > macdSignal && macdHistogram > 0 && macdHistogram > macdHistogram * 0.8) {
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

  // Bollinger Bands — price position (15 points)
  const bbRange = bbUpper - bbLower;
  if (bbRange > 0) {
    const pricePos = (currentPrice - bbLower) / bbRange;
    if (pricePos < 0.25) {
      buyScore += 15;
      reasons.push(`[${timeframe}] Price near BB lower band`);
    } else if (pricePos > 0.75) {
      sellScore += 15;
      reasons.push(`[${timeframe}] Price near BB upper band`);
    }
  }

  // BB squeeze — volatility breakout potential (10 points)
  if (bbWidth < 0.015) {
    buyScore += 5;
    sellScore += 5;
    reasons.push(`[${timeframe}] BB squeeze — breakout imminent`);
  }

  // Price vs EMA200 — major filter (5 points)
  if (currentPrice > ema200) {
    buyScore += 5;
  } else {
    sellScore += 5;
  }

  const maxScore = 100;
  let direction: SignalDirection = 'NEUTRAL';
  let score = 0;

  if (buyScore > sellScore && buyScore >= 50) {
    direction = 'BUY';
    score = Math.min((buyScore / maxScore) * 100, 100);
  } else if (sellScore > buyScore && sellScore >= 50) {
    direction = 'SELL';
    score = Math.min((sellScore / maxScore) * 100, 100);
  } else {
    score = Math.max(buyScore, sellScore);
  }

  return { timeframe, indicators: ind, direction, score, reasons };
}

export function generateSignal(
  m15Candles: Candle[],
  h1Candles: Candle[],
  h4Candles: Candle[],
  symbol: string
): Signal | null {
  if (m15Candles.length < 200 || h1Candles.length < 200 || h4Candles.length < 200) {
    return null;
  }

  const m15 = analyzeTimeframe(m15Candles, 'M15');
  const h1 = analyzeTimeframe(h1Candles, 'H1');
  const h4 = analyzeTimeframe(h4Candles, 'H4');

  // XAU/USD requires 3/3 timeframe confluence for 80%+ confidence signals
  // No 2/3 shortcut — gold is too volatile for partial confluence
  const directions = [m15.direction, h1.direction, h4.direction];
  const allBuy = directions.every(d => d === 'BUY');
  const allSell = directions.every(d => d === 'SELL');

  if (!allBuy && !allSell) return null;

  const direction: SignalDirection = allBuy || directions.filter(d => d === 'BUY').length >= 2 ? 'BUY' : 'SELL';

  // Use M15 for entry, H4 ATR for SL/TP (more stable)
  const entry = m15.indicators.currentPrice;
  const atr = h4.indicators.atr || m15.indicators.atr;

  // XAU/USD: wider SL (ATR × 2.0) to avoid stop-hunt, 1:2.5 RR minimum
  const slDistance = atr * 2.0;
  const tpDistance = slDistance * 2.5;

  const stopLoss = direction === 'BUY'
    ? parseFloat((entry - slDistance).toFixed(2))
    : parseFloat((entry + slDistance).toFixed(2));

  const takeProfit = direction === 'BUY'
    ? parseFloat((entry + tpDistance).toFixed(2))
    : parseFloat((entry - tpDistance).toFixed(2));

  // Confidence: weighted average (H4 most important for XAU trend)
  // Cap at 88% — never be overconfident with gold
  const weightedScore = (h4.score * 0.55 + h1.score * 0.30 + m15.score * 0.15);
  const confidence = Math.min(Math.round(weightedScore), 88);

  // Extra XAU/USD protection: if H4 RSI is extreme, reduce confidence
  const h4Rsi = h4.indicators.rsi;
  const rsiPenalty = (h4Rsi > 75 && direction === 'BUY') || (h4Rsi < 25 && direction === 'SELL') ? 15 : 0;
  const finalConfidence = Math.max(confidence - rsiPenalty, 40);

  const allReasons = [
    ...h4.reasons.slice(0, 3),
    ...h1.reasons.slice(0, 2),
    ...m15.reasons.slice(0, 2),
  ];

  const srLevels = findSupportResistance(h4Candles.slice(-100));

  const now = Date.now();
  return {
    id: `${symbol}_${direction}_${now}`,
    symbol,
    direction,
    entry: parseFloat(entry.toFixed(2)),
    stopLoss,
    takeProfit,
    confidence: finalConfidence,
    riskReward: 2.5,
    reasons: allReasons,
    timeframes: directions.map((d, i) => ['M15', 'H1', 'H4'][i]).filter((_, i) => [m15, h1, h4][i].direction === direction),
    indicators: m15.indicators,
    srLevels,
    timestamp: now,
    expiresAt: now + 4 * 60 * 60 * 1000, // Signal valid for 4 hours
  };
}
