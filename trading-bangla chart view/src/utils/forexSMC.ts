/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Candle } from '../types';

export interface OrderBlockZone {
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  startIndex: number;
  endIndex: number;
  mitigated: boolean;
}
export interface FVGZone {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  startIndex: number;
  filled: boolean;
}
export interface StructureBreak {
  type: 'BOS' | 'CHoCH';
  direction: 'bullish' | 'bearish';
  price: number;
  index: number;
}
export interface SMCData {
  orderBlocks: OrderBlockZone[];
  fvgZones: FVGZone[];
  structureBreaks: StructureBreak[];
  bias: 'bullish' | 'bearish' | 'neutral';
}

function swingHighs(candles: Candle[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    if (
      candles.slice(i - lookback, i).every(c => c.h <= candles[i].h) &&
      candles.slice(i + 1, i + lookback + 1).every(c => c.h <= candles[i].h)
    ) indices.push(i);
  }
  return indices;
}

function swingLows(candles: Candle[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    if (
      candles.slice(i - lookback, i).every(c => c.l >= candles[i].l) &&
      candles.slice(i + 1, i + lookback + 1).every(c => c.l >= candles[i].l)
    ) indices.push(i);
  }
  return indices;
}

export function detectSMC(candles: Candle[], offset = 0): SMCData {
  if (candles.length < 15) {
    return { orderBlocks: [], fvgZones: [], structureBreaks: [], bias: 'neutral' };
  }
  const lastPrice = candles[candles.length - 1].c;
  const orderBlocks: OrderBlockZone[] = [];

  for (let i = 1; i < candles.length - 3; i++) {
    const c = candles[i];
    const body = Math.abs(c.c - c.o);
    const rng = c.h - c.l;
    if (rng === 0 || body / rng < 0.4) continue;

    if (c.c < c.o) {
      let impulse = false;
      for (let j = i + 1; j < Math.min(i + 5, candles.length); j++) {
        if (candles[j].c > c.h) { impulse = true; break; }
      }
      if (impulse) orderBlocks.push({
        type: 'bearish', high: c.h, low: c.o,
        startIndex: offset + i - 2, endIndex: offset + i + 10,
        mitigated: lastPrice >= c.o && lastPrice <= c.h,
      });
    }

    if (c.c > c.o) {
      let impulse = false;
      for (let j = i + 1; j < Math.min(i + 5, candles.length); j++) {
        if (candles[j].c < c.l) { impulse = true; break; }
      }
      if (impulse) orderBlocks.push({
        type: 'bullish', high: c.c, low: c.l,
        startIndex: offset + i - 2, endIndex: offset + i + 10,
        mitigated: lastPrice >= c.l && lastPrice <= c.c,
      });
    }
  }

  const fvgZones: FVGZone[] = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const a = candles[i - 1];
    const c = candles[i + 1];
    if (c.l > a.h) fvgZones.push({ type: 'bullish', top: c.l, bottom: a.h, startIndex: offset + i - 1, filled: lastPrice <= a.h });
    if (c.h < a.l) fvgZones.push({ type: 'bearish', top: a.l, bottom: c.h, startIndex: offset + i - 1, filled: lastPrice >= a.l });
  }

  const structureBreaks: StructureBreak[] = [];
  const highs = swingHighs(candles, 3);
  const lows = swingLows(candles, 3);
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let lastHighBreak = -1, lastLowBreak = -1;

  for (let i = 5; i < candles.length; i++) {
    const recentHighs = highs.filter(h => h < i - 2);
    if (recentHighs.length > 0) {
      const lastH = recentHighs[recentHighs.length - 1];
      if (candles[i].c > candles[lastH].h && lastH !== lastHighBreak) {
        structureBreaks.push({ type: trend === 'bearish' ? 'CHoCH' : 'BOS', direction: 'bullish', price: candles[lastH].h, index: offset + i });
        trend = 'bullish'; lastHighBreak = lastH;
      }
    }
    const recentLows = lows.filter(l => l < i - 2);
    if (recentLows.length > 0) {
      const lastL = recentLows[recentLows.length - 1];
      if (candles[i].c < candles[lastL].l && lastL !== lastLowBreak) {
        structureBreaks.push({ type: trend === 'bullish' ? 'CHoCH' : 'BOS', direction: 'bearish', price: candles[lastL].l, index: offset + i });
        trend = 'bearish'; lastLowBreak = lastL;
      }
    }
  }

  const lastBreak = structureBreaks[structureBreaks.length - 1];
  return {
    orderBlocks: orderBlocks.slice(-6),
    fvgZones: fvgZones.slice(-5),
    structureBreaks: structureBreaks.slice(-4),
    bias: lastBreak ? lastBreak.direction : 'neutral',
  };
}