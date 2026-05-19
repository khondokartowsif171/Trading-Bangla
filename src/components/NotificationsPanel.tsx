import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Bell, Info, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { getTrades, openTrade, closeTrade, onTradeUpdate } from '@/services/paperTradingService';

interface Notif {
  id: number;
  type: 'info' | 'buy' | 'sell' | 'warn';
  msg: string;
  time: string;
}

let notifId = 0;
const notifListeners = new Set<() => void>();
let globalNotifs: Notif[] = [
  { id: ++notifId, type: 'info', msg: 'EA Dashboard initialized. Demo mode active.', time: 'SYSTEM' },
  { id: ++notifId, type: 'info', msg: 'Binance XAU/USDT WebSocket connected.', time: 'INFO' },
];

export function addNotif(type: Notif['type'], msg: string, time?: string) {
  globalNotifs = [{ id: ++notifId, type, msg, time: time || new Date().toLocaleTimeString('en-GB') }, ...globalNotifs];
  if (globalNotifs.length > 20) globalNotifs = globalNotifs.slice(0, 20);
  notifListeners.forEach(cb => { try { cb(); } catch {} });
}

export default function NotificationsPanel() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const [, setTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = () => notifListeners.delete(up);
    const up = () => setTick(t => t + 1);
    notifListeners.add(up);
    return unsub;
  }, []);

  const icons = { info: Info, buy: TrendingUp, sell: TrendingDown, warn: AlertTriangle };
  const borderColors = { info: 'border-l-blue-500', buy: 'border-l-green-500', sell: 'border-l-red-500', warn: 'border-l-yellow-500' };

  return (
    <div className={`rounded-xl border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
      <div className={`px-3 py-2 border-b flex items-center gap-1.5 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <Bell className="w-3.5 h-3.5 text-yellow-400" />
        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {isBn ? 'নটিফিকেশন' : 'Notifications'}
        </span>
      </div>
      <div ref={listRef} className="max-h-[200px] overflow-y-auto p-2 space-y-1">
        {globalNotifs.map(n => {
          const Icon = icons[n.type];
          return (
            <div key={n.id} className={`flex items-start gap-2 p-2 rounded-lg border-l-2 ${borderColors[n.type]} ${
              darkMode ? 'bg-gray-800/30' : 'bg-gray-50'
            }`}>
              <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${
                n.type === 'info' ? 'text-blue-400' : n.type === 'buy' ? 'text-green-400' : n.type === 'sell' ? 'text-red-400' : 'text-yellow-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[9px] font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{n.time}</p>
                <p className={`text-[10px] ${darkMode ? 'text-gray-300' : 'text-gray-700'} leading-tight`}>{n.msg}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
