import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSignalBot } from '@/hooks/useSignalBot';
import { useAllPrices } from '@/hooks/useMarketData';
import ProChart from '@/components/ProChart';
import Watchlist from '@/components/Watchlist';
import OrderPanel from '@/components/OrderPanel';
import MarketOverview from '@/components/MarketOverview';
import PortfolioPanel from '@/components/PortfolioPanel';
import NewsFeed from '@/components/NewsFeed';
import EconomicCalendar from '@/components/EconomicCalendar';
import PriceAlertsPanel from '@/components/PriceAlertsPanel';
import ForexSessionClock from '@/components/ForexSessionClock';
import AnimatedBackground from '@/components/AnimatedBackground';
import { LayoutDashboard, List, NewspaperIcon, CalendarDays, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mobileTabs = [
  { key: 'chart', icon: LayoutDashboard, label: 'Chart' },
  { key: 'trade', icon: List, label: 'Trade' },
  { key: 'news', icon: NewspaperIcon, label: 'News' },
  { key: 'calendar', icon: CalendarDays, label: 'Calendar' },
  { key: 'alerts', icon: Bell, label: 'Alerts' },
] as const;

// Pairs shown in the stats bar
const STAT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'] as const;
const STAT_LABELS: Record<string, string> = {
  XAUUSD: 'XAU/USD', EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY', BTCUSD: 'BTC/USD',
};

function StatBar({ darkMode }: { darkMode: boolean }) {
  const livePrices = useAllPrices();
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, 'up' | 'down' | null>>({});

  useEffect(() => {
    const newFlash: Record<string, 'up' | 'down' | null> = {};
    let hasChange = false;
    STAT_PAIRS.forEach(sym => {
      const cur = livePrices[sym]?.bid;
      const prev = prevPrices[sym];
      if (cur !== undefined && prev !== undefined && cur !== prev) {
        newFlash[sym] = cur > prev ? 'up' : 'down';
        hasChange = true;
      }
    });
    if (hasChange) {
      setFlash(newFlash);
      const newPrev: Record<string, number> = {};
      STAT_PAIRS.forEach(sym => { if (livePrices[sym]?.bid) newPrev[sym] = livePrices[sym].bid; });
      setPrevPrices(newPrev);
      const t = setTimeout(() => setFlash({}), 600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePrices]);

  return (
    <div className={`rounded-2xl border px-4 py-3 ${darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
        {STAT_PAIRS.map(sym => {
          const q = livePrices[sym];
          if (!q) return null;
          const chg = q.changePercent ?? 0;
          const isPos = chg >= 0;
          const f = flash[sym];
          return (
            <div key={sym} className="flex items-center gap-2.5 shrink-0">
              <div>
                <p className={`text-[10px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{STAT_LABELS[sym]}</p>
                <p className={`text-sm font-bold tabular-nums transition-colors duration-300 ${
                  f === 'up' ? 'text-green-400'
                    : f === 'down' ? 'text-red-400'
                    : darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {sym.includes('JPY') ? q.bid.toFixed(3)
                    : sym === 'XAUUSD' || sym === 'BTCUSD' ? q.bid.toFixed(2)
                    : q.bid.toFixed(5)}
                </p>
              </div>
              <div className={`flex items-center gap-0.5 text-[10px] font-medium ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPos ? '+' : ''}{chg.toFixed(2)}%
              </div>
              <div className={`w-px h-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} last-child:hidden`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { darkMode, t } = useApp();
  const { user, isLoggedIn } = useAuth();
  const { status: botStatus, latestSignal } = useSignalBot();
  const [mobileTab, setMobileTab] = useState<string>('chart');

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5">
        {/* Welcome + Bot status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('welcomeBack')}{isLoggedIn && user ? `, ${user.name}` : ''} 👋
            </h1>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('paperTrading')} • {t('demoAccount')}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
            botStatus === 'connected'
              ? 'bg-green-500/15 text-green-400'
              : 'bg-red-500/15 text-red-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${botStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {botStatus === 'connected' ? 'Bot Connected' : 'Bot Offline'}
          </div>
        </div>

        {/* Real-time Stats Bar */}
        <StatBar darkMode={darkMode} />

        {/* === DESKTOP LAYOUT === */}
        <div className="hidden lg:block space-y-5">
          {/* Row 1: Watchlist | Chart | Order + Session */}
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <Watchlist compact />
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2">
              <ProChart darkMode={darkMode} latestSignal={latestSignal} botStatus={botStatus} />
            </div>
            <div className="lg:col-span-3 order-3 space-y-5">
              <OrderPanel />
              <ForexSessionClock />
            </div>
          </div>

          {/* Row 2: Portfolio | News | Calendar + Alerts */}
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4"><PortfolioPanel /></div>
            <div className="lg:col-span-4"><NewsFeed /></div>
            <div className="lg:col-span-4 space-y-5">
              <EconomicCalendar />
              <PriceAlertsPanel />
            </div>
          </div>
        </div>

        {/* === MOBILE/TABLET LAYOUT === */}
        <div className="lg:hidden space-y-4">
          {/* Tabs */}
          <div className={`flex rounded-2xl p-1 border ${darkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white'}`}>
            {mobileTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[10px] font-medium transition-all ${
                  mobileTab === tab.key
                    ? darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                    : darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {mobileTab === 'chart' && (
              <motion.div key="chart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <ProChart darkMode={darkMode} latestSignal={latestSignal} botStatus={botStatus} />
                <Watchlist compact />
              </motion.div>
            )}
            {mobileTab === 'trade' && (
              <motion.div key="trade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <OrderPanel />
                <PortfolioPanel />
                <MarketOverview />
              </motion.div>
            )}
            {mobileTab === 'news' && (
              <motion.div key="news" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <NewsFeed />
              </motion.div>
            )}
            {mobileTab === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <ForexSessionClock />
                <EconomicCalendar />
              </motion.div>
            )}
            {mobileTab === 'alerts' && (
              <motion.div key="alerts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <PriceAlertsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
