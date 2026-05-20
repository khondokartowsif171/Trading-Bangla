import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Calendar, RefreshCw, AlertTriangle } from 'lucide-react';

interface CalendarEvent {
  id: string;
  time: string;
  country: string;
  flag: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  actual: string;
  forecast: string;
  prev: string;
}

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', GB: '🇬🇧', JP: '🇯🇵', CN: '🇨🇳',
  CA: '🇨🇦', AU: '🇦🇺', NZ: '🇳🇿', CH: '🇨🇭', DE: '🇩🇪',
};

// Rich static fallback — major FX/Gold events always visible
const STATIC_EVENTS: CalendarEvent[] = [
  { id: 's1', time: '09:00', country: 'EU', flag: '🇪🇺', event: 'ECB Monetary Policy Statement', impact: 'high', actual: '', forecast: '3.40%', prev: '3.65%' },
  { id: 's2', time: '12:30', country: 'US', flag: '🇺🇸', event: 'Core CPI m/m', impact: 'high', actual: '', forecast: '0.3%', prev: '0.4%' },
  { id: 's3', time: '14:00', country: 'US', flag: '🇺🇸', event: 'FOMC Meeting Minutes', impact: 'high', actual: '', forecast: '', prev: '' },
  { id: 's4', time: '14:30', country: 'US', flag: '🇺🇸', event: 'Initial Jobless Claims', impact: 'medium', actual: '', forecast: '215K', prev: '218K' },
  { id: 's5', time: '16:00', country: 'US', flag: '🇺🇸', event: 'ISM Services PMI', impact: 'medium', actual: '', forecast: '51.2', prev: '50.8' },
  { id: 's6', time: '07:00', country: 'GB', flag: '🇬🇧', event: 'BOE Interest Rate Decision', impact: 'high', actual: '', forecast: '5.00%', prev: '5.25%' },
  { id: 's7', time: '08:30', country: 'US', flag: '🇺🇸', event: 'Non-Farm Payrolls', impact: 'high', actual: '', forecast: '185K', prev: '175K' },
  { id: 's8', time: '10:00', country: 'US', flag: '🇺🇸', event: 'University of Michigan Sentiment', impact: 'medium', actual: '', forecast: '67.5', prev: '66.4' },
  { id: 's9', time: '15:30', country: 'US', flag: '🇺🇸', event: 'Crude Oil Inventories', impact: 'medium', actual: '', forecast: '-1.8M', prev: '0.5M' },
  { id: 's10', time: '07:45', country: 'EU', flag: '🇪🇺', event: 'EU CPI Flash Estimate y/y', impact: 'high', actual: '', forecast: '2.4%', prev: '2.6%' },
];

async function fetchFinnhubCalendar(): Promise<CalendarEvent[]> {
  if (!FINNHUB_KEY) return [];
  try {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const to = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0];
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const events = (data.economicCalendar || []) as {
      country: string; event: string; time: string; impact: string;
      actual: number | null; estimate: number | null; prev: number | null; unit: string;
    }[];
    return events.slice(0, 12).map((e, i) => ({
      id: `f${i}`,
      time: e.time ? e.time.split('T')[1]?.slice(0, 5) || 'All Day' : 'All Day',
      country: e.country || 'US',
      flag: FLAG_MAP[e.country] || '🌐',
      event: e.event,
      impact: (e.impact === 'high' ? 'high' : e.impact === 'medium' ? 'medium' : 'low') as CalendarEvent['impact'],
      actual: e.actual != null ? `${e.actual}${e.unit || ''}` : '',
      forecast: e.estimate != null ? `${e.estimate}${e.unit || ''}` : '',
      prev: e.prev != null ? `${e.prev}${e.unit || ''}` : '',
    }));
  } catch { return []; }
}

const impactColor = (impact: string) => {
  if (impact === 'high') return 'bg-red-500';
  if (impact === 'medium') return 'bg-yellow-500';
  return 'bg-gray-400';
};

const impactLabel = (impact: string) => {
  if (impact === 'high') return 'text-red-400';
  if (impact === 'medium') return 'text-yellow-400';
  return 'text-gray-400';
};

export default function EconomicCalendar() {
  const { darkMode } = useApp();
  const [events, setEvents] = useState<CalendarEvent[]>(STATIC_EVENTS);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high'>('all');

  const load = async () => {
    setLoading(true);
    const live = await fetchFinnhubCalendar();
    if (live.length > 0) { setEvents(live); setIsLive(true); }
    else setEvents(STATIC_EVENTS);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'high' ? events.filter(e => e.impact === 'high') : events;

  return (
    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Economic Calendar</h3>
          {isLive && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/20">LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Filter */}
          <button
            onClick={() => setFilter(f => f === 'all' ? 'high' : 'all')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              filter === 'high'
                ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            High Impact
          </button>
          <button onClick={load} disabled={loading}
            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="overflow-y-auto max-h-[380px]">
        {filtered.map(ev => (
          <div
            key={ev.id}
            className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 ${
              darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'
            } transition-colors`}
          >
            {/* Impact dot */}
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${impactColor(ev.impact)}`} />

            {/* Time */}
            <span className={`text-[10px] font-mono w-10 shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{ev.time}</span>

            {/* Flag + country */}
            <span className="text-sm shrink-0">{ev.flag}</span>

            {/* Event name */}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{ev.event}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[9px] font-bold uppercase ${impactLabel(ev.impact)}`}>{ev.impact}</span>
                <span className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{ev.country}</span>
              </div>
            </div>

            {/* Actual / Forecast / Prev */}
            <div className="shrink-0 text-right space-y-0.5">
              {ev.actual ? (
                <div className="text-[10px] font-bold text-green-400">{ev.actual}</div>
              ) : ev.forecast ? (
                <div className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>F: {ev.forecast}</div>
              ) : null}
              {ev.prev && (
                <div className={`text-[9px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>P: {ev.prev}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={`px-4 py-2 text-[10px] ${darkMode ? 'text-gray-600 bg-gray-900/50' : 'text-gray-400 bg-gray-50'}`}>
        {isLive ? 'Live data from Finnhub — next 7 days' : 'Sample events — add VITE_FINNHUB_API_KEY for live data'}
      </div>
    </div>
  );
}
