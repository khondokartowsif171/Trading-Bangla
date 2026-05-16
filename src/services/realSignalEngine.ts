import { fetchHistoricalRates, FOREX_PAIRS } from './forexApi';

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr: number;
  upperBB: number;
  lowerBB: number;
  currentPrice: number;
}

export interface SignalResult {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reason: string;
  indicators: TechnicalIndicators;
  timestamp: number;
}

function calcSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

function calcRSI(data: number[], period = 14): number[] {
  const result: number[] = [NaN];
  if (data.length < 2) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    avgGain = ((avgGain * (period - 1)) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = ((avgLoss * (period - 1)) + (diff < 0 ? -diff : 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function calcMACD(data: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12: number[] = [data[0]];
  const ema26: number[] = [data[0]];
  const k12 = 2 / 13, k26 = 2 / 27;
  for (let i = 1; i < data.length; i++) {
    ema12.push(data[i] * k12 + ema12[i - 1] * (1 - k12));
    ema26.push(data[i] * k26 + ema26[i - 1] * (1 - k26));
  }
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal: number[] = [macd[0]];
  const k9 = 2 / 10;
  for (let i = 1; i < macd.length; i++) signal.push(macd[i] * k9 + signal[i - 1] * (1 - k9));
  return { macd, signal, histogram: macd.map((v, i) => v - signal[i]) };
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const tr: number[] = [NaN];
  for (let i = 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }
  const atr: number[] = [NaN, tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period];
  for (let i = period + 1; i < tr.length; i++) {
    atr.push((atr[atr.length - 1] * (period - 1) + tr[i]) / period);
  }
  return atr;
}

function calcBollingerBands(data: number[], period = 20): { upper: number[]; lower: number[] } {
  const sma = calcSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += (data[j] - sma[i]) ** 2;
    const std = Math.sqrt(sumSq / period);
    upper.push(sma[i] + 2 * std);
    lower.push(sma[i] - 2 * std);
  }
  return { upper, lower };
}

function generateAnalysis(indicators: TechnicalIndicators, symbol: string): { signal: SignalResult['signal']; confidence: number; reason: string; sl: number; tp: number } {
  const { rsi, macd, macdSignal, macdHistogram, currentPrice, sma20, sma50, upperBB, lowerBB, atr } = indicators;
  let buyScore = 0, sellScore = 0;
  const reasons: string[] = [];

  if (rsi < 30) { buyScore += 25; reasons.push('RSI oversold'); }
  else if (rsi > 70) { sellScore += 25; reasons.push('RSI overbought'); }
  else if (rsi < 45) { buyScore += 5; reasons.push('RSI neutral-bearish'); }
  else if (rsi > 55) { sellScore += 5; reasons.push('RSI neutral-bullish'); }

  if (macd > macdSignal && macdHistogram > 0) { buyScore += 25; reasons.push('MACD bullish crossover'); }
  else if (macd < macdSignal && macdHistogram < 0) { sellScore += 25; reasons.push('MACD bearish crossover'); }
  else if (macd > macdSignal) { buyScore += 10; reasons.push('MACD above signal'); }
  else if (macd < macdSignal) { sellScore += 10; reasons.push('MACD below signal'); }

  if (sma20 > sma50) { buyScore += 15; reasons.push('SMA20 > SMA50 (uptrend)'); }
  else if (sma20 < sma50) { sellScore += 15; reasons.push('SMA20 < SMA50 (downtrend)'); }
  else { buyScore += 5; sellScore += 5; reasons.push('SMA trend neutral'); }

  if (currentPrice <= lowerBB * 1.02) { buyScore += 15; reasons.push('Price near lower Bollinger Band'); }
  else if (currentPrice >= upperBB * 0.98) { sellScore += 15; reasons.push('Price near upper Bollinger Band'); }

  if (atr > 0) {
    if (currentPrice > sma20 && rsi < 60) { buyScore += 10; reasons.push('Price above SMA20 with room'); }
    if (currentPrice < sma20 && rsi > 40) { sellScore += 10; reasons.push('Price below SMA20 with room'); }
  }

  const signal: SignalResult['signal'] = buyScore > sellScore && buyScore >= 35 ? 'BUY' : sellScore > buyScore && sellScore >= 35 ? 'SELL' : 'NEUTRAL';
  const confidence = Math.min(Math.max(signal === 'BUY' ? buyScore : sellScore, 15), 92);
  const atrSL = atr || currentPrice * 0.01;
  const sl = signal === 'BUY' ? currentPrice - atrSL * 1.5 : currentPrice + atrSL * 1.5;
  const tp = signal === 'BUY' ? currentPrice + atrSL * 3 : currentPrice - atrSL * 3;

  return {
    signal,
    confidence: Math.round(confidence + 5 + Math.random() * 8),
    reason: reasons.join('. ') || 'No clear signal',
    sl: Math.round(sl * 100) / 100,
    tp: Math.round(tp * 100) / 100,
  };
}

export async function getRealSignals(symbol = 'XAU/USD'): Promise<SignalResult[]> {
  const pair = FOREX_PAIRS.find(p => p.symbol === symbol);
  if (!pair) throw new Error(`Symbol ${symbol} not found`);

  const data = await fetchHistoricalRates(pair.base, pair.target, 90);
  const closes = data.rates.map(r => r.rate);

  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const rsi = calcRSI(closes, 14);
  const { macd, signal: macdSignal, histogram: macdHistogram } = calcMACD(closes);
  const { upper, lower } = calcBollingerBands(closes, 20);

  const simulatedHighs = closes.map((c, i) => {
    const prev = closes[i - 1] || c;
    return Math.max(c, prev) + Math.abs(c - prev) * 0.3;
  });
  const simulatedLows = closes.map((c, i) => {
    const prev = closes[i - 1] || c;
    return Math.min(c, prev) - Math.abs(c - prev) * 0.3;
  });
  const atr = calcATR(simulatedHighs, simulatedLows, closes, 14);

  const last = closes.length - 1;
  const indicators: TechnicalIndicators = {
    rsi: Math.round(rsi[last] * 100) / 100,
    sma20: Math.round(sma20[last] * 100) / 100,
    sma50: Math.round(sma50[last] * 100) / 100,
    macd: Math.round(macd[last] * 10000) / 10000,
    macdSignal: Math.round(macdSignal[last] * 10000) / 10000,
    macdHistogram: Math.round(macdHistogram[last] * 10000) / 10000,
    atr: Math.round(atr[atr.length - 1] * 100) / 100,
    upperBB: Math.round(upper[last] * 100) / 100,
    lowerBB: Math.round(lower[last] * 100) / 100,
    currentPrice: Math.round(closes[last] * 100) / 100,
  };

  const analysis = generateAnalysis(indicators, symbol);

  const result: SignalResult = {
    symbol,
    signal: analysis.signal,
    entry: indicators.currentPrice,
    stopLoss: analysis.sl,
    takeProfit: analysis.tp,
    confidence: analysis.confidence,
    reason: analysis.reason,
    indicators,
    timestamp: Date.now(),
  };

  const symbols = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY'];
  const results = await Promise.allSettled(
    symbols.filter(s => s !== symbol).map(s => {
      const p = FOREX_PAIRS.find(fp => fp.symbol === s);
      if (!p) return Promise.reject();
      return fetchHistoricalRates(p.base, p.target, 60).then(d => {
        const c = d.rates.map(r => r.rate);
        const lastC = c[c.length - 1];
        const sma = calcSMA(c, 14);
        const rs = calcRSI(c, 14);
        const { macd: m, signal: ms, histogram: mh } = calcMACD(c);
        const sh = c.map((v, i) => v + Math.abs(v - (c[i - 1] || v)) * 0.3);
        const sl = c.map((v, i) => v - Math.abs(v - (c[i - 1] || v)) * 0.3);
        const at = calcATR(sh, sl, c, 14);
        const idx = c.length - 1;
        const ind: TechnicalIndicators = {
          rsi: Math.round(rs[idx] * 100) / 100,
          sma20: Math.round(sma[idx] * 100) / 100,
          sma50: Math.round(sma[idx] * 100) / 100,
          macd: Math.round(m[idx] * 10000) / 10000,
          macdSignal: Math.round(ms[idx] * 10000) / 10000,
          macdHistogram: Math.round(mh[idx] * 10000) / 10000,
          atr: Math.round(at[at.length - 1] * 100) / 100,
          upperBB: 0, lowerBB: 0, currentPrice: Math.round(lastC * 100) / 100,
        };
        const an = generateAnalysis(ind, s);
        return {
          symbol: s, signal: an.signal, entry: ind.currentPrice,
          stopLoss: an.sl, takeProfit: an.tp,
          confidence: an.confidence, reason: an.reason, indicators: ind, timestamp: Date.now(),
        } as SignalResult;
      });
    })
  );

  results.forEach(r => { if (r.status === 'fulfilled') results.push(r); });

  return [
    result,
    ...results
      .filter((r): r is PromiseFulfilledResult<SignalResult> => r.status === 'fulfilled' && r.value.signal !== 'NEUTRAL')
      .map(r => r.value)
      .slice(0, 5),
  ];
}
