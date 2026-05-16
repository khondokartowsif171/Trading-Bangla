import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { BarChart3, Activity, LayoutDashboard, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
  { to: '/trade', icon: BarChart3, labelKey: 'forexMT5' as const },
  { to: '/ea-analytics', icon: Activity, labelKey: 'eaAnalytics' as const },
  { to: '/crytox', icon: Coins, labelKey: 'crypto' as const },
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' as const },
];

const WHATSAPP_NUMBER = '+8801612628112';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, '')}`;

export default function MobileBottomNav() {
  const { darkMode, t, chatOpen, setChatOpen, chatMessages, sendChatMessage } = useApp();
  const location = useLocation();
  const [ripple, setRipple] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendChatMessage(input.trim());
    setInput('');
  }, [input, sendChatMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <>
      {/* === Bottom Navigation Bar === */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-2xl ${
        darkMode ? 'bg-gray-950/95 border-gray-800' : 'bg-white/95 border-gray-200'
      }`} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-16 px-1">
          {tabs.map(tab => {
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                onClick={() => setRipple(tab.to)}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-150 active:scale-90 ${
                  active
                    ? darkMode ? 'text-green-400' : 'text-green-600'
                    : darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="mobileTabIndicator"
                    className={`absolute -top-0.5 w-8 h-0.5 rounded-full ${
                      darkMode ? 'bg-green-500' : 'bg-green-600'
                    }`}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={`relative p-1 rounded-lg ${
                  active ? (darkMode ? 'bg-green-500/10' : 'bg-green-50') : ''
                }`}>
                  <tab.icon className="w-5 h-5" />
                  <AnimatePresence>
                    {ripple === tab.to && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        onAnimationComplete={() => setRipple(null)}
                        className="absolute inset-0 rounded-full bg-green-400/30"
                      />
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-[10px] font-medium leading-none">{t(tab.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* === WhatsApp Floating Button === */}
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="md:hidden fixed bottom-20 right-4 z-20 w-12 h-12 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 flex items-center justify-center active:scale-90 transition-transform"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
        </svg>
      </motion.a>

      {/* === Aura Agent Floating Button === */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setChatOpen(true)}
            className="md:hidden fixed bottom-20 left-4 z-20 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* === Mobile Chat Bottom Sheet === */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl shadow-2xl flex flex-col ${
                darkMode ? 'bg-gray-950 border-t border-gray-800' : 'bg-white border-t border-gray-200'
              }`}
              style={{ height: '85vh', maxHeight: '620px' }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
              </div>

              <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
                darkMode ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <span className="text-white text-sm font-black">A</span>
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Aura Agent</h4>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-medium">AI Online</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto px-3 py-3 space-y-2.5 ${darkMode ? 'bg-gray-950' : 'bg-white'}`}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                        <span className="text-white text-[10px] font-bold">A</span>
                      </div>
                    )}
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-sm'
                        : darkMode ? 'bg-gray-800 text-gray-200 rounded-bl-sm' : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className={`p-3 border-t ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex gap-2">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ask Aura..."
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border transition-all ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-violet-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400'
                    }`} />
                  <button onClick={handleSend} disabled={!input.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all">
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
