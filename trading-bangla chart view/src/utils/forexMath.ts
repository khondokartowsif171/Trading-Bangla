/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle } from '../types';

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].c;
    }
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length === 0) return result;

  const k = 2 / (period + 1);
  let prevEma = candles[0].c;
  result.push(prevEma);

  for (let i = 1; i < candles.length; i++) {
    const curEma = candles[i].c * k + prevEma * (1 - k);
    result.push(curEma);
    prevEma = curEma;
  }

  // Nullify initial pads for visual elegance if needed
  for (let i = 0; i < Math.min(period - 1, candles.length); i++) {
    result[i] = null;
  }

  return result;
}

/**
 * Calculates Bollinger Bands (Upper, Lower, Middle SMA)
 */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2
): { upper: (number | null)[]; lower: (number | null)[]; middle: (number | null)[] } {
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

    // SMA Middle
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].c;
    }
    const midValue = sum / period;
    middle.push(midValue);

    // Std Dev
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].c - midValue, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    upper.push(midValue + stdDevMultiplier * stdDev);
    lower.push(midValue - stdDevMultiplier * stdDev);
  }

  return { upper, lower, middle };
}

/**
 * Calculates Relative Strength Index (RSI) using Wilder's original smoothing
 */
export function calculateRSI(candles: Candle[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = [];
  if (candles.length < period) {
    return Array(candles.length).fill(50);
  }

  // Track gains & losses
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].c - candles[i - 1].c;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First values averages
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  // Fill in the first initial (period) index as null or 50
  for (let i = 0; i <= period; i++) {
    rsi.push(null);
  }

  const initialRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + initialRs);

  // Wilder's Smoothing
  for (let i = period; i < candles.length - 1; i++) {
    const gain = gains[i];
    const loss = losses[i];

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const value = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsi.push(value);
  }

  return rsi;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const macd: (number | null)[] = [];
  const signal: (number | null)[] = [];
  const hist: (number | null)[] = [];

  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  // Core MACD line = Fast EMA - Slow EMA
  for (let i = 0; i < candles.length; i++) {
    const fVal = fastEma[i];
    const sVal = slowEma[i];
    if (fVal === null || sVal === null) {
      macd.push(null);
    } else {
      macd.push(fVal - sVal);
    }
  }

  // Signal Line = EMA(MACD Line, signalPeriod)
  // Fill in non-null items in macd
  const validMacdIndexes = macd.map((val, idx) => ({ val, idx })).filter(item => item.val !== null) as { val: number; idx: number }[];
  if (validMacdIndexes.length < signalPeriod) {
    return {
      macd: Array(candles.length).fill(0),
      signal: Array(candles.length).fill(0),
      hist: Array(candles.length).fill(0),
    };
  }

  const k = 2 / (signalPeriod + 1);
  let prevSignal = validMacdIndexes[0].val;

  const signalLineFilled: (number | null)[] = Array(candles.length).fill(null);
  signalLineFilled[validMacdIndexes[0].idx] = prevSignal;

  for (let i = 1; i < validMacdIndexes.length; i++) {
    const { val, idx } = validMacdIndexes[i];
    const curSignal = val * k + prevSignal * (1 - k);
    signalLineFilled[idx] = curSignal;
    prevSignal = curSignal;
  }

  // Nullify initial pads for signal
  const firstTriggerIndex = validMacdIndexes[0].idx + signalPeriod - 1;
  for (let i = 0; i < firstTriggerIndex; i++) {
    signalLineFilled[i] = null;
  }

  // Histogram = MACD - Signal
  for (let i = 0; i < candles.length; i++) {
    const mVal = macd[i];
    const sVal = signalLineFilled[i];
    if (mVal === null || sVal === null) {
      signal.push(null);
      hist.push(null);
    } else {
      signal.push(sVal);
      hist.push(mVal - sVal);
    }
  }

  return { macd, signal, hist };
}

/**
 * Converts standard OHLC candlesticks into Heikin Ashi values
 */
export function convertToHeikinAshi(candles: Candle[]): Candle[] {
  const haCandles: Candle[] = [];
  if (candles.length === 0) return haCandles;

  // First HA candle is average of original values
  let prevOpen = candles[0].o;
  let prevClose = candles[0].c;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.o + c.h + c.l + c.c) / 4;
    const haOpen = i === 0 ? (prevOpen + prevClose) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.h, haOpen, haClose);
    const haLow = Math.min(c.l, haOpen, haClose);

    haCandles.push({
      t: c.t,
      o: haOpen,
      h: haHigh,
      l: haLow,
      c: haClose,
      v: c.v,
    });

    prevOpen = haOpen;
    prevClose = haClose;
  }

  return haCandles;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period = 14): (number | null)[] {
  const atr: (number | null)[] = [null];
  if (candles.length < 2) return Array(candles.length).fill(null);

  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].h - candles[i].l;
    const hpc = Math.abs(candles[i].h - candles[i - 1].c);
    const lpc = Math.abs(candles[i].l - candles[i - 1].c);
    tr.push(Math.max(hl, hpc, lpc));
  }

  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) { atr.push(null); continue; }
    if (i === period - 1) {
      atr.push(tr.slice(0, period).reduce((a, b) => a + b, 0) / period);
    } else {
      atr.push(((atr[atr.length - 1] as number) * (period - 1) + tr[i]) / period);
    }
  }
  return atr;
}

/**
 * Calculates SuperTrend indicator
 */
export function calculateSuperTrend(
  candles: Candle[],
  period = 10,
  multiplier = 3
): { value: (number | null)[]; direction: (boolean | null)[] } {
  const atr = calculateATR(candles, period);
  const value: (number | null)[] = [];
  const direction: (boolean | null)[] = [];
  let prevUpper = 0, prevLower = 0, prevDir = true;

  for (let i = 0; i < candles.length; i++) {
    const a = atr[i];
    if (a === null) { value.push(null); direction.push(null); continue; }
    const hl2 = (candles[i].h + candles[i].l) / 2;
    const rawUpper = hl2 + multiplier * a;
    const rawLower = hl2 - multiplier * a;
    const finalUpper = i === 0 ? rawUpper : (rawUpper < prevUpper || candles[i - 1].c > prevUpper ? rawUpper : prevUpper);
    const finalLower = i === 0 ? rawLower : (rawLower > prevLower || candles[i - 1].c < prevLower ? rawLower : prevLower);
    let dir = prevDir;
    if (i > 0) {
      if (!prevDir && candles[i].c > prevUpper) dir = true;
      else if (prevDir && candles[i].c < prevLower) dir = false;
    }
    value.push(dir ? finalLower : finalUpper);
    direction.push(dir);
    prevUpper = finalUpper;
    prevLower = finalLower;
    prevDir = dir;
  }
  return { value, direction };
}

/**
 * Calculates Stochastic Oscillator (%K and %D)
 */
export function calculateStochastic(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const k: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) { k.push(null); continue; }
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map(c => c.h));
    const lowest = Math.min(...slice.map(c => c.l));
    const rng = highest - lowest;
    k.push(rng === 0 ? 50 : ((candles[i].c - lowest) / rng) * 100);
  }
  const d: (number | null)[] = [];
  for (let i = 0; i < k.length; i++) {
    if (k[i] === null) { d.push(null); continue; }
    const slice = k.slice(Math.max(0, i - dPeriod + 1), i + 1).filter(v => v !== null) as number[];
    d.push(slice.length < dPeriod ? null : slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return { k, d };
}

/**
 * Calculates Weighted Moving Average (WMA)
 */
export function calculateWMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const weightSum = (period * (period + 1)) / 2;
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let wSum = 0;
    for (let j = 0; j < period; j++) wSum += candles[i - j].c * (period - j);
    result.push(wSum / weightSum);
  }
  return result;
}

/**
 * Calculates Volume-Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumPV = 0, cumV = 0;
  for (const c of candles) {
    const tp = (c.h + c.l + c.c) / 3;
    cumPV += tp * c.v;
    cumV += c.v;
    result.push(cumV === 0 ? null : cumPV / cumV);
  }
  return result;
}

/**
 * Calculates Commodity Channel Index (CCI)
 */
export function calculateCCI(candles: Candle[], period = 20): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = candles.slice(i - period + 1, i + 1);
    const tp = slice.map(c => (c.h + c.l + c.c) / 3);
    const meanTp = tp.reduce((a, b) => a + b, 0) / period;
    const meanDev = tp.reduce((a, b) => a + Math.abs(b - meanTp), 0) / period;
    result.push(meanDev === 0 ? 0 : (tp[tp.length - 1] - meanTp) / (0.015 * meanDev));
  }
  return result;
}

/**
 * Parses arbitrary timeframe strings into minutes.
 * Supports standard codes (e.g. M1, M5, H1, H4, D1) as well as custom
 * expressions (e.g. "3m", "3 minutes", "2 hours", "daily", "2h", "1d").
 */
export function parseTimeframeToMinutes(tf: string): number {
  if (!tf) return 1;
  const s = tf.trim().toLowerCase();

  // Common verbose names
  if (s === 'daily' || s === 'day' || s === 'd1' || s === '1d') return 24 * 60;
  if (s === 'weekly' || s === 'week' || s === 'w1' || s === '1w') return 7 * 24 * 60;
  if (s === 'monthly' || s === 'month' || s === 'mn' || s === '1mn') return 30 * 24 * 60;

  // Pattern A: matches letters then digits (e.g., m5, h2, d3)
  const matchA = s.match(/^([a-z]+)\s*(\d+)$/);
  if (matchA) {
    const unit = matchA[1];
    const val = parseInt(matchA[2], 10);
    if (unit.startsWith('m') && !unit.startsWith('mo')) return val; // minutes
    if (unit.startsWith('h')) return val * 60; // hours
    if (unit.startsWith('d')) return val * 24 * 60; // days
    if (unit.startsWith('w')) return val * 7 * 24 * 60; // weeks
    if (unit.startsWith('mo') || unit === 'mn') return val * 30 * 24 * 60; // months
  }

  // Pattern B: matches digits then letters (e.g., 3m, 2h, 15min, 10hours)
  const matchB = s.match(/^(\d+)\s*([a-z]*)$/);
  if (matchB) {
    const val = parseInt(matchB[1], 10);
    const unit = matchB[2];
    if (!unit || (unit.startsWith('m') && !unit.startsWith('mo'))) return val; // default is minutes
    if (unit.startsWith('h')) return val * 60;
    if (unit.startsWith('d')) return val * 24 * 60;
    if (unit.startsWith('w')) return val * 7 * 24 * 60;
    if (unit.startsWith('mo') || unit === 'mn') return val * 30 * 24 * 60;
  }

  // Fallback check if it's just a number
  const valOnly = parseInt(s, 10);
  if (!isNaN(valOnly) && valOnly > 0) {
    return valOnly;
  }

  return 1; // Default fallback to M1
}

// ── Parabolic SAR ─────────────────────────────────────────────────────────
export function calculateParabolicSAR(
  candles: Candle[],
  step = 0.02,
  max = 0.2
): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < 2) return result;

  let bull = true;
  let sar = candles[0].l;
  let ep = candles[0].h;
  let af = step;

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];

    if (bull) {
      sar = sar + af * (ep - sar);
      sar = Math.min(sar, prev.l, i >= 2 ? candles[i - 2].l : prev.l);
      if (cur.l < sar) {
        bull = false;
        sar = ep;
        ep = cur.l;
        af = step;
      } else {
        if (cur.h > ep) { ep = cur.h; af = Math.min(af + step, max); }
      }
    } else {
      sar = sar + af * (ep - sar);
      sar = Math.max(sar, prev.h, i >= 2 ? candles[i - 2].h : prev.h);
      if (cur.h > sar) {
        bull = true;
        sar = ep;
        ep = cur.h;
        af = step;
      } else {
        if (cur.l < ep) { ep = cur.l; af = Math.min(af + step, max); }
      }
    }
    result[i] = sar;
  }
  return result;
}

// ── ADX / DMI ─────────────────────────────────────────────────────────────
export function calculateADX(
  candles: Candle[],
  period = 14
): { adx: (number | null)[]; diPlus: (number | null)[]; diMinus: (number | null)[] } {
  const len = candles.length;
  const adx: (number | null)[] = new Array(len).fill(null);
  const diPlus: (number | null)[] = new Array(len).fill(null);
  const diMinus: (number | null)[] = new Array(len).fill(null);
  if (len < period * 2) return { adx, diPlus, diMinus };

  const tr: number[] = [0];
  const dmPlus: number[] = [0];
  const dmMinus: number[] = [0];

  for (let i = 1; i < len; i++) {
    const c = candles[i], p = candles[i - 1];
    tr.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
    const upMove = c.h - p.h;
    const downMove = p.l - c.l;
    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Wilder smoothing
  let atr = tr.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let smoothPlus = dmPlus.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let smoothMinus = dmMinus.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let dx: number[] = [];

  for (let i = period; i < len; i++) {
    if (i > period) {
      atr = atr - atr / period + tr[i];
      smoothPlus = smoothPlus - smoothPlus / period + dmPlus[i];
      smoothMinus = smoothMinus - smoothMinus / period + dmMinus[i];
    }
    const dip = atr > 0 ? (smoothPlus / atr) * 100 : 0;
    const dim = atr > 0 ? (smoothMinus / atr) * 100 : 0;
    diPlus[i] = dip;
    diMinus[i] = dim;
    const dxVal = dip + dim > 0 ? (Math.abs(dip - dim) / (dip + dim)) * 100 : 0;
    dx.push(dxVal);
  }

  // ADX = smoothed DX
  if (dx.length >= period) {
    let adxVal = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
    adx[period * 2 - 1] = adxVal;
    for (let i = period; i < dx.length; i++) {
      adxVal = (adxVal * (period - 1) + dx[i]) / period;
      adx[period + i] = adxVal;
    }
  }
  return { adx, diPlus, diMinus };
}

// ── Williams %R ───────────────────────────────────────────────────────────
export function calculateWilliamsR(
  candles: Candle[],
  period = 14
): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    const slice = candles.slice(i - period + 1, i + 1);
    const hh = Math.max(...slice.map(c => c.h));
    const ll = Math.min(...slice.map(c => c.l));
    return hh === ll ? -50 : ((hh - candles[i].c) / (hh - ll)) * -100;
  });
}

// ── Pivot Points ──────────────────────────────────────────────────────────
export interface PivotPoints {
  pp: number; r1: number; r2: number; r3: number;
  s1: number; s2: number; s3: number;
}
export function calculatePivotPoints(candles: Candle[]): PivotPoints | null {
  if (candles.length < 2) return null;
  const c = candles[candles.length - 2]; // use last CLOSED candle
  const pp = (c.h + c.l + c.c) / 3;
  return {
    pp,
    r1: 2 * pp - c.l,
    r2: pp + (c.h - c.l),
    r3: c.h + 2 * (pp - c.l),
    s1: 2 * pp - c.h,
    s2: pp - (c.h - c.l),
    s3: c.l - 2 * (c.h - pp),
  };
}

// ── Keltner Channel ───────────────────────────────────────────────────────
export function calculateKeltnerChannel(
  candles: Candle[],
  period = 20,
  multiplier = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const ema = calculateEMA(candles, period);
  const atr = calculateATR(candles, period);
  return {
    upper: ema.map((e, i) => e != null && atr[i] != null ? e + multiplier * atr[i]! : null),
    middle: ema,
    lower: ema.map((e, i) => e != null && atr[i] != null ? e - multiplier * atr[i]! : null),
  };
}

// ── OBV (On Balance Volume) ───────────────────────────────────────────────
export function calculateOBV(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const prev = result[i - 1] as number;
    const dir = candles[i].c > candles[i - 1].c ? 1 : candles[i].c < candles[i - 1].c ? -1 : 0;
    result.push(prev + dir * candles[i].v);
  }
  return result;
}

// ── Momentum ──────────────────────────────────────────────────────────────
export function calculateMomentum(candles: Candle[], period = 10): (number | null)[] {
  return candles.map((c, i) => i < period ? null : c.c - candles[i - period].c);
}

// ── Rate of Change ────────────────────────────────────────────────────────
export function calculateROC(candles: Candle[], period = 12): (number | null)[] {
  return candles.map((c, i) => {
    if (i < period || candles[i - period].c === 0) return null;
    return ((c.c - candles[i - period].c) / candles[i - period].c) * 100;
  });
}

// ── Awesome Oscillator ────────────────────────────────────────────────────
export function calculateAO(candles: Candle[]): (number | null)[] {
  const mid = candles.map(c => (c.h + c.l) / 2);
  const sma5 = mid.map((_, i) => {
    if (i < 4) return null;
    return mid.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5;
  });
  const sma34 = mid.map((_, i) => {
    if (i < 33) return null;
    return mid.slice(i - 33, i + 1).reduce((a, b) => a + b, 0) / 34;
  });
  return sma5.map((s5, i) => s5 != null && sma34[i] != null ? s5 - sma34[i]! : null);
}

