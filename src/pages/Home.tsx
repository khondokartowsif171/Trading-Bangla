import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import {
  TrendingUp, ArrowRight, CheckCircle, Star,
  Monitor, Brain, PieChart, Bitcoin, Bell, BookOpen, LineChart, Activity,
  LogIn, UserPlus, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: Monitor,
    title: 'MT5 Terminal',
    titleBn: 'MT5 ট্রেডিং টার্মিনাল',
    desc: 'Real-time forex BUY/SELL with SL/TP, live P&L, multi-chart layout.',
    descBn: 'রিয়েল-টাইম ফরেক্স ট্রেডিং — BUY/SELL, SL/TP, লাইভ P&L সহ।',
    href: '/forex',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    icon: Brain,
    title: 'Aura AI Signals',
    titleBn: 'অরা AI সিগন্যাল স্ক্যানার',
    desc: 'Live BUY/SELL signals for XAU/USD, EUR/USD, GBP/USD, USD/JPY.',
    descBn: 'লাইভ BUY/SELL সিগন্যাল — সম্পূর্ণ ফ্রি, AI পাওয়ার্ড।',
    href: '/ea-analytics',
    color: 'from-purple-500 to-violet-600',
  },
  {
    icon: Activity,
    title: 'EA Dashboard',
    titleBn: 'EA ড্যাশবোর্ড',
    desc: 'Expert Advisor performance stats, win rate, profit factor.',
    descBn: 'Expert Advisor এর পারফরম্যান্স, উইন রেট এবং প্রফিট ফ্যাক্টর।',
    href: '/ea-dashboard',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: PieChart,
    title: 'Live Portfolio',
    titleBn: 'লাইভ পোর্টফোলিও',
    desc: 'Track your holdings, P&L history, and open positions in real time.',
    descBn: 'আপনার ট্রেড হিস্ট্রি, পোর্টফোলিও এবং ওপেন পজিশন ট্র্যাক করুন।',
    href: '/portfolio',
    color: 'from-yellow-500 to-amber-600',
  },
  {
    icon: Bitcoin,
    title: 'Crypto Trading',
    titleBn: 'ক্রিপ্টো ট্রেডিং',
    desc: 'AuraCrytox — trade BTC, ETH, and major crypto pairs live.',
    descBn: 'BTC, ETH সহ প্রধান ক্রিপ্টো পেয়ার ট্রেড করুন লাইভ।',
    href: '/crytox',
    color: 'from-orange-500 to-red-600',
  },
  {
    icon: Bell,
    title: 'Price Alerts',
    titleBn: 'প্রাইস অ্যালার্ট',
    desc: 'Set custom price alerts on any pair — get notified instantly.',
    descBn: 'যেকোনো পেয়ারে কাস্টম প্রাইস অ্যালার্ট সেট করুন।',
    href: '/dashboard',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: LineChart,
    title: 'Advanced Charts',
    titleBn: 'অ্যাডভান্সড চার্ট',
    desc: 'Multi-timeframe charts with indicators, SMC zones, and drawing tools.',
    descBn: 'মাল্টি-টাইমফ্রেম চার্ট — ইন্ডিকেটর, SMC জোন ও ড্রইং টুল।',
    href: '/mt5-chart',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: BookOpen,
    title: 'Trading Blog',
    titleBn: 'ট্রেডিং ব্লগ',
    desc: 'Bangla trading education — strategies, analysis, and market news.',
    descBn: 'বাংলায় ট্রেডিং শিক্ষা — কৌশল, বিশ্লেষণ ও মার্কেট নিউজ।',
    href: '/blog',
    color: 'from-slate-500 to-gray-600',
  },
];

const WHATSAPP_NUMBER = '+8801612628112';

export default function Home() {
  const { darkMode, t, lang } = useApp();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [typedText, setTypedText] = useState('');
  const fullText = lang === 'bn' ? 'বাংলাদেশের প্রিমিয়ার ট্রেডিং প্ল্যাটফর্ম' : "Bangladesh's Premier Trading Platform";

  useEffect(() => {
    setTypedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [lang, fullText]);

  return (
    <div className={`relative min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'} pb-20 md:pb-0`}>
      <AnimatedBackground />

      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 pb-12 md:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm font-medium mb-6">
              <Star className="w-4 h-4 fill-current" />
              ৮টি প্রিমিয়াম ফিচার · ১০০% ফ্রি
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t('heroTitle')}
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-3 h-8"
          >
            <span className={`text-base sm:text-xl ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {typedText}
              <span className="animate-pulse text-indigo-400">|</span>
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`mt-6 max-w-2xl mx-auto text-base sm:text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {lang === 'bn'
              ? 'MT5 টার্মিনাল, AI সিগন্যাল, ক্রিপ্টো ট্রেডিং, পোর্টফোলিও ট্র্যাকার — সব এক জায়গায়। সম্পূর্ণ বিনামূল্যে।'
              : 'MT5 Terminal, AI Signals, Crypto Trading, Portfolio Tracker — all in one place. Completely free.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {isLoggedIn ? (
              <Link
                to="/forex"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl flex items-center gap-2"
              >
                ট্রেডিং শুরু করুন
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <button
                  onClick={openLoginModal}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/30 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  বিনামূল্যে নিবন্ধন করুন
                </button>
                <button
                  onClick={openLoginModal}
                  className={`px-8 py-3.5 rounded-xl border-2 font-semibold transition-all flex items-center gap-2 ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  লগইন করুন
                </button>
              </>
            )}
          </motion.div>

          {!isLoggedIn && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              কোনো পেমেন্ট নেই · মোবাইল নম্বর দিয়ে নিবন্ধন করুন
            </motion.p>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '৫০K+', label: 'Active Traders' },
            { value: '$2.5B+', label: 'Trading Volume' },
            { value: '৮+', label: 'Premium Features' },
            { value: '৯৯.৯%', label: 'Uptime' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`text-center p-6 rounded-2xl border ${
                darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* All Features Grid */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">
              <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                আমাদের সব সুবিধা
              </span>
            </h2>
            <p className={`mt-3 text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              All Features · একটি অ্যাকাউন্টেই সব কিছু
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                    : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">{feature.title}</p>
                  <h3 className={`text-sm font-bold mb-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feature.titleBn}
                  </h3>
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {lang === 'bn' ? feature.descBn : feature.desc}
                  </p>
                </div>
                {isLoggedIn ? (
                  <Link
                    to={feature.href}
                    className={`flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-br ${feature.color} bg-clip-text text-transparent hover:opacity-80 transition-opacity`}
                  >
                    ব্যবহার করুন
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: 'inherit' }} />
                  </Link>
                ) : (
                  <button
                    onClick={openLoginModal}
                    className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    লগইন করুন →
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">
              {lang === 'bn' ? 'কিভাবে শুরু করবেন?' : 'How It Works'}
            </h2>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              মাত্র ৩টি ধাপে সব ফিচার ব্যবহার করুন
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '০১',
                title: 'নিবন্ধন করুন',
                subtitle: 'Register',
                desc: 'নাম, মোবাইল নম্বর ও ইমেইল দিয়ে বিনামূল্যে অ্যাকাউন্ট তৈরি করুন।',
                color: 'from-yellow-500 to-amber-500',
              },
              {
                step: '০২',
                title: 'লগইন করুন',
                subtitle: 'Login',
                desc: 'Email ও password দিয়ে লগইন করুন অথবা Google দিয়ে সাইন ইন করুন।',
                color: 'from-indigo-500 to-purple-500',
              },
              {
                step: '০৩',
                title: 'সব ফিচার ব্যবহার করুন',
                subtitle: 'Use All Features',
                desc: 'MT5 টার্মিনাল, AI সিগন্যাল, ক্রিপ্টো সহ সব ৮টি ফিচার আনলক হয়ে যাবে।',
                color: 'from-emerald-500 to-teal-500',
              },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`relative rounded-2xl border p-6 text-center ${
                  darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className={`inline-flex w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} items-center justify-center text-white font-black text-sm mb-4 shadow-lg`}>
                  {step.step}
                </div>
                <h3 className={`font-bold text-base mb-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {step.title}
                </h3>
                <p className="text-xs text-gray-500 mb-2">{step.subtitle}</p>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {!isLoggedIn && (
            <div className="mt-8 text-center">
              <button
                onClick={openLoginModal}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold hover:from-yellow-400 hover:to-amber-400 transition-all shadow-lg shadow-yellow-500/25 flex items-center gap-2 mx-auto"
              >
                <UserPlus className="w-4 h-4" />
                এখনই শুরু করুন — বিনামূল্যে
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 px-4 sm:px-6 lg:px-8 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('brandName')}
                </span>
              </div>
              <p className={`text-sm max-w-md ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('tagline')}. Professional trading platform for forex, stocks, and crypto with real-time data and AI-powered insights.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href={`https://wa.me/8801612628112`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                    darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
                  {WHATSAPP_NUMBER}
                </a>
              </div>
            </div>
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('market')}</h4>
              <div className="space-y-2">
                <Link to="/dashboard" className={`text-sm block ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>{t('stocks')}</Link>
                <Link to="/crytox" className={`text-sm block ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>{t('crypto')}</Link>
                <Link to="/dashboard" className={`text-sm block ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>{t('forex')}</Link>
                <Link to="/ea-analytics" className={`text-sm block ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>AI Signals</Link>
              </div>
            </div>
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('support')}</h4>
              <div className="space-y-2">
                <a href="https://wa.me/8801612628112" target="_blank" rel="noopener noreferrer" className={`text-sm block ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                  {t('whatsappSupport')}
                </a>
                {[t('contactUs'), t('privacy'), t('terms')].map(item => (
                  <a
                    key={item}
                    href="https://wa.me/8801612628112"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Coming Soon — contact us via WhatsApp"
                    className={`text-sm block ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className={`mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-center gap-2 text-sm ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
            <span>{t('footerText')} | tradingbangla.com</span>
            <span className="text-xs font-semibold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
              Powered by Aura AI
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile fixed-bottom CTA (logged-out only) */}
      {!isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden p-3 bg-gray-950/95 border-t border-yellow-500/20 backdrop-blur-md">
          <button
            onClick={openLoginModal}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold text-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            নিবন্ধন / লগইন করুন · Register / Login Free
          </button>
        </div>
      )}
    </div>
  );
}
