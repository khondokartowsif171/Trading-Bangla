export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorSet {
  // Moving Averages
  ema9: number;
  ema21: number;
  ema20: number;
  ema50: number;
  ema200: number;
  // MA Crossover events (high-value signals)
  goldenCross: boolean;   // EMA9 just crossed ABOVE EMA21 (previous bar below)
  deathCross: boolean;    // EMA9 just crossed BELOW EMA21 (previous bar above)
  // Momentum
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  // Volatility
  atr: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;
  // Volume
  volumeSpike: boolean;   // Current volume > 1.5× 20-period average
  avgVolume: number;
  // Price / Trend
  currentPrice: number;
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  // S/R proximity
  nearSupport: boolean;   // Price within 0.3% of a support level
  nearResistance: boolean;// Price within 0.3% of a resistance level
}

export interface SRLevel {
  price: number;
  strength: number;
  type: 'support' | 'resistance';
}

// ─── EMA ─────────────────────────────────────────────────────────────────────
function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return result;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

// ─── SMA ─────────────────────────────────────────────────────────────────────
export function calcSMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result[i] = sum / period;
  }
  return result;
}

// ─── RSI ─────────────────────────────────────────────────────────────────────
export function calcRSI(data: number[], period = 14): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length <= period) return result;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    avgGain = ((avgGain * (period - 1)) + Math.max(diff, 0)) / period;
    avgLoss = ((avgLoss * (period - 1)) + Math.max(-diff, 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

// ─── MACD ────────────────────────────────────────────────────────────────────
export function calcMACD(data: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdLine = ema12.map((v, i) => isNaN(v) || isNaN(ema26[i]) ? NaN : v - ema26[i]);
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalRaw = calcEMA(validMacd, 9);
  const signal: number[] = new Array(data.length).fill(NaN);
  let validIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (!isNaN(macdLine[i])) {
      signal[i] = signalRaw[validIdx++] ?? NaN;
    }
  }
  const histogram = macdLine.map((v, i) => isNaN(v) || isNaN(signal[i]) ? NaN : v - signal[i]);
  return { macd: macdLine, signal, histogram };
}

// ─── ATR ─────────────────────────────────────────────────────────────────────
export function calcATR(candles: Candle[], period = 14): number[] {
  const tr: number[] = [NaN];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }
  const result: number[] = new Array(candles.length).fill(NaN);
  if (tr.length < period + 1) return result;
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  result[period] = sum / period;
  for (let i = period + 1; i < tr.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + tr[i]) / period;
  }
  return result;
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────
export function calcBollingerBands(data: number[], period = 20, multiplier = 2): { upper: number[]; middle: number[]; lower: number[]; width: number[] } {
  const sma = calcSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const width: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || isNaN(sma[i])) {
      upper.push(NaN); lower.push(NaN); width.push(NaN);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (data[j] - sma[i]) ** 2;
    const std = Math.sqrt(sumSq / period);
    const u = sma[i] + multiplier * std;
    const l = sma[i] - multiplier * std;
    upper.push(u);
    lower.push(l);
    width.push((u - l) / sma[i]);
  }
  return { upper, middle: sma, lower, width };
}

// ─── Support / Resistance ─────────────────────────────────────────────────────
export function findSupportResistance(candles: Candle[], lookback = 50): SRLevel[] {
  const levels: SRLevel[] = [];
  const slice = candles.slice(-lookback);
  const highs = slice.map(c => c.high);
  const lows = slice.map(c => c.low);

  for (let i = 2; i < slice.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      const nearby = levels.find(l => Math.abs(l.price - highs[i]) / highs[i] < 0.002);
      if (nearby) nearby.strength++;
      else levels.push({ price: highs[i], strength: 1, type: 'resistance' });
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      const nearby = levels.find(l => Math.abs(l.price - lows[i]) / lows[i] < 0.002);
      if (nearby) nearby.strength++;
      else levels.push({ price: lows[i], strength: 1, type: 'support' });
    }
  }
  return levels.sort((a, b) => b.strength - a.strength).slice(0, 10);
}

// ─── Main Indicator Calculator ────────────────────────────────────────────────
export function calcIndicators(candles: Candle[]): IndicatorSet {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume ?? 0);
  const last = closes.length - 1;
  const prev = last - 1;

  // EMAs
  const ema9arr   = calcEMA(closes, 9);
  const ema21arr  = calcEMA(closes, 21);
  const ema20arr  = calcEMA(closes, 20);
  const ema50arr  = calcEMA(closes, 50);
  const ema200arr = calcEMA(closes, 200);

  const ema9   = ema9arr[last]   ?? closes[last];
  const ema21  = ema21arr[last]  ?? closes[last];
  const ema20  = ema20arr[last]  ?? closes[last];
  const ema50  = ema50arr[last]  ?? closes[last];
  const ema200 = ema200arr[last] ?? closes[last];
  const price  = closes[last];

  // MA Crossover events — compare current vs previous bar
  const ema9Prev  = ema9arr[prev]  ?? ema9arr[last] ?? closes[last];
  const ema21Prev = ema21arr[prev] ?? ema21arr[last] ?? closes[last];
  const goldenCross = !isNaN(ema9Prev) && !isNaN(ema21Prev)
    ? (ema9Prev <= ema21Prev && ema9 > ema21)
    : false;
  const deathCross = !isNaN(ema9Prev) && !isNaN(ema21Prev)
    ? (ema9Prev >= ema21Prev && ema9 < ema21)
    : false;

  // Trend
  let trend: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  if (price > ema20 && ema20 > ema50 && ema50 > ema200) trend = 'UP';
  else if (price < ema20 && ema20 < ema50 && ema50 < ema200) trend = 'DOWN';

  // Momentum
  const rsiArr = calcRSI(closes, 14);
  const { macd, signal, histogram } = calcMACD(closes);
  const atrArr = calcATR(candles, 14);
  const bb = calcBollingerBands(closes, 20);

  // Volume spike: current volume > 1.5× 20-period average
  const vol20 = volumes.slice(Math.max(0, last - 20), last);
  const avgVolume = vol20.length > 0 ? vol20.reduce((s, v) => s + v, 0) / vol20.length : 0;
  const volumeSpike = avgVolume > 0 && (volumes[last] ?? 0) > avgVolume * 1.5;

  // S/R proximity (within 0.3% of price)
  const srLevels = findSupportResistance(candles.slice(-100));
  const proximity = price * 0.003;
  const nearSupport     = srLevels.some(l => l.type === 'support'    && Math.abs(l.price - price) < proximity);
  const nearResistance  = srLevels.some(l => l.type === 'resistance' && Math.abs(l.price - price) < proximity);

  return {
    ema9,
    ema21,
    ema20,
    ema50,
    ema200,
    goldenCross,
    deathCross,
    rsi: rsiArr[last] ?? 50,
    macd: macd[last] ?? 0,
    macdSignal: signal[last] ?? 0,
    macdHistogram: histogram[last] ?? 0,
    atr: atrArr[last] ?? price * 0.005,
    bbUpper: bb.upper[last] ?? price * 1.02,
    bbMiddle: bb.middle[last] ?? price,
    bbLower: bb.lower[last] ?? price * 0.98,
    bbWidth: bb.width[last] ?? 0.04,
    volumeSpike,
    avgVolume,
    currentPrice: price,
    trend,
    nearSupport,
    nearResistance,
  };
}
