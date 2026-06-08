/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * forexIndicators.ts
 * ~60 additional technical indicator functions for trend, oscillator, volume,
 * and volatility analysis. Imports helpers from forexMath.ts.
 */

import { Candle } from '../types';
import {
  calculateEMA,
  calculateSMA,
  calculateATR,
  calculateWMA,
  calculateRSI,
  calculateBollingerBands,
} from './forexMath';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute EMA on a raw number array (not Candle[]). Returns same-length array
 * with nulls before the period warms up.
 */
function emaOnArray(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  let warmUp = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) {
      result.push(null);
      continue;
    }
    if (prev === null) {
      prev = v;
      warmUp = 1;
      result.push(null); // not warmed up yet
    } else {
      prev = v * k + prev * (1 - k);
      warmUp++;
      result.push(warmUp >= period ? prev : null);
    }
  }
  return result;
}

/**
 * Compute SMA on a raw number array. Returns same-length array with nulls.
 */
function smaOnArray(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const slice: number[] = [];
    for (let j = i; j >= 0 && slice.length < period; j--) {
      const v = values[j];
      if (v !== null) slice.push(v);
      else break; // contiguous only
    }
    result.push(slice.length === period ? slice.reduce((a, b) => a + b, 0) / period : null);
  }
  return result;
}

/**
 * Compute WMA on a raw number array. Returns same-length array with nulls.
 */
function wmaOnArray(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const weightSum = (period * (period + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let wSum = 0;
    let valid = true;
    for (let j = 0; j < period; j++) {
      const v = values[i - j];
      if (v === null) { valid = false; break; }
      wSum += v * (period - j);
    }
    result.push(valid ? wSum / weightSum : null);
  }
  return result;
}

/**
 * Rolling standard deviation of close prices.
 */
function rollingStdDev(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = candles.slice(i - period + 1, i + 1).map(c => c.c);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    result.push(Math.sqrt(variance));
  }
  return result;
}

/**
 * SMMA (Smoothed/Wilder MA) on candles array.
 */
function smmaOnCandles(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length < period) return Array(candles.length).fill(null);

  // Seed: SMA of first `period` closes
  let smma = candles.slice(0, period).reduce((a, c) => a + c.c, 0) / period;

  for (let i = 0; i < period - 1; i++) result.push(null);
  result.push(smma);

  for (let i = period; i < candles.length; i++) {
    smma = (smma * (period - 1) + candles[i].c) / period;
    result.push(smma);
  }
  return result;
}

/**
 * SMMA on a raw number array.
 */
function smmaOnArray(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let smma: number | null = null;
  let count = 0;
  const seedBuf: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) { result.push(null); continue; }

    if (smma === null) {
      seedBuf.push(v);
      if (seedBuf.length < period) {
        result.push(null);
      } else {
        smma = seedBuf.reduce((a, b) => a + b, 0) / period;
        result.push(smma);
        count = period;
      }
    } else {
      smma = (smma * (period - 1) + v) / period;
      result.push(smma);
      count++;
    }
  }
  return result;
}

/**
 * Rolling linear regression coefficients [a (intercept), b (slope)] for last `period` closes.
 */
function lrCoeffs(candles: Candle[], i: number, period: number): [number, number] | null {
  if (i < period - 1) return null;
  const n = period;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let j = 0; j < n; j++) {
    const x = j;
    const y = candles[i - (n - 1 - j)].c;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return [a, b];
}

/**
 * ROC on a raw number array.
 */
function rocOnArray(values: (number | null)[], period: number): (number | null)[] {
  return values.map((v, i) => {
    if (i < period || v === null) return null;
    const prev = values[i - period];
    if (prev === null || prev === 0) return null;
    return ((v - prev) / prev) * 100;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TREND / OVERLAY INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Double Exponential Moving Average (DEMA)
 * DEMA = 2*EMA(n) - EMA(EMA(n))
 */
export function calculateDEMA(candles: Candle[], period = 21): (number | null)[] {
  const ema1 = calculateEMA(candles, period);
  const ema2 = emaOnArray(ema1, period);
  return ema1.map((e1, i) => {
    const e2 = ema2[i];
    if (e1 === null || e2 === null) return null;
    return 2 * e1 - e2;
  });
}

/**
 * Triple Exponential Moving Average (TEMA)
 * TEMA = 3*EMA - 3*EMA(EMA) + EMA(EMA(EMA))
 */
export function calculateTEMA(candles: Candle[], period = 21): (number | null)[] {
  const ema1 = calculateEMA(candles, period);
  const ema2 = emaOnArray(ema1, period);
  const ema3 = emaOnArray(ema2, period);
  return ema1.map((e1, i) => {
    const e2 = ema2[i];
    const e3 = ema3[i];
    if (e1 === null || e2 === null || e3 === null) return null;
    return 3 * e1 - 3 * e2 + e3;
  });
}

/**
 * Hull Moving Average (HMA)
 * HMA = WMA( 2*WMA(n/2) - WMA(n), floor(sqrt(n)) )
 */
export function calculateHMA(candles: Candle[], period = 20): (number | null)[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));

  const wmaFull = calculateWMA(candles, period);
  const wmaHalf = calculateWMA(candles, halfPeriod);

  // Intermediate series: 2*WMA(n/2) - WMA(n)
  const intermediate: (number | null)[] = wmaFull.map((wf, i) => {
    const wh = wmaHalf[i];
    if (wf === null || wh === null) return null;
    return 2 * wh - wf;
  });

  return wmaOnArray(intermediate, sqrtPeriod);
}

/**
 * Smoothed Moving Average / Wilder Moving Average (SMMA)
 * Seed = SMA(period), then SMMA(i) = (SMMA(i-1)*(n-1) + close(i)) / n
 */
export function calculateSMMA(candles: Candle[], period = 14): (number | null)[] {
  return smmaOnCandles(candles, period);
}

/**
 * Zero-Lag EMA (ZLEMA)
 * lag = floor((period-1)/2)
 * adjusted(i) = 2*close(i) - close(i-lag)
 * ZLEMA = EMA(adjusted, period)
 */
export function calculateZLEMA(candles: Candle[], period = 21): (number | null)[] {
  const lag = Math.floor((period - 1) / 2);
  const adjusted: (number | null)[] = candles.map((c, i) => {
    if (i < lag) return null;
    return 2 * c.c - candles[i - lag].c;
  });

  // EMA on adjusted values
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let prev: number | null = null;
  let warmUp = 0;

  for (let i = 0; i < adjusted.length; i++) {
    const v = adjusted[i];
    if (v === null) { result.push(null); continue; }
    if (prev === null) {
      prev = v;
      warmUp = 1;
      result.push(null);
    } else {
      prev = v * k + prev * (1 - k);
      warmUp++;
      result.push(warmUp >= period ? prev : null);
    }
  }
  return result;
}

/**
 * McGinley Dynamic Indicator
 * M(i) = M(i-1) + (close - M(i-1)) / (period * (close/M(i-1))^4)
 * Seeded with SMA(period).
 */
export function calculateMcGinley(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length < period) return Array(candles.length).fill(null);

  // Seed
  let mg = candles.slice(0, period).reduce((a, c) => a + c.c, 0) / period;
  for (let i = 0; i < period - 1; i++) result.push(null);
  result.push(mg);

  for (let i = period; i < candles.length; i++) {
    const close = candles[i].c;
    const ratio = close / mg;
    mg = mg + (close - mg) / (period * Math.pow(ratio, 4));
    result.push(mg);
  }
  return result;
}

/**
 * Linear Regression Line (LR Line)
 * Value at each bar = endpoint of regression line fitted over last `period` bars.
 */
export function calculateLRLine(candles: Candle[], period = 20): (number | null)[] {
  return candles.map((_, i) => {
    const coeffs = lrCoeffs(candles, i, period);
    if (coeffs === null) return null;
    const [a, b] = coeffs;
    return a + b * (period - 1); // endpoint (x = period-1)
  });
}

/**
 * Linear Regression Channel
 * Upper = LR Line + 2*stddev, Lower = LR Line - 2*stddev
 */
export function calculateLRChannel(
  candles: Candle[],
  period = 20
): { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = [];
  const mid: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null); mid.push(null); lower.push(null);
      continue;
    }
    const coeffs = lrCoeffs(candles, i, period);
    if (coeffs === null) {
      upper.push(null); mid.push(null); lower.push(null);
      continue;
    }
    const [a, b] = coeffs;
    const lrVal = a + b * (period - 1);
    mid.push(lrVal);

    // Stddev of residuals
    let varSum = 0;
    for (let j = 0; j < period; j++) {
      const x = j;
      const actualY = candles[i - (period - 1 - j)].c;
      const fittedY = a + b * x;
      varSum += (actualY - fittedY) ** 2;
    }
    const stddev = Math.sqrt(varSum / period);
    upper.push(lrVal + 2 * stddev);
    lower.push(lrVal - 2 * stddev);
  }
  return { upper, mid, lower };
}

/**
 * Donchian Channel
 * Upper = max(high, period), Lower = min(low, period), Mid = (upper+lower)/2
 */
export function calculateDonchian(
  candles: Candle[],
  period = 20
): { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = [];
  const mid: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null); mid.push(null); lower.push(null);
      continue;
    }
    const slice = candles.slice(i - period + 1, i + 1);
    const hi = Math.max(...slice.map(c => c.h));
    const lo = Math.min(...slice.map(c => c.l));
    upper.push(hi);
    lower.push(lo);
    mid.push((hi + lo) / 2);
  }
  return { upper, mid, lower };
}

export interface IchimokuData {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  senkouA: (number | null)[];
  senkouB: (number | null)[];
  chikou: (number | null)[];
}

/**
 * Ichimoku Cloud
 * Tenkan = (max(H,9)+min(L,9))/2
 * Kijun  = (max(H,26)+min(L,26))/2
 * Senkou A = (Tenkan+Kijun)/2 shifted 26 forward
 * Senkou B = (max(H,52)+min(L,52))/2 shifted 26 forward
 * Chikou   = close shifted 26 back
 */
export function calculateIchimoku(candles: Candle[]): IchimokuData {
  const len = candles.length;
  const tenkan: (number | null)[] = [];
  const kijun: (number | null)[] = [];
  const senkouA: (number | null)[] = Array(len).fill(null);
  const senkouB: (number | null)[] = Array(len).fill(null);
  const chikou: (number | null)[] = Array(len).fill(null);

  const midpoint = (arr: Candle[], prd: number, idx: number): number | null => {
    if (idx < prd - 1) return null;
    const sl = arr.slice(idx - prd + 1, idx + 1);
    return (Math.max(...sl.map(c => c.h)) + Math.min(...sl.map(c => c.l))) / 2;
  };

  for (let i = 0; i < len; i++) {
    tenkan.push(midpoint(candles, 9, i));
    kijun.push(midpoint(candles, 26, i));
  }

  for (let i = 0; i < len; i++) {
    const t = tenkan[i];
    const k = kijun[i];
    const projIdx = i + 26;
    if (projIdx < len) {
      if (t !== null && k !== null) senkouA[projIdx] = (t + k) / 2;
      const sb = midpoint(candles, 52, i);
      if (sb !== null) senkouB[projIdx] = sb;
    }
    // Chikou: today's close placed 26 bars back
    const chikouIdx = i - 26;
    if (chikouIdx >= 0) chikou[chikouIdx] = candles[i].c;
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}

/**
 * Alligator Indicator (Bill Williams)
 * Jaw   = SMMA(13) shifted 8 bars forward
 * Teeth = SMMA(8)  shifted 5 bars forward
 * Lips  = SMMA(5)  shifted 3 bars forward
 */
export function calculateAlligator(
  candles: Candle[]
): { jaw: (number | null)[]; teeth: (number | null)[]; lips: (number | null)[] } {
  const len = candles.length;
  const smma13 = smmaOnCandles(candles, 13);
  const smma8  = smmaOnCandles(candles, 8);
  const smma5  = smmaOnCandles(candles, 5);

  const shiftForward = (arr: (number | null)[], shift: number): (number | null)[] => {
    const out: (number | null)[] = Array(len).fill(null);
    for (let i = 0; i < len; i++) {
      const dest = i + shift;
      if (dest < len && arr[i] !== null) out[dest] = arr[i];
    }
    return out;
  };

  return {
    jaw:   shiftForward(smma13, 8),
    teeth: shiftForward(smma8, 5),
    lips:  shiftForward(smma5, 3),
  };
}

/**
 * Chandelier Exit
 * longStop  = max(high, period) - mult * ATR(period)
 * shortStop = min(low,  period) + mult * ATR(period)
 */
export function calculateChandelierExit(
  candles: Candle[],
  period = 22,
  mult = 3
): { longStop: (number | null)[]; shortStop: (number | null)[] } {
  const atr = calculateATR(candles, period);
  const longStop: (number | null)[] = [];
  const shortStop: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const a = atr[i];
    if (i < period - 1 || a === null) {
      longStop.push(null);
      shortStop.push(null);
      continue;
    }
    const slice = candles.slice(i - period + 1, i + 1);
    const hi = Math.max(...slice.map(c => c.h));
    const lo = Math.min(...slice.map(c => c.l));
    longStop.push(hi - mult * a);
    shortStop.push(lo + mult * a);
  }
  return { longStop, shortStop };
}

/**
 * ATR Bands
 * mid = EMA(period), upper = mid + mult*ATR, lower = mid - mult*ATR
 */
export function calculateATRBands(
  candles: Candle[],
  period = 14,
  mult = 2
): { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] } {
  const ema = calculateEMA(candles, period);
  const atr = calculateATR(candles, period);

  return {
    upper: ema.map((e, i) => {
      const a = atr[i];
      if (e === null || a === null) return null;
      return e + mult * a;
    }),
    mid: ema,
    lower: ema.map((e, i) => {
      const a = atr[i];
      if (e === null || a === null) return null;
      return e - mult * a;
    }),
  };
}

/**
 * Fractal Indicator (Bill Williams 5-bar fractals)
 * Bull fractal at i: candle[i] has the LOWEST low of 5 bars (i-2 to i+2)
 * Bear fractal at i: candle[i] has the HIGHEST high of 5 bars (i-2 to i+2)
 * Result arrays are indexed by the CENTER bar (i), so first/last 2 are null.
 */
export function calculateFractal(
  candles: Candle[]
): { bullFractal: (boolean | null)[]; bearFractal: (boolean | null)[] } {
  const len = candles.length;
  const bullFractal: (boolean | null)[] = Array(len).fill(null);
  const bearFractal: (boolean | null)[] = Array(len).fill(null);

  for (let i = 2; i < len - 2; i++) {
    const window = candles.slice(i - 2, i + 3);
    const lowestLow   = Math.min(...window.map(c => c.l));
    const highestHigh = Math.max(...window.map(c => c.h));
    bullFractal[i] = candles[i].l === lowestLow;
    bearFractal[i] = candles[i].h === highestHigh;
  }
  return { bullFractal, bearFractal };
}

/**
 * Volume-Weighted EMA (VEMA)
 * Simplified: EMA(close*volume) / EMA(volume)
 */
export function calculateVEMA(candles: Candle[], period = 20): (number | null)[] {
  const closeVol = candles.map(c => ({ c: c.c * c.v, h: c.h, l: c.l, o: c.o, v: c.v, t: c.t }));
  const volCandles = candles.map(c => ({ c: c.v, h: c.h, l: c.l, o: c.o, v: c.v, t: c.t }));

  const emaCv = calculateEMA(closeVol as Candle[], period);
  const emaV  = calculateEMA(volCandles as Candle[], period);

  return emaCv.map((ecv, i) => {
    const ev = emaV[i];
    if (ecv === null || ev === null || ev === 0) return null;
    return ecv / ev;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OSCILLATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stochastic RSI
 * Apply stochastic formula to RSI values, then smooth K and D with SMA.
 */
export function calculateStochRSI(
  candles: Candle[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const rsi = calculateRSI(candles, rsiPeriod);

  const rawK: (number | null)[] = [];
  for (let i = 0; i < rsi.length; i++) {
    const slice = rsi.slice(Math.max(0, i - stochPeriod + 1), i + 1).filter((v): v is number => v !== null);
    if (slice.length < stochPeriod || rsi[i] === null) {
      rawK.push(null);
      continue;
    }
    const minRsi = Math.min(...slice);
    const maxRsi = Math.max(...slice);
    const range = maxRsi - minRsi;
    rawK.push(range === 0 ? 0 : ((rsi[i] as number) - minRsi) / range * 100);
  }

  const smoothedK = smaOnArray(rawK, kSmooth);
  const d         = smaOnArray(smoothedK, dSmooth);

  return { k: smoothedK, d };
}

/**
 * Money Flow Index (MFI)
 * TP = (H+L+C)/3, MF = TP*V
 * MFI = 100 - 100/(1 + PosMF/NegMF)
 */
export function calculateMFI(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null]; // index 0 has no previous bar
  if (candles.length < 2) return Array(candles.length).fill(null);

  const tp = candles.map(c => (c.h + c.l + c.c) / 3);
  const mf = candles.map((c, i) => tp[i] * c.v);

  for (let i = 1; i < candles.length; i++) {
    if (i < period) { result.push(null); continue; }
    let posMF = 0, negMF = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) posMF += mf[j];
      else negMF += mf[j];
    }
    result.push(negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF));
  }
  return result;
}

/**
 * Chaikin Money Flow (CMF)
 * CLV = ((C-L)-(H-C))/(H-L)
 * CMF = sum(CLV*V, n) / sum(V, n)
 */
export function calculateCMF(candles: Candle[], period = 20): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sumClvV = 0, sumV = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const { h, l, c, v } = candles[j];
      const range = h - l;
      if (range > 0) sumClvV += ((c - l) - (h - c)) / range * v;
      sumV += v;
    }
    result.push(sumV === 0 ? null : sumClvV / sumV);
  }
  return result;
}

/**
 * True Strength Index (TSI)
 * PC = close - prevClose
 * TSI = EMA(EMA(PC, long), short) / EMA(EMA(|PC|, long), short) * 100
 */
export function calculateTSI(
  candles: Candle[],
  longPeriod = 25,
  shortPeriod = 13
): (number | null)[] {
  if (candles.length < 2) return Array(candles.length).fill(null);

  const pc:  (number | null)[] = [null];
  const apc: (number | null)[] = [null];
  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].c - candles[i - 1].c;
    pc.push(diff);
    apc.push(Math.abs(diff));
  }

  const smoothPC  = emaOnArray(emaOnArray(pc, longPeriod), shortPeriod);
  const smoothAPC = emaOnArray(emaOnArray(apc, longPeriod), shortPeriod);

  return smoothPC.map((sp, i) => {
    const sa = smoothAPC[i];
    if (sp === null || sa === null || sa === 0) return null;
    return (sp / sa) * 100;
  });
}

/**
 * Fisher Transform
 * HL2 = (H+L)/2, normalize to [-1,1] over period
 * Fisher = 0.5 * ln((1+v)/(1-v)), v clamped to ±0.999
 */
export function calculateFisher(candles: Candle[], period = 10): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = candles.slice(i - period + 1, i + 1);
    const hl2   = (candles[i].h + candles[i].l) / 2;
    const hiHL2 = Math.max(...slice.map(c => (c.h + c.l) / 2));
    const loHL2 = Math.min(...slice.map(c => (c.h + c.l) / 2));
    const range = hiHL2 - loHL2;
    let v = range === 0 ? 0 : (2 * (hl2 - loHL2) / range) - 1;
    v = Math.max(-0.999, Math.min(0.999, v));
    result.push(0.5 * Math.log((1 + v) / (1 - v)));
  }
  return result;
}

/**
 * Ultimate Oscillator
 * BP = C - min(L, prevC), TR = max(H, prevC) - min(L, prevC)
 * UO = 100*(4*avg(BP,p1)/avg(TR,p1) + 2*avg(BP,p2)/avg(TR,p2) + avg(BP,p3)/avg(TR,p3)) / 7
 */
export function calculateUltimateOsc(
  candles: Candle[],
  p1 = 7,
  p2 = 14,
  p3 = 28
): (number | null)[] {
  const result: (number | null)[] = [null];
  if (candles.length < 2) return Array(candles.length).fill(null);

  const bp: number[] = [0];
  const tr: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], pc = candles[i - 1];
    bp.push(c.c - Math.min(c.l, pc.c));
    tr.push(Math.max(c.h, pc.c) - Math.min(c.l, pc.c));
  }

  const sumOver = (arr: number[], i: number, period: number): number =>
    arr.slice(Math.max(0, i - period + 1), i + 1).reduce((a, b) => a + b, 0);

  for (let i = 1; i < candles.length; i++) {
    if (i < p3 - 1) { result.push(null); continue; }
    const bp1 = sumOver(bp, i, p1), tr1 = sumOver(tr, i, p1);
    const bp2 = sumOver(bp, i, p2), tr2 = sumOver(tr, i, p2);
    const bp3 = sumOver(bp, i, p3), tr3 = sumOver(tr, i, p3);
    if (tr1 === 0 || tr2 === 0 || tr3 === 0) { result.push(null); continue; }
    result.push(100 * (4 * (bp1 / tr1) + 2 * (bp2 / tr2) + (bp3 / tr3)) / 7);
  }
  return result;
}

/**
 * Aroon Indicator
 * AroonUp   = (period - bars since period-high) / period * 100
 * AroonDown = (period - bars since period-low)  / period * 100
 * AroonOsc  = AroonUp - AroonDown
 */
export function calculateAroon(
  candles: Candle[],
  period = 25
): { aroonUp: (number | null)[]; aroonDown: (number | null)[]; aroonOsc: (number | null)[] } {
  const aroonUp:   (number | null)[] = [];
  const aroonDown: (number | null)[] = [];
  const aroonOsc:  (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      aroonUp.push(null); aroonDown.push(null); aroonOsc.push(null);
      continue;
    }
    const slice = candles.slice(i - period, i + 1);
    const hiIdx = slice.reduce((best, c, j) => c.h > slice[best].h ? j : best, 0);
    const loIdx = slice.reduce((best, c, j) => c.l < slice[best].l ? j : best, 0);
    const barsSinceHi = period - hiIdx;
    const barsSinceLo = period - loIdx;
    const up   = (period - barsSinceHi) / period * 100;
    const down = (period - barsSinceLo) / period * 100;
    aroonUp.push(up);
    aroonDown.push(down);
    aroonOsc.push(up - down);
  }
  return { aroonUp, aroonDown, aroonOsc };
}

/**
 * Chande Momentum Oscillator (CMO)
 * SU = sum of positive price changes, SD = sum of absolute negative changes
 * CMO = (SU-SD)/(SU+SD)*100
 */
export function calculateCMO(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  if (candles.length < 2) return Array(candles.length).fill(null);

  for (let i = 1; i < candles.length; i++) {
    if (i < period) { result.push(null); continue; }
    let su = 0, sd = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].c - candles[j - 1].c;
      if (diff > 0) su += diff;
      else sd += Math.abs(diff);
    }
    result.push(su + sd === 0 ? 0 : (su - sd) / (su + sd) * 100);
  }
  return result;
}

/**
 * Detrended Price Oscillator (DPO)
 * DPO(i) = close(i) - SMA(period, i - floor(period/2) - 1)
 */
export function calculateDPO(candles: Candle[], period = 20): (number | null)[] {
  const sma = calculateSMA(candles, period);
  const shift = Math.floor(period / 2) + 1;

  return candles.map((c, i) => {
    const smaIdx = i - shift;
    if (smaIdx < 0) return null;
    const smaVal = sma[smaIdx];
    if (smaVal === null) return null;
    return c.c - smaVal;
  });
}

/**
 * TRIX
 * EMA3 = EMA(EMA(EMA(close,n),n),n)
 * TRIX = (EMA3(i) - EMA3(i-1)) / EMA3(i-1) * 100
 */
export function calculateTRIX(candles: Candle[], period = 15): (number | null)[] {
  const ema1 = calculateEMA(candles, period);
  const ema2 = emaOnArray(ema1, period);
  const ema3 = emaOnArray(ema2, period);

  const result: (number | null)[] = [null];
  for (let i = 1; i < ema3.length; i++) {
    const curr = ema3[i];
    const prev = ema3[i - 1];
    if (curr === null || prev === null || prev === 0) { result.push(null); continue; }
    result.push((curr - prev) / prev * 100);
  }
  return result;
}

/**
 * Vortex Indicator
 * VM+ = |H - prevL|, VM- = |L - prevH|
 * TR  = max(H-L, |H-prevC|, |L-prevC|)
 * VI+ = sum(VM+,n)/sum(TR,n), VI- = sum(VM-,n)/sum(TR,n)
 */
export function calculateVortex(
  candles: Candle[],
  period = 14
): { viPlus: (number | null)[]; viMinus: (number | null)[] } {
  const viPlus:  (number | null)[] = [null];
  const viMinus: (number | null)[] = [null];

  const vmPlus:  number[] = [0];
  const vmMinus: number[] = [0];
  const trArr:   number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    vmPlus.push(Math.abs(c.h - p.l));
    vmMinus.push(Math.abs(c.l - p.h));
    trArr.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }

  for (let i = 1; i < candles.length; i++) {
    if (i < period) { viPlus.push(null); viMinus.push(null); continue; }
    const sumVMP  = vmPlus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumVMM  = vmMinus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR   = trArr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    viPlus.push(sumTR === 0 ? null : sumVMP / sumTR);
    viMinus.push(sumTR === 0 ? null : sumVMM / sumTR);
  }
  return { viPlus, viMinus };
}

/**
 * Elder Ray Index
 * Bull Power = High - EMA(period)
 * Bear Power = Low  - EMA(period)
 */
export function calculateElderRay(
  candles: Candle[],
  period = 13
): { bullPower: (number | null)[]; bearPower: (number | null)[] } {
  const ema = calculateEMA(candles, period);
  return {
    bullPower: candles.map((c, i) => ema[i] === null ? null : c.h - (ema[i] as number)),
    bearPower: candles.map((c, i) => ema[i] === null ? null : c.l - (ema[i] as number)),
  };
}

/**
 * Squeeze Momentum (LazyBear style)
 * Squeeze = BB(bbPeriod) inside KC(kcPeriod, mult)
 * val = LinReg of (close - avg(avg(highest,lowest), SMA)) over bbPeriod
 */
export function calculateSqueeze(
  candles: Candle[],
  bbPeriod = 20,
  kcPeriod = 20,
  mult = 2
): { val: (number | null)[]; squeezed: boolean[] } {
  const bb = calculateBollingerBands(candles, bbPeriod, mult);
  const atr = calculateATR(candles, kcPeriod);
  const ema = calculateEMA(candles, kcPeriod);

  const val: (number | null)[] = [];
  const squeezed: boolean[] = [];

  for (let i = 0; i < candles.length; i++) {
    const bbU = bb.upper[i], bbL = bb.lower[i];
    const a   = atr[i], e = ema[i];
    if (bbU === null || bbL === null || a === null || e === null) {
      val.push(null);
      squeezed.push(false);
      continue;
    }
    const kcU = e + mult * a;
    const kcL = e - mult * a;
    squeezed.push(bbU < kcU && bbL > kcL);

    // Linear regression value
    if (i < bbPeriod - 1) { val.push(null); continue; }
    const slice = candles.slice(i - bbPeriod + 1, i + 1);
    const highest = Math.max(...slice.map(c => c.h));
    const lowest  = Math.min(...slice.map(c => c.l));
    const smaSlice = slice.reduce((a2, c2) => a2 + c2.c, 0) / bbPeriod;
    const mid2     = (highest + lowest) / 2;
    const delta    = candles[i].c - (mid2 + smaSlice) / 2;

    // LinReg endpoint of (close - mid2) over bbPeriod, approximated with delta
    const n = bbPeriod;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < n; j++) {
      const x = j;
      const hSlice = Math.max(...candles.slice(i - n + 1, i + 1).map(c => c.h));
      const lSlice = Math.min(...candles.slice(i - n + 1, i + 1).map(c => c.l));
      const mSlice = candles.slice(i - n + 1, i + 1).reduce((acc, c2) => acc + c2.c, 0) / n;
      const y = candles[i - n + 1 + j].c - (((hSlice + lSlice) / 2) + mSlice) / 2;
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) { val.push(delta); continue; }
    const bCoef = (n * sumXY - sumX * sumY) / denom;
    const aCoef = (sumY - bCoef * sumX) / n;
    val.push(aCoef + bCoef * (n - 1));
  }
  return { val, squeezed };
}

/**
 * Relative Vigor Index (RVI)
 * Numerator uses symmetrically weighted (C-O) over 4 bars
 * Denominator uses symmetrically weighted (H-L) over 4 bars
 * Signal = 4-bar weighted average of RVI
 */
export function calculateRVI(
  candles: Candle[],
  period = 10
): { rvi: (number | null)[]; signal: (number | null)[] } {
  const rvi:    (number | null)[] = [];
  const signal: (number | null)[] = [];

  // weighted sum of 4-bar sequence: w = [1, 2, 2, 1] / 6
  const w4 = (arr: number[]): number => (arr[0] + 2 * arr[1] + 2 * arr[2] + arr[3]) / 6;

  const numArr: (number | null)[] = [];
  const denArr: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < 3) { numArr.push(null); denArr.push(null); continue; }
    const cs = [candles[i - 3], candles[i - 2], candles[i - 1], candles[i]];
    numArr.push(w4(cs.map(c => c.c - c.o)));
    denArr.push(w4(cs.map(c => c.h - c.l)));
  }

  // RVI = SMA(num, period) / SMA(den, period)
  for (let i = 0; i < candles.length; i++) {
    if (i < period + 2) { rvi.push(null); continue; }
    let sumN = 0, sumD = 0;
    let valid = true;
    for (let j = i - period + 1; j <= i; j++) {
      if (numArr[j] === null || denArr[j] === null) { valid = false; break; }
      sumN += numArr[j] as number;
      sumD += denArr[j] as number;
    }
    rvi.push(valid && sumD !== 0 ? sumN / sumD : null);
  }

  // Signal = 4-bar weighted average of RVI
  for (let i = 0; i < rvi.length; i++) {
    if (i < 3) { signal.push(null); continue; }
    const s = [rvi[i - 3], rvi[i - 2], rvi[i - 1], rvi[i]];
    if (s.some(v => v === null)) { signal.push(null); continue; }
    signal.push(w4(s as number[]));
  }

  return { rvi, signal };
}

/**
 * Percentage Price Oscillator (PPO)
 * PPO = (EMA(fast) - EMA(slow)) / EMA(slow) * 100
 * Signal = EMA(PPO, 9), Hist = PPO - Signal
 */
export function calculatePPO(
  candles: Candle[],
  fast = 12,
  slow = 26
): { ppo: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const fastEMA = calculateEMA(candles, fast);
  const slowEMA = calculateEMA(candles, slow);

  const ppo: (number | null)[] = fastEMA.map((f, i) => {
    const s = slowEMA[i];
    if (f === null || s === null || s === 0) return null;
    return (f - s) / s * 100;
  });

  const signalArr = emaOnArray(ppo, 9);

  const hist: (number | null)[] = ppo.map((p, i) => {
    const sig = signalArr[i];
    if (p === null || sig === null) return null;
    return p - sig;
  });

  return { ppo, signal: signalArr, hist };
}

/**
 * Bollinger Band %B
 * %B = (close - lower) / (upper - lower)
 */
export function calculateBBPctB(candles: Candle[], period = 20, stdDev = 2): (number | null)[] {
  const bb = calculateBollingerBands(candles, period, stdDev);
  return candles.map((c, i) => {
    const u = bb.upper[i], l = bb.lower[i];
    if (u === null || l === null || u === l) return null;
    return (c.c - l) / (u - l);
  });
}

/**
 * Bollinger Band Width
 * Width = (upper - lower) / middle
 */
export function calculateBBWidth(candles: Candle[], period = 20, stdDev = 2): (number | null)[] {
  const bb = calculateBollingerBands(candles, period, stdDev);
  return candles.map((_, i) => {
    const u = bb.upper[i], l = bb.lower[i], m = bb.middle[i];
    if (u === null || l === null || m === null || m === 0) return null;
    return (u - l) / m;
  });
}

/**
 * Coppock Curve
 * WMA(ROC(14) + ROC(11), 10)
 */
export function calculateCoppock(candles: Candle[]): (number | null)[] {
  const roc14 = candles.map((c, i) => {
    if (i < 14 || candles[i - 14].c === 0) return null;
    return (c.c - candles[i - 14].c) / candles[i - 14].c * 100;
  });
  const roc11 = candles.map((c, i) => {
    if (i < 11 || candles[i - 11].c === 0) return null;
    return (c.c - candles[i - 11].c) / candles[i - 11].c * 100;
  });

  const combined: (number | null)[] = roc14.map((r14, i) => {
    const r11 = roc11[i];
    if (r14 === null || r11 === null) return null;
    return r14 + r11;
  });

  return wmaOnArray(combined, 10);
}

/**
 * Balance of Power (BOP)
 * BOP = (close - open) / (high - low), smoothed with EMA(14)
 */
export function calculateBalanceOfPower(candles: Candle[]): (number | null)[] {
  const raw: (number | null)[] = candles.map(c => {
    const range = c.h - c.l;
    if (range === 0) return 0;
    return (c.c - c.o) / range;
  });
  return emaOnArray(raw, 14);
}

/**
 * Normalized RSI (centered at 0)
 * NormRSI = RSI - 50
 */
export function calculateNormRSI(candles: Candle[], period = 14): (number | null)[] {
  return calculateRSI(candles, period).map(v => v === null ? null : v - 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accumulation/Distribution Line (AD Line)
 * CLV = ((C-L)-(H-C))/(H-L)
 * AD  = cumulative sum of CLV*volume
 */
export function calculateADLine(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumAD = 0;
  for (const c of candles) {
    const range = c.h - c.l;
    const clv   = range === 0 ? 0 : ((c.c - c.l) - (c.h - c.c)) / range;
    cumAD += clv * c.v;
    result.push(cumAD);
  }
  return result;
}

/**
 * Chaikin Oscillator
 * EMA(AD, fast) - EMA(AD, slow)
 */
export function calculateChaikinOsc(candles: Candle[], fast = 3, slow = 10): (number | null)[] {
  const ad = calculateADLine(candles);
  const fastEMA = emaOnArray(ad, fast);
  const slowEMA = emaOnArray(ad, slow);
  return fastEMA.map((f, i) => {
    const s = slowEMA[i];
    if (f === null || s === null) return null;
    return f - s;
  });
}

/**
 * Price Volume Trend (PVT)
 * PVT(i) = PVT(i-1) + volume * (close - prevClose) / prevClose
 */
export function calculatePVT(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].c;
    if (prev === 0) { result.push(null); continue; }
    const pvt = (result[i - 1] as number) + candles[i].v * (candles[i].c - prev) / prev;
    result.push(pvt);
  }
  return result;
}

/**
 * Negative Volume Index (NVI)
 * If volume < prevVolume: NVI += (close-prevClose)/prevClose * NVI
 * else: NVI unchanged
 */
export function calculateNVI(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [1000]; // conventional seed
  for (let i = 1; i < candles.length; i++) {
    const prevNVI = result[i - 1] as number;
    const prevC   = candles[i - 1].c;
    if (candles[i].v < candles[i - 1].v && prevC !== 0) {
      result.push(prevNVI + prevNVI * (candles[i].c - prevC) / prevC);
    } else {
      result.push(prevNVI);
    }
  }
  return result;
}

/**
 * Positive Volume Index (PVI)
 * If volume > prevVolume: PVI += (close-prevClose)/prevClose * PVI
 * else: PVI unchanged
 */
export function calculatePVI(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [1000]; // conventional seed
  for (let i = 1; i < candles.length; i++) {
    const prevPVI = result[i - 1] as number;
    const prevC   = candles[i - 1].c;
    if (candles[i].v > candles[i - 1].v && prevC !== 0) {
      result.push(prevPVI + prevPVI * (candles[i].c - prevC) / prevC);
    } else {
      result.push(prevPVI);
    }
  }
  return result;
}

/**
 * Force Index
 * Raw = (close - prevClose) * volume, then EMA(Raw, period)
 */
export function calculateForceIndex(candles: Candle[], period = 13): (number | null)[] {
  const raw: (number | null)[] = [null];
  for (let i = 1; i < candles.length; i++) {
    raw.push((candles[i].c - candles[i - 1].c) * candles[i].v);
  }
  return emaOnArray(raw, period);
}

/**
 * Ease of Movement (EOM)
 * MidMove  = (H+L)/2 - (prevH+prevL)/2
 * BoxRatio = volume / 1e6 / (H-L)
 * EOM      = MidMove / BoxRatio, then SMA(period)
 */
export function calculateEOM(candles: Candle[], period = 14): (number | null)[] {
  const rawEOM: (number | null)[] = [null];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    const midMove  = (c.h + c.l) / 2 - (p.h + p.l) / 2;
    const hlRange  = c.h - c.l;
    if (hlRange === 0 || c.v === 0) { rawEOM.push(null); continue; }
    const boxRatio = (c.v / 1e6) / hlRange;
    rawEOM.push(midMove / boxRatio);
  }
  return smaOnArray(rawEOM, period);
}

/**
 * Volume-Weighted Moving Average (VWMA)
 * sum(close*volume, n) / sum(volume, n)
 */
export function calculateVWMA(candles: Candle[], period = 20): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sumCV = 0, sumV = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumCV += candles[j].c * candles[j].v;
      sumV  += candles[j].v;
    }
    result.push(sumV === 0 ? null : sumCV / sumV);
  }
  return result;
}

/**
 * Volume RSI
 * Apply RSI formula to volume changes (up-volume vs down-volume).
 */
export function calculateVolumeRSI(candles: Candle[], period = 14): (number | null)[] {
  if (candles.length < period + 1) return Array(candles.length).fill(null);

  const volChanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    volChanges.push(candles[i].v - candles[i - 1].v);
  }

  const gains  = volChanges.map(d => d > 0 ? d : 0);
  const losses = volChanges.map(d => d < 0 ? -d : 0);

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const result: (number | null)[] = Array(period + 1).fill(null);
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0);

  for (let i = period; i < volChanges.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs));
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLATILITY INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Historical Volatility (HV)
 * Log returns: ln(close/prevClose)
 * StdDev of log returns over period * sqrt(252) * 100
 */
export function calculateHV(candles: Candle[], period = 20): (number | null)[] {
  const logRet: (number | null)[] = [null];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].c;
    logRet.push(prev <= 0 ? null : Math.log(candles[i].c / prev));
  }

  const result: (number | null)[] = [];
  for (let i = 0; i < logRet.length; i++) {
    if (i < period) { result.push(null); continue; }
    const slice = logRet.slice(i - period + 1, i + 1);
    if (slice.some(v => v === null)) { result.push(null); continue; }
    const nums = slice as number[];
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (period - 1);
    result.push(Math.sqrt(variance) * Math.sqrt(252) * 100);
  }
  return result;
}

/**
 * ATR Percent (ATR as % of close)
 * ATR(period) / close * 100
 */
export function calculateATRPct(candles: Candle[], period = 14): (number | null)[] {
  const atr = calculateATR(candles, period);
  return candles.map((c, i) => {
    const a = atr[i];
    if (a === null || c.c === 0) return null;
    return a / c.c * 100;
  });
}

/**
 * Chaikin Volatility
 * EMA of (H-L), then ROC of that EMA over period
 */
export function calculateChaikinVol(candles: Candle[], period = 10): (number | null)[] {
  const hlCandles = candles.map(c => ({ ...c, c: c.h - c.l }));
  const emaHL = calculateEMA(hlCandles as Candle[], period);
  return rocOnArray(emaHL, period);
}

/**
 * Standard Deviation Oscillator
 * Rolling StdDev of close over `period`
 */
export function calculateStdDevOsc(candles: Candle[], period = 20): (number | null)[] {
  return rollingStdDev(candles, period);
}

/**
 * Ulcer Index
 * MaxClose over period, Drawdown% = (close-MaxClose)/MaxClose*100
 * UI = sqrt(sum(Drawdown%^2, period) / period)
 */
export function calculateUlcerIndex(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = candles.slice(i - period + 1, i + 1);
    const maxC  = Math.max(...slice.map(c => c.c));
    const sumSq = slice.reduce((acc, c) => {
      const dd = maxC === 0 ? 0 : (c.c - maxC) / maxC * 100;
      return acc + dd * dd;
    }, 0);
    result.push(Math.sqrt(sumSq / period));
  }
  return result;
}

/**
 * Know Sure Thing (KST)
 * KST    = SMA(ROC(10),10) + 2*SMA(ROC(15),10) + 3*SMA(ROC(20),10) + 4*SMA(ROC(30),15)
 * Signal = SMA(KST, 9)
 */
export function calculateKST(
  candles: Candle[]
): { kst: (number | null)[]; signal: (number | null)[] } {
  // ROC variants
  const roc10 = candles.map((c, i) => {
    if (i < 10 || candles[i - 10].c === 0) return null;
    return (c.c - candles[i - 10].c) / candles[i - 10].c * 100;
  });
  const roc15 = candles.map((c, i) => {
    if (i < 15 || candles[i - 15].c === 0) return null;
    return (c.c - candles[i - 15].c) / candles[i - 15].c * 100;
  });
  const roc20 = candles.map((c, i) => {
    if (i < 20 || candles[i - 20].c === 0) return null;
    return (c.c - candles[i - 20].c) / candles[i - 20].c * 100;
  });
  const roc30 = candles.map((c, i) => {
    if (i < 30 || candles[i - 30].c === 0) return null;
    return (c.c - candles[i - 30].c) / candles[i - 30].c * 100;
  });

  const smaR10 = smaOnArray(roc10, 10);
  const smaR15 = smaOnArray(roc15, 10);
  const smaR20 = smaOnArray(roc20, 10);
  const smaR30 = smaOnArray(roc30, 15);

  const kst: (number | null)[] = smaR10.map((s10, i) => {
    const s15 = smaR15[i], s20 = smaR20[i], s30 = smaR30[i];
    if (s10 === null || s15 === null || s20 === null || s30 === null) return null;
    return s10 + 2 * s15 + 3 * s20 + 4 * s30;
  });

  const signal = smaOnArray(kst, 9);
  return { kst, signal };
}

/**
 * Quantitative Qualitative Estimation (QQE)
 * RSI smoothed with SMMA → QQE line
 * ATR-like smoothing of RSI used for signal band
 */
export function calculateQQE(
  candles: Candle[],
  rsiPeriod = 14,
  smoothFactor = 5
): { qqe: (number | null)[]; signal: (number | null)[] } {
  const rsi = calculateRSI(candles, rsiPeriod);

  // Smooth RSI with SMMA
  const smoothedRSI = smmaOnArray(rsi, smoothFactor);

  // Wilders smoothing constant for ATR of RSI
  const wildersK = 2 / (rsiPeriod * 2 + 1);

  const atrRSI: (number | null)[] = [null];
  for (let i = 1; i < smoothedRSI.length; i++) {
    const curr = smoothedRSI[i], prev = smoothedRSI[i - 1];
    if (curr === null || prev === null) { atrRSI.push(null); continue; }
    const diff = Math.abs(curr - prev);
    const prevATR = atrRSI[i - 1];
    atrRSI.push(prevATR === null ? diff : prevATR * (1 - wildersK) + diff * wildersK);
  }

  // Signal band = smoothedRSI ± atrRSI * 4.236
  const qqeFactor = 4.236;
  const signal: (number | null)[] = smoothedRSI.map((sr, i) => {
    const a = atrRSI[i];
    if (sr === null || a === null) return null;
    return sr > 50 ? sr - a * qqeFactor : sr + a * qqeFactor;
  });

  return { qqe: smoothedRSI, signal };
}
