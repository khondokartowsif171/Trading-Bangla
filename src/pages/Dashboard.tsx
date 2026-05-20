import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSignalBot } from '@/hooks/useSignalBot';
import ProChart from '@/components/ProChart';
import Watchlist from '@/components/Watchlist';
import OrderPanel from '@/components/OrderPanel';
import MarketOverview from '@/components/MarketOverview';
import PortfolioPanel from '@/components/PortfolioPanel';
import NewsFeed from '@/components/NewsFeed';
import AnimatedBackground from '@/components/AnimatedBackground';
import { LayoutDashboard, List, NewspaperIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mobileTabs = [
  { key: 'chart', icon: LayoutDashboard, label: 'Chart' },
  { key: 'trade', icon: List, label: 'Trade' },
  { key: 'news', icon: NewspaperIcon, label: 'News' },
] as const;

export default function Dashboard() {
  const { darkMode, t } = useApp();
  const { user, isLoggedIn } = useAuth();
  const { status: botStatus, latestSignal } = useSignalBot();
  const [mobileTab, setMobileTab] = useState<string>('chart');

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />
      
      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Welcome */}
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
            <span className={`w-1.5 h-1.5 rounded-full ${botStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
            {botStatus === 'connected' ? 'Bot Connected' : 'Bot Offline'}
          </div>
        </div>

        {/* === DESKTOP LAYOUT === */}
        <div className="hidden lg:block space-y-6">
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <Watchlist compact />
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2">
              <ProChart darkMode={darkMode} latestSignal={latestSignal} botStatus={botStatus} />
            </div>
            <div className="lg:col-span-3 order-3 space-y-6">
              <OrderPanel />
              <MarketOverview />
            </div>
          </div>
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5"><PortfolioPanel /></div>
            <div className="lg:col-span-4"><NewsFeed /></div>
            <div className="lg:col-span-3">
              <div className={`rounded-2xl border p-4 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
                <h3 className={`font-semibold text-sm mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('market')} {darkMode ? '🌙' : '☀️'}
                </h3>
                <div className="space-y-3">
                  {[
                    ['S&P 500', '5,234.18', '+0.32%', 'text-green-500'],
                    ['NASDAQ', '18,435.72', '+0.54%', 'text-green-500'],
                    ['DSEX (Dhaka)', '6,234.50', '+0.18%', 'text-green-500'],
                    ['BTC Dominance', '52.4%', '', darkMode ? 'text-gray-300' : 'text-gray-700'],
                    ['Fear & Greed', '65 — Greed', '', 'text-yellow-500'],
                  ].map(([name, val, change, cls]) => (
                    <div key={name} className={`flex justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span>{name}</span>
                      <span className={cls || ''}>{val} {change && <span className={cls}>({change})</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === MOBILE/TABLET SMART VIEW === */}
        <div className="lg:hidden space-y-4">
          {/* Mobile Tabs Switcher */}
          <div className={`flex rounded-2xl p-1 border ${darkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white'}`}>
            {mobileTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  mobileTab === tab.key
                    ? darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                    : darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {mobileTab === 'chart' && (
              <motion.div
                key="chart"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <ProChart darkMode={darkMode} latestSignal={latestSignal} botStatus={botStatus} />
                <Watchlist compact />
              </motion.div>
            )}

            {mobileTab === 'trade' && (
              <motion.div
                key="trade"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <OrderPanel />
                <PortfolioPanel />
                <MarketOverview />
              </motion.div>
            )}

            {mobileTab === 'news' && (
              <motion.div
                key="news"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <NewsFeed />
                <div className={`rounded-2xl border p-4 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
                  <h3 className={`font-semibold text-sm mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t('market')} Snapshot
                  </h3>
                  <div className="space-y-2.5">
                    {[
                      ['S&P 500', '5,234.18', '+0.32%'],
                      ['NASDAQ', '18,435.72', '+0.54%'],
                      ['DSEX', '6,234.50', '+0.18%'],
                      ['BTC Dom.', '52.4%', ''],
                    ].map(([name, val, chg]) => (
                      <div key={name} className="flex justify-between text-xs">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{name}</span>
                        <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                          {val} {chg && <span className="text-green-500">({chg})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
