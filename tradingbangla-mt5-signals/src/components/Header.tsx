import { Activity, Radio, Info } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
}

export function Header({ isConnected }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 p-[1px]">
            <div className="w-full h-full rounded-xl bg-[#0B0F19] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/10"></div>
                <Activity className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
              Trading Bangla <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">Aura AI</span>
            </h1>
            <p className="text-xs text-slate-400">World-Class XAU/USD & Forex Signals</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
             <Info className="w-4 h-4 text-slate-400" />
             <span className="text-xs text-slate-400">Low Latency Feed</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
             <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-500'}`} />
             <span className="text-xs font-mono font-medium">
               {isConnected ? (
                   <span className="text-emerald-400">SESSION_ACTIVE</span>
               ) : (
                   <span className="text-slate-500">CONNECTING...</span>
               )}
             </span>
          </div>
        </div>

      </div>
    </header>
  );
}
