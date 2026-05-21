/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { PairConfig } from '../types';
import { TrendingUp, TrendingDown, ChevronLeft } from 'lucide-react';

interface WatchListProps {
  pairs: PairConfig[];
  selectedSym: string;
  onSelectPair: (sym: string) => void;
  onClose?: () => void;
  currentWidth?: number;
  onWidthChange?: (newWidth: number) => void;
}

export default function WatchList({
  pairs,
  selectedSym,
  onSelectPair,
  onClose,
  currentWidth,
  onWidthChange,
}: WatchListProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] select-none text-[#F0F0F0]">
      {/* Search/Header bar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/30">
        <span className="font-extrabold text-[11px] font-sans text-white/50 uppercase tracking-widest">
          লাইভ মার্কেটস (Watchlist)
        </span>
        <div className="flex items-center space-x-2">
          {currentWidth && onWidthChange && (
            <div className="flex items-center space-x-0.5 bg-black/40 border border-white/10 rounded overflow-hidden">
              <button
                onClick={() => onWidthChange(Math.max(160, currentWidth - 30))}
                className="w-5 h-5 flex items-center justify-center text-[10px] text-gray-400 hover:text-white hover:bg-white/5 font-bold transition-colors animate-pulse"
                title="সাইজ ছোট করুন (Make narrower)"
              >
                ➖
              </button>
              <span className="text-[8.5px] text-white/40 font-mono px-1">
                {currentWidth}
              </span>
              <button
                onClick={() => onWidthChange(Math.min(500, currentWidth + 30))}
                className="w-5 h-5 flex items-center justify-center text-[10px] text-gray-400 hover:text-white hover:bg-white/5 font-bold transition-colors animate-pulse"
                title="সাইজ বড় করুন (Make wider)"
              >
                ➕
              </button>
            </div>
          )}
          <span className="text-[9px] text-[#00FF41] bg-[#00FF41]/10 px-2 py-1 rounded-sm border border-[#00FF41]/20 font-bold tracking-wider animate-pulse uppercase">
            LIVE
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition"
              title="মিনিমাইজ করুন (Collapse Watchlist Panel)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Watchlist Headers */}
      <div className="grid grid-cols-12 px-4 py-1.5 bg-black/55 border-b border-white/5 text-[9px] font-bold uppercase tracking-wider text-white/30 font-sans">
        <div className="col-span-5">জোড় / স্প্রেড</div>
        <div className="col-span-4 text-center">বিড (BID)</div>
        <div className="col-span-3 text-right">আস্ক (ASK)</div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {pairs.map((p) => {
          const lastCandle = p.sparkline[p.sparkline.length - 1];
          if (!lastCandle) return null;
          const isUp = lastCandle.c >= p.base;
          const pct = ((lastCandle.c - p.base) / p.base) * 100;
          
          // Spread in price units
          const halfSpread = (p.spread * p.pip) / 2;
          const bid = lastCandle.c - halfSpread;
          const ask = lastCandle.c + halfSpread;

          return (
            <div
              key={p.sym}
              onClick={() => onSelectPair(p.sym)}
              className={`flex flex-col p-3.5 cursor-pointer transition-all relative group border-l-2 ${
                selectedSym === p.sym
                  ? 'bg-white/5 border-l-[#00FF41]'
                  : 'hover:bg-white/[0.02] border-l-transparent'
              }`}
            >
              {/* Row 1: Label Info & Sparkline & Pct Badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col min-w-0 max-w-[42%]">
                  <span className="font-bold text-xs tracking-wider text-white group-hover:text-[#00d4ff] transition">
                    {p.label}
                  </span>
                  <span className="text-[9px] text-white/40 truncate" title={p.bnLabel}>
                    {p.bnLabel}
                  </span>
                </div>

                {/* Integrated Sparkline */}
                <div className="w-[60px] h-[18px] opacity-60 group-hover:opacity-100 transition-opacity">
                  <SparklineCanvas candles={p.sparkline} isUp={isUp} />
                </div>

                {/* Percentage Change Badge */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 ${
                    isUp ? 'text-[#00FF41] bg-[#00FF41]/10' : 'text-[#FF3131] bg-[#FF3131]/10'
                  }`}>
                    {isUp ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Row 2: Bid side and Ask side boxes */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {/* Bid Card */}
                <div className="bg-black/40 border border-white/5 hover:border-red-500/10 px-2 py-1 rounded-sm flex flex-col transition">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[7.5px] font-sans font-bold tracking-wider text-white/30 uppercase">Bid (sell)</span>
                    <TrendingDown className="w-2 h-2 text-red-500/35" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#FF3131] tracking-tight">
                    {bid.toFixed(p.dec)}
                  </span>
                </div>

                {/* Ask Card */}
                <div className="bg-black/40 border border-white/5 hover:border-emerald-500/10 px-2 py-1 rounded-sm flex flex-col text-right transition">
                  <div className="flex items-center justify-between mb-0.5 gap-1">
                    <TrendingUp className="w-2 h-2 text-emerald-500/35" />
                    <span className="text-[7.5px] font-sans font-bold tracking-wider text-white/30 uppercase">Ask (buy)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#00FF41] tracking-tight">
                    {ask.toFixed(p.dec)}
                  </span>
                </div>
              </div>

              {/* Row 3: Spread and Tick Volume micro statistics with subtle separator */}
              <div className="flex items-center justify-between text-[8px] font-sans font-bold text-white/30 group-hover:text-white/45 mt-2 pt-1.5 border-t border-dashed border-white/5">
                <span className="flex items-center gap-1">
                  Spread: <strong className="text-white/50">{p.spread.toFixed(1)}</strong> Pips
                </span>
                <span className="flex items-center gap-1">
                  Vol: <strong className="text-white/50">{Math.round(lastCandle.v)}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sparkline miniature Canvas sub-component
function SparklineCanvas({ candles, isUp }: { candles: any[]; isUp: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Limit sparkline coordinates to the last 24 ticks for high density representation
    const sampleCandles = candles.slice(-24);
    if (sampleCandles.length < 2) return;

    const closes: number[] = sampleCandles.map((c) => c.c);
    const hi = Math.max(...closes);
    const lo = Math.min(...closes);
    const rng = hi - lo || 0.0001;

    // Mini outline gradient path
    ctx.strokeStyle = isUp ? '#00FF41' : '#FF3131';
    ctx.lineWidth = 1.35;
    ctx.beginPath();

    const stepX = W / (sampleCandles.length - 1);
    sampleCandles.forEach((c, idx) => {
      const x = idx * stepX;
      const y = H - 1.5 - ((c.c - lo) / rng) * (H - 3);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Subtle fading gradient tail below sparkline curves
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, isUp ? 'rgba(0,255,65,0.08)' : 'rgba(255,49,49,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();

  }, [candles, isUp]);

  return <canvas ref={canvasRef} width={60} height={18} className="block w-full h-full opacity-85" />;
}
