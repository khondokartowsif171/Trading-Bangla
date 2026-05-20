import { useApp } from '@/context/AppContext';
import { useCryptoAssets, useMarketOverview, useCryptoSymbols, useTopMovers } from '@/hooks/useCryptoData';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Globe, Layers, Target, ShieldAlert, Zap, Coins, Gauge, ArrowUpDown } from 'lucide-react';

function formatMarketCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function Sparkline({ positive }: { positive: boolean }) {
  const points = Array.from({ length: 20 }, (_, i) => 30 + Math.sin(i * 0.8) * 15 + (Math.random() - 0.5) * 8);
  const min = Math.min(...points), max = Math.max(...points);
  const h = 32, w = 80;
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={d} fill="none" stroke={positive ? '#22c55e' : '#ef4444'} strokeWidth="1.5" />
    </svg>
  );
}

function LoadingBar() {
  return <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 bg-[length:200%_100%] animate-[loading_2s_linear_infinite]" />;
}

function getFgColor(v: number): string {
  if (v < 25) return '#ef4444'; if (v < 45) return '#f97316'; if (v < 55) return '#eab308';
  if (v < 75) return '#84cc16'; return '#22c55e';
}

export default function AuraCrytox() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const { assets, loading } = useCryptoAssets();
  const { data: marketData } = useMarketOverview();
  const signals = useCryptoSymbols(assets);
  const { gainers, losers } = useTopMovers(assets);

  const glass = `rounded-xl border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md`;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <LoadingBar />
      <div className="max-w-7xl mx-auto px-3 py-4 space-y-4 pb-24 md:pb-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs mb-2">
            <Zap className="w-3 h-3" /> AURACRYTOX
          </span>
          <h1 className={`text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent`}>
            {isBn ? 'ক্রিপ্টো মার্কেট অ্যানালাইসিস' : 'CryptoX Intelligence'}
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5">by <span className="text-green-400 font-bold">Trading Bangla</span> • Powered by Binance + CoinGecko</p>
        </motion.div>

        {/* Market Overview Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { icon: DollarSign, label: 'Market Cap', value: marketData ? formatMarketCap(marketData.totalMarketCap) : '...', cls: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20' },
            { icon: Activity, label: '24h Volume', value: marketData ? formatMarketCap(marketData.totalVolume24h) : '...', cls: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/20' },
            { icon: BarChart3, label: 'BTC Dominance', value: marketData ? `${marketData.btcDominance.toFixed(1)}%` : '...', cls: 'text-orange-400', bg: 'from-orange-500/20 to-amber-500/20' },
            { icon: Layers, label: 'ETH Dominance', value: marketData ? `${marketData.ethDominance.toFixed(1)}%` : '...', cls: 'text-indigo-400', bg: 'from-indigo-500/20 to-blue-500/20' },
            { icon: Globe, label: 'Active Cryptos', value: marketData ? marketData.activeCryptos.toLocaleString() : '...', cls: 'text-teal-400', bg: 'from-teal-500/20 to-cyan-500/20' },
            { icon: Gauge, label: 'Fear & Greed', value: marketData ? `${marketData.fearGreedValue}` : '...', cls: `text-[${marketData ? getFgColor(marketData.fearGreedValue) : '#22c55e'}]`, bg: 'from-purple-500/20 to-pink-500/20' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-2.5 text-center border ${darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.bg} flex items-center justify-center mx-auto mb-1`}>
                <s.icon className={`w-3.5 h-3.5 ${s.cls}`} />
              </div>
              <p className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{s.label}</p>
              <p className={`text-xs font-bold font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Fear & Greed Bar */}
        {marketData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-xl p-3 border ${darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Fear & Greed Index</span>
              <span className="text-xs font-bold font-mono" style={{ color: getFgColor(marketData.fearGreedValue) }}>
                {marketData.fearGreedValue} — {marketData.fearGreedLabel}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 overflow-hidden relative">
              <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-800 shadow-md transition-all duration-500"
                style={{ left: `${marketData.fearGreedValue}%`, transform: 'translate(-50%, -50%)' }} />
            </div>
            <div className="flex justify-between mt-1 text-[8px] text-gray-500">
              <span>Extreme Fear</span><span>Fear</span><span>Neutral</span><span>Greed</span><span>Extreme Greed</span>
            </div>
          </motion.div>
        )}

        {/* Top Movers */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={glass + ' p-3'}>
            <h3 className={`text-xs font-bold flex items-center gap-1 mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              <TrendingUp className="w-3 h-3" /> {isBn ? 'সর্বোচ্চ লাভ' : 'Top Gainers'}
            </h3>
            <div className="space-y-1">
              {gainers.length ? gainers.map(c => (
                <div key={c.symbol} className="flex justify-between text-[11px]">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{c.symbol}</span>
                  <span className="font-mono font-bold text-green-400">+{c.changePercent24h.toFixed(2)}%</span>
                </div>
              )) : <p className="text-[10px] text-gray-500">Loading...</p>}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={glass + ' p-3'}>
            <h3 className={`text-xs font-bold flex items-center gap-1 mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              <TrendingDown className="w-3 h-3" /> {isBn ? 'সর্বোচ্চ ক্ষতি' : 'Top Losers'}
            </h3>
            <div className="space-y-1">
              {losers.length ? losers.map(c => (
                <div key={c.symbol} className="flex justify-between text-[11px]">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{c.symbol}</span>
                  <span className="font-mono font-bold text-red-400">{c.changePercent24h.toFixed(2)}%</span>
                </div>
              )) : <p className="text-[10px] text-gray-500">Loading...</p>}
            </div>
          </motion.div>
        </div>

        {/* Trading Signals */}
        {signals.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={glass + ' p-3'}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent`}>
                🎯 {isBn ? 'ট্রেডিং সিগন্যাল' : 'Trading Signals'}
              </h2>
              <span className="flex items-center gap-1 text-[9px] text-green-400">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {isBn ? 'লাইভ' : 'LIVE'}
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              {signals.slice(0, 6).map((s, i) => (
                <motion.div key={`${s.symbol}-${i}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-xl p-3 border ${s.signal === 'BUY' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs">{s.symbol}/USDT</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${s.signal === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.signal}</span>
                    </div>
                    <span className="text-[9px] text-gray-500">{s.timeframe}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mb-1.5 text-[10px]">
                    <div><p className="text-gray-500">Entry</p><p className="font-mono font-bold">${fmtPrice(s.entry)}</p></div>
                    <div><p className="text-gray-500">Target</p><p className="font-mono font-bold text-green-400">${fmtPrice(s.target)}</p></div>
                    <div><p className="text-gray-500">SL</p><p className="font-mono font-bold text-red-400">${fmtPrice(s.stopLoss)}</p></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
                      <div className={`h-full rounded-full ${s.confidence >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${s.confidence}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-500">{s.confidence}%</span>
                  </div>
                  <p className="text-[8px] text-gray-500 mt-1">{s.indicator}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cryptox External Link */}
        <a href="https://cryptox.auraajenticai.cloud" target="_blank" rel="noopener noreferrer"
          className={`block rounded-xl border p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 transition-all ${darkMode ? 'border-orange-500/30' : 'border-orange-500/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">AURACRYTOX</span>
                <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isBn ? 'সম্পূর্ণ ক্রিপ্টো ট্রেডিং প্ল্যাটফর্ম' : 'Full Crypto Trading Platform'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold">
              <Globe className="w-3.5 h-3.5" />
              {isBn ? 'ওপেন' : 'OPEN'}
              <span className="text-[8px] opacity-60">↗</span>
            </div>
          </div>
        </a>

        {/* Crypto Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
          <div className={`px-3 py-2.5 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <Coins className="w-4 h-4 text-orange-400" />
            <h3 className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isBn ? 'ক্রিপ্টো মার্কেট' : 'CryptoX Market'}
            </h3>
            {loading ? (
              <div className="ml-auto w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="ml-auto flex items-center gap-1 text-[9px] text-green-400">
                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" /> {assets.length} {isBn ? 'অ্যাসেট' : 'assets'}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  {['#', 'Name', 'Price', '24h%', '24h High', '24h Low', 'Volume', 'Chart'].map(h => (
                    <th key={h} className={`p-2 text-left font-semibold ${darkMode ? 'text-gray-400 bg-gray-900' : 'text-gray-600 bg-gray-50'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 20).map((c, i) => (
                  <tr key={c.symbol} className={`border-b ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                    <td className="p-2 text-gray-500">{i + 1}</td>
                    <td className="p-2 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {c.symbol}
                    </td>
                    <td className={`p-2 font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>${fmtPrice(c.price)}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded font-bold text-[10px] ${c.changePercent24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.changePercent24h >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {c.changePercent24h >= 0 ? '+' : ''}{c.changePercent24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${fmtPrice(c.high24h)}</td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${fmtPrice(c.low24h)}</td>
                    <td className={`p-2 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${(c.quoteVolume / 1e9).toFixed(1)}B</td>
                    <td className="p-2"><Sparkline positive={c.changePercent24h >= 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Footer */}
        <div className={`rounded-xl p-4 text-center border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-[10px]">AURA CRYPTOX</span>
            <span className="text-green-400 font-bold text-xs">by Trading Bangla</span>
          </div>
          <p className="text-[9px] text-gray-500">{isBn ? 'রিয়েল-টাইম ক্রিপ্টো মার্কেট ইন্টেলিজেন্স' : 'Real-Time CryptoX Market Intelligence'} — Binance + CoinGecko</p>
        </div>
      </div>
    </div>
  );
}
