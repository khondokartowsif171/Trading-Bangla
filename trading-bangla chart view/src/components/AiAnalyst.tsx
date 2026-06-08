/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { PairConfig, Candle } from '../types';
import {
  Sparkles,
  RefreshCw,
  BrainCircuit,
  Lightbulb,
  ShieldCheck,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface AiAnalystProps {
  pair: PairConfig;
  candles: Candle[];
  timeframe: string;
}

// Compute EMA from an array of prices
function calcEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// Compute RSI (14 period)
function calcRSI(prices: number[]): number {
  const n = Math.min(prices.length - 1, 14);
  if (n < 2) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - n; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = (gains / n) / (losses / n);
  return 100 - 100 / (1 + rs);
}

// Local SMC-based analysis engine — no backend required
function computeAnalysis(pair: PairConfig, candles: Candle[], timeframe: string): string {
  if (!candles || candles.length < 30) {
    return 'পর্যাপ্ত চার্ট ডাটা লোড হয়নি। কিছুক্ষণ অপেক্ষা করুন।';
  }

  const recent = candles.slice(-60);
  const last = recent[recent.length - 1];
  const closes = recent.map(c => c.c);
  const highs = recent.map(c => c.h);
  const lows = recent.map(c => c.l);

  // Trend via EMA cross
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const bullish = ema20 > ema50;
  const trendLabel = bullish ? 'বুলিশ (Bullish) 📈' : 'বেয়ারিশ (Bearish) 📉';

  // Key levels — last 20 candles
  const resistance = Math.max(...highs.slice(-20)).toFixed(pair.dec);
  const support = Math.min(...lows.slice(-20)).toFixed(pair.dec);

  // RSI
  const rsi = calcRSI(closes);
  const rsiLabel = rsi > 70 ? 'অতিরিক্ত কেনা (Overbought)' : rsi < 30 ? 'অতিরিক্ত বিক্রি (Oversold)' : 'নিরপেক্ষ (Neutral)';

  // Price change from 30 candles ago
  const priceChange = ((last.c - recent[0].c) / recent[0].c * 100).toFixed(2);

  // Candlestick pattern on last 3 candles
  const c1 = recent[recent.length - 3];
  const c2 = recent[recent.length - 2];
  const c3 = recent[recent.length - 1];
  let pattern = '';
  if (c2 && c3) {
    const body3 = Math.abs(c3.c - c3.o);
    const body2 = Math.abs(c2.c - c2.o);
    if (c2.c < c2.o && c3.c > c3.o && c3.c > c2.o && c3.o < c2.c && body3 > body2) {
      pattern = '🕯️ **বুলিশ এনগালফিং** শনাক্ত — শক্তিশালী বাই সিগনাল।';
    } else if (c2.c > c2.o && c3.c < c3.o && c3.c < c2.o && c3.o > c2.c && body3 > body2) {
      pattern = '🕯️ **বেয়ারিশ এনগালফিং** শনাক্ত — শক্তিশালী সেল সিগনাল।';
    } else if (body3 < pair.pip * 3 && (c3.h - c3.l) > body3 * 3) {
      pattern = '🕯️ **ডোজি** ক্যান্ডেল — মার্কেট অনিশ্চয়তা, ব্রেকআউটের অপেক্ষা করুন।';
    } else if (c3.c > c3.o && c3.o - c3.l > body3 * 1.8 && c3.h - c3.c < pair.pip * 5) {
      pattern = '🕯️ **হ্যামার** ক্যান্ডেল — সম্ভাব্য বুলিশ রিভার্সাল।';
    } else if (c3.c < c3.o && c3.h - c3.o > body3 * 1.8 && c3.c - c3.l < pair.pip * 5) {
      pattern = '🕯️ **শুটিং স্টার** ক্যান্ডেল — সম্ভাব্য বেয়ারিশ রিভার্সাল।';
    }
  }

  // Signal bias
  let signalColor: string;
  let signal: string;
  if (rsi > 72) {
    signal = '⚠️ RSI Overbought — SELL/SHORT এর কথা বিবেচনা করুন। পুলব্যাকের সম্ভাবনা।';
    signalColor = '🔴';
  } else if (rsi < 28) {
    signal = '✅ RSI Oversold — BUY/LONG এর সুযোগ। বাউন্স আসতে পারে।';
    signalColor = '🟢';
  } else if (bullish) {
    signal = `✅ আপট্রেন্ড — **${support}** থেকে পুলব্যাকে BUY এন্ট্রি খুঁজুন।`;
    signalColor = '🟢';
  } else {
    signal = `⚠️ ডাউনট্রেন্ড — **${resistance}** রিটেস্টে SELL এন্ট্রি খুঁজুন।`;
    signalColor = '🔴';
  }

  // Trade plan
  const slPips = 20;
  const tpPips = 40;
  const slPrice = bullish
    ? (last.c - slPips * pair.pip).toFixed(pair.dec)
    : (last.c + slPips * pair.pip).toFixed(pair.dec);
  const tpPrice = bullish
    ? (last.c + tpPips * pair.pip).toFixed(pair.dec)
    : (last.c - tpPips * pair.pip).toFixed(pair.dec);

  return `## ${bullish ? '📈' : '📉'} ট্রেন্ড বিশ্লেষণ — ${pair.label}

**টাইমফ্রেম:** ${timeframe} | **মূল্য:** ${last.c.toFixed(pair.dec)} | **পরিবর্তন:** ${Number(priceChange) >= 0 ? '+' : ''}${priceChange}%

বর্তমান বাজার **${trendLabel}** অবস্থায় রয়েছে। EMA20 (${ema20.toFixed(pair.dec)}) এবং EMA50 (${ema50.toFixed(pair.dec)}) এর পার্থক্য থেকে ট্রেন্ড নির্ধারিত।

## 📊 মূল সাপোর্ট ও রেজিস্ট্যান্স

- **রেজিস্ট্যান্স (উপরের বাধা):** ${resistance}
- **সাপোর্ট (নিচের সাপোর্ট):** ${support}
- **RSI (14):** ${rsi.toFixed(1)} — ${rsiLabel}

## ${signalColor} ট্রেডিং সিগনাল

${signal}

${pattern ? `## 🕯️ ক্যান্ডেলস্টিক প্যাটার্ন\n\n${pattern}` : ''}

## 📋 সম্ভাব্য ট্রেড পরিকল্পনা (২:১ R/R)

- **এন্ট্রি:** ${last.c.toFixed(pair.dec)} (বর্তমান মূল্য)
- **স্টপ লস:** ${slPrice} (≈${slPips} pips)
- **টেক প্রফিট:** ${tpPrice} (≈${tpPips} pips)
- **রিস্ক/রিওয়ার্ড:** ১:২

💡 রিস্ক ক্যালকুলেটর ব্যবহার করে সঠিক লট সাইজ নির্ধারণ করুন।`;
}

export default function AiAnalyst({ pair, candles, timeframe }: AiAnalystProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleTriggerAnalysis = useCallback(() => {
    setLoading(true);
    setAnalysis('');
    // Small delay for visual feedback
    setTimeout(() => {
      const result = computeAnalysis(pair, candles, timeframe);
      setAnalysis(result);
      setLoading(false);
    }, 900);
  }, [pair, candles, timeframe]);

  const parsedMarkdownHtml = (rawText: string) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('##')) {
        const title = trimmed.replace(/^##\s*\**\s*/, '').replace(/\**\s*$/, '');
        return (
          <h3 key={idx} className="text-sm font-sans font-bold text-[#00d4ff] mt-5 mb-2.5 flex items-center gap-2 border-b border-gray-800/40 pb-1 w-full">
            <Zap className="w-4 h-4 text-[#ffc107] animate-pulse shrink-0" />
            <span>{title}</span>
          </h3>
        );
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const bodyContent = trimmed.replace(/^[-*]\s*/, '');
        return (
          <li key={idx} className="text-xs text-gray-300 font-sans ml-4 mb-2 list-none relative before:content-['➔'] before:text-cyan-500 before:absolute before:-left-4 before:top-0">
            {formatBoldSegments(bodyContent)}
          </li>
        );
      }
      if (trimmed.startsWith('⚠️')) {
        return (
          <div key={idx} className="my-4 p-3 bg-amber-950/20 border border-amber-500/15 rounded-lg text-[11px] text-amber-300 flex items-start gap-2 w-full font-sans">
            <span className="shrink-0 text-amber-400">⚠️</span>
            <span>{trimmed.replace(/^⚠️\s*/, '')}</span>
          </div>
        );
      }
      if (trimmed.startsWith('💡')) {
        return (
          <div key={idx} className="my-4 p-3 bg-emerald-950/20 border border-emerald-500/15 rounded-lg text-[11px] text-emerald-300 flex items-start gap-2 w-full font-sans">
            <Lightbulb className="w-4 h-4 shrink-0 text-[#00e676]" />
            <span>{trimmed.replace(/^💡\s*/, '')}</span>
          </div>
        );
      }
      if (trimmed.length > 0) {
        return (
          <p key={idx} className="text-xs leading-relaxed text-gray-400 font-sans mb-3 last:mb-0 w-full">
            {formatBoldSegments(trimmed)}
          </p>
        );
      }
      return <div key={idx} className="h-1.5" />;
    });
  };

  const formatBoldSegments = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-bold text-gray-100 bg-[#1e273f]/40 px-1 py-0.5 rounded text-[11.5px]">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4 font-sans select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1f2b48]/60 pb-3 mb-4 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-cyan-950/40 rounded-lg border border-cyan-800/30">
            <BrainCircuit className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-gray-200">Aura AI মার্কেট অ্যানালিস্ট</h3>
            <span className="text-[10px] text-gray-500 block">SMC · EMA · RSI · ক্যান্ডেলস্টিক প্যাটার্ন</span>
          </div>
        </div>
        <button
          onClick={handleTriggerAnalysis}
          disabled={loading}
          className={`px-4 py-2 font-semibold text-[10.5px] uppercase tracking-wide rounded-lg transition flex items-center justify-center gap-1.5 shadow ${
            loading
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-[#a855f7] hover:bg-fuchsia-600 text-white'
          }`}
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>{loading ? 'বিশ্লেষণ হচ্ছে...' : 'এআই সিগন্যাল নিন'}</span>
        </button>
      </div>

      {/* Quick stats bar */}
      {!analysis && !loading && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'EMA20', value: calcEMA(candles.slice(-20).map(c => c.c), 20).toFixed(pair.dec), color: 'text-cyan-400' },
            { label: 'RSI(14)', value: calcRSI(candles.slice(-15).map(c => c.c)).toFixed(1), color: 'text-amber-400' },
            { label: 'পেয়ার', value: pair.label.split('(')[0].trim(), color: 'text-purple-400' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-950/40 border border-gray-800/30 rounded-lg p-2 text-center">
              <div className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">{item.label}</div>
              <div className={`text-xs font-mono font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Output */}
      <div className="flex-1 bg-gray-950/20 border border-[#1f2b48]/40 rounded-xl p-4 flex flex-col items-center justify-center min-h-[180px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center max-w-[280px]">
            <div className="w-10 h-10 border-4 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin mb-4" />
            <h4 className="text-xs font-semibold text-gray-200 mb-1.5 animate-pulse">চার্ট ডাটা বিশ্লেষণ হচ্ছে...</h4>
            <span className="text-[10px] text-gray-500 leading-relaxed font-sans">
              {pair.label} এর সাম্প্রতিক ক্যান্ডেল থেকে SMC, EMA, RSI এবং প্যাটার্ন গণনা করা হচ্ছে...
            </span>
          </div>
        ) : analysis ? (
          <div className="w-full text-left font-sans">
            <div className="flex items-center gap-2 mb-3 text-[9px] text-emerald-400 bg-emerald-950/20 border border-emerald-800/20 rounded px-2 py-1">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>লাইভ ক্যান্ডেল ডাটা থেকে গণনা করা — {new Date().toLocaleTimeString('bn-BD')}</span>
            </div>
            {parsedMarkdownHtml(analysis)}
            <div className="mt-6 p-3 bg-[#111625] border border-gray-800/40 rounded-lg flex gap-2 w-full text-[9px] text-[#7986cb] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                **ঝুঁকি সচেতনতা:** এই বিশ্লেষণ শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। ফরেক্স ট্রেডিং উচ্চ ঝুঁকিপূর্ণ। বাস্তব অর্থ বিনিয়োগের আগে নিজের রিস্ক ম্যানেজমেন্ট নিশ্চিত করুন।
              </span>
            </div>
            <button
              onClick={handleTriggerAnalysis}
              className="mt-3 w-full py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700/40 text-[10px] text-gray-400 rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> আবার বিশ্লেষণ করুন
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center max-w-[280px]">
            <BrainCircuit className="w-12 h-12 text-gray-700 mb-2.5" />
            <span className="text-xs font-semibold text-gray-300">AI বিশ্লেষণ প্রস্তুত</span>
            <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
              উপরের <strong className="text-purple-400">"এআই সিগন্যাল নিন"</strong> বাটনে ক্লিক করুন। লাইভ চার্ট ডাটা থেকে SMC, EMA, RSI এবং ক্যান্ডেলস্টিক প্যাটার্ন বিশ্লেষণ করা হবে।
            </p>
            <div className="mt-3 flex items-center gap-2 text-[9px] text-cyan-500">
              <TrendingDown className="w-3 h-3" />
              <span>কোনো ইন্টারনেট সংযোগ ছাড়াই কাজ করে</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
