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

