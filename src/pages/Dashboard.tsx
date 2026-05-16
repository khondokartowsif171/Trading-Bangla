import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import TradingChart from '@/components/TradingChart';
import Watchlist from '@/components/Watchlist';
import OrderPanel from '@/components/OrderPanel';
import MarketOverview from '@/components/MarketOverview';
import PortfolioPanel from '@/components/PortfolioPanel';
import NewsFeed from '@/components/NewsFeed';
import AnimatedBackground from '@/components/AnimatedBackground';
import { useCryptoAssets, useCryptoSignals } from '@/hooks/useCryptoData';
import { TrendingUp, TrendingDown, LayoutDashboard, List, NewspaperIcon, Coins, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mobileTabs = [
  { key: 'chart', icon: LayoutDashboard, label: 'Chart' },
  { key: 'trade', icon: List, label: 'Trade' },
  { key: 'news', icon: NewspaperIcon, label: 'News' },
] as const;

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export default function Dashboard() {
  const { darkMode, t } = useApp();
  const [mobileTab, setMobileTab] = useState<string>('chart');
  const { assets: cryptos, loading: cryptoLoading } = useCryptoAssets();
  const signals = useCryptoSignals(cryptos);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />
      
      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('welcomeBack')} 👋
            </h1>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('paperTrading')} • {t('demoAccount')}
            </p>
          </div>
        </div>

        {/* === DESKTOP LAYOUT === */}
        <div className="hidden lg:block space-y-6">
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <Watchlist compact />
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2">
              <TradingChart />
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

        {/* === CRYPTO MARKETS SECTION (Desktop) === */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`hidden lg:block rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
          <div className={`px-4 py-3 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <Coins className="w-4 h-4 text-orange-400" />
            <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Crypto Markets <span className={`text-[10px] font-normal ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>— Binance Real-Time</span>
            </h3>
            {cryptoLoading ? (
              <div className="ml-auto w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  {['#', 'Name', 'Price', '24h Change', '24h %', '24h High', '24h Low', 'Volume (USDT)'].map(h => (
                    <th key={h} className={`p-2.5 text-left font-semibold ${darkMode ? 'text-gray-400 bg-gray-900' : 'text-gray-600 bg-gray-50'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cryptos.slice(0, 20).map((c, i) => (
                  <tr key={c.symbol} className={`border-b ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                    <td className="p-2.5 text-gray-500">{i + 1}</td>
                    <td className="p-2.5 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.symbol}
                    </td>
                    <td className={`p-2.5 font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>${formatPrice(c.price)}</td>
                    <td className={`p-2.5 font-mono ${c.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {c.change24h >= 0 ? '+' : ''}{c.change24h.toFixed(2)}
                    </td>
                    <td className="p-2.5">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-[10px] ${c.changePercent24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.changePercent24h >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {c.changePercent24h >= 0 ? '+' : ''}{c.changePercent24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className={`p-2.5 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${formatPrice(c.high24h)}</td>
                    <td className={`p-2.5 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${formatPrice(c.low24h)}</td>
                    <td className={`p-2.5 font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${(c.quoteVolume / 1e9).toFixed(2)}B</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* === CRYPTO SIGNALS (Desktop) === */}
        {signals.length > 0 && (
          <div className="hidden lg:grid grid-cols-3 gap-3">
            {signals.slice(0, 3).map((s, i) => (
              <motion.div key={`${s.symbol}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-3 ${s.signal === 'BUY' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{s.symbol}/USDT</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.signal === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.signal}</span>
                </div>
                <p className="text-xs font-mono text-gray-400 mb-1">${formatPrice(s.entry)}</p>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
                    <div className={`h-full rounded-full ${s.confidence >= 60 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${s.confidence}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-500">{s.confidence}%</span>
                </div>
                <p className="text-[9px] text-gray-500 mt-1">{s.reason}</p>
              </motion.div>
            ))}
          </div>
        )}

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
                <TradingChart />
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

                {/* Mobile Crypto Section */}
                <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
                  <div className={`px-3 py-2.5 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <Coins className="w-3.5 h-3.5 text-orange-400" />
                    <h3 className={`font-semibold text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Crypto Markets
                    </h3>
                    {cryptoLoading ? (
                      <div className="ml-auto w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="ml-auto text-[9px] text-green-400 flex items-center gap-1">
                        <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {cryptos.slice(0, 8).map(c => (
                      <div key={c.symbol} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className={`font-semibold text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>{c.symbol}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>${formatPrice(c.price)}</p>
                          <span className={`text-[9px] font-medium ${c.changePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {c.changePercent24h >= 0 ? '+' : ''}{c.changePercent24h.toFixed(2)}%
                          </span>
                        </div>
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
