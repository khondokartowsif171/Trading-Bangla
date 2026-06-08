import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSignalBot } from '@/hooks/useSignalBot';
import { useAllPrices } from '@/hooks/useMarketData';
import PortfolioPanel from '@/components/PortfolioPanel';
import NewsFeed from '@/components/NewsFeed';
import EconomicCalendar from '@/components/EconomicCalendar';
import PriceAlertsPanel from '@/components/PriceAlertsPanel';
import ForexSessionClock from '@/components/ForexSessionClock';
import AnimatedBackground from '@/components/AnimatedBackground';
import {
  TrendingUp, TrendingDown, Wifi, WifiOff,
  NewspaperIcon, CalendarDays, Bell, LayoutGrid,
  Wallet, Activity, BarChart2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Top stat pairs ────────────────────────────────────────────────────────────
const STAT_PAIRS = [
  { key: 'XAUUSD', label: 'XAU/USD', dec: 2 },
  { key: 'EURUSD', label: 'EUR/USD', dec: 5 },
  { key: 'GBPUSD', label: 'GBP/USD', dec: 5 },
  { key: 'USDJPY', label: 'USD/JPY', dec: 3 },
  { key: 'BTCUSD', label: 'BTC/USD', dec: 2 },
];

// ─── Mobile tabs ───────────────────────────────────────────────────────────────
const MOBILE_TABS = [
  { key: 'overview',  icon: LayoutGrid,     label: 'Overview'  },
  { key: 'news',      icon: NewspaperIcon,  label: 'News'      },
  { key: 'calendar',  icon: CalendarDays,   label: 'Calendar'  },
  { key: 'alerts',    icon: Bell,           label: 'Alerts'    },
] as const;

// ─── Price Flash component ─────────────────────────────────────────────────────
function LivePriceBar({ darkMode }: { darkMode: boolean }) {
  const livePrices = useAllPrices();
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'dn'>>({});
  const [prev, setPrev] = useState<Record<string, number>>({});

  useEffect(() => {
    const newFlash: Record<string, 'up' | 'dn'> = {};
    let changed = false;
    STAT_PAIRS.forEach(({ key }) => {
      const cur = livePrices[key]?.bid;
      const p   = prev[key];
      if (cur !== undefined && p !== undefined && cur !== p) {
        newFlash[key] = cur > p ? 'up' : 'dn';
        changed = true;
      }
    });
    if (changed) {
      setFlashes(newFlash);
      const np: Record<string, number> = {};
      STAT_PAIRS.forEach(({ key }) => { const b = livePrices[key]?.bid; if (b) np[key] = b; });
      setPrev(np);
      const t = setTimeout(() => setFlashes({}), 700);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrices]);

  return (
    <div className={`rounded-2xl border px-5 py-3.5 ${darkMode ? 'border-gray-800 bg-gray-900/70' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
        {STAT_PAIRS.map(({ key, label, dec }) => {
          const q = livePrices[key];
          if (!q) return null;
          const chg = q.changePercent ?? 0;
          const isPos = chg >= 0;
          const fl = flashes[key];
          return (
            <div key={key} className="flex items-center gap-3 shrink-0">
              <div>
                <p className={`text-[10px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
                <p className={`text-base font-bold tabular-nums transition-colors duration-500 ${
                  fl === 'up' ? 'text-green-400' : fl === 'dn' ? 'text-red-400' : darkMode ? 'text-white' : 'text-gray-900'
                }`}>{q.bid.toFixed(dec)}</p>
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPos ? '+' : ''}{chg.toFixed(2)}%
              </div>
              <div className={`w-px h-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} />
            </div>
          );
        })}
        {/* Spread indicator for last item */}
        <div className="shrink-0 ml-auto">
          <p className={`text-[9px] ${darkMode ? 'text-gray-700' : 'text-gray-400'}`}>Live Prices</p>
          <p className="text-[9px] text-green-400 font-medium">● Real-time</p>
        </div>
      </div>
    </div>
  );
}

// ─── Account Mini Stats ────────────────────────────────────────────────────────
function AccountStats({ darkMode, balance }: { darkMode: boolean; balance: number }) {
  const dm = darkMode;
  const stats = [
    { label: 'Demo Balance',   val: `$${balance.toLocaleString()}`,  icon: Wallet,    color: dm ? 'text-indigo-400' : 'text-indigo-600', bg: dm ? 'bg-indigo-500/10' : 'bg-indigo-50' },
    { label: 'Equity',         val: `$${balance.toLocaleString()}`,  icon: BarChart2, color: 'text-green-400',                           bg: dm ? 'bg-green-500/10' : 'bg-green-50' },
    { label: 'Open Positions', val: '0',                             icon: Activity,  color: dm ? 'text-yellow-400' : 'text-yellow-600', bg: dm ? 'bg-yellow-500/10' : 'bg-yellow-50' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(s => (
        <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${dm ? 'border-gray-800 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
            <s.icon className={`w-4.5 h-4.5 ${s.color}`} style={{ width: 18, height: 18 }} />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] ${dm ? 'text-gray-500' : 'text-gray-400'} truncate`}>{s.label}</p>
            <p className={`text-sm font-bold tabular-nums ${dm ? 'text-white' : 'text-gray-900'}`}>{s.val}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { darkMode, t, balance } = useApp();
  const { user, isLoggedIn } = useAuth();
  const { status: botStatus } = useSignalBot();
  const [mobileTab, setMobileTab] = useState<string>('overview');

  const dm = darkMode;

  return (
    <div className={`min-h-screen ${dm ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-5 space-y-5">

        {/* ── Welcome Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={`text-xl md:text-2xl font-bold ${dm ? 'text-white' : 'text-gray-900'}`}>
              {t('welcomeBack')}{isLoggedIn && user ? `, ${user.name}` : ''} 👋
            </h1>
            <p className={`text-xs md:text-sm mt-0.5 ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('paperTrading')} · {t('demoAccount')}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium shrink-0 ${
            botStatus === 'connected'
              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/15'
          }`}>
            {botStatus === 'connected'
              ? <><Wifi className="w-3.5 h-3.5" /> Bot Connected</>
              : <><WifiOff className="w-3.5 h-3.5" /> Bot Offline</>}
          </div>
        </div>

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden lg:block space-y-5">

          {/* Live price bar */}
          <LivePriceBar darkMode={dm} />

          {/* Account mini stats */}
          <AccountStats darkMode={dm} balance={balance} />

          {/* Row 1 — News (left wide) | Market Sessions (right) */}
          <div className="grid grid-cols-12 gap-5">
            {/* News - takes most width */}
            <div className="col-span-8">
              <NewsFeed />
            </div>
            {/* Market Sessions */}
            <div className="col-span-4">
              <ForexSessionClock />
            </div>
          </div>

          {/* Row 2 — Portfolio | Economic Calendar | Price Alerts */}
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-4">
              <PortfolioPanel />
            </div>
            <div className="col-span-5">
              <EconomicCalendar />
            </div>
            <div className="col-span-3">
              <PriceAlertsPanel />
            </div>
          </div>

        </div>

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden space-y-4">

          {/* Live price bar (mobile) */}
          <LivePriceBar darkMode={dm} />

          {/* Tabs */}
          <div className={`grid grid-cols-4 rounded-2xl p-1 border gap-1 ${dm ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white'}`}>
            {MOBILE_TABS.map(tab => (
              <button key={tab.key} onClick={() => setMobileTab(tab.key)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-medium transition-all ${
                  mobileTab === tab.key
                    ? dm ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                    : dm ? 'text-gray-500' : 'text-gray-400'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mobileTab === 'overview' && (
              <motion.div key="overview"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4">
                <AccountStats darkMode={dm} balance={balance} />
                <ForexSessionClock />
                <PortfolioPanel />
              </motion.div>
            )}
            {mobileTab === 'news' && (
              <motion.div key="news"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <NewsFeed />
              </motion.div>
            )}
            {mobileTab === 'calendar' && (
              <motion.div key="calendar"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <EconomicCalendar />
              </motion.div>
            )}
            {mobileTab === 'alerts' && (
              <motion.div key="alerts"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <PriceAlertsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
