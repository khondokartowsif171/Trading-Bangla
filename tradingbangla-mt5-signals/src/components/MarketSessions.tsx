import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';

interface Session {
  name: string;
  start: number; // UTC Hour (0-23)
  end: number;   // UTC Hour (0-23)
  color: string;
}

const SESSIONS: Session[] = [
  { name: 'Sydney', start: 22, end: 7, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { name: 'Tokyo', start: 0, end: 9, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { name: 'London', start: 8, end: 17, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { name: 'New York', start: 13, end: 22, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
];

export function MarketSessions() {
  const [currentUTCHour, setCurrentUTCHour] = useState(new Date().getUTCHours());
  const [currentMinutes, setCurrentMinutes] = useState(new Date().getUTCMinutes());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentUTCHour(now.getUTCHours());
      setCurrentMinutes(now.getUTCMinutes());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const isSessionActive = (start: number, end: number) => {
    if (start < end) {
      return currentUTCHour >= start && currentUTCHour < end;
    } else {
      // Crosses midnight UTC (e.g., Sydney 22 to 7)
      return currentUTCHour >= start || currentUTCHour < end;
    }
  };

  const formattedTime = `${currentUTCHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')} UTC`;

  return (
    <div className="bg-[#0f1423] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Market Sessions
        </h3>
        <span className="text-xs font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
          {formattedTime}
        </span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SESSIONS.map((session) => {
          const active = isSessionActive(session.start, session.end);
          return (
            <div 
              key={session.name}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-500 relative overflow-hidden ${
                active 
                  ? session.color 
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500'
              }`}
            >
              <span className="text-sm font-semibold relative z-10">{session.name}</span>
              <span className="text-[10px] font-mono tracking-wider opacity-70 mt-1 relative z-10">
                {session.start.toString().padStart(2, '0')}:00 - {session.end.toString().padStart(2, '0')}:00
              </span>
              
              {active && (
                <motion.div
                  className="absolute inset-0 bg-current opacity-5"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
