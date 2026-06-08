/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle } from '../types';

export interface PatternMarker {
  index: number;
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  price: number;
}

const body = (c: Candle) => Math.abs(c.c - c.o);
const rng = (c: Candle) => c.h - c.l;
const isBull = (c: Candle) => c.c >= c.o;
const upperWick = (c: Candle) => c.h - Math.max(c.o, c.c);
const lowerWick = (c: Candle) => Math.min(c.o, c.c) - c.l;

export function detectCandlePatterns(candles: Candle[], startIdx = 0): PatternMarker[] {
  const markers: PatternMarker[] = [];

  for (let i = startIdx; i < candles.length; i++) {
    const c2 = candles[i];
    const c1 = i >= 1 ? candles[i - 1] : null;
    const c0 = i >= 2 ? candles[i - 2] : null;

    const bs2 = body(c2);
    const r2 = rng(c2);

    if (r2 === 0) continue;

    // ── Single-candle ──────────────────────────────────────────────
    if (bs2 / r2 < 0.08) {
      markers.push({ index: i, name: 'Doji', type: 'neutral', price: c2.h });
    } else if (lowerWick(c2) > 2 * bs2 && upperWick(c2) < bs2 * 0.5) {
      markers.push({ index: i, name: isBull(c2) ? 'Hammer' : 'Hanging Man', type: 'bullish', price: c2.l });
    } else if (upperWick(c2) > 2 * bs2 && lowerWick(c2) < bs2 * 0.5) {
      markers.push({ index: i, name: isBull(c2) ? 'Shooting Star' : 'Inv. Hammer', type: 'bearish', price: c2.h });
    } else if (bs2 / r2 > 0.88) {
      markers.push({ index: i, name: isBull(c2) ? 'Bull Marubozu' : 'Bear Marubozu', type: isBull(c2) ? 'bullish' : 'bearish', price: isBull(c2) ? c2.l : c2.h });
    } else if (bs2 / r2 < 0.3 && lowerWick(c2) > upperWick(c2) * 2) {
      markers.push({ index: i, name: 'Spinning Top', type: 'neutral', price: c2.h });
    }

    if (!c1) continue;
    const bs1 = body(c1);

    // ── Two-candle ──────────────────────────────────────────────────
    // Bullish Engulfing
    if (!isBull(c1) && isBull(c2) && c2.o < c1.c && c2.c > c1.o && bs2 > bs1 * 0.9) {
      markers.push({ index: i, name: 'Bull Engulf', type: 'bullish', price: c2.l });
    }
    // Bearish Engulfing
    if (isBull(c1) && !isBull(c2) && c2.o > c1.c && c2.c < c1.o && bs2 > bs1 * 0.9) {
      markers.push({ index: i, name: 'Bear Engulf', type: 'bearish', price: c2.h });
    }
    // Bullish Harami
    if (!isBull(c1) && isBull(c2) && c2.o > c1.c && c2.c < c1.o && bs2 < bs1 * 0.55) {
      markers.push({ index: i, name: 'Bull Harami', type: 'bullish', price: c2.l });
    }
    // Bearish Harami
    if (isBull(c1) && !isBull(c2) && c2.o < c1.c && c2.c > c1.o && bs2 < bs1 * 0.55) {
      markers.push({ index: i, name: 'Bear Harami', type: 'bearish', price: c2.h });
    }
    // Piercing Line
    if (!isBull(c1) && isBull(c2) && c2.o < c1.l && c2.c > (c1.o + c1.c) / 2 && c2.c < c1.o) {
      markers.push({ index: i, name: 'Piercing', type: 'bullish', price: c2.l });
    }
    // Dark Cloud Cover
    if (isBull(c1) && !isBull(c2) && c2.o > c1.h && c2.c < (c1.o + c1.c) / 2 && c2.c > c1.o) {
      markers.push({ index: i, name: 'Dark Cloud', type: 'bearish', price: c2.h });
    }
    // Tweezer Bottom
    if (!isBull(c1) && isBull(c2) && Math.abs(c1.l - c2.l) < rng(c1) * 0.05) {
      markers.push({ index: i, name: 'Tweezer Bot', type: 'bullish', price: c2.l });
    }
    // Tweezer Top
    if (isBull(c1) && !isBull(c2) && Math.abs(c1.h - c2.h) < rng(c1) * 0.05) {
      markers.push({ index: i, name: 'Tweezer Top', type: 'bearish', price: c2.h });
    }

    if (!c0) continue;
    const bs0 = body(c0);

    // ── Three-candle ────────────────────────────────────────────────
    // Morning Star
    if (!isBull(c0) && bs1 < bs0 * 0.35 && isBull(c2) && c2.c > (c0.o + c0.c) / 2) {
      markers.push({ index: i, name: 'Morning Star', type: 'bullish', price: c2.l });
    }
    // Evening Star
    if (isBull(c0) && bs1 < bs0 * 0.35 && !isBull(c2) && c2.c < (c0.o + c0.c) / 2) {
      markers.push({ index: i, name: 'Evening Star', type: 'bearish', price: c2.h });
    }
    // Three White Soldiers
    if (isBull(c0) && isBull(c1) && isBull(c2) && c1.c > c0.c && c2.c > c1.c && c1.o > c0.o && c2.o > c1.o) {
      markers.push({ index: i, name: '3 Soldiers', type: 'bullish', price: c2.l });
    }
    // Three Black Crows
    if (!isBull(c0) && !isBull(c1) && !isBull(c2) && c1.c < c0.c && c2.c < c1.c && c1.o < c0.o && c2.o < c1.o) {
      markers.push({ index: i, name: '3 Crows', type: 'bearish', price: c2.h });
    }
    // Morning Doji Star
    if (!isBull(c0) && bs1 / rng(c1) < 0.1 && isBull(c2) && c2.c > (c0.o + c0.c) / 2) {
      markers.push({ index: i, name: 'Morn. Doji', type: 'bullish', price: c2.l });
    }
    // Evening Doji Star
    if (isBull(c0) && bs1 / rng(c1) < 0.1 && !isBull(c2) && c2.c < (c0.o + c0.c) / 2) {
      markers.push({ index: i, name: 'Eve. Doji', type: 'bearish', price: c2.h });
    }
    // Three Inside Up
    if (!isBull(c0) && isBull(c1) && c1.o > c0.c && c1.c < c0.o && isBull(c2) && c2.c > c0.o) {
      markers.push({ index: i, name: '3 Inside Up', type: 'bullish', price: c2.l });
    }
    // Three Inside Down
    if (isBull(c0) && !isBull(c1) && c1.o < c0.c && c1.c > c0.o && !isBull(c2) && c2.c < c0.o) {
      markers.push({ index: i, name: '3 Inside Dn', type: 'bearish', price: c2.h });
    }
    // Abandoned Baby (bullish)
    if (!isBull(c0) && bs1 / rng(c1) < 0.1 && c1.l > c0.l && isBull(c2) && c2.l > c1.l) {
      markers.push({ index: i, name: 'Abnd. Baby↑', type: 'bullish', price: c2.l });
    }
    // Abandoned Baby (bearish)
    if (isBull(c0) && bs1 / rng(c1) < 0.1 && c1.h < c0.h && !isBull(c2) && c2.h < c1.h) {
      markers.push({ index: i, name: 'Abnd. Baby↓', type: 'bearish', price: c2.h });
    }
  }

  // Deduplicate — keep first match per index (most specific)
  const seen = new Set<number>();
  return markers.filter(m => {
    if (seen.has(m.index)) return false;
    seen.add(m.index);
    return true;
  });
}
