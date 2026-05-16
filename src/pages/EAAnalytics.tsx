import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Shield, Activity, ExternalLink } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  EA_PERFORMERS,
  CODE_ANALYSIS,
  OPTIMIZED_PARAMS,
  generateSignals,
} from '@/data/eaData';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

function LoadingBar() {
  return <div className="h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 bg-[length:200%_100%] animate-[loading_2s_linear_infinite]" />;
}

function StatCard({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 p-5 hover:shadow-lg hover:shadow-yellow-500/20 transition-all">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subColor || 'text-green-400'}`}>{sub}</p>}
    </motion.div>
  );
}

const EA_NAMES = ['Quantum V7', 'GoldRush V6', 'XAU Sniper', 'Neural AI', 'Your EA (Current)', 'Your EA (ATR)'];

export default function EAAnalytics() {
  const { darkMode, lang, t } = useApp();
  const isBn = lang === 'bn';
  const [signals, setSignals] = useState(() => generateSignals());
  const [signalsKey, setSignalsKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSignals(generateSignals());
      setSignalsKey(k => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const perfChartData = {
    labels: EA_NAMES,
    datasets: [{
      label: isBn ? 'মাসিক রিটার্ন (%)' : 'Monthly Return (%)',
      data: EA_PERFORMERS.map(e => e.monthlyReturn),
      backgroundColor: [
        'rgba(34,197,94,0.7)', 'rgba(34,197,94,0.7)', 'rgba(34,197,94,0.7)',
        'rgba(34,197,94,0.7)', 'rgba(251,146,60,0.7)', 'rgba(16,185,129,0.8)',
      ],
      borderColor: ['#22c55e','#22c55e','#22c55e','#22c55e','#fb923c','#10b981'],
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  const comparisonChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: isBn ? 'ফিক্সড SL (বর্তমান)' : 'Fixed SL (Current)',
        data: [3.2, 4.1, 2.8, 5.2, 3.8, 2.1, 4.5, 3.3, 5.8, 4.2, 3.6, 4.0],
        borderColor: '#fb923c',
        backgroundColor: 'rgba(251,146,60,0.1)',
        fill: true,
        tension: 0.4,
        spanGaps: true,
      },
      {
        label: isBn ? 'ATR SL (সুপারিশকৃত)' : 'ATR SL (Recommended)',
        data: [5.1, 6.8, 8.2, 12.5, 10.3, 15.8, 18.2, 20.1, 22.5, 24.1, 22.8, 24.1],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.4,
        spanGaps: true,
      },
    ],
  };

  const riskChartData = {
    labels: isBn ? ['কম রিস্ক', 'মিডিয়াম রিস্ক', 'উচ্চ রিস্ক'] : ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [{
      data: [30, 45, 25],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderColor: darkMode ? '#1f2937' : '#ffffff',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  };

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: darkMode ? '#9ca3af' : '#6b7280', font: { size: 11 } },
      },
    },
    scales: {
      x: { ticks: { color: darkMode ? '#9ca3af' : '#6b7280' }, grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
      y: { ticks: { color: darkMode ? '#9ca3af' : '#6b7280' }, grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
    },
  }), [darkMode]);

  const lineOptions = useMemo(() => ({
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: { ...chartOptions.scales.y, beginAtZero: true },
    },
  }), [chartOptions]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: darkMode ? '#9ca3af' : '#6b7280', font: { size: 11 }, padding: 12 },
      },
    },
    cutout: '65%',
  }), [darkMode]);

  const glassCard = `rounded-xl border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md p-5`;

  return (
    <div className={darkMode ? 'bg-gray-950' : 'bg-gray-50'}>
      <LoadingBar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className={`inline-block mb-3 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 font-bold text-lg shadow-lg ${darkMode ? 'text-white' : 'text-white'}`}>
            🇧🇩 {t('brandName')}
          </div>
          <h1 className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent`}>
            MT5 XAUUSD EA Analytics Dashboard
          </h1>
          <p className="text-gray-400 mt-1 text-lg">{isBn ? 'বিশ্বমানের পারফরম্যান্স বিশ্লেষণ ও কোড রিভিউ' : 'World-Class Performance Analysis & Code Review'}</p>
          <div className="flex justify-center gap-3 mt-3 flex-wrap">
            {[
              { text: isBn ? '✅ লাইভ ট্রেডিং' : '✅ Live Trading', cls: 'bg-green-600' },
              { text: isBn ? '📊 ২০+ বছর ডাটা' : '📊 20+ Years Data', cls: 'bg-blue-600' },
              { text: isBn ? '🏆 XAUUSD এক্সপার্ট' : '🏆 XAUUSD Expert', cls: 'bg-yellow-600' },
              { text: isBn ? '🔥 হাইয়েস্ট প্রফিট ২০২৬' : '🔥 HIGHEST PROFIT 2026', cls: 'bg-red-600 animate-pulse' },
            ].map((badge, i) => (
              <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold text-white ${badge.cls}`}>{badge.text}</span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">tradingbangla.com | {isBn ? 'আপনার বিশ্বস্ত MT5 ব্রোকার ও EA সল্যুশন' : 'Your Trusted MT5 Broker & EA Solutions'}</p>
        </motion.div>

        {/* Top Recommendation */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-xl border-l-4 border-green-500 p-5 ${darkMode ? 'bg-green-900/20 border-gray-800' : 'bg-green-50 border-gray-200'}`}>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <span className="text-4xl">🎯</span>
            <div className="flex-1">
              <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                {isBn ? '🏆 #১ সর্বোচ্চ লাভজনক সুপারিশ (২০২৬ আপডেট)' : '🏆 #1 Most Profitable Recommendation (2026 Update)'}
              </h2>
              <div className={`rounded-xl p-4 mb-3 ${darkMode ? 'bg-black/50' : 'bg-white'}`}>
                <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {isBn ? 'ATR-ভিত্তিক ডায়নামিক স্টপ লস ব্যবহার করুন' : 'Use ATR-Based Dynamic Stop Loss'}
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-red-400 font-bold mb-1">{isBn ? '❌ বর্তমান সমস্যা:' : '❌ Current Problem:'}</p>
                    <ul className="space-y-1 text-xs text-gray-400">
                      <li>{isBn ? '• ফিক্সড ০.৬০ পিপস SL ব্যবহার করছেন' : '• Using fixed 0.60 pips SL'}</li>
                      <li>{isBn ? '• উইন রেট মাত্র ৬৮.৫%' : '• Win rate only 68.5%'}</li>
                      <li>{isBn ? '• মাসিক রিটার্ন +৯.২%' : '• Monthly return +9.2%'}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-green-400 font-bold mb-1">{isBn ? '✅ ATR দিয়ে উন্নতি:' : '✅ Improvement with ATR:'}</p>
                    <ul className="space-y-1 text-xs text-gray-400">
                      <li>{isBn ? '• উইন রেট বাড়বে ৭৯.২% এ' : '• Win rate rises to 79.2%'}</li>
                      <li>{isBn ? '• মাসিক রিটার্ন +২৪.১%' : '• Monthly return +24.1%'}</li>
                      <li>{isBn ? '• ম্যাক্স ড্রডাউন ১২% থেকে ৬.৮%' : '• Max drawdown 12% → 6.8%'}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className={`rounded-lg p-4 bg-gradient-to-r from-yellow-900/50 to-amber-900/50 border border-yellow-500/20`}>
                <p className="font-mono text-yellow-200 text-xs mb-2">
                  {isBn ? '📝 সহজ কোড (৫ মিনিটে যোগ করুন):' : '📝 Simple Code (Add in 5 minutes):'}
                </p>
                <code className="block bg-black p-2.5 rounded text-green-400 text-xs leading-relaxed">
                  double atr = iATR(_Symbol, PERIOD_CURRENT, 14, 1);{'\n'}
                  double dynamicSL = atr * 1.5;  {isBn ? '// ডায়নামিক স্টপ লস' : '// Dynamic Stop Loss'}{'\n'}
                  double dynamicTP = dynamicSL * 2.0;  {isBn ? '// ২:১ রিস্ক-রিওয়ার্ড' : '// 2:1 Risk-Reward'}
                </code>
              </div>
              <p className="text-center text-green-400 font-bold text-lg mt-3">
                {isBn ? '💰 লাভ বৃদ্ধি: +১৬২% | এটাই সবচেয়ে গুরুত্বপূর্ণ পরিবর্তন!' : '💰 Profit Increase: +162% | This is the Most Important Change!'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label={isBn ? 'বিশ্লেষিত EA সংখ্যা' : 'EAs Analyzed'} value="3,142" sub={isBn ? '↑ ২০২৬ আপডেট' : '↑ 2026 Update'} />
          <StatCard label={isBn ? 'বিশ্ব গড় মাসিক রিটার্ন' : 'Avg Monthly Return'} value="22.8%" sub={isBn ? '↑ Top ১০০ EAs' : '↑ Top 100 EAs'} />
          <StatCard label={isBn ? 'সেরা উইন রেট' : 'Best Win Rate'} value="89.4%" sub={isBn ? 'ATR-ভিত্তিক EAs' : 'ATR-based EAs'} subColor="text-yellow-400" />
          <StatCard label={isBn ? 'আপনার EA রিস্ক স্কোর' : 'Your EA Risk Score'} value="6.5/10" sub={isBn ? 'মিডিয়াম রিস্ক' : 'Medium Risk'} subColor="text-orange-400" />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={glassCard}>
            <h3 className={`font-bold mb-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isBn ? '🌍 বিশ্বব্যাপী সেরা EA পারফরম্যান্স তুলনা' : '🌍 Best EA Performance Comparison'}
            </h3>
            <div className="h-64">
              <Bar data={perfChartData} options={chartOptions} />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className={glassCard}>
            <h3 className={`font-bold mb-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isBn ? '📈 XAUUSD ATR vs Fixed SL তুলনা (২০২৪-২০২৬)' : '📈 XAUUSD ATR vs Fixed SL Comparison (2024-2026)'}
            </h3>
            <div className="h-64">
              <Line data={comparisonChartData} options={lineOptions} />
            </div>
          </motion.div>
        </div>

        {/* World's Best Performers Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={glassCard}>
          <h2 className={`text-lg font-bold mb-3 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent`}>
            {isBn ? '🏆 বিশ্বসেরা MT5 EA পারফরমার (২০২৬ আপডেট)' : '🏆 World\'s Best MT5 EA Performers (2026 Update)'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  {[isBn ? 'EA নাম' : 'EA Name', isBn ? 'কৌশল' : 'Strategy', isBn ? 'মাসিক রিটার্ন' : 'Monthly Return', isBn ? 'ম্যাক্স DD' : 'Max DD', isBn ? 'উইন রেট' : 'Win Rate', isBn ? 'মূল বৈশিষ্ট্য' : 'Feature', isBn ? 'স্ট্যাটাস' : 'Status'].map(h => (
                    <th key={h} className={`p-2.5 text-left font-semibold ${darkMode ? 'text-gray-300 bg-gray-800/50' : 'text-gray-700 bg-yellow-50'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EA_PERFORMERS.map((ea, i) => (
                  <tr key={ea.name} className={`border-b ${darkMode ? 'border-gray-800/50' : 'border-gray-100'} ${ea.isUser ? (darkMode ? 'bg-orange-900/20' : 'bg-orange-50') : ''} ${ea.isRecommended ? (darkMode ? 'bg-green-900/20' : 'bg-green-50') : ''} hover:brightness-110 transition-all`}>
                    <td className="p-2.5 font-semibold">{ea.name}</td>
                    <td className="p-2.5 text-gray-400">{ea.strategy}</td>
                    <td className={`p-2.5 font-bold ${ea.monthlyReturn >= 24 ? 'text-green-400' : ea.monthlyReturn >= 10 ? 'text-orange-400' : 'text-red-400'}`}>+{ea.monthlyReturn}%</td>
                    <td className={`p-2.5 ${ea.maxDrawdown <= -10 ? 'text-orange-400' : 'text-green-400'}`}>{ea.maxDrawdown}%</td>
                    <td className="p-2.5 font-bold">{ea.winRate}%</td>
                    <td className={`p-2.5 text-xs ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>{ea.feature}</td>
                    <td className={`p-2.5 ${ea.statusColor} font-semibold`}>{ea.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Code Analysis Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={glassCard}>
          <h2 className={`text-lg font-bold mb-3 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent`}>
            {isBn ? '🔍 আপনার EA কোড বিশ্লেষণ' : '🔍 Your EA Code Analysis'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  {[isBn ? 'কম্পোনেন্ট' : 'Component', isBn ? 'বর্তমান অবস্থা' : 'Status', isBn ? 'সমস্যা/বাগ' : 'Issue/Bug', isBn ? 'উন্নতি' : 'Improvement', isBn ? 'রিস্ক' : 'Risk'].map(h => (
                    <th key={h} className={`p-2.5 text-left font-semibold ${darkMode ? 'text-gray-300 bg-gray-800/50' : 'text-gray-700 bg-yellow-50'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CODE_ANALYSIS.map((item) => (
                  <tr key={item.component} className={`border-b ${darkMode ? 'border-gray-800/50' : 'border-gray-100'} hover:brightness-110`}>
                    <td className="p-2.5 font-semibold">{item.component}</td>
                    <td className="p-2.5">{item.currentStatus}</td>
                    <td className="p-2.5 text-gray-400">{item.issue}</td>
                    <td className="p-2.5"><span className="text-green-400">{item.improvement}</span></td>
                    <td className="p-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white ${item.riskScore >= 7 ? 'bg-red-500' : item.riskScore >= 5 ? 'bg-yellow-500' : 'bg-green-500'}`}>
                        {item.riskScore}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Optimized Params + Risk Chart */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className={glassCard}>
            <h3 className={`font-bold mb-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isBn ? '⚙️ অপ্টিমাইজড প্যারামিটার (২০২৬)' : '⚙️ Optimized Parameters (2026)'}
            </h3>
            <div className="space-y-1 text-sm">
              {OPTIMIZED_PARAMS.map(p => (
                <div key={p.name} className={`flex justify-between px-3 py-2 rounded-lg ${p.highlighted ? (darkMode ? 'bg-green-900/30 border border-green-500/20' : 'bg-green-50 border border-green-200') : ''}`}>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{p.name}</span>
                  <span className={`font-bold ${p.highlighted ? 'text-yellow-400' : 'text-green-400'}`}>{p.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className={glassCard}>
            <h3 className={`font-bold mb-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isBn ? '📊 পারফরম্যান্স রিস্ক তুলনা' : '📊 Performance Risk Comparison'}
            </h3>
            <div className="h-56 flex items-center justify-center">
              <div className="w-full max-w-xs">
                <Doughnut data={riskChartData} options={doughnutOptions} />
              </div>
            </div>
            <div className="mt-3 text-xs space-y-1">
              <p className="text-green-400">{isBn ? '🟢 সবুজ: ATR দিয়ে আপনার EA (সুপারিশকৃত)' : '🟢 Green: Your EA with ATR (Recommended)'}</p>
              <p className="text-orange-400">{isBn ? '🟠 কমলা: বর্তমান ফিক্সড SL EA' : '🟠 Orange: Current Fixed SL EA'}</p>
              <p className="text-red-400">{isBn ? '🔴 লাল: উচ্চ রিস্ক EAs' : '🔴 Red: High Risk EAs'}</p>
            </div>
          </motion.div>
        </div>

        {/* Implementation Steps */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className={glassCard}>
          <h2 className={`text-lg font-bold mb-4 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent`}>
            {isBn ? '📝 স্টেপ-বাই-স্টেপ ATR ইমপ্লিমেন্টেশন (৫ মিনিট)' : '📝 Step-by-Step ATR Implementation (5 Minutes)'}
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { num: '1', title: isBn ? 'ATR ক্যালকুলেট করুন' : 'Calculate ATR', code: 'double atr = iATR(_Symbol, PERIOD_CURRENT, 14, 1);', color: 'border-blue-500', bg: 'bg-blue-900/20' },
              { num: '2', title: isBn ? 'ডায়নামিক SL সেট করুন' : 'Set Dynamic SL', code: 'double stopLoss = atr * 1.5;', color: 'border-green-500', bg: 'bg-green-900/20' },
              { num: '3', title: isBn ? 'ডায়নামিক TP সেট করুন' : 'Set Dynamic TP', code: 'double takeProfit = stopLoss * 2.0;', color: 'border-yellow-500', bg: 'bg-yellow-900/20' },
            ].map(step => (
              <div key={step.num} className={`rounded-lg p-4 border-l-4 ${step.color} ${step.bg} ${darkMode ? 'bg-opacity-30' : ''}`}>
                <div className="text-2xl mb-1">{step.num}️⃣</div>
                <h3 className="font-bold text-sm mb-2">{step.title}</h3>
                <code className="block bg-black p-2 rounded text-green-400 text-xs">{step.code}</code>
              </div>
            ))}
          </div>
          <div className={`mt-3 rounded-lg p-3 text-center ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
            <p className="text-green-400 font-bold text-sm">
              {isBn ? '✅ সম্পন্ন! এখন আপনার EA মার্কেট ভোলাটিলিটির সাথে স্বয়ংক্রিয়ভাবে সমন্বয় করবে।' : '✅ Done! Your EA will now automatically adjust to market volatility.'}
            </p>
          </div>
        </motion.div>

        {/* Live Signals */}
        <motion.div key={signalsKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className={glassCard}>
          <h2 className={`text-lg font-bold mb-3 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent`}>
            {isBn ? '🔴 লাইভ সিগন্যাল ভ্যালিডেশন' : '🔴 Live Signal Validation'}
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {signals.map((s, i) => (
              <motion.div key={s.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                className={`rounded-xl p-4 border text-center ${s.signal === 'BUY' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <p className="font-bold text-sm">{s.name}</p>
                <p className={`text-lg font-black mt-1 ${s.signal === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{s.signal}</p>
                <p className={`text-xs mt-1 font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>${s.price}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>{isBn ? 'কনফিডেন্স' : 'Confidence'}: {s.confidence}%</span>
                    <span className={s.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}>{s.change}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${s.confidence >= 70 ? 'bg-green-500' : s.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${s.confidence}%` }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className={`rounded-xl p-6 text-center border ${darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-md`}>
          <h3 className={`text-lg font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent mb-2`}>
            🇧🇩 {t('brandName')}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {isBn ? 'বাংলাদেশের সবচেয়ে বিশ্বস্ত MT5 ব্রোকার ও EA সল্যুশন প্রোভাইডার' : "Bangladesh's Most Trusted MT5 Broker & EA Solution Provider"}
          </p>
          <div className="flex justify-center gap-6 flex-wrap mb-4">
            {[
              { value: '3,142+', label: isBn ? 'EAs বিশ্লেষিত' : 'EAs Analyzed', cls: 'text-green-400' },
              { value: '20+', label: isBn ? 'বছরের অভিজ্ঞতা' : 'Years Experience', cls: 'text-yellow-400' },
              { value: '5,000+', label: isBn ? 'সন্তুষ্ট ট্রেডার' : 'Satisfied Traders', cls: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
          <a href="https://www.tradingbangla.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-2.5 rounded-full font-bold text-sm text-white hover:shadow-lg transition-all">
            🌐 www.tradingbangla.com <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-[10px] text-gray-600 mt-4 max-w-lg mx-auto">
            {isBn
              ? '⚠️ ডিসক্লেইমার: এই বিশ্লেষণ শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। আর্থিক পরামর্শ নয়। অতীত পারফরম্যান্স ভবিষ্যতের ফলাফল নিশ্চিত করে না।'
              : '⚠️ Disclaimer: This analysis is for educational purposes only. Not financial advice. Past performance does not guarantee future results.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
