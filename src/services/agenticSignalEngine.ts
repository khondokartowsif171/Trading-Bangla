import { OHLC } from './marketDataService';

export interface AgentVote {
  agent: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  reason: string;
}

export interface AgenticSignal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  agents: AgentVote[];
  indicators: {
    rsi: number;
    ema9: number;
    ema21: number;
    sma20: number;
    sma50: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    atr: number;
    upperBB: number;
    lowerBB: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    maCross: 'ABOVE' | 'BELOW' | 'CROSSING';
  };
  timestamp: number;
}

function calcSMA(data: number[], period: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += data[j];
    r.push(s / period);
  }
  return r;
}

function calcEMA(data: number[], period: number): number[] {
  const r: number[] = [data[0]];
  const k = 2 / (period + 1);
  for (let i = 1; i < data.length; i++) r.push(data[i] * k + r[i - 1] * (1 - k));
  return r;
}

function calcRSI(data: number[], period = 14): number[] {
  const r: number[] = [NaN];
  if (data.length < 2) return r;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i] - data[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgG = gains / period, avgL = losses / period;
  r.push(avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL));
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    avgG = (avgG * (period - 1) + (d >= 0 ? d : 0)) / period;
    avgL = (avgL * (period - 1) + (d < 0 ? -d : 0)) / period;
    r.push(avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL));
  }
  return r;
}

function calcMACD(data: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal: number[] = [macd[0]];
  const k = 2 / 10;
  for (let i = 1; i < macd.length; i++) signal.push(macd[i] * k + signal[i - 1] * (1 - k));
  return { macd, signal, histogram: macd.map((v, i) => v - signal[i]) };
}

function calcATR(candles: OHLC[], period = 14): number[] {
  const tr: number[] = [NaN];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }
  const atr: number[] = [NaN, tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period];
  for (let i = period + 1; i < tr.length; i++)
    atr.push((atr[atr.length - 1] * (period - 1) + tr[i]) / period);
  return atr;
}

function calcBB(data: number[], period = 20): { upper: number[]; lower: number[] } {
  const sma = calcSMA(data, period);
  const upper: number[] = [], lower: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); continue; }
    let ss = 0;
    for (let j = i - period + 1; j <= i; j++) ss += (data[j] - sma[i]) ** 2;
    const std = Math.sqrt(ss / period);
    upper.push(sma[i] + 2 * std);
    lower.push(sma[i] - 2 * std);
  }
  return { upper, lower };
}

// ─── Agent 1: Trend Agent ───
function trendAgent(closes: number[], ema9: number[], ema21: number[], sma20: number[], sma50: number[]): AgentVote {
  const last = closes.length - 1;
  const ema9_21 = ema9[last] - ema21[last];
  const prevEma9_21 = ema9[last - 1] - ema21[last - 1];
  const smaCross = sma20[last] - sma50[last];
  const prevSmaCross = sma20[last - 1] - sma50[last - 1];

  const emaBull = ema9[last] > ema21[last];
  const smaBull = sma20[last] > sma50[last];
  const emaCrossUp = !(ema9[last - 1] > ema21[last - 1]) && emaBull;
  const emaCrossDown = (ema9[last - 1] > ema21[last - 1]) && !emaBull;

  let score = 0;
  const reasons: string[] = [];

  if (emaBull) { score += 25; reasons.push('EMA9 > EMA21 (bullish)'); }
  else { score -= 25; reasons.push('EMA9 < EMA21 (bearish)'); }

  if (smaBull) { score += 20; reasons.push('SMA20 > SMA50 (uptrend)'); }
  else { score -= 20; reasons.push('SMA20 < SMA50 (downtrend)'); }

  if (emaCrossUp) { score += 15; reasons.push('EMA bullish cross'); }
  if (emaCrossDown) { score -= 15; reasons.push('EMA bearish cross'); }

  if (ema9_21 > 0 && prevEma9_21 <= 0) { score += 10; reasons.push('EMA9/21 width expanding'); }
  if (smaCross > 0 && prevSmaCross <= 0) { score += 10; reasons.push('SMA20/50 width expanding'); }

  const signal = score >= 30 ? 'BUY' : score <= -30 ? 'SELL' : 'NEUTRAL';
  const confidence = Math.min(Math.abs(score) + 20, 95);

  return {
    agent: 'Trend',
    signal,
    confidence: Math.round(confidence),
    reason: reasons.length > 0 ? reasons.join('; ') : 'No clear trend',
  };
}

// ─── Agent 2: Momentum Agent ───
function momentumAgent(rsi: number[], macd: number[], macdSignal: number[], histogram: number[]): AgentVote {
  const last = rsi.length - 1;
  const rsiVal = rsi[last];
  const prevRsi = rsi[last - 1];
  const rsiMtm = rsiVal - prevRsi;

  let score = 0;
  const reasons: string[] = [];

  if (rsiVal < 30) { score += 30; reasons.push(`RSI oversold (${rsiVal.toFixed(1)})`); }
  else if (rsiVal > 70) { score -= 30; reasons.push(`RSI overbought (${rsiVal.toFixed(1)})`); }
  else if (rsiVal < 40) { score += 10; reasons.push('RSI neutral-bullish'); }
  else if (rsiVal > 60) { score -= 10; reasons.push('RSI neutral-bearish'); }
  else { score += 5; reasons.push('RSI neutral'); }

  if (rsiMtm > 5 && rsiVal < 50) { score += 15; reasons.push('RSI rising from low'); }
  if (rsiMtm < -5 && rsiVal > 50) { score -= 15; reasons.push('RSI falling from high'); }

  const macdVal = macd[last];
  const sigVal = macdSignal[last];
  const histVal = histogram[last];
  const prevHist = histogram[last - 1];

  if (macdVal > sigVal) { score += 20; reasons.push('MACD above signal'); }
  else { score -= 20; reasons.push('MACD below signal'); }

  if (histVal > 0 && prevHist <= 0) { score += 15; reasons.push('MACD histogram turned positive'); }
  if (histVal < 0 && prevHist >= 0) { score -= 15; reasons.push('MACD histogram turned negative'); }

  if (histVal > 0 && histVal > prevHist) { score += 10; reasons.push('MACD momentum increasing'); }
  if (histVal < 0 && histVal < prevHist) { score -= 10; reasons.push('MACD momentum decreasing'); }

  const signal = score >= 30 ? 'BUY' : score <= -30 ? 'SELL' : 'NEUTRAL';
  const confidence = Math.min(Math.abs(score) + 15, 95);

  return {
    agent: 'Momentum',
    signal,
    confidence: Math.round(confidence),
    reason: reasons.length > 0 ? reasons.join('; ') : 'No clear momentum',
  };
}

// ─── Agent 3: Volatility Agent ───
function volatilityAgent(closes: number[], upperBB: number[], lowerBB: number[], atr: number[], candles: OHLC[]): AgentVote {
  const last = closes.length - 1;
  const price = closes[last];
  const prevPrice = closes[last - 1];
  const atrVal = atr[atr.length - 1] || price * 0.01;

  let score = 0;
  const reasons: string[] = [];

  const bbUpper = upperBB[last];
  const bbLower = lowerBB[last];
  const bbRange = bbUpper - bbLower;

  if (bbRange > 0) {
    const bbPos = ((price - bbLower) / bbRange) * 100;
    if (bbPos < 15) { score += 25; reasons.push('Price near lower BB (oversold)'); }
    else if (bbPos > 85) { score -= 25; reasons.push('Price near upper BB (overbought)'); }
    else if (bbPos < 35) { score += 10; reasons.push('Price in lower BB zone'); }
    else if (bbPos > 65) { score -= 10; reasons.push('Price in upper BB zone'); }
  }

  const recentHigh = Math.max(...closes.slice(-10));
  const recentLow = Math.min(...closes.slice(-10));
  const sRange = recentHigh - recentLow;

  if (price <= recentLow * 1.02) { score += 15; reasons.push('Price at recent support'); }
  else if (price >= recentHigh * 0.98) { score -= 15; reasons.push('Price at recent resistance'); }

  if (Math.abs(price - prevPrice) > atrVal * 0.5) {
    if (price > prevPrice) { score += 10; reasons.push('Strong bullish candle'); }
    else { score -= 10; reasons.push('Strong bearish candle'); }
  }

  const lastCandle = candles[candles.length - 1];
  if (lastCandle) {
    const body = Math.abs(lastCandle.close - lastCandle.open);
    const wickTop = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
    const wickBot = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
    if (wickTop > body * 0.6 && lastCandle.close < lastCandle.open) { score -= 10; reasons.push('Bearish rejection at high'); }
    if (wickBot > body * 0.6 && lastCandle.close > lastCandle.open) { score += 10; reasons.push('Bullish rejection at low'); }
  }

  const signal = score >= 25 ? 'BUY' : score <= -25 ? 'SELL' : 'NEUTRAL';
  const confidence = Math.min(Math.abs(score) + 20, 90);

  return {
    agent: 'Volatility',
    signal,
    confidence: Math.round(confidence),
    reason: reasons.length > 0 ? reasons.join('; ') : 'Normal volatility',
  };
}

export function analyzeSignal(symbol: string, candles: OHLC[]): AgenticSignal {
  if (candles.length < 30) {
    return {
      symbol, signal: 'NEUTRAL', confidence: 0, entry: 0, stopLoss: 0, takeProfit: 0,
      reason: 'Insufficient data', agents: [],
      indicators: { rsi: 50, ema9: 0, ema21: 0, sma20: 0, sma50: 0, macd: 0, macdSignal: 0, macdHistogram: 0, atr: 0, upperBB: 0, lowerBB: 0, trend: 'NEUTRAL', maCross: 'CROSSING' },
      timestamp: Date.now(),
    };
  }

  const closes = candles.map(c => c.close);
  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const rsi = calcRSI(closes, 14);
  const { macd, signal: macdSig, histogram } = calcMACD(closes);
  const { upper, lower } = calcBB(closes, 20);
  const atr = calcATR(candles, 14);

  const last = closes.length - 1;
  const price = closes[last];

  const trend = trendAgent(closes, ema9, ema21, sma20, sma50);
  const momentum = momentumAgent(rsi, macd, macdSig, histogram);
  const volatility = volatilityAgent(closes, upper, lower, atr, candles);

  const agents = [trend, momentum, volatility];

  let totalConf = 0;
  let buyWeight = 0, sellWeight = 0;
  let totalWeight = 0;
  const reasons: string[] = [];

  agents.forEach(a => {
    const w = a.confidence;
    totalWeight += w;
    if (a.signal === 'BUY') { buyWeight += w; reasons.push(`${a.agent}: BUY (${a.confidence}%)`); }
    else if (a.signal === 'SELL') { sellWeight += w; reasons.push(`${a.agent}: SELL (${a.confidence}%)`); }
    else { totalWeight -= w * 0.5; reasons.push(`${a.agent}: NEUTRAL`); }
  });

  const buyScore = buyWeight / totalWeight;
  const sellScore = sellWeight / totalWeight;

  let finalSignal: 'BUY' | 'SELL' | 'NEUTRAL';
  let confidence: number;

  const agreeing = agents.filter(a => a.signal === 'BUY').length >= 2 ? 'BUY' :
    agents.filter(a => a.signal === 'SELL').length >= 2 ? 'SELL' : 'NEUTRAL';

  if (agreeing !== 'NEUTRAL' && buyScore > sellScore && buyScore > 0.35) {
    finalSignal = 'BUY';
    confidence = Math.round(buyScore * 100);
  } else if (agreeing !== 'NEUTRAL' && sellScore > buyScore && sellScore > 0.35) {
    finalSignal = 'SELL';
    confidence = Math.round(sellScore * 100);
  } else {
    finalSignal = 'NEUTRAL';
    confidence = 25;
  }

  confidence = Math.min(Math.max(confidence + Math.floor(Math.random() * 8), 15), 92);

  const atrVal = atr[atr.length - 1] || price * 0.01;
  const sl = finalSignal === 'BUY' ? +(price - atrVal * 1.5).toFixed(price > 100 ? 2 : 5) : +(price + atrVal * 1.5).toFixed(price > 100 ? 2 : 5);
  const tp = finalSignal === 'BUY' ? +(price + atrVal * 3).toFixed(price > 100 ? 2 : 5) : +(price - atrVal * 3).toFixed(price > 100 ? 2 : 5);

  return {
    symbol, signal: finalSignal, confidence, entry: +price.toFixed(price > 100 ? 2 : 5),
    stopLoss: sl, takeProfit: tp,
    reason: reasons.join(' | '),
    agents,
    indicators: {
      rsi: +rsi[last].toFixed(1),
      ema9: +ema9[last].toFixed(price > 100 ? 2 : 5),
      ema21: +ema21[last].toFixed(price > 100 ? 2 : 5),
      sma20: +sma20[last].toFixed(price > 100 ? 2 : 5),
      sma50: +sma50[last].toFixed(price > 100 ? 2 : 5),
      macd: +macd[last].toFixed(5),
      macdSignal: +macdSig[last].toFixed(5),
      macdHistogram: +histogram[last].toFixed(5),
      atr: +(atrVal).toFixed(price > 100 ? 2 : 5),
      upperBB: +upper[last].toFixed(price > 100 ? 2 : 5),
      lowerBB: +lower[last].toFixed(price > 100 ? 2 : 5),
      trend: ema9[last] > ema21[last] ? 'BULLISH' : ema9[last] < ema21[last] ? 'BEARISH' : 'NEUTRAL',
      maCross: ema9[last] > ema21[last] && ema9[last - 1] <= ema21[last - 1] ? 'CROSSING' : ema9[last] > ema21[last] ? 'ABOVE' : 'BELOW',
    },
    timestamp: Date.now(),
  };
}

export function analyzeMultiple(candlesMap: Record<string, OHLC[]>): AgenticSignal[] {
  return Object.entries(candlesMap)
    .filter(([, c]) => c.length >= 30)
    .map(([sym, c]) => analyzeSignal(sym, c))
    .filter(s => s.signal !== 'NEUTRAL' || Math.random() > 0.4)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
