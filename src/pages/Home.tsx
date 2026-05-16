import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import AnimatedBackground from '@/components/AnimatedBackground';
import { TrendingUp, Shield, Zap, Globe, BarChart3, ArrowRight, CheckCircle, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Asset, STOCKS } from '@/data/marketData';

function LiveTicker({ assets }: { assets: Asset[] }) {
  const { darkMode } = useApp();
  return (
    <div className={`overflow-hidden py-2 border-y ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex gap-8 animate-marquee">
        {[...assets, ...assets].map((asset, i) => (
          <div key={`${asset.symbol}-${i}`} className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {asset.symbol}
            </span>
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              ${asset.price.toLocaleString()}
            </span>
            <span className={`text-xs font-medium ${asset.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    icon: BarChart3,
    title: 'Advanced Charting',
    desc: 'Professional-grade TradingView charts with 100+ indicators, multiple timeframes, and drawing tools.',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Zap,
    title: 'Real-Time Data',
    desc: 'Lightning-fast price updates across stocks, crypto, and forex with millisecond precision.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Secure Trading',
    desc: 'Bank-grade security with encrypted transactions and cold storage for your assets.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Globe,
    title: 'Global Markets',
    desc: 'Trade major forex pairs, US stocks, and crypto — all from one unified platform.',
    color: 'from-blue-500 to-cyan-500',
  },
];

export default function Home() {
  const { darkMode, t, lang } = useApp();
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
    <div className={`relative min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      <AnimatedBackground />

      {/* Hero Section */}
            <section className="relative pt-12 md:pt-20 pb-12 md:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-6">
              <Star className="w-4 h-4 fill-current" />
              {t('paperTrading')} — {t('demoAccount')}
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
            className={`mt-6 max-w-2xl mx-auto text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {t('heroSubtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/dashboard"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 flex items-center gap-2"
            >
              {t('startTrading')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className={`px-8 py-3.5 rounded-xl border font-semibold transition-all ${
                darkMode
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('learnMore')}
            </a>
          </motion.div>
        </div>
      </section>

      {/* Live Ticker */}
      <LiveTicker assets={STOCKS} />

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '50K+', label: 'Active Traders' },
            { value: '$2.5B+', label: 'Trading Volume' },
            { value: '16+', label: 'Global Markets' },
            { value: '99.9%', label: 'Uptime' },
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

      {/* Features */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">{t('features')}</h2>
            <p className={`mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Everything you need to trade like a professional
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`rounded-2xl border p-6 transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                    : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden ${
            darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold">
                {lang === 'bn' ? 'আজই ট্রেডিং শুরু করুন' : 'Start Trading Today'}
              </h2>
              <p className={`mt-3 max-w-lg mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {lang === 'bn'
                  ? 'বিনামূল্যে ডেমো অ্যাকাউন্ট খুলুন এবং ভার্চুয়াল $100,000 দিয়ে ট্রেডিং শুরু করুন।'
                  : 'Open a free demo account and start trading with $100,000 in virtual funds. No risk, all reward.'}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/dashboard"
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  {t('startTrading')}
                </Link>
                <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No credit card required
                </div>
              </div>
            </div>
          </div>
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
                  href={`https://wa.me/${'8801612628112'}`}
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
                {[t('stocks'), t('crypto'), t('forex'), 'Indices'].map(item => (
                  <div key={item} className={`text-sm cursor-pointer ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('support')}</h4>
              <div className="space-y-2">
                <a href={`https://wa.me/${'8801612628112'}`} target="_blank" rel="noopener noreferrer" className={`text-sm block ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                  {t('whatsappSupport')}
                </a>
                {[t('contactUs'), t('privacy'), t('terms')].map(item => (
                  <div key={item} className={`text-sm cursor-pointer ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`mt-8 pt-6 border-t text-center text-sm ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
            {t('footerText')} | tradingbangla.com
          </div>
        </div>
      </footer>
    </div>
  );
}

const WHATSAPP_NUMBER = '+8801612628112';
