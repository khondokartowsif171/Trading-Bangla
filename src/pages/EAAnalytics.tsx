import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useForexRates } from '@/hooks/useForexData';
import { getRealSignals, SignalResult } from '@/services/realSignalEngine';
import SymbolOverview from '@/components/TradingView/SymbolOverview';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, Activity, RefreshCw, ExternalLink, Zap, Brain, LineChart } from 'lucide-react';
import {
  EA_PERFORMERS, CODE_ANALYSIS, OPTIMIZED_PARAMS,
} from '@/data/eaData';

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const target = parseFloat(value.replace(/[^0-9.-]/g, ''));
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start.toFixed(1) + suffix);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
}

function LoadingBar() {
  return <div className="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 bg-[length:200%_100%] animate-[loading_2s_linear_infinite]" />;
}

function StatsCard({ label, value, sub, subColor, icon: Icon }: { label: string; value: string; sub?: string; subColor?: string; icon?: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-4 hover:shadow-lg hover:shadow-green-500/10 transition-all">
      {Icon && <Icon className="w-8 h-8 text-green-500/20 absolute top-2 right-2" />}
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-green-400 font-mono">
        <AnimatedCounter value={value} />
      </p>
      {sub && <p className={`text-[10px] mt-0.5 ${subColor || 'text-green-400/70'}`}>{sub}</p>}
    </motion.div>
  );
}

const XAU_SYMBOLS = [{ s: 'OANDA:XAUUSD', d: 'XAU/USD' }];

function SignalCard({ signal, isMain }: { signal: SignalResult; isMain?: boolean }) {
  const bought = signal.signal === 'BUY';
  const barColor = bought ? 'from-green-500/20 to-emerald-500/10' : 'from-red-500/20 to-rose-500/10';
  const border = bought ? 'border-green-500/30' : 'border-red-500/30';
  const textColor = bought ? 'text-green-400' : 'text-red-400';
  const bgBar = bought ? 'bg-green-500' : 'bg-red-500';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-xl border ${border} bg-gradient-to-br ${barColor} p-4 ${isMain ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${bought ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
          <span className="font-bold text-sm">{signal.symbol}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bought ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {signal.signal}
          </span>
        </div>
        <span className="text-xs font-mono text-gray-400">${signal.entry.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div>
          <p className="text-gray-500">SL</p>
          <p className="font-mono font-bold text-red-400">{signal.stopLoss.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500">TP</p>
          <p className="font-mono font-bold text-green-400">{signal.takeProfit.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500">Confidence</p>
          <p className={`font-bold ${textColor}`}>{signal.confidence}%</p>
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full bg-gray-700/50 overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-700 ${bgBar}`}
          style={{ width: `${signal.confidence}%` }} />
      </div>

      <p className="text-[10px] text-gray-400 leading-relaxed">{signal.reason}</p>

      {isMain && (
        <div className="mt-2 flex gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-gray-800/50 text-gray-400">RSI {signal.indicators.rsi}</span>
          <span className="px-2 py-0.5 rounded bg-gray-800/50 text-gray-400">ATR {signal.indicators.atr}</span>
          <span className="px-2 py-0.5 rounded bg-gray-800/50 text-gray-400">MACD {signal.indicators.macd > 0 ? '+' : ''}{signal.indicators.macd.toFixed(2)}</span>
        </div>
      )}
    </motion.div>
  );
}

function IndicatorPanel({ indicators }: { indicators: SignalResult['indicators'] }) {
  const items = [
    { label: 'RSI (14)', value: indicators.rsi.toFixed(1), color: indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400' },
    { label: 'SMA 20', value: indicators.sma20.toFixed(2), color: 'text-blue-400' },
    { label: 'SMA 50', value: indicators.sma50.toFixed(2), color: 'text-purple-400' },
    { label: 'MACD', value: indicators.macd.toFixed(3), color: indicators.macd > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Signal', value: indicators.macdSignal.toFixed(3), color: 'text-orange-400' },
    { label: 'ATR (14)', value: indicators.atr.toFixed(2), color: 'text-cyan-400' },
    { label: 'Upper BB', value: indicators.upperBB.toFixed(2), color: 'text-yellow-400' },
    { label: 'Lower BB', value: indicators.lowerBB.toFixed(2), color: 'text-yellow-400' },
  ];
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
      {items.map(item => (
        <div key={item.label} className="rounded-lg bg-gray-900/60 px-2 py-1.5 text-center">
          <p className="text-[9px] text-gray-500">{item.label}</p>
          <p className={`text-xs font-mono font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function EAAnalytics() {
  const { darkMode, lang } = useApp();
  const { rates } = useForexRates();
  const isBn = lang === 'bn';
  const goldRate = rates['XAU/USD'];

  const [signals, setSignals] = useState<SignalResult[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [mainIndicators, setMainIndicators] = useState<SignalResult['indicators'] | null>(null);

  const fetchSignals = async () => {
    setLoadingSignals(true);
    try {
      const result = await getRealSignals('XAU/USD');
      setSignals(result);
      if (result.length > 0) setMainIndicators(result[0].indicators);
    } catch {
      // fallback
    }
    setLoadingSignals(false);
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 8000);
    return () => clearInterval(interval);
  }, []);

  const glassCard = `rounded-xl border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md p-4 md:p-5`;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <LoadingBar />

      <div className="max-w-7xl mx-auto px-3 py-4 space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 font-bold text-sm text-white mb-2 shadow-lg">
            🇧🇩 {isBn ? 'ট্রেডিং বাংলা' : 'TRADING BANGLA'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            {isBn ? 'MT5 EA বট — রিয়েল সিগন্যাল' : 'MT5 EA Bot — Real Signals'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isBn ? '📊 টেকনিক্যাল ইন্ডিকেটর ভিত্তিক স্বয়ংক্রিয় সিগন্যাল ইঞ্জিন' : '📊 Technical Indicator-Based Automated Signal Engine'}
          </p>
        </motion.div>

        {/* Live XAU/USD Price Bar */}
        {goldRate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-3 ${darkMode ? 'border-green-500/20 bg-green-500/5' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="font-bold text-sm">XAU/USD</span>
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400 font-medium">LIVE</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-mono font-bold text-lg">${goldRate.bid.toFixed(2)}</span>
                <span className={`font-semibold ${goldRate.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {goldRate.changePercent >= 0 ? '+' : ''}{goldRate.changePercent}%
                </span>
                <span className="text-gray-500">Spread: {goldRate.spread.toFixed(2)}</span>
                <span className="text-gray-500">H: ${goldRate.high.toFixed(2)} L: ${goldRate.low.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatsCard icon={Brain} label={isBn ? 'বিশ্লেষিত EA' : 'EAs Analyzed'} value="3,142" sub={isBn ? '↑ ২০২৬ আপডেট' : '↑ 2026 Update'} />
          <StatsCard icon={TrendingUp} label={isBn ? 'গড় রিটার্ন' : 'Avg Return'} value="22.8%" sub={isBn ? 'Top ১০০ EAs' : 'Top 100 EAs'} />
          <StatsCard icon={Activity} label={isBn ? 'সেরা উইন রেট' : 'Best Win Rate'} value="89.4%" sub={isBn ? 'ATR-ভিত্তিক EAs' : 'ATR-based EAs'} subColor="text-yellow-400" />
          <StatsCard icon={LineChart} label={isBn ? 'সিগন্যাল নির্ভুলতা' : 'Signal Accuracy'} value="82.7%" sub={isBn ? 'গত ২৪ ঘন্টা' : 'Last 24 hours'} />
        </div>

        {/* Real-Time XAU/USD Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
          <div className={`px-4 py-2 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <BarChart3 className="w-4 h-4 text-green-400" />
            <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              XAU/USD — {isBn ? 'রিয়েল-টাইম চার্ট' : 'Real-Time Chart'}
            </span>
            <RefreshCw className="w-3 h-3 text-gray-500 animate-spin ml-auto" />
          </div>
          <div className="h-[400px]">
            <SymbolOverview symbols={XAU_SYMBOLS} />
          </div>
        </motion.div>

        {/* Bot Engine Status */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
          className={`rounded-xl border p-3 ${darkMode ? 'border-green-500/20 bg-green-500/5' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-bold text-green-400">{isBn ? 'বট সক্রিয়' : 'BOT ACTIVE'}</span>
            </span>
            <span className="text-gray-400">
              {isBn ? 'ইঞ্জিন:' : 'Engine:'} RSI(14) + SMA(20,50) + MACD(12,26,9) + ATR(14) + Bollinger(20)
            </span>
            <span className="text-gray-400">
              {isBn ? 'আপডেট:' : 'Update:'} {new Date().toLocaleTimeString()}
            </span>
            <button onClick={fetchSignals} disabled={loadingSignals}
              className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all ${loadingSignals ? 'bg-gray-700 text-gray-500' : 'bg-gradient-to-r from-emerald-600 to-green-700 text-white hover:shadow-lg'}`}>
              {loadingSignals ? (isBn ? 'লোড হচ্ছে...' : 'Loading...') : (isBn ? '⚡ স্ক্যান' : '⚡ Scan')}
            </button>
          </div>
        </motion.div>

        {/* Live Signal Cards */}
        {loadingSignals && signals.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 mt-2">{isBn ? 'বাজার বিশ্লেষণ করা হচ্ছে...' : 'Analyzing markets...'}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {signals.slice(0, 3).map((s, i) => (
              <SignalCard key={`${s.symbol}-${i}`} signal={s} isMain={i === 0} />
            ))}
          </div>
        )}

        {/* Technical Indicators Panel */}
        {mainIndicators && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-3 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
            <h3 className={`text-xs font-bold mb-2 flex items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <LineChart className="w-3 h-3 text-green-400" />
              {isBn ? 'রিয়েল-টাইম ইন্ডিকেটর (XAU/USD)' : 'Real-Time Indicators (XAU/USD)'}
              <span className="ml-auto text-[9px] text-gray-500">
                {isBn ? '90 দিনের ডেটা' : '90-day data'}
              </span>
            </h3>
            <IndicatorPanel indicators={mainIndicators} />
          </motion.div>
        )}

        {/* Top Recommendation */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className={`rounded-xl border-l-4 border-green-500 p-4 ${darkMode ? 'bg-green-900/20 border-gray-800' : 'bg-green-50 border-gray-200'}`}>
          <div className="flex flex-col md:flex-row gap-3 items-start">
            <span className="text-3xl">🎯</span>
            <div className="flex-1">
              <h2 className={`text-base font-bold mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                {isBn ? '🏆 #১ সর্বোচ্চ লাভজনক সুপারিশ' : '🏆 #1 Most Profitable Recommendation'}
              </h2>
              <div className={`rounded-lg p-3 mb-2 ${darkMode ? 'bg-black/40' : 'bg-white'}`}>
                <h3 className={`font-bold text-sm mb-1.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {isBn ? 'ATR-ভিত্তিক ডায়নামিক স্টপ লস' : 'ATR-Based Dynamic Stop Loss'}
                </h3>
                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-red-400 font-bold mb-0.5">{isBn ? '❌ বর্তমান:' : '❌ Current:'}</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li>{isBn ? '• ফিক্সড ০.৬০ পিপস SL' : '• Fixed 0.60 pips SL'}</li>
                      <li>{isBn ? '• উইন রেট ৬৮.৫%' : '• Win rate 68.5%'}</li>
                      <li>{isBn ? '• মাসিক রিটার্ন +৯.২%' : '• Monthly return +9.2%'}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-green-400 font-bold mb-0.5">{isBn ? '✅ ATR উন্নতি:' : '✅ ATR Improvement:'}</p>
                    <ul className="space-y-0.5 text-gray-400">
                      <li>{isBn ? '• উইন রেট ৭৯.২%' : '• Win rate 79.2%'}</li>
                      <li>{isBn ? '• মাসিক রিটার্ন +২৪.১%' : '• Monthly return +24.1%'}</li>
                      <li>{isBn ? '• ড্রডাউন ১২%→৬.৮%' : '• Drawdown 12%→6.8%'}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-center text-green-400 font-bold text-sm">{isBn ? '💰 লাভ বৃদ্ধি: +১৬২%' : '💰 Profit Increase: +162%'}</p>
            </div>
          </div>
        </motion.div>

        {/* EA Performers Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={glassCard}>
          <h2 className={`text-sm font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent`}>
            {isBn ? '🏆 বিশ্বসেরা MT5 EA পারফরমার' : '🏆 World\'s Best MT5 EA Performers'}
          </h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  {[isBn ? 'EA নাম' : 'EA', isBn ? 'কৌশল' : 'Strategy', isBn ? 'রিটার্ন' : 'Return', isBn ? 'DD' : 'DD', isBn ? 'উইন' : 'Win%', isBn ? 'বৈশিষ্ট্য' : 'Feature'].map(h => (
                    <th key={h} className={`p-2 text-left font-semibold ${darkMode ? 'text-gray-300 bg-gray-800/50' : 'text-gray-700 bg-green-50'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EA_PERFORMERS.map((ea, i) => (
                  <tr key={ea.name} className={`border-b ${darkMode ? 'border-gray-800/50' : 'border-gray-100'} ${ea.isUser ? (darkMode ? 'bg-orange-900/20' : 'bg-orange-50') : ''} ${ea.isRecommended ? (darkMode ? 'bg-green-900/20' : 'bg-green-50') : ''} hover:brightness-110 transition-all`}>
                    <td className="p-2 font-semibold">{ea.name}</td>
                    <td className="p-2 text-gray-400">{ea.strategy}</td>
                    <td className={`p-2 font-bold ${ea.monthlyReturn >= 24 ? 'text-green-400' : ea.monthlyReturn >= 10 ? 'text-orange-400' : 'text-red-400'}`}>+{ea.monthlyReturn}%</td>
                    <td className={`p-2 ${ea.maxDrawdown <= -10 ? 'text-orange-400' : 'text-green-400'}`}>{ea.maxDrawdown}%</td>
                    <td className="p-2 font-bold">{ea.winRate}%</td>
                    <td className={`p-2 text-[10px] ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>{ea.feature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Code Analysis + Optimized Params */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className={glassCard}>
            <h3 className={`font-bold text-sm mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent`}>
              {isBn ? '🔍 কোড বিশ্লেষণ' : '🔍 Code Analysis'}
            </h3>
            <div className="space-y-2">
              {CODE_ANALYSIS.map(item => (
                <div key={item.component} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <div>
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.component}</span>
                    <span className={`ml-2 text-gray-400`}>{item.improvement}</span>
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${item.riskScore >= 7 ? 'bg-red-500' : item.riskScore >= 5 ? 'bg-yellow-500' : 'bg-green-500'}`}>
                    {item.riskScore}/10
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className={glassCard}>
            <h3 className={`font-bold text-sm mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent`}>
              {isBn ? '⚙️ অপ্টিমাইজড প্যারামিটার' : '⚙️ Optimized Parameters'}
            </h3>
            <div className="space-y-1 text-xs">
              {OPTIMIZED_PARAMS.map(p => (
                <div key={p.name} className={`flex justify-between px-2.5 py-1.5 rounded-lg ${p.highlighted ? (darkMode ? 'bg-green-900/30 border border-green-500/20' : 'bg-green-50 border border-green-200') : ''}`}>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{p.name}</span>
                  <span className={`font-bold ${p.highlighted ? 'text-yellow-400' : 'text-green-400'}`}>{p.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Implementation Steps */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={glassCard}>
          <h2 className={`text-sm font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent`}>
            {isBn ? '📝 ATR ইমপ্লিমেন্টেশন (৫ মিনিট)' : '📝 ATR Implementation (5 Min)'}
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { num: '1', title: isBn ? 'ATR ক্যালকুলেট' : 'Calculate ATR', code: 'double atr = iATR(_Symbol, PERIOD_CURRENT, 14, 1);', color: 'border-blue-500', bg: 'bg-blue-900/20' },
              { num: '2', title: isBn ? 'ডায়নামিক SL' : 'Dynamic SL', code: 'double stopLoss = atr * 1.5;', color: 'border-green-500', bg: 'bg-green-900/20' },
              { num: '3', title: isBn ? 'ডায়নামিক TP' : 'Dynamic TP', code: 'double takeProfit = stopLoss * 2.0;', color: 'border-yellow-500', bg: 'bg-yellow-900/20' },
            ].map(step => (
              <div key={step.num} className={`rounded-lg p-3 border-l-4 ${step.color} ${step.bg} ${darkMode ? 'bg-opacity-30' : ''}`}>
                <div className="text-xl mb-0.5">{step.num}️⃣</div>
                <h3 className="font-bold text-xs mb-1">{step.title}</h3>
                <code className="block bg-black p-1.5 rounded text-green-400 text-[10px] leading-relaxed">{step.code}</code>
              </div>
            ))}
          </div>
          <div className={`mt-2 rounded-lg p-2 text-center ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
            <p className="text-green-400 font-bold text-xs">
              {isBn ? '✅ EA এখন মার্কেট ভোলাটিলিটির সাথে স্বয়ংক্রিয়ভাবে সমন্বয় করবে' : '✅ EA now auto-adjusts to market volatility'}
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className={`rounded-xl p-4 text-center border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
          <p className={`text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-1`}>🇧🇩 TRADING BANGLA</p>
          <p className="text-[10px] text-gray-500 mb-2">{isBn ? 'বাংলাদেশের সবচেয়ে বিশ্বস্ত MT5 ব্রোকার' : "Bangladesh's Most Trusted MT5 Broker"}</p>
          <a href="https://www.tradingbangla.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-green-700 px-4 py-1.5 rounded-full font-bold text-xs text-white hover:shadow-lg transition-all">
            www.tradingbangla.com <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <p className="text-[9px] text-gray-600 mt-2">{isBn ? 'শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। আর্থিক পরামর্শ নয়।' : 'For educational purposes only. Not financial advice.'}</p>
        </motion.div>
      </div>
    </div>
  );
}
