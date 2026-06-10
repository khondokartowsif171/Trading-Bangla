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
  fillPct: number; // 0–100: how much of the gap has been re-entered by price
}

export interface StructureBreak {
  type: 'BOS' | 'CHoCH';
  direction: 'bullish' | 'bearish';
  price: number;
  index: number;
}

export interface LiquidityLevel {
  type: 'BSL' | 'SSL'; // Buy-Side Liquidity (equal highs) | Sell-Side Liquidity (equal lows)
  price: number;
  count: number;       // number of touches in cluster
  startIndex: number;
  swept: boolean;      // true if price has crossed through this level
}

export interface PDZone {
  swingHigh: number;
  swingLow: number;
  premium: number;      // 75% of range
  equilibrium: number;  // 50% midpoint
  discount: number;     // 25% of range
  bias: 'bullish' | 'bearish' | 'neutral';
}

export interface SRLevel {
  type: 'support' | 'resistance';
  price: number;
  strength: number; // 1–5 (touch count)
  index: number;    // most recent touch (absolute)
  broken: boolean;  // price has closed beyond this level
}

export interface SDZone {
  type: 'supply' | 'demand';
  high: number;
  low: number;
  startIndex: number;
  tested: boolean; // price has re-entered the zone
}

export interface SMCData {
  orderBlocks: OrderBlockZone[];
  fvgZones: FVGZone[];
  structureBreaks: StructureBreak[];
  liquidityLevels: LiquidityLevel[];
  pdZone: PDZone | null;
  srLevels: SRLevel[];
  sdZones: SDZone[];
  bias: 'bullish' | 'bearish' | 'neutral';
}

function swingHighs(candles: Candle[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    if (
      candles.slice(i - lookback, i).every(c => c.h <= candles[i].h) &&
      candles.slice(i + 1, i + lookback + 1).every(c => c.h <= candles[i].h)
    ) {
      indices.push(i);
    }
  }
  return indices;
}

function swingLows(candles: Candle[], lookback = 3): number[] {
  const indices: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    if (
      candles.slice(i - lookback, i).every(c => c.l >= candles[i].l) &&
      candles.slice(i + 1, i + lookback + 1).every(c => c.l >= candles[i].l)
    ) {
      indices.push(i);
    }
  }
  return indices;
}

function clamp(min: number, max: number, val: number): number {
  return Math.min(max, Math.max(min, val));
}

function detectLiquidity(candles: Candle[], lastPrice: number, offset = 0, tolerance = 0.001): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const highs = swingHighs(candles, 3);
  const lows = swingLows(candles, 3);

  // Cluster equal highs → Buy-Side Liquidity
  const usedHighs = new Set<number>();
  for (let i = 0; i < highs.length; i++) {
    if (usedHighs.has(i)) continue;
    const price = candles[highs[i]].h;
    const cluster = [highs[i]];
    for (let j = i + 1; j < highs.length; j++) {
      if (usedHighs.has(j)) continue;
      if (Math.abs(candles[highs[j]].h - price) / price <= tolerance) {
        cluster.push(highs[j]);
        usedHighs.add(j);
      }
    }
    if (cluster.length >= 2) {
      const avgPrice = cluster.reduce((s, idx) => s + candles[idx].h, 0) / cluster.length;
      levels.push({
        type: 'BSL',
        price: avgPrice,
        count: cluster.length,
        startIndex: offset + cluster[0],
        swept: lastPrice > avgPrice,
      });
    }
    usedHighs.add(i);
  }

  // Cluster equal lows → Sell-Side Liquidity
  const usedLows = new Set<number>();
  for (let i = 0; i < lows.length; i++) {
    if (usedLows.has(i)) continue;
    const price = candles[lows[i]].l;
    const cluster = [lows[i]];
    for (let j = i + 1; j < lows.length; j++) {
      if (usedLows.has(j)) continue;
      if (Math.abs(candles[lows[j]].l - price) / price <= tolerance) {
        cluster.push(lows[j]);
        usedLows.add(j);
      }
    }
    if (cluster.length >= 2) {
      const avgPrice = cluster.reduce((s, idx) => s + candles[idx].l, 0) / cluster.length;
      levels.push({
        type: 'SSL',
        price: avgPrice,
        count: cluster.length,
        startIndex: offset + cluster[0],
        swept: lastPrice < avgPrice,
      });
    }
    usedLows.add(i);
  }

  // Return up to 6 most recent levels
  return levels.sort((a, b) => b.startIndex - a.startIndex).slice(0, 6);
}

function detectPDZone(candles: Candle[], lastPrice: number): PDZone | null {
  const highs = swingHighs(candles, 5);
  const lows = swingLows(candles, 5);
  if (highs.length === 0 || lows.length === 0) return null;

  const lastHighIdx = highs[highs.length - 1];
  const lastLowIdx = lows[lows.length - 1];
  const swingHigh = candles[lastHighIdx].h;
  const swingLow = candles[lastLowIdx].l;
  if (swingHigh <= swingLow) return null;

  const range = swingHigh - swingLow;
  const equilibrium = swingLow + range * 0.5;
  const premium = swingLow + range * 0.75;
  const discount = swingLow + range * 0.25;

  return {
    swingHigh,
    swingLow,
    premium,
    equilibrium,
    discount,
    bias: lastPrice < equilibrium ? 'bullish' : lastPrice > equilibrium ? 'bearish' : 'neutral',
  };
}

function detectSR(candles: Candle[], lastPrice: number, offset = 0, tolerance = 0.002): SRLevel[] {
  const levels: SRLevel[] = [];
  const highs = swingHighs(candles, 3);
  const lows = swingLows(candles, 3);

  // Cluster swing highs → resistance/support levels
  const usedHighs = new Set<number>();
  for (let i = 0; i < highs.length; i++) {
    if (usedHighs.has(i)) continue;
    const basePrice = candles[highs[i]].h;
    const touches = [highs[i]];
    for (let j = i + 1; j < highs.length; j++) {
      if (usedHighs.has(j)) continue;
      if (Math.abs(candles[highs[j]].h - basePrice) / basePrice <= tolerance) {
        touches.push(highs[j]);
        usedHighs.add(j);
      }
    }
    usedHighs.add(i);
    const price = touches.reduce((s, idx) => s + candles[idx].h, 0) / touches.length;
    const lastIdx = touches[touches.length - 1];
    const broken = lastPrice > price * (1 + tolerance);
    levels.push({
      type: price > lastPrice ? 'resistance' : 'support',
      price,
      strength: Math.min(5, touches.length),
      index: offset + lastIdx,
      broken,
    });
  }

  // Cluster swing lows → support/resistance levels
  const usedLows = new Set<number>();
  for (let i = 0; i < lows.length; i++) {
    if (usedLows.has(i)) continue;
    const basePrice = candles[lows[i]].l;
    const touches = [lows[i]];
    for (let j = i + 1; j < lows.length; j++) {
      if (usedLows.has(j)) continue;
      if (Math.abs(candles[lows[j]].l - basePrice) / basePrice <= tolerance) {
        touches.push(lows[j]);
        usedLows.add(j);
      }
    }
    usedLows.add(i);
    const price = touches.reduce((s, idx) => s + candles[idx].l, 0) / touches.length;
    const lastIdx = touches[touches.length - 1];
    const broken = lastPrice < price * (1 - tolerance);
    levels.push({
      type: price < lastPrice ? 'support' : 'resistance',
      price,
      strength: Math.min(5, touches.length),
      index: offset + lastIdx,
      broken,
    });
  }

  // Sort by recency, return up to 12 levels
  return levels.sort((a, b) => b.index - a.index).slice(0, 12);
}

function detectSD(candles: Candle[], offset = 0): SDZone[] {
  const zones: SDZone[] = [];
  if (candles.length < 10) return zones;

  // Average candle range for impulse comparison
  const avgRange = candles.slice(-30).reduce((s, c) => s + (c.h - c.l), 0) / Math.min(30, candles.length);

  for (let i = 1; i < candles.length - 2; i++) {
    const base = candles[i];
    const baseRange = base.h - base.l;
    const baseBody = Math.abs(base.c - base.o);

    // Base must be a small-range consolidation candle (indecision / inside bar)
    if (baseRange === 0 || baseBody / baseRange > 0.55) continue;
    if (baseRange > avgRange * 0.8) continue; // too large to be a base

    const impulse = candles[i + 1];
    const impBody = Math.abs(impulse.c - impulse.o);
    const impRange = impulse.h - impulse.l;
    if (impRange === 0 || impBody / impRange < 0.55) continue;
    if (impRange < avgRange * 1.3) continue; // impulse must be strong

    const tested = candles.slice(i + 2);

    if (impulse.c < impulse.o) {
      // Bearish impulse after base → Supply zone
      const wasRetested = tested.some(c => c.h >= base.l && c.l <= base.h);
      zones.push({
        type: 'supply',
        high: base.h,
        low: base.l,
        startIndex: offset + i,
        tested: wasRetested,
      });
    } else {
      // Bullish impulse after base → Demand zone
      const wasRetested = tested.some(c => c.l <= base.h && c.h >= base.l);
      zones.push({
        type: 'demand',
        high: base.h,
        low: base.l,
        startIndex: offset + i,
        tested: wasRetested,
      });
    }
  }

  // Return up to 6 most recent untested zones first
  return zones
    .sort((a, b) => b.startIndex - a.startIndex)
    .sort((a, b) => Number(a.tested) - Number(b.tested))
    .slice(0, 6);
}

export function detectSMC(candles: Candle[], offset = 0): SMCData {
  if (candles.length < 15) {
    return { orderBlocks: [], fvgZones: [], structureBreaks: [], liquidityLevels: [], pdZone: null, srLevels: [], sdZones: [], bias: 'neutral' };
  }

  const lastPrice = candles[candles.length - 1].c;

  // Order Blocks
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
      if (impulse) {
        orderBlocks.push({
          type: 'bearish',
          high: c.h,
          low: c.o,
          startIndex: offset + i - 2,
          endIndex: offset + i + 10,
          mitigated: lastPrice >= c.o && lastPrice <= c.h,
        });
      }
    }

    if (c.c > c.o) {
      let impulse = false;
      for (let j = i + 1; j < Math.min(i + 5, candles.length); j++) {
        if (candles[j].c < c.l) { impulse = true; break; }
      }
      if (impulse) {
        orderBlocks.push({
          type: 'bullish',
          high: c.c,
          low: c.l,
          startIndex: offset + i - 2,
          endIndex: offset + i + 10,
          mitigated: lastPrice >= c.l && lastPrice <= c.c,
        });
      }
    }
  }

  // FVG Zones — with fillPct tracking
  const fvgZones: FVGZone[] = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const a = candles[i - 1];
    const c = candles[i + 1];
    if (c.l > a.h) {
      const top = c.l;
      const bottom = a.h;
      const gapSize = top - bottom;
      const fillPct = gapSize > 0
        ? clamp(0, 100, (lastPrice - bottom) / gapSize * 100)
        : 0;
      fvgZones.push({
        type: 'bullish',
        top,
        bottom,
        startIndex: offset + i - 1,
        filled: lastPrice <= a.h,
        fillPct,
      });
    }
    if (c.h < a.l) {
      const top = a.l;
      const bottom = c.h;
      const gapSize = top - bottom;
      const fillPct = gapSize > 0
        ? clamp(0, 100, (top - lastPrice) / gapSize * 100)
        : 0;
      fvgZones.push({
        type: 'bearish',
        top,
        bottom,
        startIndex: offset + i - 1,
        filled: lastPrice >= a.l,
        fillPct,
      });
    }
  }

  // Structure Breaks (BOS / CHoCH)
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
        structureBreaks.push({
          type: trend === 'bearish' ? 'CHoCH' : 'BOS',
          direction: 'bullish',
          price: candles[lastH].h,
          index: offset + i,
        });
        trend = 'bullish';
        lastHighBreak = lastH;
      }
    }
    const recentLows = lows.filter(l => l < i - 2);
    if (recentLows.length > 0) {
      const lastL = recentLows[recentLows.length - 1];
      if (candles[i].c < candles[lastL].l && lastL !== lastLowBreak) {
        structureBreaks.push({
          type: trend === 'bullish' ? 'CHoCH' : 'BOS',
          direction: 'bearish',
          price: candles[lastL].l,
          index: offset + i,
        });
        trend = 'bearish';
        lastLowBreak = lastL;
      }
    }
  }

  const lastBreak = structureBreaks[structureBreaks.length - 1];
  const bias = lastBreak ? lastBreak.direction : 'neutral';

  return {
    orderBlocks: orderBlocks.slice(-6),
    fvgZones: fvgZones.slice(-5),
    structureBreaks: structureBreaks.slice(-4),
    liquidityLevels: detectLiquidity(candles, lastPrice, offset),
    pdZone: detectPDZone(candles, lastPrice),
    srLevels: detectSR(candles, lastPrice, offset),
    sdZones: detectSD(candles, offset),
    bias,
  };
}
