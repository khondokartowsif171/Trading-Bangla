import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, TrendingUp, TrendingDown, BarChart2, Activity, LogOut, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

interface Profile {
  full_name: string;
  role: string;
  created_at: string;
}

interface TradeStats {
  total: number;
  winRate: number;
  totalPnl: number;
  openTrades: number;
}

interface RecentTrade {
  id: number;
  symbol: string;
  type: string;
  entry_price: number;
  pnl: number;
  status: string;
  opened_at: string;
}

interface EaStat {
  total_signals: number;
  avg_confidence: number;
  win_rate: number;
  date: string;
}

export default function UserProfile() {
  const { isLoggedIn, user, loading, logout } = useAuth();
  const { darkMode } = useApp();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<TradeStats>({ total: 0, winRate: 0, totalPnl: 0, openTrades: 0 });
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [eaStat, setEaStat] = useState<EaStat | null>(null);
  const [fetching, setFetching] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) navigate('/', { replace: true });
  }, [isLoggedIn, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  async function fetchAll() {
    if (!user) return;
    setFetching(true);
    const [profileRes, tradesRes, eaRes] = await Promise.all([
      supabase.from('profiles').select('full_name, role, created_at').eq('id', user.id).single(),
      supabase.from('demo_trades').select('id, symbol, type, entry_price, pnl, status, opened_at').eq('user_id', user.id).order('opened_at', { ascending: false }),
      supabase.from('ea_stats').select('total_signals, avg_confidence, win_rate, date').order('date', { ascending: false }).limit(1).single(),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (eaRes.data) setEaStat(eaRes.data);

    if (tradesRes.data) {
      const all = tradesRes.data;
      const closed = all.filter(t => t.status === 'closed');
      const wins = closed.filter(t => t.pnl > 0);
      setStats({
        total: all.length,
        winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
        totalPnl: closed.reduce((s, t) => s + (t.pnl ?? 0), 0),
        openTrades: all.filter(t => t.status === 'open').length,
      });
      setRecentTrades(all.slice(0, 5));
    }
    setFetching(false);
  }

  async function saveName() {
    if (!user || !nameInput.trim()) return;
    setSavingName(true);
    await supabase.from('profiles').update({ full_name: nameInput.trim() }).eq('id', user.id);
    setProfile(p => p ? { ...p, full_name: nameInput.trim() } : p);
    setEditingName(false);
    setSavingName(false);
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.full_name ?? user.name;
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'} py-8 px-4`}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back */}
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-yellow-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
        >
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-gray-900 text-2xl font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName()}
                      className="bg-gray-800 border border-yellow-500/40 rounded-lg px-3 py-1.5 text-white text-lg font-bold outline-none focus:border-yellow-500"
                    />
                    <button onClick={saveName} disabled={savingName} className="text-green-400 hover:text-green-300">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="text-gray-500 hover:text-gray-300">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-bold text-white">{displayName}</h1>
                    <button onClick={() => { setNameInput(displayName); setEditingName(true); }} className="text-gray-500 hover:text-yellow-400 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-2">{user.email}</p>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  profile?.role === 'admin'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {profile?.role === 'admin' ? '⭐ Admin' : '👤 Member'}
                </span>
                <span className="text-xs text-gray-500">Member since {joinDate}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Trades', value: stats.total, icon: Activity, color: 'text-blue-400' },
            { label: 'Win Rate', value: `${stats.winRate}%`, icon: TrendingUp, color: 'text-green-400' },
            { label: 'Total P&L', value: `$${stats.totalPnl.toFixed(2)}`, icon: BarChart2, color: stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Open Trades', value: stats.openTrades, icon: TrendingDown, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Recent Trades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-bold text-white">Recent Trades</h2>
          </div>
          {recentTrades.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500 text-sm">
              কোনো trade নেই এখনো —{' '}
              <Link to="/dashboard" className="text-yellow-400 hover:underline">Dashboard থেকে trade করুন</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(t => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{t.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{t.entry_price?.toFixed(5) ?? '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}{t.pnl?.toFixed(2) ?? '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        t.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                        t.status === 'closed' ? 'bg-gray-600/40 text-gray-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.opened_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* EA Signal Stats */}
        {eaStat && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6"
          >
            <h2 className="font-bold text-yellow-400 mb-4">📡 EA Bot Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Signals', value: eaStat.total_signals },
                { label: 'Avg Confidence', value: `${eaStat.avg_confidence?.toFixed(1)}%` },
                { label: 'Win Rate', value: `${eaStat.win_rate?.toFixed(1)}%` },
                { label: 'Latest Update', value: eaStat.date ? new Date(eaStat.date).toLocaleDateString() : '—' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-bold text-white">{s.value ?? '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
        >
          <h2 className="font-bold text-white mb-4">Account</h2>
          <button
            onClick={async () => { await logout(); navigate('/'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout করুন
          </button>
        </motion.div>
      </div>
    </div>
  );
}
