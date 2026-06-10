export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  time: number;
  mitigated: boolean;
  strength: number; // 0-100
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  time: number;
  filled: boolean;
  fillPercent: number;
}

export interface StructurePoint {
  type: 'BOS' | 'CHoCH';
  direction: 'bullish' | 'bearish';
  price: number;
  time: number;
  confirmed: boolean;
}

export interface LiquidityZone {
  type: 'buy-side' | 'sell-side';
  price: number;
  time: number;
  swept: boolean;
  strength: 'equal-highs' | 'equal-lows' | 'swing-high' | 'swing-low';
}

export interface MitigationBlock extends OrderBlock {}

export interface BreakerBlock extends OrderBlock {
  flipDirection: 'now-resistance' | 'now-support';
}

export interface InducementLevel extends LiquidityZone {}

export interface DisplacementCandle {
  type: 'bullish' | 'bearish';
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  bodyRatio: number;
}

export interface PropulsionBlock {
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  time: number;
  fvgTime: number;
}

export interface SMCAnalysis {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  structurePoints: StructurePoint[];
  liquidityZones: LiquidityZone[];
  bias: 'bullish' | 'bearish' | 'neutral';
  biasScore: number; // -100 to +100
  premiumDiscount: { premium: number; discount: number; equilibrium: number } | null;
  lastMSS: StructurePoint | null;
  mitigationBlocks: MitigationBlock[];
  breakerBlocks: BreakerBlock[];
  inducementLevels: InducementLevel[];
  displacementCandles: DisplacementCandle[];
  propulsionBlocks: PropulsionBlock[];
}

function swingHighs(candles: OHLCV[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const isHigh = candles.slice(i - lookback, i).every(c => c.high <= candles[i].high) &&
      candles.slice(i + 1, i + lookback + 1).every(c => c.high <= candles[i].high);
    if (isHigh) indices.push(i);
  }
  return indices;
}

function swingLows(candles: OHLCV[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const isLow = candles.slice(i - lookback, i).every(c => c.low >= candles[i].low) &&
      candles.slice(i + 1, i + lookback + 1).every(c => c.low >= candles[i].low);
    if (isLow) indices.push(i);
  }
  return indices;
}

function detectOrderBlocks(candles: OHLCV[]): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  const lastPrice = candles[candles.length - 1]?.close ?? 0;

  for (let i = 1; i < candles.length - 2; i++) {
    const c = candles[i];
    const next = candles[i + 1];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const bodyRatio = range > 0 ? body / range : 0;

    // Bearish OB: last bearish candle before a bullish impulse
    if (c.close < c.open && bodyRatio > 0.5) {
      let impulseUp = false;
      for (let j = i + 1; j < Math.min(i + 5, candles.length); j++) {
        if (candles[j].close > c.high) { impulseUp = true; break; }
      }
      if (impulseUp) {
        const mitigated = lastPrice >= c.low && lastPrice <= c.high;
        blocks.push({
          type: 'bearish',
          high: c.high,
          low: c.open, // OB zone is from open to high for bearish
          time: c.time,
          mitigated,
          strength: Math.round(bodyRatio * 100),
        });
      }
    }

    // Bullish OB: last bullish candle before a bearish impulse
    if (c.close > c.open && bodyRatio > 0.5) {
      let impulseDown = false;
      for (let j = i + 1; j < Math.min(i + 5, candles.length); j++) {
        if (candles[j].close < c.low) { impulseDown = true; break; }
      }
      if (impulseDown) {
        const mitigated = lastPrice >= c.low && lastPrice <= c.high;
        blocks.push({
          type: 'bullish',
          high: c.close,
          low: c.low,
          time: c.time,
          mitigated,
          strength: Math.round(bodyRatio * 100),
        });
      }
    }
  }

  return blocks.slice(-8); // Keep last 8 OBs
}

function detectFVG(candles: OHLCV[]): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  const lastPrice = candles[candles.length - 1]?.close ?? 0;

  for (let i = 1; i < candles.length - 1; i++) {
    const a = candles[i - 1];
    const b = candles[i];
    const c = candles[i + 1];

    // Bullish FVG: c.low > a.high (gap up — imbalance)
    if (c.low > a.high) {
      const size = c.low - a.high;
      const fill = Math.max(0, Math.min(1, (lastPrice - a.high) / size));
      gaps.push({
        type: 'bullish',
        top: c.low,
        bottom: a.high,
        time: b.time,
        filled: lastPrice <= a.high,
        fillPercent: Math.round(fill * 100),
      });
    }

    // Bearish FVG: c.high < a.low (gap down — imbalance)
    if (c.high < a.low) {
      const size = a.low - c.high;
      const fill = Math.max(0, Math.min(1, (a.low - lastPrice) / size));
      gaps.push({
        type: 'bearish',
        top: a.low,
        bottom: c.high,
        time: b.time,
        filled: lastPrice >= a.low,
        fillPercent: Math.round(fill * 100),
      });
    }
  }

  return gaps.slice(-6);
}

function detectStructure(candles: OHLCV[]): StructurePoint[] {
  const points: StructurePoint[] = [];
  const highs = swingHighs(candles, 3);
  const lows = swingLows(candles, 3);

  // Find BOS (break of structure) and CHoCH (change of character)
  let lastHighBreak = -1;
  let lastLowBreak = -1;
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  for (let i = 5; i < candles.length; i++) {
    const close = candles[i].close;

    // Check if close breaks above recent swing high (bullish BOS/CHoCH)
    const recentHighs = highs.filter(h => h < i - 2);
    if (recentHighs.length > 0) {
      const lastH = recentHighs[recentHighs.length - 1];
      if (close > candles[lastH].high && lastH !== lastHighBreak) {
        const type: 'BOS' | 'CHoCH' = trend === 'bearish' ? 'CHoCH' : 'BOS';
        points.push({ type, direction: 'bullish', price: candles[lastH].high, time: candles[i].time, confirmed: true });
        trend = 'bullish';
        lastHighBreak = lastH;
      }
    }

    // Check if close breaks below recent swing low (bearish BOS/CHoCH)
    const recentLows = lows.filter(l => l < i - 2);
    if (recentLows.length > 0) {
      const lastL = recentLows[recentLows.length - 1];
      if (close < candles[lastL].low && lastL !== lastLowBreak) {
        const type: 'BOS' | 'CHoCH' = trend === 'bullish' ? 'CHoCH' : 'BOS';
        points.push({ type, direction: 'bearish', price: candles[lastL].low, time: candles[i].time, confirmed: true });
        trend = 'bearish';
        lastLowBreak = lastL;
      }
    }
  }

  return points.slice(-5);
}

function detectLiquidity(candles: OHLCV[]): LiquidityZone[] {
  const zones: LiquidityZone[] = [];
  const lastPrice = candles[candles.length - 1]?.close ?? 0;
  const tolerance = lastPrice * 0.001; // 0.1% tolerance for equal highs/lows

  const highs = swingHighs(candles, 2);
  const lows = swingLows(candles, 2);

  // Equal highs (buy-side liquidity)
  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const h1 = candles[highs[i]].high;
      const h2 = candles[highs[j]].high;
      if (Math.abs(h1 - h2) <= tolerance) {
        const price = (h1 + h2) / 2;
        zones.push({ type: 'buy-side', price, time: candles[highs[j]].time, swept: lastPrice > price, strength: 'equal-highs' });
      }
    }
  }

  // Equal lows (sell-side liquidity)
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const l1 = candles[lows[i]].low;
      const l2 = candles[lows[j]].low;
      if (Math.abs(l1 - l2) <= tolerance) {
        const price = (l1 + l2) / 2;
        zones.push({ type: 'sell-side', price, time: candles[lows[j]].time, swept: lastPrice < price, strength: 'equal-lows' });
      }
    }
  }

  // Significant swing highs as buy-side liquidity
  highs.slice(-3).forEach(h => {
    zones.push({ type: 'buy-side', price: candles[h].high, time: candles[h].time, swept: lastPrice > candles[h].high, strength: 'swing-high' });
  });

  // Significant swing lows as sell-side liquidity
  lows.slice(-3).forEach(l => {
    zones.push({ type: 'sell-side', price: candles[l].low, time: candles[l].time, swept: lastPrice < candles[l].low, strength: 'swing-low' });
  });

  return zones.slice(-8);
}

function calcPremiumDiscount(candles: OHLCV[]): { premium: number; discount: number; equilibrium: number } | null {
  if (candles.length < 20) return null;
  const slice = candles.slice(-50);
  const highest = Math.max(...slice.map(c => c.high));
  const lowest = Math.min(...slice.map(c => c.low));
  const equilibrium = (highest + lowest) / 2;
  const premium = equilibrium + (highest - equilibrium) * 0.5; // 75% level
  const discount = equilibrium - (equilibrium - lowest) * 0.5; // 25% level
  return { premium, discount, equilibrium };
}

function detectMitigationBlocks(orderBlocks: OrderBlock[]): MitigationBlock[] {
  return orderBlocks.filter(ob => ob.mitigated);
}

function detectBreakerBlocks(orderBlocks: OrderBlock[], lastPrice: number): BreakerBlock[] {
  const breakers: BreakerBlock[] = [];
  for (const ob of orderBlocks) {
    if (ob.type === 'bullish' && lastPrice < ob.low) {
      breakers.push({ ...ob, flipDirection: 'now-resistance' });
    } else if (ob.type === 'bearish' && lastPrice > ob.high) {
      breakers.push({ ...ob, flipDirection: 'now-support' });
    }
  }
  return breakers.slice(-4);
}

function detectInducement(liquidityZones: LiquidityZone[]): InducementLevel[] {
  return liquidityZones.filter(z => z.swept);
}

function detectDisplacement(candles: OHLCV[]): DisplacementCandle[] {
  if (candles.length < 14) return [];
  const slice = candles.slice(-50);
  const lookback = slice.slice(-14);
  const avgBody = lookback.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / lookback.length;
  const threshold = avgBody * 1.5;
  const result: DisplacementCandle[] = [];
  for (const c of slice) {
    const body = Math.abs(c.close - c.open);
    if (body > threshold) {
      result.push({
        type: c.close > c.open ? 'bullish' : 'bearish',
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        bodyRatio: avgBody > 0 ? body / avgBody : 1,
      });
    }
  }
  return result.slice(-5);
}

function detectPropulsionBlocks(candles: OHLCV[], fvgs: FairValueGap[]): PropulsionBlock[] {
  const blocks: PropulsionBlock[] = [];
  for (const fvg of fvgs.slice(-4)) {
    const fvgIdx = candles.findIndex(c => c.time === fvg.time);
    if (fvgIdx < 2) continue;
    if (fvg.type === 'bullish') {
      // Find last bearish candle before fvgIdx
      for (let i = fvgIdx - 1; i >= Math.max(0, fvgIdx - 3); i--) {
        const c = candles[i];
        if (c.close < c.open) {
          blocks.push({ type: 'bearish', high: c.high, low: c.low, time: c.time, fvgTime: fvg.time });
          break;
        }
      }
    } else {
      // Find last bullish candle before fvgIdx
      for (let i = fvgIdx - 1; i >= Math.max(0, fvgIdx - 3); i--) {
        const c = candles[i];
        if (c.close > c.open) {
          blocks.push({ type: 'bullish', high: c.high, low: c.low, time: c.time, fvgTime: fvg.time });
          break;
        }
      }
    }
  }
  return blocks.slice(-4);
}

export function analyzeSMC(candles: OHLCV[]): SMCAnalysis {
  if (candles.length < 10) {
    return {
      orderBlocks: [], fairValueGaps: [], structurePoints: [], liquidityZones: [],
      bias: 'neutral', biasScore: 0, premiumDiscount: null, lastMSS: null,
      mitigationBlocks: [], breakerBlocks: [], inducementLevels: [],
      displacementCandles: [], propulsionBlocks: [],
    };
  }

  const orderBlocks = detectOrderBlocks(candles);
  const fairValueGaps = detectFVG(candles);
  const structurePoints = detectStructure(candles);
  const liquidityZones = detectLiquidity(candles);
  const premiumDiscount = calcPremiumDiscount(candles);
  const lastPrice = candles[candles.length - 1].close;

  // Calculate bias score
  let score = 0;
  const lastBOS = structurePoints[structurePoints.length - 1];

  if (lastBOS?.direction === 'bullish') score += 30;
  else if (lastBOS?.direction === 'bearish') score -= 30;

  if (lastBOS?.type === 'CHoCH') {
    score += lastBOS.direction === 'bullish' ? 20 : -20;
  }

  // Bullish OBs below price add bullish bias
  orderBlocks.filter(ob => ob.type === 'bullish' && !ob.mitigated && ob.high < lastPrice).forEach(() => score += 10);
  orderBlocks.filter(ob => ob.type === 'bearish' && !ob.mitigated && ob.low > lastPrice).forEach(() => score -= 10);

  // FVG bias
  fairValueGaps.filter(g => g.type === 'bullish' && !g.filled && g.top < lastPrice).forEach(() => score += 5);
  fairValueGaps.filter(g => g.type === 'bearish' && !g.filled && g.bottom > lastPrice).forEach(() => score -= 5);

  // Premium/discount
  if (premiumDiscount) {
    if (lastPrice < premiumDiscount.discount) score += 15; // Discount zone — bullish
    if (lastPrice > premiumDiscount.premium) score -= 15;  // Premium zone — bearish
  }

  score = Math.max(-100, Math.min(100, score));
  const bias = score > 15 ? 'bullish' : score < -15 ? 'bearish' : 'neutral';
  const lastMSS = structurePoints.filter(p => p.type === 'CHoCH').pop() ?? null;

  const mitigationBlocks = detectMitigationBlocks(orderBlocks);
  const breakerBlocks = detectBreakerBlocks(orderBlocks, lastPrice);
  const inducementLevels = detectInducement(liquidityZones);
  const displacementCandles = detectDisplacement(candles);
  const propulsionBlocks = detectPropulsionBlocks(candles, fairValueGaps);

  return {
    orderBlocks, fairValueGaps, structurePoints, liquidityZones,
    bias, biasScore: score, premiumDiscount, lastMSS,
    mitigationBlocks, breakerBlocks, inducementLevels, displacementCandles, propulsionBlocks,
  };
}
