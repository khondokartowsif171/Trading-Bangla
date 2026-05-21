/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FOREX_NEWS_ITEMS } from '../data/forexPairs';
import { AlertCircle, Calendar, Newspaper, ArrowRight } from 'lucide-react';

export default function NewsFeed() {
  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4 font-sans select-none overflow-y-auto">
      {/* News header */}
      <div className="flex items-center justify-between border-b border-[#1f2b48]/60 pb-3 mb-4 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-cyan-950/40 rounded-lg border border-cyan-800/30">
            <Newspaper className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-gray-200 font-sans">অর্থনৈতিক ক্যালেন্ডার ও বিশ্ব সংবাদ</h3>
            <span className="text-[10px] text-gray-500 block">হাই-ইমপ্যাক্ট নিউজ এবং ফরেক্স প্রভাবনকারী ড্রাইভার</span>
          </div>
        </div>
      </div>

      {/* News feed list */}
      <div className="space-y-4">
        {FOREX_NEWS_ITEMS.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-[#131a29]/80 border border-[#1f2b48]/40 rounded-xl flex flex-col hover:border-gray-700/50 transition group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded border ${item.impactColor}`}>
                {item.impact} IMPACT
              </span>
              <div className="flex items-center gap-1.5 text-gray-500 text-[9px] font-mono">
                <Calendar className="w-3 h-3 text-[#5c6bc0]" />
                <span>{item.time}</span>
              </div>
            </div>

            <h4 className="text-gray-100 font-bold text-[11.5px] font-sans group-hover:text-[#00d4ff] transition mb-1 leading-normal">
              {item.titleBn}
            </h4>
            <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wide block mb-2">
              Source: {item.source} · {item.title}
            </span>

            <p className="text-xs text-gray-400 font-sans leading-relaxed border-t border-gray-800/40 pt-2 flex items-start gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-[#00d4ff] mt-0.5 shrink-0" />
              <span>{item.summary}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Basic informational widget */}
      <div className="mt-5 p-3 rounded-xl bg-cyan-950/15 border border-cyan-900/30 text-[10.5px] text-[#7986cb] leading-relaxed flex items-start gap-2 font-sans">
        <AlertCircle className="w-4 h-4 text-[#00d4ff] shrink-0 mt-0.5" />
        <span>
          **ইনফো ড্রাইভার:** কান্ডেল চার্ট দেখার সময় উচ্চ প্রভাব সম্পন্ন সংবাদের (যেমন: NFP, FOMC বা সুদের হার হ্রাসের সিদ্ধান্ত) ১০ মিনিট পূর্বে ও পরে ট্রেড এড়িয়ে চলা বুদ্বিমানের কাজ। এ সময়ে অস্বাভাবিক স্প্রেড উইন্ডো তৈরি হয়ে থাকে।
        </span>
      </div>
    </div>
  );
}
