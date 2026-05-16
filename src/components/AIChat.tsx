import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Send, User, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIChat() {
  const { darkMode, t, chatOpen, setChatOpen, chatMessages, sendChatMessage } = useApp();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChatMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    { icon: '📊', text: 'Market analysis today', query: 'market analysis' },
    { icon: '₿', text: 'Bitcoin price outlook', query: 'bitcoin' },
    { icon: '🛡️', text: 'Risk management tips', query: 'risk management' },
    { icon: '💡', text: 'How to place a trade', query: 'how to trade' },
  ];

  return (
    <>
      {/* Floating Aura Button — Left-Mid */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: 1, x: 0 }}
            exit={{ scale: 0, x: -20 }}
            onClick={() => setChatOpen(true)}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-40 group"
            title="Aura Agent"
          >
            {/* Outer glow ring */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 opacity-40 blur-lg animate-pulse" />
            {/* Button body */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transition-all hover:scale-110 flex flex-col items-center justify-center gap-0.5">
              <Zap className="w-5 h-5" />
              <span className="text-[8px] font-bold tracking-wide">AURA</span>
            </div>
            {/* Live dot */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-gray-950 animate-pulse shadow-lg shadow-emerald-400/50" />
            {/* Label */}
            <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              Aura Agent
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel — Left side, vertically centered */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, x: -40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed left-6 top-1/2 -translate-y-1/2 z-40 w-[400px] max-w-[calc(100vw-4rem)] h-[560px] max-h-[calc(100vh-4rem)] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
              darkMode ? 'border-gray-700/80 bg-gray-950' : 'border-gray-200 bg-white'
            }`}
          >
            {/* Header — Gradient aura style */}
            <div className="relative shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent)]" />
              <div className="relative flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm tracking-wide">
                      Aura Agent
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse shadow-lg shadow-emerald-300/50" />
                      <span className="text-[10px] text-purple-100 font-medium">
                        AI Trading Intelligence
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar ${
              darkMode ? 'bg-gray-950' : 'bg-white'
            }`}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-purple-500/20">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-3.5 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user'
                        ? darkMode
                          ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-md shadow-lg shadow-purple-500/15'
                          : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-br-md shadow-md shadow-purple-500/10'
                        : darkMode
                          ? 'bg-gray-800/80 text-gray-200 rounded-bl-md border border-gray-700/50'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200/80'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
              ))}

              {/* Suggested prompts */}
              {chatMessages.length <= 1 && (
                <div className="pt-3 space-y-2">
                  <p className={`text-[10px] uppercase tracking-wider text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Ask Aura Agent
                  </p>
                  {suggestedPrompts.map(p => (
                    <button
                      key={p.query}
                      onClick={() => sendChatMessage(p.query)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2.5 ${
                        darkMode ? 'bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 border border-gray-700/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      {p.text}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-3 border-t shrink-0 ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('typeMessage')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border transition-all ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30'
                  }`}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`p-2.5 rounded-xl transition-all ${
                    input.trim()
                      ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-purple-500/25'
                      : darkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Zap className="w-2.5 h-2.5 text-violet-400" />
                <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Aura Agent • AI-Powered Trading Intelligence
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
