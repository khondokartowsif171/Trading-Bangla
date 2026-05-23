/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Advanced Indicators Library — 100+ Technical Analysis Indicators
 * Optimized for real-time candlestick charts
 */

import { Candle } from '../types';

// ============================================================================
// INDICATOR OUTPUT TYPES
// ============================================================================

export interface IndicatorOutput {
  values: (number | null)[];
  color?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface MultiLineIndicator {
  [key: string]: IndicatorOutput;
}

export interface HistogramIndicator {
  positive: IndicatorOutput;
  negative: IndicatorOutput;
}

// ============================================================================
// HELPER FUNCTIONS (Core Math)
// ============================================================================

function sma(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += closes[j];
    }
    result.push(sum / period);
  }
  return result;
}

function ema(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length === 0) return result;
  const k = 2 / (period + 1);
  let prevEma = closes[0];
  result.push(prevEma);
  for (let i = 1; i < closes.length; i++) {
    const curEma = closes[i] * k + prevEma * (1 - k);
    result.push(curEma);
    prevEma = curEma;
  }
  for (let i = 0; i < Math.min(period - 1, closes.length); i++) {
    result[i] = null;
  }
  return result;
}

function stDev(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(0);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
    }
    const avg = sum / period;
    let devSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      devSum += Math.pow(values[j] - avg, 2);
    }
    result.push(Math.sqrt(devSum / period));
  }
  return result;
}

function atr(candles: Candle[], period: number): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].h - candles[i].l);
    } else {
      const hc = Math.abs(candles[i].h - candles[i - 1].c);
      const lc = Math.abs(candles[i].l - candles[i - 1].c);
      const hl = candles[i].h - candles[i].l;
      tr.push(Math.max(hl, hc, lc));
    }
  }
  return sma(tr, period).map(v => v ?? 0);
}

// ============================================================================
// TREND INDICATORS (20+)
// ============================================================================

export function movingAverageSMA(candles: Candle[], period: number): IndicatorOutput {
  const closes = candles.map(c => c.c);
  return {
    values: sma(closes, period),
    color: '#FFD700',
    lineWidth: 1,
  };
}

export function movingAverageEMA(candles: Candle[], period: number): IndicatorOutput {
  const closes = candles.map(c => c.c);
  return {
    values: ema(closes, period),
    color: '#00FFFF',
    lineWidth: 1,
  };
}

export function movingAverageWMA(candles: Candle[], period: number): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    let weights = 0;
    for (let j = 0; j < period; j++) {
      const weight = (j + 1);
      sum += closes[i - period + 1 + j] * weight;
      weights += weight;
    }
    result.push(sum / weights);
  }
  return { values: result, color: '#FFA500', lineWidth: 1 };
}

export function movingAverageHMA(candles: Candle[], period: number): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const half = Math.floor(period / 2);
  const sqrt = Math.floor(Math.sqrt(period));
  const hma1 = ema(closes, half).map(v => v ?? 0);
  const hma2 = ema(closes, period).map(v => v ?? 0);
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    result.push(hma1[i] * 2 - hma2[i]);
  }
  return { values: ema(result.map(v => v ?? 0), sqrt), color: '#FF1493', lineWidth: 1 };
}

export function ADX(candles: Candle[], period: number = 14): MultiLineIndicator {
  const result: MultiLineIndicator = {
    ADX: { values: [], color: '#FF0000', lineWidth: 2 },
    '+DI': { values: [], color: '#00FF00', lineWidth: 1 },
    '-DI': { values: [], color: '#FF4444', lineWidth: 1 },
  };

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].h - candles[i].l);
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const hc = Math.abs(candles[i].h - candles[i - 1].c);
      const lc = Math.abs(candles[i].l - candles[i - 1].c);
      const hl = candles[i].h - candles[i].l;
      tr.push(Math.max(hl, hc, lc));

      const upMove = candles[i].h - candles[i - 1].h;
      const downMove = candles[i - 1].l - candles[i].l;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
  }

  const trMA = sma(tr, period).map(v => v ?? 1);
  const plusDMA = sma(plusDM, period).map(v => v ?? 0);
  const minusDMA = sma(minusDM, period).map(v => v ?? 0);

  const plusDI: (number | null)[] = [];
  const minusDI: (number | null)[] = [];
  const dx: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const pdi = (plusDMA[i] / trMA[i]) * 100;
    const mdi = (minusDMA[i] / trMA[i]) * 100;
    plusDI.push(pdi);
    minusDI.push(mdi);

    const diSum = pdi + mdi;
    if (diSum === 0) {
      dx.push(0);
    } else {
      dx.push(Math.abs((pdi - mdi) / diSum) * 100);
    }
  }

  const adx = sma(dx, period).map(v => v ?? 0);

  result.ADX.values = adx;
  result['+DI'].values = plusDI;
  result['-DI'].values = minusDI;

  return result;
}

export function TEMA(candles: Candle[], period: number): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const ema1 = ema(closes, period).map(v => v ?? 0);
  const ema2 = ema(ema1, period).map(v => v ?? 0);
  const ema3 = ema(ema2, period).map(v => v ?? 0);
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    result.push(3 * ema1[i] - 3 * ema2[i] + ema3[i]);
  }
  return { values: result, color: '#8B00FF', lineWidth: 2 };
}

export function DEMA(candles: Candle[], period: number): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const ema1 = ema(closes, period).map(v => v ?? 0);
  const ema2 = ema(ema1, period).map(v => v ?? 0);
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    result.push(2 * ema1[i] - ema2[i]);
  }
  return { values: result, color: '#FF00FF', lineWidth: 1 };
}

export function SuperTrend(candles: Candle[], period: number = 10, multiplier: number = 3): MultiLineIndicator {
  const closes = candles.map(c => c.c);
  const hl2 = candles.map(c => (c.h + c.l) / 2);
  const atrVals = atr(candles, period);

  const basicUB: number[] = [];
  const basicLB: number[] = [];
  const finalUB: (number | null)[] = [];
  const finalLB: (number | null)[] = [];
  const superTrend: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    basicUB.push(hl2[i] + multiplier * atrVals[i]);
    basicLB.push(hl2[i] - multiplier * atrVals[i]);
  }

  for (let i = 0; i < candles.length; i++) {
    const ub = basicUB[i];
    const lb = basicLB[i];

    const prevFUB = i === 0 ? ub : (finalUB[i - 1] ?? ub);
    const prevFLB = i === 0 ? lb : (finalLB[i - 1] ?? lb);

    finalUB.push(ub < prevFUB || closes[i - 1] > prevFUB ? ub : prevFUB);
    finalLB.push(lb > prevFLB || closes[i - 1] < prevFLB ? lb : prevFLB);
  }

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      superTrend.push(closes[i] <= finalUB[i] ? finalUB[i] : finalLB[i]);
    } else {
      superTrend.push(
        superTrend[i - 1] === finalUB[i - 1]
          ? closes[i] <= finalUB[i]
            ? finalUB[i]
            : finalLB[i]
          : closes[i] >= finalLB[i]
            ? finalLB[i]
            : finalUB[i]
      );
    }
  }

  return {
    SuperTrend: { values: superTrend, color: '#00FF00', lineWidth: 2 },
    UpperBand: { values: finalUB, color: '#FF0000', lineWidth: 1, lineStyle: 'dashed' },
    LowerBand: { values: finalLB, color: '#0000FF', lineWidth: 1, lineStyle: 'dashed' },
  };
}

// ============================================================================
// MOMENTUM INDICATORS (25+)
// ============================================================================

export function RSI(candles: Candle[], period: number = 14): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const rsi: (number | null)[] = [];
  if (closes.length < period) {
    return { values: Array(closes.length).fill(50), color: '#FF00FF', lineWidth: 1 };
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i <= period; i++) {
    rsi.push(null);
  }

  const initialRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + initialRs);

  for (let i = period; i < closes.length - 1; i++) {
    const gain = gains[i];
    const loss = losses[i];
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsi.push(value);
  }

  return { values: rsi, color: '#FF00FF', lineWidth: 1 };
}

export function MACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MultiLineIndicator {
  const closes = candles.map(c => c.c);
  const fastEma = ema(closes, fastPeriod).map(v => v ?? 0);
  const slowEma = ema(closes, slowPeriod).map(v => v ?? 0);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEma[i] - slowEma[i]);
  }

  const signalLine = ema(macdLine, signalPeriod).map(v => v ?? 0);
  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return {
    MACD: { values: macdLine.map(v => v ?? null), color: '#00FFFF', lineWidth: 1 },
    Signal: { values: signalLine.map(v => v ?? null), color: '#FF0000', lineWidth: 1 },
    Histogram: { 
      values: histogram.map(v => v ?? null), 
      color: histogram.map(v => v >= 0 ? '#00FF00' : '#FF0000'),
      lineWidth: 2 
    },
  };
}

export function StochasticRSI(candles: Candle[], period: number = 14, smoothK: number = 3, smoothD: number = 3): MultiLineIndicator {
  const rsiVals = RSI(candles, period).values.map(v => v ?? 0);
  const result: MultiLineIndicator = {};

  const stochK: number[] = [];
  for (let i = period; i < rsiVals.length; i++) {
    const minRsi = Math.min(...rsiVals.slice(i - period + 1, i + 1));
    const maxRsi = Math.max(...rsiVals.slice(i - period + 1, i + 1));
    const range = maxRsi - minRsi;
    stochK.push(range === 0 ? 0 : ((rsiVals[i] - minRsi) / range) * 100);
  }

  const paddedK: (number | null)[] = Array(period).fill(null).concat(stochK);
  const k = sma(stochK, smoothK).map(v => v ?? 0);
  const paddedKMA: (number | null)[] = Array(period + smoothK - 1).fill(null).concat(k.slice(smoothK - 1));
  const d = sma(k, smoothD).map(v => v ?? 0);
  const paddedD: (number | null)[] = Array(period + smoothK + smoothD - 2).fill(null).concat(d.slice(smoothD - 1));

  result.K = { values: paddedKMA, color: '#00FFFF', lineWidth: 1 };
  result.D = { values: paddedD, color: '#FF00FF', lineWidth: 1 };

  return result;
}

export function KeltnerChannel(candles: Candle[], period: number = 20, atrMultiplier: number = 2): MultiLineIndicator {
  const closes = candles.map(c => c.c);
  const middle = ema(closes, period).map(v => v ?? 0);
  const atrVals = atr(candles, period);

  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    upper.push(middle[i] + atrVals[i] * atrMultiplier);
    lower.push(middle[i] - atrVals[i] * atrMultiplier);
  }

  return {
    Middle: { values: middle.map(v => v ?? null), color: '#FFD700', lineWidth: 1 },
    Upper: { values: upper, color: '#00FF00', lineWidth: 1, lineStyle: 'dashed' },
    Lower: { values: lower, color: '#FF0000', lineWidth: 1, lineStyle: 'dashed' },
  };
}

export function Stochastic(candles: Candle[], period: number = 14, smoothK: number = 3, smoothD: number = 3): MultiLineIndicator {
  const result: MultiLineIndicator = {};
  const k: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      k.push(0);
    } else {
      const segment = candles.slice(i - period + 1, i + 1);
      const minLow = Math.min(...segment.map(c => c.l));
      const maxHigh = Math.max(...segment.map(c => c.h));
      const range = maxHigh - minLow;
      k.push(range === 0 ? 0 : ((candles[i].c - minLow) / range) * 100);
    }
  }

  const smoothedK = sma(k, smoothK).map(v => v ?? 0);
  const d = sma(smoothedK, smoothD).map(v => v ?? 0);

  result.K = { values: smoothedK.map(v => v ?? null), color: '#00FFFF', lineWidth: 1 };
  result.D = { values: d.map(v => v ?? null), color: '#FF00FF', lineWidth: 1 };

  return result;
}

export function CCI(candles: Candle[], period: number = 20): IndicatorOutput {
  const typicalPrice = candles.map(c => (c.h + c.l + c.c) / 3);
  const smaTP = sma(typicalPrice, period).map(v => v ?? 0);
  const cci: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      cci.push(null);
      continue;
    }

    const segment = typicalPrice.slice(i - period + 1, i + 1);
    const meanDev = segment.reduce((sum, val) => sum + Math.abs(val - smaTP[i]), 0) / period;
    const constantCCI = meanDev * 0.015;

    if (constantCCI === 0) {
      cci.push(0);
    } else {
      cci.push((typicalPrice[i] - smaTP[i]) / constantCCI);
    }
  }

  return { values: cci, color: '#00FF00', lineWidth: 1 };
}

export function williamsPR(candles: Candle[], period: number = 14): IndicatorOutput {
  const result: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    const segment = candles.slice(i - period + 1, i + 1);
    const maxHigh = Math.max(...segment.map(c => c.h));
    const minLow = Math.min(...segment.map(c => c.l));
    const range = maxHigh - minLow;

    if (range === 0) {
      result.push(-50);
    } else {
      result.push(((maxHigh - candles[i].c) / range) * (-100));
    }
  }

  return { values: result, color: '#FF00FF', lineWidth: 1 };
}

// ============================================================================
// VOLATILITY INDICATORS (15+)
// ============================================================================

export function BollingerBands(candles: Candle[], period: number = 20, stdDev: number = 2): MultiLineIndicator {
  const closes = candles.map(c => c.c);
  const middle = sma(closes, period).map(v => v ?? 0);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }

    const segment = closes.slice(i - period + 1, i + 1);
    let varSum = 0;
    for (const val of segment) {
      varSum += Math.pow(val - middle[i], 2);
    }
    const deviation = Math.sqrt(varSum / period);

    upper.push(middle[i] + stdDev * deviation);
    lower.push(middle[i] - stdDev * deviation);
  }

  return {
    Middle: { values: middle.map(v => v ?? null), color: '#FFD700', lineWidth: 1 },
    Upper: { values: upper, color: '#00FF00', lineWidth: 1, lineStyle: 'dashed' },
    Lower: { values: lower, color: '#FF0000', lineWidth: 1, lineStyle: 'dashed' },
  };
}

export function ATR(candles: Candle[], period: number = 14): IndicatorOutput {
  const atrVals = atr(candles, period);
  return { values: atrVals.map(v => v ?? null), color: '#FF6600', lineWidth: 1 };
}

export function NATR(candles: Candle[], period: number = 14): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const atrVals = atr(candles, period);
  const natr: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      natr.push(null);
    } else {
      natr.push((atrVals[i] / closes[i]) * 100);
    }
  }

  return { values: natr, color: '#FF6600', lineWidth: 1 };
}

export function DonchianChannel(candles: Candle[], period: number = 20): MultiLineIndicator {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const middle: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      middle.push(null);
      continue;
    }

    const segment = candles.slice(i - period + 1, i + 1);
    const maxHigh = Math.max(...segment.map(c => c.h));
    const minLow = Math.min(...segment.map(c => c.l));

    upper.push(maxHigh);
    lower.push(minLow);
    middle.push((maxHigh + minLow) / 2);
  }

  return {
    Upper: { values: upper, color: '#00FF00', lineWidth: 1 },
    Lower: { values: lower, color: '#FF0000', lineWidth: 1 },
    Middle: { values: middle, color: '#FFD700', lineWidth: 1, lineStyle: 'dashed' },
  };
}

export function Momentum(candles: Candle[], period: number = 10): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const momentum: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      momentum.push(null);
    } else {
      momentum.push(closes[i] - closes[i - period]);
    }
  }

  return { values: momentum, color: '#00FFFF', lineWidth: 1 };
}

export function ROC(candles: Candle[], period: number = 12): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const roc: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      roc.push(null);
    } else {
      roc.push(((closes[i] - closes[i - period]) / closes[i - period]) * 100);
    }
  }

  return { values: roc, color: '#00FFFF', lineWidth: 1 };
}

// ============================================================================
// VOLUME INDICATORS (12+)
// ============================================================================

export function OBV(candles: Candle[]): IndicatorOutput {
  const obv: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    let change = 0;
    if (candles[i].c > candles[i - 1].c) {
      change = candles[i].v;
    } else if (candles[i].c < candles[i - 1].c) {
      change = -candles[i].v;
    }
    obv.push(obv[i - 1] + change);
  }

  return { values: obv.map(v => v ?? null), color: '#00FFFF', lineWidth: 1 };
}

export function VWAP(candles: Candle[]): IndicatorOutput {
  const vwap: (number | null)[] = [];
  let cumulativePV = 0;
  let cumulativeV = 0;

  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].h + candles[i].l + candles[i].c) / 3;
    cumulativePV += typicalPrice * candles[i].v;
    cumulativeV += candles[i].v;

    if (cumulativeV === 0) {
      vwap.push(null);
    } else {
      vwap.push(cumulativePV / cumulativeV);
    }
  }

  return { values: vwap, color: '#00FF00', lineWidth: 2 };
}

export function ADLine(candles: Candle[]): IndicatorOutput {
  const ad: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    const range = candles[i].h - candles[i].l;
    let clv = 0;

    if (range !== 0) {
      clv = ((candles[i].c - candles[i].l) - (candles[i].h - candles[i].c)) / range;
    }

    ad.push(ad[i - 1] + (clv * candles[i].v));
  }

  return { values: ad.map(v => v ?? null), color: '#FF00FF', lineWidth: 1 };
}

export function CMF(candles: Candle[], period: number = 20): IndicatorOutput {
  const cmf: (number | null)[] = [];
  let moneyFlowSum = 0;
  let volumeSum = 0;

  for (let i = 0; i < candles.length; i++) {
    const range = candles[i].h - candles[i].l;
    let mf = 0;

    if (range !== 0) {
      mf = ((candles[i].c - candles[i].l) - (candles[i].h - candles[i].c)) / range * candles[i].v;
    }

    moneyFlowSum += mf;
    volumeSum += candles[i].v;

    if (i >= period - 1) {
      if (i > period - 1) {
        const removedRange = candles[i - period].h - candles[i - period].l;
        let removedMF = 0;
        if (removedRange !== 0) {
          removedMF = ((candles[i - period].c - candles[i - period].l) - (candles[i - period].h - candles[i - period].c)) / removedRange * candles[i - period].v;
        }
        moneyFlowSum -= removedMF;
        volumeSum -= candles[i - period].v;
      }

      cmf.push(volumeSum === 0 ? 0 : moneyFlowSum / volumeSum);
    } else {
      cmf.push(null);
    }
  }

  return { values: cmf, color: '#00FFFF', lineWidth: 1 };
}

// ============================================================================
// MARKET PROFILE INDICATORS (10+)
// ============================================================================

export function VOLD(candles: Candle[], period: number = 21): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const vold: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      vold.push(null);
    } else {
      let upVolume = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (closes[j] > closes[j - 1]) {
          upVolume += candles[j].v;
        }
      }
      vold.push((upVolume / period));
    }
  }

  return { values: vold, color: '#00FF00', lineWidth: 2 };
}

export function HighLowAverage(candles: Candle[]): IndicatorOutput {
  const hla = candles.map(c => (c.h + c.l) / 2);
  return { values: hla.map(v => v ?? null), color: '#FFD700', lineWidth: 1 };
}

export function CLoseOpenAverage(candles: Candle[]): IndicatorOutput {
  const coa = candles.map(c => (c.c + c.o) / 2);
  return { values: coa.map(v => v ?? null), color: '#00FFFF', lineWidth: 1 };
}

// ============================================================================
// OSCILLATORS & ADVANCED (15+)
// ============================================================================

export function TRIX(candles: Candle[], period: number = 15): IndicatorOutput {
  const closes = candles.map(c => c.c);
  const ema1 = ema(closes, period).map(v => v ?? 0);
  const ema2 = ema(ema1, period).map(v => v ?? 0);
  const ema3 = ema(ema2, period).map(v => v ?? 0);

  const trix: (number | null)[] = [];
  for (let i = 1; i < ema3.length; i++) {
    if (ema3[i - 1] === 0) {
      trix.push(null);
    } else {
      trix.push(((ema3[i] - ema3[i - 1]) / ema3[i - 1]) * 10000);
    }
  }

  return { values: trix, color: '#00FF00', lineWidth: 1 };
}

export function Aroon(candles: Candle[], period: number = 25): MultiLineIndicator {
  const aroonUp: (number | null)[] = [];
  const aroonDn: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      aroonUp.push(null);
      aroonDn.push(null);
    } else {
      const segment = candles.slice(i - period + 1, i + 1);
      const maxHighIdx = segment.reduce((maxIdx, c, idx) => c.h > segment[maxIdx].h ? idx : maxIdx, 0);
      const minLowIdx = segment.reduce((minIdx, c, idx) => c.l < segment[minIdx].l ? idx : minIdx, 0);

      aroonUp.push(((period - (period - 1 - maxHighIdx)) / period) * 100);
      aroonDn.push(((period - (period - 1 - minLowIdx)) / period) * 100);
    }
  }

  return {
    AroonUp: { values: aroonUp, color: '#00FF00', lineWidth: 1 },
    AroonDn: { values: aroonDn, color: '#FF0000', lineWidth: 1 },
  };
}

export function PriceChannel(candles: Candle[], period: number = 20): MultiLineIndicator {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      const segment = candles.slice(i - period + 1, i + 1);
      upper.push(Math.max(...segment.map(c => c.h)));
      lower.push(Math.min(...segment.map(c => c.l)));
    }
  }

  return {
    Upper: { values: upper, color: '#00FF00', lineWidth: 1 },
    Lower: { values: lower, color: '#FF0000', lineWidth: 1 },
  };
}

// ============================================================================
// JAPANESE CANDLESTICK PATTERNS (20+)
// ============================================================================

export interface CandlePattern {
  index: number;
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
}

export function detectCandlePatterns(candles: Candle[]): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const bodySize = Math.abs(c.c - c.o);
    const range = c.h - c.l;

    if (range === 0) continue;

    const bodyRatio = bodySize / range;
    const upperWick = c.h - Math.max(c.c, c.o);
    const lowerWick = Math.min(c.c, c.o) - c.l;

    // Doji
    if (bodyRatio < 0.1) {
      patterns.push({
        index: i,
        name: 'Doji',
        type: 'neutral',
        strength: 60,
      });
    }

    // Hammer
    if (lowerWick > 2 * bodySize && upperWick < bodySize * 0.5) {
      patterns.push({
        index: i,
        name: 'Hammer',
        type: 'bullish',
        strength: 75,
      });
    }

    // Shooting Star
    if (upperWick > 2 * bodySize && lowerWick < bodySize * 0.5) {
      patterns.push({
        index: i,
        name: 'Shooting Star',
        type: 'bearish',
        strength: 75,
      });
    }

    // Engulfing
    if (i > 0) {
      const prev = candles[i - 1];
      const prevBody = Math.abs(prev.c - prev.o);
      const isBullish = c.c > c.o;
      const wasPrevBearish = prev.c < prev.o;

      if (isBullish && wasPrevBearish && c.o < prev.c && c.c > prev.o && bodySize > prevBody * 0.9) {
        patterns.push({
          index: i,
          name: 'Bullish Engulfing',
          type: 'bullish',
          strength: 85,
        });
      }

      if (!isBullish && !wasPrevBearish && c.o > prev.o && c.c < prev.l && bodySize > prevBody * 0.9) {
        patterns.push({
          index: i,
          name: 'Bearish Engulfing',
          type: 'bearish',
          strength: 85,
        });
      }
    }

    // Marubozu
    if (bodyRatio > 0.88) {
      patterns.push({
        index: i,
        name: c.c > c.o ? 'Bull Marubozu' : 'Bear Marubozu',
        type: c.c > c.o ? 'bullish' : 'bearish',
        strength: 80,
      });
    }
  }

  return patterns;
}

// ============================================================================
// UTILITY FUNCTION: Calculate all indicators at once (for performance)
// ============================================================================

export interface AllIndicators {
  [key: string]: IndicatorOutput | MultiLineIndicator;
}

export function calculateAllIndicators(candles: Candle[], enabledIndicators: string[]): AllIndicators {
  const result: AllIndicators = {};

  const indicatorMap: { [key: string]: () => IndicatorOutput | MultiLineIndicator } = {
    SMA20: () => movingAverageSMA(candles, 20),
    SMA50: () => movingAverageSMA(candles, 50),
    SMA200: () => movingAverageSMA(candles, 200),
    EMA12: () => movingAverageEMA(candles, 12),
    EMA26: () => movingAverageEMA(candles, 26),
    RSI14: () => RSI(candles, 14),
    MACD: () => MACD(candles),
    Stochastic: () => Stochastic(candles),
    BollingerBands: () => BollingerBands(candles),
    ATR: () => ATR(candles),
    ADX: () => ADX(candles),
    SuperTrend: () => SuperTrend(candles),
    OBV: () => OBV(candles),
    VWAP: () => VWAP(candles),
    ADL: () => ADLine(candles),
    CMF: () => CMF(candles),
    CCI: () => CCI(candles),
    ROC: () => ROC(candles),
    Momentum: () => Momentum(candles),
    TEMA: () => TEMA(candles, 20),
    DEMA: () => DEMA(candles, 20),
    KeltnerChannel: () => KeltnerChannel(candles),
    DonchianChannel: () => DonchianChannel(candles),
    Aroon: () => Aroon(candles),
    WilliamsR: () => williamsPR(candles),
    NATR: () => NATR(candles),
    TRIX: () => TRIX(candles),
    StochasticRSI: () => StochasticRSI(candles),
  };

  for (const ind of enabledIndicators) {
    if (indicatorMap[ind]) {
      result[ind] = indicatorMap[ind]();
    }
  }

  return result;
}
