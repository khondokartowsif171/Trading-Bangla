import { motion, AnimatePresence } from 'motion/react';
import { TradeSignal } from '../types';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, AlertCircle, ArrowUpDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, ReferenceLine, YAxis, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

function MiniChart({ signal }: { signal: TradeSignal }) {
  const data = signal.history.map((price, i) => ({ value: price, index: i }));
  // Domain limits
  const allValues = [
    ...signal.history,
    signal.entryPrice,
    signal.takeProfit,
    ...signal.status !== 'PROFIT' ? [signal.stopLoss] : [] // Add StopLoss into consideration if not hit
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const padding = (max - min) * 0.1;

  const lineColor = signal.status === 'PROFIT' ? '#34d399' : signal.status === 'LOSS' ? '#fb7185' : '#60a5fa'; // emerald-400, rose-400, blue-400

  return (
    <div className="w-[100px] h-[40px] opacity-80">
      <LineChart width={100} height={40} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis domain={[min - padding, max + padding]} hide />
        <ReferenceLine y={signal.entryPrice} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.5} />
        {signal.action === 'BUY' ? (
          <>
            <ReferenceLine y={signal.takeProfit} stroke="#34d399" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={signal.stopLoss} stroke="#fb7185" strokeDasharray="3 3" strokeOpacity={0.5} />
          </>
        ) : (
           <>
             <ReferenceLine y={signal.stopLoss} stroke="#fb7185" strokeDasharray="3 3" strokeOpacity={0.5} />
             <ReferenceLine y={signal.takeProfit} stroke="#34d399" strokeDasharray="3 3" strokeOpacity={0.5} />
           </>
        )}
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={lineColor} 
          strokeWidth={1.5} 
          dot={false} 
          isAnimationActive={false} 
        />
      </LineChart>
    </div>
  );
}

function AnimatedPrice({ signal }: { signal: TradeSignal }) {
  const prevPriceRef = useRef(signal.currentPrice);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (signal.status !== 'ACTIVE' && signal.status !== 'PENDING') return;
    
    if (signal.currentPrice > prevPriceRef.current) {
      setFlash('up');
    } else if (signal.currentPrice < prevPriceRef.current) {
      setFlash('down');
    }
    
    prevPriceRef.current = signal.currentPrice;

    const timer = setTimeout(() => setFlash(null), 300);
    return () => clearTimeout(timer);
  }, [signal.currentPrice, signal.status]);

  const baseColor = signal.status === 'PROFIT' ? 'text-emerald-400' : signal.status === 'LOSS' ? 'text-rose-400' : 'text-slate-200';
  const flashClass = flash === 'up' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50' : 
                     flash === 'down' ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/50' : 'ring-1 ring-transparent';

  const isBuy = signal.action === 'BUY';
  const totalTp = Math.abs(signal.takeProfit - signal.entryPrice);
  const currentDiffTp = isBuy ? signal.currentPrice - signal.entryPrice : signal.entryPrice - signal.currentPrice;
  const tpProgress = totalTp > 0 ? Math.max(0, Math.min(100, (currentDiffTp / totalTp) * 100)) : 0;

  const totalSl = Math.abs(signal.entryPrice - signal.stopLoss);
  const currentDiffSl = isBuy ? signal.entryPrice - signal.currentPrice : signal.currentPrice - signal.entryPrice;
  const slProgress = totalSl > 0 ? Math.max(0, Math.min(100, (currentDiffSl / totalSl) * 100)) : 0;

  return (
    <div className="flex flex-col items-end justify-center min-h-[40px]">
      <span className={`px-2 py-0.5 rounded transition-all duration-300 font-semibold ${flashClass} ${!flash ? baseColor : ''}`}>
        {signal.currentPrice.toFixed(signal.precision)}
      </span>
      {signal.status === 'ACTIVE' && tpProgress > 80 && (
         <span className="text-[9px] text-emerald-400 uppercase tracking-wider animate-pulse mt-1 flex items-center gap-1">
           <TrendingUp className="w-3 h-3" /> Near TP ({tpProgress.toFixed(0)}%)
         </span>
      )}
      {signal.status === 'ACTIVE' && slProgress > 80 && (
         <span className="text-[9px] text-rose-400 uppercase tracking-wider animate-pulse mt-1 flex items-center gap-1">
           <TrendingDown className="w-3 h-3" /> Near SL ({slProgress.toFixed(0)}%)
         </span>
      )}
    </div>
  );
}

interface SignalTableProps {
  signals: TradeSignal[];
}

export function SignalTable({ signals }: SignalTableProps) {
  const notifiedSignals = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'currentPrice' | 'pips', direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'PROFIT' | 'LOSS'>('ALL');

  const requestSort = (key: 'currentPrice' | 'pips') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedSignals = [...signals].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredAndSortedSignals = sortedSignals.filter(signal => {
    if (statusFilter === 'ALL') return true;
    return signal.status === statusFilter;
  });

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Prevent barrage of notifications on initial load
    if (signals.length > 0 && !initializedRef.current) {
      signals.forEach(s => {
        if (s.status === 'PROFIT' || s.status === 'LOSS') {
          notifiedSignals.current.add(s.id);
        }
      });
      initializedRef.current = true;
      return;
    }

    signals.forEach(signal => {
      if ((signal.status === 'PROFIT' || signal.status === 'LOSS') && !notifiedSignals.current.has(signal.id)) {
        notifiedSignals.current.add(signal.id);
        
        const isProfit = signal.status === 'PROFIT';
        const title = `Signal Alert: ${signal.pair}`;
        const description = isProfit
          ? `Take Profit reached! (+${signal.pips.toFixed(1)} pips)`
          : `Stop Loss triggered! (${signal.pips.toFixed(1)} pips)`;
        
        if (isProfit) {
          toast.success(title, { description, duration: 5000, icon: '🎯' });
        } else {
          toast.error(title, { description, duration: 5000, icon: '🛑' });
        }

        // Also trigger native desktop notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, { body: description });
          } catch (e) {
            console.warn("Notifications might be blocked:", e);
          }
        }
      }
    });
  }, [signals]);

  const getBuySellRatio = (pairName: string) => {
    const pairSignals = signals.filter(s => s.pair === pairName);
    const buys = pairSignals.filter(s => s.action === 'BUY').length;
    const sells = pairSignals.filter(s => s.action === 'SELL').length;
    const total = buys + sells;
    if (total === 0) return { buy: 50, sell: 50 };
    return {
      buy: Math.round((buys / total) * 100),
      sell: Math.round((sells / total) * 100),
    };
  };

  const formatPrice = (price: number, precision: number) => {
    return price.toFixed(precision);
  };

  const formatTime = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full bg-[#0f1423] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/30">
        <h3 className="text-sm font-medium text-slate-300">Filter by Status</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 transition-colors cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="PROFIT">Profit</option>
          <option value="LOSS">Loss</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
              <th className="px-6 py-4">Symbol / Pair</th>
              <th className="px-6 py-4">B/S Ratio</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4 text-right">Entry Price</th>
              <th 
                className="px-6 py-4 text-right font-bold text-slate-300 cursor-pointer hover:text-white transition-colors"
                onClick={() => requestSort('currentPrice')}
              >
                <div className="flex items-center justify-end gap-1.5 w-full">
                  Current
                  {sortConfig?.key === 'currentPrice' ? (
                     <span className="text-blue-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-right">Target (TP)</th>
              <th className="px-6 py-4 text-right">Stop (SL)</th>
              <th 
                className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors group"
                onClick={() => requestSort('pips')}
              >
                <div className="flex items-center justify-end gap-1.5 w-full">
                  Pips
                  {sortConfig?.key === 'pips' ? (
                     <span className="text-blue-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4">Status & Time</th>
              <th className="px-6 py-4">Chart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <AnimatePresence>
              {filteredAndSortedSignals.map((signal) => (
                <motion.tr
                  key={signal.id}
                  initial={{ opacity: 0, x: -20, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className={`transition-colors group ${
                    signal.status === 'LOSS' 
                      ? 'bg-rose-500/10 hover:bg-rose-500/20' 
                      : signal.status === 'PROFIT'
                      ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                      : 'hover:bg-slate-800/20'
                  }`}
                >
                  {/* Symbol */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {signal.status === 'LOSS' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                            <AlertCircle className="w-4 h-4 text-rose-400 drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                          </motion.div>
                        )}
                        <div className="font-bold text-slate-200">{signal.pair}</div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                        {signal.timeframe}
                      </span>
                    </div>
                  </td>
                  
                  {/* B/S Ratio */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const ratio = getBuySellRatio(signal.pair);
                      return (
                        <div className="flex flex-col gap-1.5 w-20">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 leading-none">
                            <span className="text-emerald-400">{ratio.buy}%</span>
                            <span className="text-rose-400">{ratio.sell}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                            {ratio.buy > 0 && <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${ratio.buy}%` }}></div>}
                            {ratio.sell > 0 && <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${ratio.sell}%` }}></div>}
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1.5 font-bold text-sm ${signal.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {signal.action === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {signal.action}
                    </div>
                  </td>

                  {/* Entry Price */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm text-slate-400">
                    {formatPrice(signal.entryPrice, signal.precision)}
                  </td>

                  {/* Current Price */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm relative">
                     <AnimatedPrice signal={signal} />
                  </td>

                  {/* Take Profit */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm text-emerald-400/80">
                    {formatPrice(signal.takeProfit, signal.precision)}
                  </td>

                  {/* Stop Loss */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm text-rose-400/80">
                    {formatPrice(signal.stopLoss, signal.precision)}
                  </td>

                  {/* Pips */}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold">
                    <div className={`px-2 py-1 rounded inline-block bg-slate-900/50 min-w-[60px] text-center ${signal.pips > 0 ? 'text-emerald-400' : signal.pips < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {signal.pips > 0 ? '+' : ''}{signal.pips.toFixed(1)}
                    </div>
                  </td>

                  {/* Status & Time */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {signal.status === 'ACTIVE' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          ACTIVE
                        </span>
                      )}
                      {signal.status === 'PENDING' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      )}
                      {signal.status === 'PROFIT' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> TP HIT
                        </span>
                      )}
                      {signal.status === 'LOSS' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                          <XCircle className="w-3 h-3" /> SL HIT
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatTime(signal.time)}
                      </span>
                    </div>
                  </td>

                  {/* Chart Overlay */}
                  <td className="px-6 py-4 whitespace-nowrap">
                     <MiniChart signal={signal} />
                  </td>

                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
