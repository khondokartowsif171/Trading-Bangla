import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Radio,
  BarChart3,
  LogOut,
  Lock,
  ArrowLeft,
  TrendingUp,
  Activity,
} from 'lucide-react';

type Tab = 'overview' | 'users' | 'signals' | 'eastats';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface Signal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  sl: number;
  tp: number;
  timeframe: string;
  source: string;
  created_at: string;
}

interface EaStat {
  id: string;
  date: string;
  total_signals: number;
  buy_signals: number;
  sell_signals: number;
  avg_confidence: number;
  win_rate: number;
  total_pnl: number;
  updated_at: string;
}

interface OverviewStats {
  totalUsers: number;
  totalSignals: number;
  totalTrades: number;
  winRate: number | null;
}

interface Toast {
  msg: string;
  type: 'success' | 'error';
}

export default function AdminDashboard() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [toast, setToast] = useState<Toast | null>(null);

  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);

  const [eaStats, setEaStats] = useState<EaStat[]>([]);
  const [eaLoading, setEaLoading] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      navigate('/');
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data?.role !== 'admin') setAccessDenied(true);
      setCheckingAccess(false);
    };
    check();
  }, [isLoggedIn, user, navigate]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    const [usersRes, signalsRes, tradesRes, winRateRes, recentSigRes, recentUsersRes] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('signals').select('id', { count: 'exact', head: true }),
        supabase.from('demo_trades').select('id', { count: 'exact', head: true }),
        supabase
          .from('ea_stats')
          .select('win_rate')
          .order('date', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('signals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('profiles')
          .select('id, full_name, role, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

    setOverviewStats({
      totalUsers: usersRes.count ?? 0,
      totalSignals: signalsRes.count ?? 0,
      totalTrades: tradesRes.count ?? 0,
      winRate: winRateRes.data?.win_rate ?? null,
    });
    setRecentSignals((recentSigRes.data as Signal[]) ?? []);
    setRecentUsers((recentUsersRes.data as Profile[]) ?? []);
    setOverviewLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false });
    setAllUsers((data as Profile[]) ?? []);
    setUsersLoading(false);
  }, []);

  const loadSignals = useCallback(async () => {
    setSignalsLoading(true);
    const { data } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAllSignals((data as Signal[]) ?? []);
    setSignalsLoading(false);
  }, []);

  const loadEaStats = useCallback(async () => {
    setEaLoading(true);
    const { data } = await supabase
      .from('ea_stats')
      .select('*')
      .order('date', { ascending: false });
    setEaStats((data as EaStat[]) ?? []);
    setEaLoading(false);
  }, []);

  useEffect(() => {
    if (checkingAccess || accessDenied) return;
    if (activeTab === 'overview') loadOverview();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'signals') loadSignals();
    if (activeTab === 'eastats') loadEaStats();
  }, [activeTab, checkingAccess, accessDenied, loadOverview, loadUsers, loadSignals, loadEaStats]);

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) {
      showToast('Failed to update role', 'error');
    } else {
      showToast('Role updated successfully', 'success');
      setAllUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
  };

  const signalBadge = (sig: string) => {
    if (sig === 'BUY') return 'bg-green-500/20 text-green-400 border border-green-500/30';
    if (sig === 'SELL') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'signals', label: 'Signals', icon: <Radio className="w-4 h-4" /> },
    { id: 'eastats', label: 'EA Stats', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  if (checkingAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center p-10 rounded-2xl border border-gray-800 bg-gray-900 max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-gray-400 mb-6">Admin only — you don't have permission to view this page.</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gray-900" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin Panel</p>
              <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-yellow-500/20 text-yellow-400 border-l-2 border-yellow-400 pl-[10px]'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Tab header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Trading Bangla — Admin Dashboard</p>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            overviewLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: overviewStats?.totalUsers ?? 0, icon: <Users className="w-5 h-5 text-blue-400" />, color: 'blue' },
                    { label: 'Total Signals', value: overviewStats?.totalSignals ?? 0, icon: <Radio className="w-5 h-5 text-yellow-400" />, color: 'yellow' },
                    { label: 'Total Trades', value: overviewStats?.totalTrades ?? 0, icon: <Activity className="w-5 h-5 text-purple-400" />, color: 'purple' },
                    { label: 'Win Rate', value: overviewStats?.winRate != null ? `${overviewStats.winRate.toFixed(1)}%` : 'N/A', icon: <BarChart3 className="w-5 h-5 text-green-400" />, color: 'green' },
                  ].map(card => (
                    <div key={card.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{card.label}</p>
                        <div className="p-1.5 rounded-lg bg-gray-800">{card.icon}</div>
                      </div>
                      <p className="text-2xl font-bold text-white">{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Signals */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Signals</h2>
                  <div className="rounded-xl overflow-hidden border border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800">
                          {['Symbol', 'Signal', 'Confidence', 'Price', 'Timeframe', 'Date'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentSignals.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs">No signals found</td></tr>
                        ) : recentSignals.map(s => (
                          <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-white">{s.symbol}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${signalBadge(s.signal)}`}>{s.signal}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-300">{s.confidence != null ? `${s.confidence}%` : '—'}</td>
                            <td className="px-4 py-3 text-gray-300">{s.price ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-400">{s.timeframe ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Users */}
                <div>
                  <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Users</h2>
                  <div className="rounded-xl overflow-hidden border border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800">
                          {['User', 'Role', 'Joined'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentUsers.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-xs">No users found</td></tr>
                        ) : recentUsers.map(u => (
                          <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-gray-900 text-xs font-bold shrink-0">
                                  {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                </div>
                                <span className="text-white font-medium">{u.full_name ?? 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-gray-700 text-gray-300'
                              }`}>{u.role}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            usersLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800">
                      {['User', 'Role', 'Joined'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-xs">No users found</td></tr>
                    ) : allUsers.map(u => (
                      <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-gray-900 text-xs font-bold shrink-0">
                              {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <span className="text-white font-medium">{u.full_name ?? 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={e => changeRole(u.id, e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-500/50 cursor-pointer"
                          >
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Signals Tab */}
          {activeTab === 'signals' && (
            signalsLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800">
                      {['Symbol', 'Signal', 'Confidence', 'Price', 'SL', 'TP', 'Timeframe', 'Source', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allSignals.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-xs">No signals found</td></tr>
                    ) : allSignals.map(s => (
                      <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{s.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${signalBadge(s.signal)}`}>{s.signal}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{s.confidence != null ? `${s.confidence}%` : '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{s.price ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400">{s.sl ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400">{s.tp ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400">{s.timeframe ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400">{s.source ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* EA Stats Tab */}
          {activeTab === 'eastats' && (
            eaLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800">
                      {['Date', 'Total Signals', 'Buy', 'Sell', 'Avg Confidence', 'Win Rate', 'Total P&L', 'Updated'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eaStats.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs">No EA stats found</td></tr>
                    ) : eaStats.map(row => (
                      <tr key={row.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{row.date}</td>
                        <td className="px-4 py-3 text-gray-300">{row.total_signals ?? '—'}</td>
                        <td className="px-4 py-3 text-green-400">{row.buy_signals ?? '—'}</td>
                        <td className="px-4 py-3 text-red-400">{row.sell_signals ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{row.avg_confidence != null ? `${row.avg_confidence.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-3 text-yellow-400">{row.win_rate != null ? `${row.win_rate.toFixed(1)}%` : '—'}</td>
                        <td className={`px-4 py-3 font-semibold ${row.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {row.total_pnl != null ? (row.total_pnl >= 0 ? '+' : '') + row.total_pnl.toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(row.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
