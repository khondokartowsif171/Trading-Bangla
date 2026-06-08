export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandlePattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  strength: 'weak' | 'moderate' | 'strong';
  time: number;
  description: string;
  index: number;
}

function body(c: OHLCV) { return Math.abs(c.close - c.open); }
function range(c: OHLCV) { return c.high - c.low; }
function upperShadow(c: OHLCV) { return c.high - Math.max(c.open, c.close); }
function lowerShadow(c: OHLCV) { return Math.min(c.open, c.close) - c.low; }
function isBull(c: OHLCV) { return c.close > c.open; }
function isBear(c: OHLCV) { return c.close < c.open; }
function bodyRatio(c: OHLCV) { return range(c) === 0 ? 0 : body(c) / range(c); }
function mid(c: OHLCV) { return (c.open + c.close) / 2; }

// --- Single-candle patterns ---

function isDoji(c: OHLCV): boolean {
  return bodyRatio(c) < 0.1 && range(c) > 0;
}

function isLongLeggedDoji(c: OHLCV): boolean {
  return isDoji(c) && upperShadow(c) > body(c) * 2 && lowerShadow(c) > body(c) * 2;
}

function isDragonfly(c: OHLCV): boolean {
  return isDoji(c) && lowerShadow(c) > range(c) * 0.6 && upperShadow(c) < body(c) * 0.5;
}

function isGravestone(c: OHLCV): boolean {
  return isDoji(c) && upperShadow(c) > range(c) * 0.6 && lowerShadow(c) < body(c) * 0.5;
}

function isHammer(c: OHLCV): boolean {
  return lowerShadow(c) > body(c) * 2 && upperShadow(c) < body(c) * 0.3 && body(c) > 0;
}

function isInvertedHammer(c: OHLCV): boolean {
  return upperShadow(c) > body(c) * 2 && lowerShadow(c) < body(c) * 0.3 && body(c) > 0;
}

function isMarubozu(c: OHLCV): boolean {
  return bodyRatio(c) > 0.9;
}

function isSpinningTop(c: OHLCV): boolean {
  return bodyRatio(c) > 0.1 && bodyRatio(c) < 0.35 && upperShadow(c) > body(c) && lowerShadow(c) > body(c);
}

// --- Two-candle patterns ---

function isBullishEngulfing(p: OHLCV, c: OHLCV): boolean {
  return isBear(p) && isBull(c) && c.open < p.close && c.close > p.open;
}

function isBearishEngulfing(p: OHLCV, c: OHLCV): boolean {
  return isBull(p) && isBear(c) && c.open > p.close && c.close < p.open;
}

function isBullishHarami(p: OHLCV, c: OHLCV): boolean {
  return isBear(p) && isBull(c) && c.open > p.close && c.close < p.open && body(c) < body(p) * 0.5;
}

function isBearishHarami(p: OHLCV, c: OHLCV): boolean {
  return isBull(p) && isBear(c) && c.open < p.close && c.close > p.open && body(c) < body(p) * 0.5;
}

function isTweezerBottom(p: OHLCV, c: OHLCV): boolean {
  return isBear(p) && isBull(c) && Math.abs(p.low - c.low) / (p.low || 1) < 0.001;
}

function isTweezerTop(p: OHLCV, c: OHLCV): boolean {
  return isBull(p) && isBear(c) && Math.abs(p.high - c.high) / (p.high || 1) < 0.001;
}

function isPiercing(p: OHLCV, c: OHLCV): boolean {
  return isBear(p) && isBull(c) && c.open < p.low && c.close > mid(p) && c.close < p.open;
}

function isDarkCloudCover(p: OHLCV, c: OHLCV): boolean {
  return isBull(p) && isBear(c) && c.open > p.high && c.close < mid(p) && c.close > p.open;
}

function isKicker(p: OHLCV, c: OHLCV): 'bullish' | 'bearish' | null {
  if (isBear(p) && isBull(c) && c.open > p.open && body(c) > body(p) * 0.8) return 'bullish';
  if (isBull(p) && isBear(c) && c.open < p.open && body(c) > body(p) * 0.8) return 'bearish';
  return null;
}

// --- Three-candle patterns ---

function isMorningStar(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBear(a) && body(b) < body(a) * 0.3 && isBull(c) && c.close > mid(a) && b.high < a.close;
}

function isEveningStar(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBull(a) && body(b) < body(a) * 0.3 && isBear(c) && c.close < mid(a) && b.low > a.close;
}

function isThreeWhiteSoldiers(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBull(a) && isBull(b) && isBull(c) &&
    b.open > a.open && b.open < a.close &&
    c.open > b.open && c.open < b.close &&
    body(a) > range(a) * 0.5 && body(b) > range(b) * 0.5 && body(c) > range(c) * 0.5;
}

function isThreeBlackCrows(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBear(a) && isBear(b) && isBear(c) &&
    b.open < a.open && b.open > a.close &&
    c.open < b.open && c.open > b.close &&
    body(a) > range(a) * 0.5 && body(b) > range(b) * 0.5 && body(c) > range(c) * 0.5;
}

function isMorningDojiStar(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBear(a) && isDoji(b) && isBull(c) && c.close > mid(a);
}

function isEveningDojiStar(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBull(a) && isDoji(b) && isBear(c) && c.close < mid(a);
}

function isThreeInsideUp(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBullishHarami(a, b) && isBull(c) && c.close > a.open;
}

function isThreeInsideDown(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBearishHarami(a, b) && isBear(c) && c.close < a.open;
}

function isUpsideGapTwoCrows(a: OHLCV, b: OHLCV, c: OHLCV): boolean {
  return isBull(a) && isBear(b) && isBear(c) &&
    b.open > a.close && c.open > b.open && c.close < b.open && c.close > a.close;
}

function isAbandonedBaby(a: OHLCV, b: OHLCV, c: OHLCV): 'bullish' | 'bearish' | null {
  if (isBear(a) && isDoji(b) && isBull(c) && b.high < a.low && b.low > c.high) return 'bullish';
  if (isBull(a) && isDoji(b) && isBear(c) && b.low > a.high && b.high < c.low) return 'bearish';
  return null;
}

export function detectPatterns(candles: OHLCV[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];
  if (candles.length < 3) return patterns;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const p = i > 0 ? candles[i - 1] : null;
    const pp = i > 1 ? candles[i - 2] : null;

    // Single-candle patterns
    if (isDoji(c)) {
      if (isLongLeggedDoji(c))
        patterns.push({ name: 'Long-Legged Doji', type: 'neutral', strength: 'moderate', time: c.time, description: 'Market indecision — equal buying and selling pressure', index: i });
      else if (isDragonfly(c))
        patterns.push({ name: 'Dragonfly Doji', type: 'bullish', strength: 'strong', time: c.time, description: 'Buyers rejected lower prices — bullish reversal signal', index: i });
      else if (isGravestone(c))
        patterns.push({ name: 'Gravestone Doji', type: 'bearish', strength: 'strong', time: c.time, description: 'Sellers rejected higher prices — bearish reversal signal', index: i });
      else
        patterns.push({ name: 'Doji', type: 'neutral', strength: 'weak', time: c.time, description: 'Market indecision — potential reversal or continuation', index: i });
    }

    if (isHammer(c))
      patterns.push({ name: isBull(c) ? 'Hammer' : 'Hanging Man', type: isBull(c) ? 'bullish' : 'bearish', strength: 'strong', time: c.time, description: isBull(c) ? 'Rejection of lower prices — bullish reversal' : 'Hanging Man — potential bearish reversal at top', index: i });

    if (isInvertedHammer(c))
      patterns.push({ name: isBull(c) ? 'Inverted Hammer' : 'Shooting Star', type: isBull(c) ? 'bullish' : 'bearish', strength: 'strong', time: c.time, description: isBull(c) ? 'Inverted hammer — bullish reversal after downtrend' : 'Shooting Star — bearish reversal after uptrend', index: i });

    if (isMarubozu(c))
      patterns.push({ name: isBull(c) ? 'Bullish Marubozu' : 'Bearish Marubozu', type: isBull(c) ? 'bullish' : 'bearish', strength: 'strong', time: c.time, description: isBull(c) ? 'Full body bullish candle — strong buying pressure' : 'Full body bearish candle — strong selling pressure', index: i });

    if (isSpinningTop(c))
      patterns.push({ name: 'Spinning Top', type: 'neutral', strength: 'weak', time: c.time, description: 'Small body with equal shadows — market indecision', index: i });

    // Two-candle patterns
    if (p) {
      if (isBullishEngulfing(p, c))
        patterns.push({ name: 'Bullish Engulfing', type: 'bullish', strength: 'strong', time: c.time, description: 'Bulls overwhelm bears — high-probability reversal signal', index: i });
      if (isBearishEngulfing(p, c))
        patterns.push({ name: 'Bearish Engulfing', type: 'bearish', strength: 'strong', time: c.time, description: 'Bears overwhelm bulls — high-probability reversal signal', index: i });
      if (isBullishHarami(p, c))
        patterns.push({ name: 'Bullish Harami', type: 'bullish', strength: 'moderate', time: c.time, description: 'Small bullish inside previous bearish — trend slowing', index: i });
      if (isBearishHarami(p, c))
        patterns.push({ name: 'Bearish Harami', type: 'bearish', strength: 'moderate', time: c.time, description: 'Small bearish inside previous bullish — trend slowing', index: i });
      if (isTweezerBottom(p, c))
        patterns.push({ name: 'Tweezer Bottom', type: 'bullish', strength: 'moderate', time: c.time, description: 'Double-bottom wick rejection — support confirmation', index: i });
      if (isTweezerTop(p, c))
        patterns.push({ name: 'Tweezer Top', type: 'bearish', strength: 'moderate', time: c.time, description: 'Double-top wick rejection — resistance confirmation', index: i });
      if (isPiercing(p, c))
        patterns.push({ name: 'Piercing Line', type: 'bullish', strength: 'strong', time: c.time, description: 'Bullish reversal after gap down — buyers step in', index: i });
      if (isDarkCloudCover(p, c))
        patterns.push({ name: 'Dark Cloud Cover', type: 'bearish', strength: 'strong', time: c.time, description: 'Bearish reversal after gap up — sellers take control', index: i });
      const kick = isKicker(p, c);
      if (kick)
        patterns.push({ name: `${kick === 'bullish' ? 'Bullish' : 'Bearish'} Kicker`, type: kick, strength: 'strong', time: c.time, description: 'Sudden gap reversal — very powerful institutional signal', index: i });
    }

    // Three-candle patterns
    if (pp && p) {
      if (isMorningStar(pp, p, c))
        patterns.push({ name: 'Morning Star', type: 'bullish', strength: 'strong', time: c.time, description: 'Classic 3-candle bullish reversal at bottom', index: i });
      if (isEveningStar(pp, p, c))
        patterns.push({ name: 'Evening Star', type: 'bearish', strength: 'strong', time: c.time, description: 'Classic 3-candle bearish reversal at top', index: i });
      if (isMorningDojiStar(pp, p, c))
        patterns.push({ name: 'Morning Doji Star', type: 'bullish', strength: 'strong', time: c.time, description: 'Morning star with doji gap — extremely bullish reversal', index: i });
      if (isEveningDojiStar(pp, p, c))
        patterns.push({ name: 'Evening Doji Star', type: 'bearish', strength: 'strong', time: c.time, description: 'Evening star with doji gap — extremely bearish reversal', index: i });
      if (isThreeWhiteSoldiers(pp, p, c))
        patterns.push({ name: 'Three White Soldiers', type: 'bullish', strength: 'strong', time: c.time, description: 'Three consecutive bullish candles — strong uptrend confirmation', index: i });
      if (isThreeBlackCrows(pp, p, c))
        patterns.push({ name: 'Three Black Crows', type: 'bearish', strength: 'strong', time: c.time, description: 'Three consecutive bearish candles — strong downtrend confirmation', index: i });
      if (isThreeInsideUp(pp, p, c))
        patterns.push({ name: 'Three Inside Up', type: 'bullish', strength: 'strong', time: c.time, description: 'Harami followed by confirmation — reliable reversal', index: i });
      if (isThreeInsideDown(pp, p, c))
        patterns.push({ name: 'Three Inside Down', type: 'bearish', strength: 'strong', time: c.time, description: 'Bearish harami followed by confirmation — reliable reversal', index: i });
      if (isUpsideGapTwoCrows(pp, p, c))
        patterns.push({ name: 'Upside Gap Two Crows', type: 'bearish', strength: 'moderate', time: c.time, description: 'Bearish reversal after gap — institutional selling', index: i });
      const baby = isAbandonedBaby(pp, p, c);
      if (baby)
        patterns.push({ name: `Abandoned Baby ${baby === 'bullish' ? 'Bottom' : 'Top'}`, type: baby, strength: 'strong', time: c.time, description: baby === 'bullish' ? 'Gap isolation doji — extreme bullish reversal' : 'Gap isolation doji — extreme bearish reversal', index: i });
    }
  }

  return patterns;
}

export function getRecentPatterns(candles: OHLCV[], lookback = 5): CandlePattern[] {
  if (candles.length < 3) return [];
  const slice = candles.slice(-Math.max(lookback + 2, 5));
  const all = detectPatterns(slice);
  return all.filter(p => p.index >= slice.length - lookback);
}
