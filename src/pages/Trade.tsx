import { useState, Suspense, lazy } from 'react';
import { useApp } from '@/context/AppContext';
import TradingChart from '@/components/TradingChart';
import Watchlist from '@/components/Watchlist';
import OrderPanel from '@/components/OrderPanel';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ArrowUpDown, Clock, LayoutDashboard, List, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MT5TerminalPanel = lazy(() => import('@/components/MT5TerminalPanel'));

const mobileTabs = [
  { key: 'chart', icon: LayoutDashboard, label: 'Chart' },
  { key: 'order', icon: List, label: 'Order' },
  { key: 'history', icon: Clock, label: 'History' },
] as const;

export default function Trade() {
  const { darkMode, t, trades, orders, lang } = useApp();
  const isBn = lang === 'bn';
  const [mobileTab, setMobileTab] = useState<string>('chart');
  const [mode, setMode] = useState<'classic' | 'mt5'>('classic');

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />
      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('forexMT5')}
            </h1>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {mode === 'classic'
                ? `${t('paperTrading')} • ${t('demoAccount')}`
                : (isBn ? 'MT5 স্টাইল মার্কেট ওয়াচ ও চার্ট' : 'MT5-style Market Watch & Charts')}
            </p>
          </div>
          <div className={`flex rounded-xl p-0.5 border self-start ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
            <button onClick={() => setMode('classic')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'classic'
                  ? darkMode ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 shadow-sm'
                  : darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
              {isBn ? 'পেপার ট্রেড' : 'Paper Trade'}
            </button>
            <button onClick={() => setMode('mt5')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                mode === 'mt5'
                  ? darkMode ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 shadow-sm'
                  : darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
              <TrendingUp className="w-3 h-3" />
              MT5 {isBn ? 'টার্মিনাল' : 'Terminal'}
            </button>
          </div>
        </div>

        {mode === 'mt5' ? (
          <Suspense fallback={
            <div className={`flex items-center justify-center py-20 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 animate-pulse" />
                <span className="text-sm">{isBn ? 'MT5 টার্মিনাল লোড হচ্ছে...' : 'Loading MT5 Terminal...'}</span>
              </div>
            </div>
          }>
            <MT5TerminalPanel />
          </Suspense>
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-3"><Watchlist compact /></div>
              <div className="lg:col-span-6 space-y-6">
                <TradingChart />
                <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
                  <div className={`px-4 py-3 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <Clock className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('recentTrades')}</h3>
                  </div>
                  <div className="overflow-y-auto max-h-[300px]">
                    {trades.length === 0 ? (
                      <p className={`text-sm text-center py-8 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{t('noData')}</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className={`border-b ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                            <th className="text-left py-2 px-4">Symbol</th>
                            <th className="text-left py-2 px-4">Type</th>
                            <th className="text-right py-2 px-4">Qty</th>
                            <th className="text-right py-2 px-4">Price</th>
                            <th className="text-right py-2 px-4">Total</th>
                            <th className="text-right py-2 px-4">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map(trade => (
                            <tr key={trade.id} className={`border-b last:border-b-0 ${darkMode ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                              <td className={`py-2.5 px-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{trade.symbol}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${trade.type === 'buy' ? (darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')}`}>
                                  {trade.type.toUpperCase()}
                                </span>
                              </td>
                              <td className={`text-right py-2.5 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{trade.quantity}</td>
                              <td className={`text-right py-2.5 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${trade.price.toFixed(2)}</td>
                              <td className={`text-right py-2.5 px-4 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>${trade.total.toFixed(2)}</td>
                              <td className={`text-right py-2.5 px-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{trade.timestamp.toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 space-y-6">
                <OrderPanel />
                <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
                  <div className={`px-4 py-3 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <ArrowUpDown className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('openOrders')}</h3>
                  </div>
                  <div className="p-4">
                    {orders.filter(o => o.status === 'pending').length === 0 ? (
                      <p className={`text-xs text-center py-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{t('noData')}</p>
                    ) : (
                      <div className="space-y-2">
                        {orders.filter(o => o.status === 'pending').map(order => (
                          <div key={order.id} className={`p-3 rounded-xl border text-xs ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex justify-between">
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{order.symbol}</span>
                              <span className={order.type === 'buy' ? 'text-green-500' : 'text-red-500'}>{order.type.toUpperCase()} {order.orderType}</span>
                            </div>
                            <div className={`flex justify-between mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <span>Qty: {order.quantity}</span>
                              <span>Price: ${order.price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE */}
            <div className="lg:hidden space-y-4">
              <div className={`flex rounded-2xl p-1 border ${darkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white'}`}>
                {mobileTabs.map(tab => (
                  <button key={tab.key} onClick={() => setMobileTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      mobileTab === tab.key
                        ? darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        : darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {mobileTab === 'chart' && (
                  <motion.div key="chart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <TradingChart />
                    <Watchlist compact />
                  </motion.div>
                )}
                {mobileTab === 'order' && (
                  <motion.div key="order" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <OrderPanel />
                    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
                      <div className={`px-4 py-3 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <ArrowUpDown className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('openOrders')}</h3>
                      </div>
                      <div className="p-4">
                        {orders.filter(o => o.status === 'pending').length === 0 ? (
                          <p className={`text-xs text-center py-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{t('noData')}</p>
                        ) : (
                          <div className="space-y-2">
                            {orders.filter(o => o.status === 'pending').map(order => (
                              <div key={order.id} className={`p-3 rounded-xl border text-xs ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex justify-between">
                                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{order.symbol}</span>
                                  <span className={order.type === 'buy' ? 'text-green-500' : 'text-red-500'}>{order.type.toUpperCase()} {order.orderType}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
                {mobileTab === 'history' && (
                  <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
                      <div className={`px-4 py-3 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <Clock className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('recentTrades')}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        {trades.length === 0 ? (
                          <p className={`text-xs text-center py-8 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{t('noData')}</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={`border-b ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                <th className="text-left py-2 px-3">Sym</th>
                                <th className="text-left py-2 px-3">Type</th>
                                <th className="text-right py-2 px-3">Qty</th>
                                <th className="text-right py-2 px-3">Price</th>
                                <th className="text-right py-2 px-3">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trades.map(trade => (
                                <tr key={trade.id} className={`border-b last:border-b-0 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                  <td className={`py-2.5 px-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{trade.symbol}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trade.type === 'buy' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                      {trade.type === 'buy' ? 'B' : 'S'}
                                    </span>
                                  </td>
                                  <td className={`text-right py-2.5 px-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{trade.quantity}</td>
                                  <td className={`text-right py-2.5 px-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>${trade.price.toFixed(2)}</td>
                                  <td className={`text-right py-2.5 px-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>${trade.total.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
