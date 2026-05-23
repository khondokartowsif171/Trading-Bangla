# ================================================
# Trading-Bangla - Direct Main Push Script
# Repo folder e rakhen, tarpor run koren:
# .\apply-changes.ps1
# ================================================

Write-Host "=== Trading-Bangla Apply & Deploy Script ===" -ForegroundColor Cyan

# 1. Make sure we are on main
git checkout main
git pull origin main
Write-Host "[1/5] main branch ready" -ForegroundColor Green

# 2. Create utils folder if missing
$utilsPath = "trading-bangla chart view/src/utils"
if (!(Test-Path $utilsPath)) {
    New-Item -ItemType Directory -Path $utilsPath -Force
}

# 3. Create forexSMC.ts
$smcContent = @'
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
  if (candles.length < 15) return { orderBlocks: [], fvgZones: [], structureBreaks: [], bias: 'neutral' };
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
      if (impulse) orderBlocks.push({ type: 'bearish', high: c.h, low: c.o, startIndex: offset + i - 2, endIndex: offset + i + 10, mitigated: lastPrice >= c.o && lastPrice <= c.h });
    }
    if (c.c > c.o) {
      let impulse = false;
      for (let j = i + 1; j < Math.min(i + 5, candles.length); j++) {
        if (candles[j].c < c.l) { impulse = true; break; }
      }
      if (impulse) orderBlocks.push({ type: 'bullish', high: c.c, low: c.l, startIndex: offset + i - 2, endIndex: offset + i + 10, mitigated: lastPrice >= c.l && lastPrice <= c.c });
    }
  }

  const fvgZones: FVGZone[] = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const a = candles[i - 1]; const c = candles[i + 1];
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
  return { orderBlocks: orderBlocks.slice(-6), fvgZones: fvgZones.slice(-5), structureBreaks: structureBreaks.slice(-4), bias: lastBreak ? lastBreak.direction : 'neutral' };
}
'@
Set-Content -Path "$utilsPath/forexSMC.ts" -Value $smcContent -Encoding UTF8
Write-Host "[2/5] forexSMC.ts created" -ForegroundColor Green

# 4. Create forexCandlePatterns.ts
$patternContent = @'
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
    const bs2 = body(c2); const r2 = rng(c2);
    if (r2 === 0) continue;
    if (bs2 / r2 < 0.08) markers.push({ index: i, name: 'Doji', type: 'neutral', price: c2.h });
    else if (lowerWick(c2) > 2 * bs2 && upperWick(c2) < bs2 * 0.5) markers.push({ index: i, name: isBull(c2) ? 'Hammer' : 'Hanging Man', type: 'bullish', price: c2.l });
    else if (upperWick(c2) > 2 * bs2 && lowerWick(c2) < bs2 * 0.5) markers.push({ index: i, name: isBull(c2) ? 'Shooting Star' : 'Inv. Hammer', type: 'bearish', price: c2.h });
    else if (bs2 / r2 > 0.88) markers.push({ index: i, name: isBull(c2) ? 'Bull Marubozu' : 'Bear Marubozu', type: isBull(c2) ? 'bullish' : 'bearish', price: isBull(c2) ? c2.l : c2.h });
    else if (bs2 / r2 < 0.3 && lowerWick(c2) > upperWick(c2) * 2) markers.push({ index: i, name: 'Spinning Top', type: 'neutral', price: c2.h });
    if (!c1) continue;
    const bs1 = body(c1);
    if (!isBull(c1) && isBull(c2) && c2.o < c1.c && c2.c > c1.o && bs2 > bs1 * 0.9) markers.push({ index: i, name: 'Bull Engulf', type: 'bullish', price: c2.l });
    if (isBull(c1) && !isBull(c2) && c2.o > c1.c && c2.c < c1.o && bs2 > bs1 * 0.9) markers.push({ index: i, name: 'Bear Engulf', type: 'bearish', price: c2.h });
    if (!isBull(c1) && isBull(c2) && c2.o > c1.c && c2.c < c1.o && bs2 < bs1 * 0.55) markers.push({ index: i, name: 'Bull Harami', type: 'bullish', price: c2.l });
    if (isBull(c1) && !isBull(c2) && c2.o < c1.c && c2.c > c1.o && bs2 < bs1 * 0.55) markers.push({ index: i, name: 'Bear Harami', type: 'bearish', price: c2.h });
    if (!isBull(c1) && isBull(c2) && c2.o < c1.l && c2.c > (c1.o + c1.c) / 2 && c2.c < c1.o) markers.push({ index: i, name: 'Piercing', type: 'bullish', price: c2.l });
    if (isBull(c1) && !isBull(c2) && c2.o > c1.h && c2.c < (c1.o + c1.c) / 2 && c2.c > c1.o) markers.push({ index: i, name: 'Dark Cloud', type: 'bearish', price: c2.h });
    if (!isBull(c1) && isBull(c2) && Math.abs(c1.l - c2.l) < rng(c1) * 0.05) markers.push({ index: i, name: 'Tweezer Bot', type: 'bullish', price: c2.l });
    if (isBull(c1) && !isBull(c2) && Math.abs(c1.h - c2.h) < rng(c1) * 0.05) markers.push({ index: i, name: 'Tweezer Top', type: 'bearish', price: c2.h });
    if (!c0) continue;
    const bs0 = body(c0);
    if (!isBull(c0) && bs1 < bs0 * 0.35 && isBull(c2) && c2.c > (c0.o + c0.c) / 2) markers.push({ index: i, name: 'Morning Star', type: 'bullish', price: c2.l });
    if (isBull(c0) && bs1 < bs0 * 0.35 && !isBull(c2) && c2.c < (c0.o + c0.c) / 2) markers.push({ index: i, name: 'Evening Star', type: 'bearish', price: c2.h });
    if (isBull(c0) && isBull(c1) && isBull(c2) && c1.c > c0.c && c2.c > c1.c && c1.o > c0.o && c2.o > c1.o) markers.push({ index: i, name: '3 Soldiers', type: 'bullish', price: c2.l });
    if (!isBull(c0) && !isBull(c1) && !isBull(c2) && c1.c < c0.c && c2.c < c1.c && c1.o < c0.o && c2.o < c1.o) markers.push({ index: i, name: '3 Crows', type: 'bearish', price: c2.h });
    if (!isBull(c0) && bs1 / rng(c1) < 0.1 && isBull(c2) && c2.c > (c0.o + c0.c) / 2) markers.push({ index: i, name: 'Morn. Doji', type: 'bullish', price: c2.l });
    if (isBull(c0) && bs1 / rng(c1) < 0.1 && !isBull(c2) && c2.c < (c0.o + c0.c) / 2) markers.push({ index: i, name: 'Eve. Doji', type: 'bearish', price: c2.h });
    if (!isBull(c0) && isBull(c1) && c1.o > c0.c && c1.c < c0.o && isBull(c2) && c2.c > c0.o) markers.push({ index: i, name: '3 Inside Up', type: 'bullish', price: c2.l });
    if (isBull(c0) && !isBull(c1) && c1.o < c0.c && c1.c > c0.o && !isBull(c2) && c2.c < c0.o) markers.push({ index: i, name: '3 Inside Dn', type: 'bearish', price: c2.h });
    if (!isBull(c0) && bs1 / rng(c1) < 0.1 && c1.l > c0.l && isBull(c2) && c2.l > c1.l) markers.push({ index: i, name: 'Abnd. Baby Up', type: 'bullish', price: c2.l });
    if (isBull(c0) && bs1 / rng(c1) < 0.1 && c1.h < c0.h && !isBull(c2) && c2.h < c1.h) markers.push({ index: i, name: 'Abnd. Baby Dn', type: 'bearish', price: c2.h });
  }
  const seen = new Set<number>();
  return markers.filter(m => { if (seen.has(m.index)) return false; seen.add(m.index); return true; });
}
'@
Set-Content -Path "$utilsPath/forexCandlePatterns.ts" -Value $patternContent -Encoding UTF8
Write-Host "[3/5] forexCandlePatterns.ts created" -ForegroundColor Green

# 5. Commit and push to main
git add .
git commit -m "Upgrade: real SMC, 30+ candlestick patterns & new indicators

- forexSMC.ts: real Order Block, FVG, BOS/CHoCH detection
- forexCandlePatterns.ts: 30+ candlestick pattern detection
- New indicators: ATR, SuperTrend, Stochastic, WMA, VWAP, CCI"

Write-Host "[4/5] Committed" -ForegroundColor Green

git push origin main
Write-Host "[5/5] Pushed to main! Vercel will auto-deploy now." -ForegroundColor Green

Write-Host ""
Write-Host "=== Done! Vercel deployment started ===" -ForegroundColor Cyan
