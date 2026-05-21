/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PairConfig, Candle } from '../types';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AiAnalystProps {
  pair: PairConfig;
  candles: Candle[];
  timeframe: string;
}

export default function AiAnalyst({ pair, candles, timeframe }: AiAnalystProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTriggerAnalysis = async () => {
    setLoading(true);
    setAnalysis('');
    setErrorMsg('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pair: pair.label,
          candles,
          timeframe,
        }),
      });

      if (!response.ok) {
        throw new Error('সার্ভার থেকে বিশ্লেষণ ডাটা লোড করতে ব্যর্থ হয়েছে');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis || 'কোনো বিশ্লেষণ ফলাফল পাওয়া যায়নি।');
    } catch (err: any) {
      setErrorMsg(err.message || 'নেটওয়ার্ক সমস্যা। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  // Inline Custom Markdown Parser for pristine, secure UI rendering
  const parsedMarkdownHtml = (rawText: string) => {
    if (!rawText) return null;

    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 2: e.g. ## **১. বর্তমান বাজার ট্রেন্ড**
      if (trimmed.startsWith('##')) {
        const title = trimmed.replace(/^##\s*\**\s*/, '').replace(/\**\s*$/, '');
        return (
          <h3 key={idx} className="text-sm font-sans font-bold text-[#00d4ff] mt-5 mb-2.5 flex items-center gap-2 border-b border-gray-800/40 pb-1 w-full">
            <Zap className="w-4 h-4 text-[#ffc107] animate-pulse shrink-0" />
            <span>{title}</span>
          </h3>
        );
      }

      // Check lists or points: e.g. - **সাপোর্ট জোন:** 1.08300
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const bodyContent = trimmed.replace(/^[-*]\s*/, '');
        // Split on bold text markers ** to style segments
        return (
          <li key={idx} className="text-xs text-gray-300 font-sans ml-4 mb-2 list-none relative before:content-['➔'] before:text-cyan-500 before:absolute before:-left-4 before:top-0">
            {formatBoldSegments(bodyContent)}
          </li>
        );
      }

      // Warning details or tips
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
            <span className="shrink-0 text-[#00e676]"><Lightbulb className="w-4 h-4 shrink-0" /></span>
            <span>{trimmed.replace(/^💡\s*/, '')}</span>
          </div>
        );
      }

      // Safe paragraphs
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

  // Helper helper to highlight **bold text** sections
  const formatBoldSegments = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // bold chunk
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
      {/* Upper header section */}
      <div className="flex items-center justify-between border-b border-[#1f2b48]/60 pb-3 mb-4 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-cyan-950/40 rounded-lg border border-cyan-800/30">
            <BrainCircuit className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-gray-200">Aura AI মার্কেট অ্যানালিস্ট</h3>
            <span className="text-[10px] text-gray-500 block">SMC ও ICT টেকনিক্যাল প্যাটার্ন ডিটেক্টর</span>
          </div>
        </div>

        <button
          onClick={handleTriggerAnalysis}
          disabled={loading}
          className={`px-4 py-2 font-semibold text-[10.5px] uppercase tracking-wide rounded-lg scroll-smooth transition flex items-center justify-center gap-1.5 shadow ${
            loading
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-[#a855f7] hover:bg-fuchsia-600 text-white'
          }`}
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{loading ? 'বিশ্লেষণ হচ্ছে...' : 'এআই সিগন্যাল নিন'}</span>
        </button>
      </div>

      {/* Main output viewport panel */}
      <div className="flex-1 bg-gray-950/20 border border-[#1f2b48]/40 rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center max-w-[280px]">
            <div className="w-10 h-10 border-4 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin mb-4" />
            <h4 className="text-xs font-semibold text-gray-200 mb-1.5 animate-pulse">ক্যান্ডেল ডাটা যাচাই করা হচ্ছে</h4>
            <span className="text-[10px] text-gray-500 leading-relaxed font-sans">
              ${pair.label} জোড়ার বিগত ১০০টি লাইভ ক্যান্ডেল রিড করে সাপোর্ট, রেজিস্ট্যান্স এবং বায়ার-সেলার অর্ডার ব্লক জোনে গবেষণা চালাচ্ছে আমাদের সার্ভার-সাইড এআই...
            </span>
          </div>
        ) : errorMsg ? (
          <div className="text-center p-4 max-w-[280px]">
            <span className="text-red-500 font-bold block text-sm mb-2">সমস্যা ঘটেছে</span>
            <p className="text-xs text-gray-400 mb-3">{errorMsg}</p>
            <button
              onClick={handleTriggerAnalysis}
              className="px-3.5 py-1.5 bg-gray-805 hover:bg-gray-800 border border-gray-700 text-[10.5px] font-semibold text-gray-200 rounded-lg transition"
            >
              পুনরায় চেষ্টা করুন
            </button>
          </div>
        ) : analysis ? (
          <div className="w-full text-left font-sans">
            {parsedMarkdownHtml(analysis)}

            {/* Standard Trade Safety Footer */}
            <div className="mt-6 p-3 bg-[#111625] border border-gray-800/40 rounded-lg flex gap-2 w-full text-[9px] text-[#7986cb] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                **ঝুঁকি সচেতনতা:** ফরেক্স ও কারেন্সি মার্কেটে লিভারেজ ট্রেডিং অত্যন্ত উচ্চ ঝুঁকিপূর্ণ। এআই সিগন্যাল বা কারিগরি অঙ্কন মূলত শিক্ষামূলক সিমুলেশন কাজের জন্য তৈরি। বাস্তব মানি ব্যবহারের আগে আপনার রিস্ক ম্যানেজমেন্ট ভালোভাবে বুঝে নিন।
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center max-w-[280px]">
            <BrainCircuit className="w-12 h-12 text-gray-700 mb-2.5 animate-bounce" />
            <span className="text-xs font-semibold text-gray-300">কোনো এআই এনালাইসিস লোড করা নেই</span>
            <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
              ডানদিকের বেগুনি **&quot;এআই সিগন্যাল নিন&quot;** বাটনে ক্লিক করুন। এটি চার্টের রিয়েল-টাইম ১০০টি ক্যান্ডেলের জটিল প্যাটার্ন বিশ্লেষণ করে একটি কাস্টম বাংলা গাইড এবং ট্রেড ডিরেকশন প্রদান করবে।
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
