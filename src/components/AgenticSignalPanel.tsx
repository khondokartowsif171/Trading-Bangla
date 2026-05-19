import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { AgenticSignal, AgentVote } from '@/services/agenticSignalEngine';
import { TrendingUp, TrendingDown, Activity, BarChart3, Zap, Shield, AlertTriangle } from 'lucide-react';

function AgentCard({ vote, index }: { vote: AgentVote; index: number }) {
  const { darkMode } = useApp();
  const icons = [TrendingUp, Activity, Shield];
  const Icon = icons[index % 3];
  const colors = {
    BUY: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', bar: 'bg-green-500' },
    SELL: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-500' },
    NEUTRAL: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', bar: 'bg-gray-500' },
  };
  const c = colors[vote.signal];

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-2.5`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3 h-3 ${c.text}`} />
        <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{vote.agent}</span>
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{vote.signal}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
          <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${vote.confidence}%` }} />
        </div>
        <span className="text-[9px] text-gray-500 font-mono">{vote.confidence}%</span>
      </div>
      <p className="text-[8px] text-gray-500 mt-1 leading-tight">{vote.reason}</p>
    </div>
  );
}

function IndicatorBar({ label, value, color, bar }: { label: string; value: string; color: string; bar?: { value: number; color: string } }) {
  const { darkMode } = useApp();
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-b-0">
      <span className={`text-[10px] font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-mono font-bold ${color}`}>{value}</span>
        {bar && (
          <div className="w-12 h-1.5 rounded-full bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.value}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgenticSignalPanel({ signal }: { signal: AgenticSignal | null }) {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';

  if (!signal) {
    return (
      <div className={`rounded-xl border p-4 ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-gray-500">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-xs">{isBn ? 'সিগন্যাল আসছে...' : 'Waiting for signal...'}</span>
          </div>
        </div>
      </div>
    );
  }

  const bought = signal.signal === 'BUY';

  return (
    <div className={`rounded-xl border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      {/* Signal Box */}
      <div className={`p-4 text-center rounded-t-xl transition-all duration-700 ${
        signal.signal === 'BUY' ? 'bg-green-500/10 border-b border-green-500/30' :
        signal.signal === 'SELL' ? 'bg-red-500/10 border-b border-red-500/30' :
        'bg-gray-500/5 border-b border-gray-500/20'
      }`}>
        <div className={`text-4xl mb-1 ${signal.signal === 'BUY' ? 'text-green-400' : signal.signal === 'SELL' ? 'text-red-400' : 'text-gray-500'}`}>
          {signal.signal === 'BUY' ? '▲' : signal.signal === 'SELL' ? '▼' : '◆'}
        </div>
        <div className={`text-xl font-black tracking-widest font-mono ${
          signal.signal === 'BUY' ? 'text-green-400' : signal.signal === 'SELL' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {signal.signal}
        </div>
        <div className="text-[10px] text-gray-500 mt-1 font-mono">{signal.symbol}</div>
        <div className="mt-2 max-w-xs mx-auto">
          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
            <span>Confidence</span>
            <span>{signal.confidence}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              signal.confidence >= 70 ? 'bg-green-500' : signal.confidence >= 45 ? 'bg-yellow-500' : 'bg-red-500'
            }`} style={{ width: `${signal.confidence}%` }} />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-lg bg-gray-900/60 p-2">
            <span className="text-gray-500">Entry</span>
            <div className="font-mono font-bold text-white">${signal.entry.toFixed(signal.entry > 100 ? 2 : 5)}</div>
          </div>
          <div className="rounded-lg bg-gray-900/60 p-2">
            <span className="text-gray-500">SL</span>
            <div className="font-mono font-bold text-red-400">{signal.stopLoss.toFixed(signal.stopLoss > 100 ? 2 : 5)}</div>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-lg bg-gray-900/60 p-2">
            <span className="text-gray-500">TP</span>
            <div className="font-mono font-bold text-green-400">{signal.takeProfit.toFixed(signal.takeProfit > 100 ? 2 : 5)}</div>
          </div>
          <div className="rounded-lg bg-gray-900/60 p-2">
            <span className="text-gray-500">R:R</span>
            <div className="font-mono font-bold text-yellow-400">
              {signal.takeProfit !== signal.entry && signal.stopLoss !== signal.entry
                ? `${Math.abs((signal.takeProfit - signal.entry) / (signal.stopLoss - signal.entry)).toFixed(1)}:1`
                : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Votes */}
      <div className="p-3 border-b border-gray-800">
        <div className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <Zap className="w-3 h-3 text-yellow-400" />
          {isBn ? 'এজেন্ট ভোট' : 'Agent Consensus'}
        </div>
        <div className="grid md:grid-cols-3 gap-1.5">
          {signal.agents.map((a, i) => <AgentCard key={a.agent} vote={a} index={i} />)}
        </div>
      </div>

      {/* Smart Indicators */}
      <div className="p-3">
        <div className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <BarChart3 className="w-3 h-3 text-blue-400" />
          {isBn ? 'স্মার্ট ইন্ডিকেটর' : 'Smart Indicators'}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3">
          <div>
            <IndicatorBar label="RSI (14)" value={signal.indicators.rsi.toFixed(1)}
              color={signal.indicators.rsi > 70 ? 'text-red-400' : signal.indicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}
              bar={{ value: signal.indicators.rsi, color: signal.indicators.rsi > 70 ? 'bg-red-500' : signal.indicators.rsi < 30 ? 'bg-green-500' : 'bg-yellow-500' }} />
            <IndicatorBar label="EMA 9" value={signal.indicators.ema9.toFixed(2)}
              color={signal.indicators.ema9 > signal.indicators.ema21 ? 'text-green-400' : 'text-red-400'} />
            <IndicatorBar label="EMA 21" value={signal.indicators.ema21.toFixed(2)}
              color={signal.indicators.ema21 > signal.indicators.ema9 ? 'text-green-400' : 'text-red-400'} />
          </div>
          <div>
            <IndicatorBar label="MACD" value={signal.indicators.macd.toFixed(4)}
              color={signal.indicators.macd > 0 ? 'text-green-400' : 'text-red-400'} />
            <IndicatorBar label="MACD Signal" value={signal.indicators.macdSignal.toFixed(4)} color="text-orange-400" />
            <IndicatorBar label="MACD Hist" value={signal.indicators.macdHistogram.toFixed(4)}
              color={signal.indicators.macdHistogram > 0 ? 'text-green-400' : 'text-red-400'} />
          </div>
          <div>
            <IndicatorBar label="ATR (14)" value={signal.indicators.atr.toFixed(2)} color="text-cyan-400" />
            <IndicatorBar label="Upper BB" value={signal.indicators.upperBB.toFixed(2)} color="text-yellow-400" />
            <IndicatorBar label="Lower BB" value={signal.indicators.lowerBB.toFixed(2)} color="text-yellow-400" />
          </div>
          <div>
            <IndicatorBar label="Trend" value={signal.indicators.trend} color={signal.indicators.trend === 'BULLISH' ? 'text-green-400' : 'text-red-400'} />
            <IndicatorBar label="MA Cross" value={signal.indicators.maCross} color={signal.indicators.maCross === 'ABOVE' ? 'text-green-400' : signal.indicators.maCross === 'BELOW' ? 'text-red-400' : 'text-yellow-400'} />
            <IndicatorBar label="SMA 20" value={signal.indicators.sma20.toFixed(2)} color="text-blue-400" />
            <IndicatorBar label="SMA 50" value={signal.indicators.sma50.toFixed(2)} color="text-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
