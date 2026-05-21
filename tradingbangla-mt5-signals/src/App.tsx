import { useState } from 'react';
import { Header } from './components/Header';
import { SignalTable } from './components/SignalTable';
import { MarketSessions } from './components/MarketSessions';
import { useSignals } from './hooks/useSignals';
import { Activity, BarChart2, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const { signals, isConnected, addManualEurusdBuySignal } = useSignals();
  const [timeframeFilter, setTimeframeFilter] = useState<string>('ALL');

  // Calculate some simple stats
  const activeCount = signals.filter(s => s.status === 'ACTIVE').length;
  const activeBuyCount = signals.filter(s => s.status === 'ACTIVE' && s.action === 'BUY').length;
  const activeSellCount = signals.filter(s => s.status === 'ACTIVE' && s.action === 'SELL').length;
  const profitCount = signals.filter(s => s.status === 'PROFIT').length;
  const totalPips = signals.reduce((acc, s) => acc + (s.status === 'PROFIT' || s.status === 'LOSS' || s.status === 'ACTIVE' ? s.pips : 0), 0);

  const filteredSignals = timeframeFilter === 'ALL' 
    ? signals 
    : signals.filter(s => s.timeframe === timeframeFilter);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19]">
      <Header isConnected={isConnected} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        <MarketSessions />

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Active Signals" 
            value={isConnected ? activeCount.toString() : '...'} 
            icon={<Activity className="w-5 h-5 text-blue-400" />} 
            color="border-blue-500/20 bg-blue-500/5 text-blue-400"
            subtext={
              isConnected ? (
                <div className="flex gap-3 text-xs mt-2 font-mono">
                  <span className="text-emerald-400 font-semibold">{activeBuyCount} Buys</span>
                  <span className="text-rose-400 font-semibold">{activeSellCount} Sells</span>
                </div>
              ) : null
            }
          />
          <StatCard 
            title="Total Pips (Session)" 
            value={isConnected ? `${totalPips > 0 ? '+' : ''}${totalPips.toFixed(1)}` : '...'} 
            icon={<BarChart2 className="w-5 h-5 text-purple-400" />} 
            color="border-purple-500/20 bg-purple-500/5 text-purple-400"
          />
          <StatCard 
            title="Winning Trades" 
            value={isConnected ? profitCount.toString() : '...'} 
            icon={<Zap className="w-5 h-5 text-emerald-400" />} 
            color="border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
          />
        </div>

        {/* Main Signal Area */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
               <h2 className="text-xl font-semibold text-slate-100 tracking-tight">Live Market Scanner</h2>
               {isConnected && (
                 <button
                   onClick={addManualEurusdBuySignal}
                   className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-colors"
                 >
                   <TrendingUp className="w-3.5 h-3.5" />
                   Generate EURUSD Buy
                 </button>
               )}
             </div>
             <div className="flex items-center gap-2">
                <div className="flex bg-[#0f1423] p-1 rounded-lg border border-slate-800">
                  {['ALL', 'M5', 'M15', 'H1', 'H4'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframeFilter(tf)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        timeframeFilter === tf 
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
             </div>
          </div>
          
          {isConnected ? (
             <SignalTable signals={filteredSignals} />
          ) : (
            <div className="h-64 w-full rounded-2xl bg-[#0f1423] border border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-4">
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               >
                 <Activity className="w-8 h-8 opacity-20" />
               </motion.div>
               <p className="font-mono text-sm tracking-widest uppercase">Initializing MT5 Core...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtext }: { title: string, value: string, icon: React.ReactNode, color: string, subtext?: React.ReactNode }) {
  return (
    <div className="bg-[#0f1423] border border-slate-800 rounded-xl p-5 flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">{title}</span>
        <span className="text-2xl font-bold font-mono text-slate-200">{value}</span>
        {subtext}
      </div>
      <div className={`p-3 rounded-lg border ${color} shrink-0`}>
        {icon}
      </div>
    </div>
  );
}
