import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Clock } from 'lucide-react';

interface Session {
  name: string;
  city: string;
  open: number;  // UTC hour (0-23)
  close: number; // UTC hour (0-23)
  color: string;
  pairs: string;
}

const SESSIONS: Session[] = [
  { name: 'Sydney',   city: 'AUS',    open: 22, close: 7,  color: 'blue',   pairs: 'AUD/USD NZD/USD' },
  { name: 'Tokyo',    city: 'JPN',    open: 0,  close: 9,  color: 'red',    pairs: 'USD/JPY GBP/JPY' },
  { name: 'London',   city: 'UK',     open: 8,  close: 17, color: 'purple', pairs: 'EUR/USD GBP/USD' },
  { name: 'New York', city: 'USA',    open: 13, close: 22, color: 'green',  pairs: 'EUR/USD XAU/USD' },
];

const SESSION_COLORS: Record<string, { bg: string; text: string; ring: string; dark: { bg: string; text: string } }> = {
  blue:   { bg: 'bg-blue-500/15',   text: 'text-blue-400',   ring: 'ring-blue-400',   dark: { bg: 'bg-blue-500/10',   text: 'text-blue-400' } },
  red:    { bg: 'bg-red-500/15',    text: 'text-red-400',    ring: 'ring-red-400',    dark: { bg: 'bg-red-500/10',    text: 'text-red-400' } },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', ring: 'ring-purple-400', dark: { bg: 'bg-purple-500/10', text: 'text-purple-400' } },
  green:  { bg: 'bg-green-500/15',  text: 'text-green-400',  ring: 'ring-green-400',  dark: { bg: 'bg-green-500/10',  text: 'text-green-400' } },
};

function isSessionOpen(session: Session, utcHour: number, utcMinute: number): boolean {
  const utcFrac = utcHour + utcMinute / 60;
  if (session.open < session.close) {
    return utcFrac >= session.open && utcFrac < session.close;
  }
  // Crosses midnight (e.g. Sydney: 22-7)
  return utcFrac >= session.open || utcFrac < session.close;
}

function minutesUntilOpen(session: Session, utcHour: number, utcMinute: number): number {
  const now = utcHour * 60 + utcMinute;
  const open = session.open * 60;
  let diff = open - now;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

function formatMins(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function utcBar(session: Session): { left: string; width: string } {
  if (session.open < session.close) {
    return {
      left: `${(session.open / 24) * 100}%`,
      width: `${((session.close - session.open) / 24) * 100}%`,
    };
  }
  // Wraps midnight — just show the part from open to 24h for simplicity
  return {
    left: `${(session.open / 24) * 100}%`,
    width: `${((24 - session.open) / 24) * 100}%`,
  };
}

export default function ForexSessionClock() {
  const { darkMode } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const utcTimeStr = `${String(utcH).padStart(2, '0')}:${String(utcM).padStart(2, '0')} UTC`;

  const openSessions = SESSIONS.filter(s => isSessionOpen(s, utcH, utcM));
  const isOverlap = openSessions.length >= 2;

  return (
    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Market Sessions</h3>
          {isOverlap && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 animate-pulse">
              OVERLAP
            </span>
          )}
        </div>
        <span className={`text-xs tabular-nums font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{utcTimeStr}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Sessions */}
        {SESSIONS.map(session => {
          const open = isSessionOpen(session, utcH, utcM);
          const colors = SESSION_COLORS[session.color];
          const minsLeft = open
            ? null
            : minutesUntilOpen(session, utcH, utcM);
          const bar = utcBar(session);
          return (
            <div key={session.name} className={`rounded-xl p-3 border transition-all ${
              open
                ? darkMode
                  ? `border-${session.color}-500/30 ${colors.bg}`
                  : `border-${session.color}-200 ${colors.bg}`
                : darkMode
                  ? 'border-gray-800/50 bg-gray-900/30'
                  : 'border-gray-100 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full ${open ? `${colors.bg.replace('/15', '')} ${open ? 'animate-pulse' : ''}` : 'bg-gray-600'}`}
                    style={{ background: open ? undefined : '#4b5563' }}
                  >
                    <span className={`block w-2 h-2 rounded-full ${open ? 'animate-ping opacity-75' : ''}`}
                      style={{ background: open
                        ? session.color === 'blue' ? '#60a5fa'
                          : session.color === 'red' ? '#f87171'
                          : session.color === 'purple' ? '#c084fc'
                          : '#4ade80'
                        : 'transparent'
                      }}
                    />
                  </span>
                  <div>
                    <span className={`text-xs font-bold ${open ? colors.text : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {session.name}
                    </span>
                    <span className={`text-[9px] ml-1.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{session.city}</span>
                  </div>
                </div>
                <div className="text-right">
                  {open ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      darkMode ? `${colors.bg} ${colors.text}` : `${colors.bg} ${colors.text}`
                    }`}>OPEN</span>
                  ) : (
                    <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      Opens in {formatMins(minsLeft!)}
                    </span>
                  )}
                </div>
              </div>
              {/* UTC time bar */}
              <div className={`mt-2 h-1 rounded-full relative ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <div className="absolute h-full rounded-full" style={{
                  left: bar.left,
                  width: bar.width,
                  background: session.color === 'blue' ? '#60a5fa'
                    : session.color === 'red' ? '#f87171'
                    : session.color === 'purple' ? '#c084fc'
                    : '#4ade80',
                  opacity: open ? 1 : 0.35,
                }} />
                {/* Current time marker */}
                <div className="absolute w-0.5 h-full bg-white/60 rounded-full"
                  style={{ left: `${((utcH * 60 + utcM) / (24 * 60)) * 100}%` }} />
              </div>
              <div className={`flex justify-between mt-1 text-[9px] ${darkMode ? 'text-gray-700' : 'text-gray-400'}`}>
                <span>{String(session.open).padStart(2, '0')}:00</span>
                <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{session.pairs}</span>
                <span>{String(session.close).padStart(2, '0')}:00</span>
              </div>
            </div>
          );
        })}

        {/* Overlap hint */}
        {isOverlap && (
          <div className={`text-[10px] px-3 py-2 rounded-lg ${darkMode ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
            ⚡ {openSessions.map(s => s.name).join(' + ')} overlap — highest liquidity & volatility period
          </div>
        )}
      </div>
    </div>
  );
}
