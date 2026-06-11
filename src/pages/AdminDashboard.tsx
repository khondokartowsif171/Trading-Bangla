import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  LayoutDashboard, Users, Radio, BarChart3, LogOut, Lock,
  ArrowLeft, TrendingUp, Activity, FileText, Settings,
  Plus, Edit2, Trash2, Eye, Globe, Bell, AlertTriangle,
  CheckCircle, Search, ChevronDown, Save, X,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

type Tab = 'overview' | 'users' | 'signals' | 'blog' | 'eastats' | 'settings';
type BlogView = 'list' | 'editor';

interface Profile { id: string; full_name: string; email?: string; phone?: string; role: string; created_at: string; }
interface DemoTrade { id: string; symbol: string; type: string; entry_price: number; exit_price: number | null; lot_size: number; pnl: number; status: string; opened_at: string; closed_at: string | null; }
interface Signal { id: string; symbol: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; confidence: number; price: number; sl: number; tp: number; timeframe: string; source: string; created_at: string; }
interface EaStat { id: string; date: string; total_signals: number; buy_signals: number; sell_signals: number; avg_confidence: number; win_rate: number; total_pnl: number; updated_at: string; }
interface OverviewStats { totalUsers: number; totalSignals: number; totalTrades: number; winRate: number | null; }
interface BlogPostRow { id: string; title: string; slug: string; content: string; excerpt: string; thumbnail_url: string | null; category: string; author_id: string; published: boolean; published_at: string | null; views: number; created_at: string; updated_at: string; }
interface DraftPost { id: string | null; title: string; slug: string; content: string; excerpt: string; thumbnail_url: string; category: string; published: boolean; }
interface AnnouncementVal { enabled: boolean; message: string; type: 'info' | 'warning' | 'success'; }
interface SiteSettingsState { announcement: AnnouncementVal; maintenance: { enabled: boolean }; }
interface Toast { msg: string; type: 'success' | 'error'; }

const BLANK_DRAFT: DraftPost = { id: null, title: '', slug: '', content: '', excerpt: '', thumbnail_url: '', category: 'general', published: false };
const CATEGORIES = ['general', 'education', 'signals', 'strategy', 'news'];

const autoSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80);

export default function AdminDashboard() {
  const { isLoggedIn, user, logout, login } = useAuth();
  const { darkMode } = useApp();
  const navigate = useNavigate();

  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Inline login state (used when Navbar is hidden, e.g. CRM subdomain)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [toast, setToast] = useState<Toast | null>(null);

  // Overview
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [eaChartData, setEaChartData] = useState<EaStat[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Users
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userTradeCounts, setUserTradeCounts] = useState<Record<string, number>>({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [tradeModal, setTradeModal] = useState<{ user: Profile; trades: DemoTrade[] } | null>(null);
  const [tradeModalLoading, setTradeModalLoading] = useState(false);

  // Signals
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [signalPage, setSignalPage] = useState(0);
  const [signalHasMore, setSignalHasMore] = useState(true);
  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(new Set());
  const [signalFilter, setSignalFilter] = useState('');
  const [signalsLoading, setSignalsLoading] = useState(false);

  // Blog
  const [blogPosts, setBlogPosts] = useState<BlogPostRow[]>([]);
  const [blogView, setBlogView] = useState<BlogView>('list');
  const [draft, setDraft] = useState<DraftPost>(BLANK_DRAFT);
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogLoading, setBlogLoading] = useState(false);

  // EA Stats
  const [eaStats, setEaStats] = useState<EaStat[]>([]);
  const [eaLoading, setEaLoading] = useState(false);

  // Settings
  const [siteSettings, setSiteSettings] = useState<SiteSettingsState>({
    announcement: { enabled: false, message: '', type: 'info' },
    maintenance: { enabled: false },
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Access check — admin emails OR Supabase role = 'admin'
  const ADMIN_EMAILS = ['admin@tradingbangla.com', 'khondokartowsif171@gmail.com'];
  useEffect(() => {
    if (!isLoggedIn || !user) return; // Show inline login instead of navigating away
    // Email-based bypass — always allow these accounts
    if (ADMIN_EMAILS.includes(user.email)) { setCheckingAccess(false); return; }
    // Otherwise check Supabase role
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => { if (data?.role !== 'admin') setAccessDenied(true); setCheckingAccess(false); });
  }, [isLoggedIn, user]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await login(loginEmail, loginPassword);
    if (error) setLoginError(error);
    setLoginLoading(false);
  };

  // ─── Data loaders ───────────────────────────────────────────────────────────

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    const [usersRes, signalsRes, tradesRes, winRateRes, recentSigRes, recentUsersRes, eaRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('signals').select('id', { count: 'exact', head: true }),
      supabase.from('demo_trades').select('id', { count: 'exact', head: true }),
      supabase.from('ea_stats').select('win_rate').order('date', { ascending: false }).limit(1).single(),
      supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(8),
      supabase.from('profiles').select('id, full_name, email, phone, role, created_at').order('created_at', { ascending: false }).limit(8),
      supabase.from('ea_stats').select('date, total_signals, win_rate').order('date', { ascending: false }).limit(30),
    ]);
    setOverviewStats({ totalUsers: usersRes.count ?? 0, totalSignals: signalsRes.count ?? 0, totalTrades: tradesRes.count ?? 0, winRate: winRateRes.data?.win_rate ?? null });
    setRecentSignals((recentSigRes.data as Signal[]) ?? []);
    setRecentUsers((recentUsersRes.data as Profile[]) ?? []);
    setEaChartData(((eaRes.data as EaStat[]) ?? []).reverse());
    setOverviewLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data } = await supabase.from('profiles').select('id, full_name, email, phone, role, created_at').order('created_at', { ascending: false });
    const users = (data as Profile[]) ?? [];
    setAllUsers(users);
    if (users.length > 0) {
      const ids = users.map(u => u.id);
      const { data: trades } = await supabase.from('demo_trades').select('user_id').in('user_id', ids);
      const counts: Record<string, number> = {};
      (trades ?? []).forEach((t: { user_id: string }) => { counts[t.user_id] = (counts[t.user_id] ?? 0) + 1; });
      setUserTradeCounts(counts);
    }
    setUsersLoading(false);
  }, []);

  const loadSignals = useCallback(async (page = 0, append = false) => {
    setSignalsLoading(true);
    const { data } = await supabase.from('signals').select('*').order('created_at', { ascending: false }).range(page * 50, (page + 1) * 50 - 1);
    const rows = (data as Signal[]) ?? [];
    setSignalHasMore(rows.length === 50);
    setAllSignals(prev => append ? [...prev, ...rows] : rows);
    setSignalsLoading(false);
  }, []);

  const loadBlog = useCallback(async () => {
    setBlogLoading(true);
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    setBlogPosts((data as BlogPostRow[]) ?? []);
    setBlogLoading(false);
  }, []);

  const loadEaStats = useCallback(async () => {
    setEaLoading(true);
    const { data } = await supabase.from('ea_stats').select('*').order('date', { ascending: false });
    setEaStats((data as EaStat[]) ?? []);
    setEaLoading(false);
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const { data } = await supabase.from('site_settings').select('key, value');
    if (data) {
      const map: Record<string, unknown> = {};
      (data as { key: string; value: unknown }[]).forEach(r => { map[r.key] = r.value; });
      setSiteSettings({
        announcement: (map['announcement'] as AnnouncementVal) ?? { enabled: false, message: '', type: 'info' },
        maintenance: (map['maintenance_mode'] as { enabled: boolean }) ?? { enabled: false },
      });
    }
    setSettingsLoading(false);
  }, []);

  useEffect(() => {
    if (checkingAccess || accessDenied) return;
    if (activeTab === 'overview') loadOverview();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'signals') { setSignalPage(0); loadSignals(0); }
    if (activeTab === 'blog') loadBlog();
    if (activeTab === 'eastats') loadEaStats();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab, checkingAccess, accessDenied, loadOverview, loadUsers, loadSignals, loadBlog, loadEaStats, loadSettings]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) showToast('Role update failed', 'error');
    else { showToast('Role updated!', 'success'); setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u)); }
  };

  const deleteSignals = async () => {
    if (selectedSignals.size === 0) return;
    const { error } = await supabase.from('signals').delete().in('id', [...selectedSignals]);
    if (error) showToast('Delete failed', 'error');
    else { showToast(`${selectedSignals.size} signals deleted`, 'success'); setAllSignals(prev => prev.filter(s => !selectedSignals.has(s.id))); setSelectedSignals(new Set()); }
  };

  const saveDraft = async () => {
    if (!draft.title.trim()) { showToast('Title is required', 'error'); return; }
    setBlogSaving(true);
    const payload = { title: draft.title, slug: draft.slug || autoSlug(draft.title), content: draft.content, excerpt: draft.excerpt, thumbnail_url: draft.thumbnail_url || null, category: draft.category, published: draft.published, published_at: draft.published ? (draft.id ? undefined : new Date().toISOString()) : null, author_id: user!.id };
    let error: { code?: string; message?: string } | null = null;
    if (draft.id === null) {
      const res = await supabase.from('blog_posts').insert(payload).select('id').single();
      error = res.error;
      if (!error && res.data) setDraft(d => ({ ...d, id: (res.data as { id: string }).id }));
    } else {
      const res = await supabase.from('blog_posts').update(payload).eq('id', draft.id);
      error = res.error;
    }
    setBlogSaving(false);
    if (error) {
      if (error.code === '23505') showToast('Slug already taken — edit it manually', 'error');
      else showToast('Save failed: ' + error.message, 'error');
    } else { showToast('Post saved!', 'success'); loadBlog(); }
  };

  const deleteBlogPost = async (id: string) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) showToast('Delete failed', 'error');
    else { showToast('Post deleted', 'success'); setBlogPosts(prev => prev.filter(p => p.id !== id)); }
  };

  const togglePublish = async (post: BlogPostRow) => {
    const newVal = !post.published;
    const { error } = await supabase.from('blog_posts').update({ published: newVal, published_at: newVal ? new Date().toISOString() : null }).eq('id', post.id);
    if (error) showToast('Update failed', 'error');
    else { showToast(newVal ? 'Post published!' : 'Post unpublished', 'success'); setBlogPosts(prev => prev.map(p => p.id === post.id ? { ...p, published: newVal } : p)); }
  };

  const saveSettings = async (key: 'announcement' | 'maintenance') => {
    setSettingsSaving(true);
    const value = key === 'announcement' ? siteSettings.announcement : siteSettings.maintenance;
    const dbKey = key === 'maintenance' ? 'maintenance_mode' : 'announcement';
    const { error } = await supabase.from('site_settings').upsert({ key: dbKey, value }, { onConflict: 'key' });
    setSettingsSaving(false);
    if (error) showToast('Settings save failed', 'error');
    else showToast('Settings saved!', 'success');
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const signalBadge = (sig: string) => {
    if (sig === 'BUY') return 'bg-green-500/20 text-green-400 border border-green-500/30';
    if (sig === 'SELL') return 'bg-red-500/20 text-red-400 border border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  };
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`;
  const filteredUsers = allUsers.filter(u => !userSearch || [u.full_name, u.email, u.phone].some(f => f?.toLowerCase().includes(userSearch.toLowerCase())));
  const filteredSignals = signalFilter ? allSignals.filter(s => s.signal === signalFilter) : allSignals;

  const viewUserTrades = async (u: Profile) => {
    setTradeModalLoading(true);
    setTradeModal({ user: u, trades: [] });
    const { data } = await supabase.from('demo_trades')
      .select('id, symbol, type, entry_price, exit_price, lot_size, pnl, status, opened_at, closed_at')
      .eq('user_id', u.id)
      .order('opened_at', { ascending: false })
      .limit(100);
    setTradeModal({ user: u, trades: (data as DemoTrade[]) ?? [] });
    setTradeModalLoading(false);
  };

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'signals', label: 'Signals', icon: <Radio className="w-4 h-4" /> },
    { id: 'blog', label: 'Blog', icon: <FileText className="w-4 h-4" /> },
    { id: 'eastats', label: 'EA Stats', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const Spinner = () => (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const chartOpts = (label: string) => ({
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: label, color: darkMode ? '#9ca3af' : '#6b7280', font: { size: 12 } } },
    scales: {
      x: { ticks: { color: darkMode ? '#6b7280' : '#9ca3af', font: { size: 10 } }, grid: { color: darkMode ? '#1f2937' : '#f3f4f6' } },
      y: { ticks: { color: darkMode ? '#6b7280' : '#9ca3af', font: { size: 10 } }, grid: { color: darkMode ? '#1f2937' : '#f3f4f6' } },
    },
  });

  // ─── Access guard ────────────────────────────────────────────────────────────

  // Not logged in → show embedded login form (works on any subdomain, no Navbar needed)
  if (!isLoggedIn) return (
    <div className={`flex h-screen items-center justify-center ${bg}`}>
      <div className={`p-8 rounded-2xl border max-w-sm w-full mx-4 ${cardBg}`}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Admin Login</h2>
          <p className={`text-xs mt-1 ${textMuted}`}>Trading Bangla — Admin Dashboard</p>
        </div>
        <form onSubmit={handleAdminLogin} className="flex flex-col gap-3">
          <input
            type="email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            placeholder="Email"
            required
            className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-yellow-500/40 ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
          />
          <input
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            placeholder="Password"
            required
            className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-yellow-500/40 ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
          />
          {loginError && <p className="text-xs text-red-400 text-center">{loginError}</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loginLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );

  if (checkingAccess) return (
    <div className={`flex h-screen items-center justify-center ${bg}`}>
      <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (accessDenied) return (
    <div className={`flex h-screen items-center justify-center ${bg}`}>
      <div className={`text-center p-10 rounded-2xl border max-w-sm w-full ${cardBg}`}>
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Access Denied</h2>
        <p className={`text-sm mb-6 ${textMuted}`}>Admin only — আপনার এই page দেখার permission নেই।</p>
        <button onClick={() => navigate('/')} className={`flex items-center gap-2 mx-auto text-xs text-yellow-400 hover:text-yellow-300 transition-colors`}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </button>
      </div>
    </div>
  );

  // ─── Main layout ──────────────────────────────────────────────────────────────

  return (
    <div className={`flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] ${bg}`}>
      {/* Sidebar */}
      <aside className={`w-[200px] lg:w-[220px] shrink-0 border-r flex flex-col ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className={`px-4 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-gray-900" />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${textPrimary}`}>Admin Panel</p>
              <p className={`text-[10px] truncate ${textMuted}`}>{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-yellow-500/20 text-yellow-400 border-l-2 border-yellow-400 pl-[10px]'
                  : darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        <div className={`p-3 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <button onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-5 md:p-6">
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${textPrimary}`}>{navItems.find(n => n.id === activeTab)?.label}</h1>
            <p className={`text-sm mt-0.5 ${textMuted}`}>Trading Bangla — Admin Dashboard</p>
          </div>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (overviewLoading ? <Spinner /> : (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: overviewStats?.totalUsers ?? 0, icon: <Users className="w-5 h-5 text-blue-400" /> },
                  { label: 'Total Signals', value: overviewStats?.totalSignals ?? 0, icon: <Radio className="w-5 h-5 text-yellow-400" /> },
                  { label: 'Total Trades', value: overviewStats?.totalTrades ?? 0, icon: <Activity className="w-5 h-5 text-purple-400" /> },
                  { label: 'Win Rate', value: overviewStats?.winRate != null ? `${overviewStats.winRate.toFixed(1)}%` : 'N/A', icon: <BarChart3 className="w-5 h-5 text-green-400" /> },
                ].map(card => (
                  <div key={card.label} className={`rounded-xl p-5 border ${cardBg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>{card.label}</p>
                      <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>{card.icon}</div>
                    </div>
                    <p className={`text-2xl font-bold ${textPrimary}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              {eaChartData.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`rounded-xl p-4 border ${cardBg}`}>
                    <Bar
                      data={{ labels: eaChartData.slice(-7).map(d => d.date.slice(5)), datasets: [{ label: 'Signals', data: eaChartData.slice(-7).map(d => d.total_signals ?? 0), backgroundColor: '#6366f1aa', borderRadius: 4 }] }}
                      options={chartOpts('Signals per Day (Last 7)')}
                    />
                  </div>
                  <div className={`rounded-xl p-4 border ${cardBg}`}>
                    <Line
                      data={{ labels: eaChartData.map(d => d.date.slice(5)), datasets: [{ label: 'Win Rate %', data: eaChartData.map(d => d.win_rate ?? 0), borderColor: '#22c55e', backgroundColor: '#22c55e22', tension: 0.4, fill: true, pointRadius: 2 }] }}
                      options={chartOpts('Win Rate Trend (Last 30 Days)')}
                    />
                  </div>
                </div>
              )}

              {/* Recent Signals */}
              <div>
                <h2 className={`text-sm font-semibold mb-3 ${textMuted}`}>Recent Signals</h2>
                <div className={`rounded-xl overflow-hidden border ${cardBg}`}>
                  <table className="w-full text-sm">
                    <thead><tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      {['Symbol', 'Signal', 'Confidence', 'Price', 'Timeframe', 'Date'].map(h => <th key={h} className={`px-4 py-3 text-left text-xs uppercase tracking-wider font-medium ${textMuted}`}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {recentSignals.length === 0 ? <tr><td colSpan={6} className={`px-4 py-8 text-center text-xs ${textMuted}`}>No signals</td></tr>
                        : recentSignals.map(s => (
                          <tr key={s.id} className={`border-b transition-colors ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <td className={`px-4 py-3 font-semibold ${textPrimary}`}>{s.symbol}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${signalBadge(s.signal)}`}>{s.signal}</span></td>
                            <td className={`px-4 py-3 ${textMuted}`}>{s.confidence != null ? `${s.confidence}%` : '—'}</td>
                            <td className={`px-4 py-3 ${textMuted}`}>{s.price ?? '—'}</td>
                            <td className={`px-4 py-3 ${textMuted}`}>{s.timeframe ?? '—'}</td>
                            <td className={`px-4 py-3 text-xs ${textMuted}`}>{formatDate(s.created_at)}</td>
                          </tr>))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Users */}
              <div>
                <h2 className={`text-sm font-semibold mb-3 ${textMuted}`}>Recent Users</h2>
                <div className={`rounded-xl overflow-hidden border ${cardBg}`}>
                  <table className="w-full text-sm">
                    <thead><tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      {['Name', 'Email', 'Mobile', 'Role', 'Joined'].map(h => <th key={h} className={`px-4 py-3 text-left text-xs uppercase tracking-wider font-medium ${textMuted}`}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {recentUsers.length === 0 ? <tr><td colSpan={5} className={`px-4 py-8 text-center text-xs ${textMuted}`}>No users</td></tr>
                        : recentUsers.map(u => (
                          <tr key={u.id} className={`border-b transition-colors ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-gray-900 text-xs font-bold shrink-0">{u.full_name?.charAt(0)?.toUpperCase() ?? '?'}</div>
                                <span className={`font-medium ${textPrimary}`}>{u.full_name ?? 'Unknown'}</span>
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-xs ${textMuted} max-w-[140px] truncate`}>{u.email ?? '—'}</td>
                            <td className={`px-4 py-3 text-xs ${textMuted}`}>{u.phone || '—'}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                            <td className={`px-4 py-3 text-xs ${textMuted}`}>{formatDate(u.created_at)}</td>
                          </tr>))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textMuted}`} />
                  <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users…" className={`${inputCls} pl-9`} />
                </div>
                <span className={`text-xs ${textMuted}`}>{filteredUsers.length} users</span>
              </div>
              {usersLoading ? <Spinner /> : (
                <div className={`rounded-xl overflow-hidden border ${cardBg}`}>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead><tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      {['User', 'Email', 'Mobile', 'Role', 'Trades', 'Joined'].map(h => <th key={h} className={`px-4 py-3 text-left text-xs uppercase tracking-wider font-medium ${textMuted}`}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredUsers.length === 0 ? <tr><td colSpan={6} className={`px-4 py-8 text-center text-xs ${textMuted}`}>No users found</td></tr>
                        : filteredUsers.map(u => (
                          <tr key={u.id} className={`border-b transition-colors ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-gray-900 text-xs font-bold shrink-0">{u.full_name?.charAt(0)?.toUpperCase() ?? '?'}</div>
                                <div>
                                  <p className={`font-medium ${textPrimary}`}>{u.full_name ?? 'Unknown'}</p>
                                  <p className={`text-[10px] font-mono ${textMuted}`}>{u.id.slice(0, 8)}…</p>
                                </div>
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-xs ${textMuted} max-w-[160px] truncate`}>{u.email ?? '—'}</td>
                            <td className={`px-4 py-3 text-xs ${textMuted}`}>{u.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                                className={`text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                                <option value="member">member</option>
                                <option value="admin">admin</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => viewUserTrades(u)}
                                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${(userTradeCounts[u.id] ?? 0) > 0 ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : `border-gray-700 ${textMuted} hover:border-gray-500`}`}>
                                {userTradeCounts[u.id] ?? 0} trades
                              </button>
                            </td>
                            <td className={`px-4 py-3 text-xs ${textMuted}`}>{formatDate(u.created_at)}</td>
                          </tr>))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SIGNALS ── */}
          {activeTab === 'signals' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <select value={signalFilter} onChange={e => setSignalFilter(e.target.value)}
                  className={`text-xs rounded-lg px-3 py-2 border focus:outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                  <option value="">All Signals</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                  <option value="NEUTRAL">NEUTRAL</option>
                </select>
                {selectedSignals.size > 0 && (
                  <button onClick={deleteSignals} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete {selectedSignals.size} selected
                  </button>
                )}
              </div>
              {signalsLoading && allSignals.length === 0 ? <Spinner /> : (
                <>
                  <div className={`rounded-xl overflow-hidden border ${cardBg}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[700px]">
                        <thead><tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                          <th className="px-3 py-3 w-10">
                            <input type="checkbox" checked={selectedSignals.size === filteredSignals.length && filteredSignals.length > 0}
                              onChange={e => setSelectedSignals(e.target.checked ? new Set(filteredSignals.map(s => s.id)) : new Set())}
                              className="rounded" />
                          </th>
                          {['Symbol', 'Signal', 'Confidence', 'Price', 'SL', 'TP', 'Timeframe', 'Date'].map(h => <th key={h} className={`px-4 py-3 text-left text-xs uppercase tracking-wider font-medium ${textMuted}`}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {filteredSignals.length === 0 ? <tr><td colSpan={9} className={`px-4 py-8 text-center text-xs ${textMuted}`}>No signals</td></tr>
                            : filteredSignals.map(s => (
                              <tr key={s.id} className={`border-b transition-colors ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                                <td className="px-3 py-3"><input type="checkbox" checked={selectedSignals.has(s.id)} onChange={e => { const n = new Set(selectedSignals); e.target.checked ? n.add(s.id) : n.delete(s.id); setSelectedSignals(n); }} className="rounded" /></td>
                                <td className={`px-4 py-3 font-semibold ${textPrimary}`}>{s.symbol}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${signalBadge(s.signal)}`}>{s.signal}</span></td>
                                <td className={`px-4 py-3 ${textMuted}`}>{s.confidence != null ? `${s.confidence}%` : '—'}</td>
                                <td className={`px-4 py-3 ${textMuted}`}>{s.price ?? '—'}</td>
                                <td className={`px-4 py-3 ${textMuted}`}>{s.sl ?? '—'}</td>
                                <td className={`px-4 py-3 ${textMuted}`}>{s.tp ?? '—'}</td>
                                <td className={`px-4 py-3 ${textMuted}`}>{s.timeframe ?? '—'}</td>
                                <td className={`px-4 py-3 text-xs ${textMuted}`}>{formatDate(s.created_at)}</td>
                              </tr>))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {signalHasMore && (
                    <div className="flex justify-center">
                      <button onClick={() => { const next = signalPage + 1; setSignalPage(next); loadSignals(next, true); }}
                        disabled={signalsLoading}
                        className="px-5 py-2 rounded-xl text-xs font-medium border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50 transition-colors">
                        {signalsLoading ? 'Loading…' : 'Load more signals'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── BLOG ── */}
          {activeTab === 'blog' && (
            blogView === 'list' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${textMuted}`}>{blogPosts.length} posts total</p>
                  <button onClick={() => { setDraft(BLANK_DRAFT); setBlogView('editor'); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> New Post
                  </button>
                </div>
                {blogLoading ? <Spinner /> : (
                  <div className={`rounded-xl overflow-hidden border ${cardBg}`}>
                    <table className="w-full text-sm">
                      <thead><tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                        {['Title', 'Category', 'Status', 'Views', 'Date', 'Actions'].map(h => <th key={h} className={`px-4 py-3 text-left text-xs uppercase tracking-wider font-medium ${textMuted}`}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {blogPosts.length === 0 ? <tr><td colSpan={6} className={`px-4 py-12 text-center text-xs ${textMuted}`}>No posts yet. Click "New Post" to create one.</td></tr>
                          : blogPosts.map(p => (
                            <tr key={p.id} className={`border-b transition-colors ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                              <td className={`px-4 py-3 font-medium max-w-[200px] truncate ${textPrimary}`}>{p.title}</td>
                              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 capitalize">{p.category}</span></td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                  {p.published ? 'Published' : 'Draft'}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-xs ${textMuted}`}>{p.views}</td>
                              <td className={`px-4 py-3 text-xs ${textMuted}`}>{formatDate(p.created_at)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => { setDraft({ id: p.id, title: p.title, slug: p.slug, content: p.content, excerpt: p.excerpt, thumbnail_url: p.thumbnail_url ?? '', category: p.category, published: p.published }); setBlogView('editor'); }}
                                    className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => togglePublish(p)}
                                    className={`p-1.5 rounded-lg transition-colors ${p.published ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-green-400 hover:bg-green-500/10'}`}>
                                    {p.published ? <X className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                                  </button>
                                  <button onClick={() => deleteBlogPost(p.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Blog Editor */
              <div>
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => setBlogView('list')} className={`flex items-center gap-2 text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                    <ArrowLeft className="w-4 h-4" /> All Posts
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={saveDraft} disabled={blogSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                      <Save className="w-3.5 h-3.5" />{blogSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                  {/* Left: Content */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Title *</label>
                      <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value, slug: d.slug || autoSlug(e.target.value) }))}
                        placeholder="Post title…" className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Slug</label>
                      <input value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))}
                        placeholder="auto-generated-from-title" className={`${inputCls} font-mono text-xs`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Content</label>
                      <textarea value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                        placeholder="Post content… (paragraphs separated by blank lines)"
                        rows={18} className={`${inputCls} font-mono resize-none`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Excerpt</label>
                      <textarea value={draft.excerpt} onChange={e => setDraft(d => ({ ...d, excerpt: e.target.value }))}
                        placeholder="Short summary (shown in blog listing)…"
                        rows={3} className={`${inputCls} resize-none`} />
                    </div>
                  </div>

                  {/* Right: Settings */}
                  <div className="space-y-4">
                    <div className={`rounded-xl border p-4 space-y-4 ${cardBg}`}>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Thumbnail URL</label>
                        <input value={draft.thumbnail_url} onChange={e => setDraft(d => ({ ...d, thumbnail_url: e.target.value }))}
                          placeholder="https://…" className={inputCls} />
                        {draft.thumbnail_url && <img src={draft.thumbnail_url} alt="thumb" className="mt-2 w-full h-28 object-cover rounded-lg" onError={e => (e.currentTarget.style.display = 'none')} />}
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Category</label>
                        <div className="relative">
                          <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                            className={`${inputCls} appearance-none pr-8 capitalize`}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${textMuted}`} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-medium ${textPrimary}`}>Published</p>
                          <p className={`text-[10px] ${textMuted}`}>{draft.published ? 'Visible to public' : 'Draft — hidden'}</p>
                        </div>
                        <button onClick={() => setDraft(d => ({ ...d, published: !d.published }))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${draft.published ? 'bg-green-500' : darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft.published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ── EA STATS ── */}
          {activeTab === 'eastats' && (eaLoading ? <Spinner /> : (
            <div className={`rounded-xl overflow-hidden border ${cardBg}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead><tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    {['Date', 'Total', 'Buy', 'Sell', 'Avg Conf', 'Win Rate', 'Total P&L', 'Updated'].map(h => <th key={h} className={`px-4 py-3 text-left text-xs uppercase tracking-wider font-medium ${textMuted}`}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {eaStats.length === 0 ? <tr><td colSpan={8} className={`px-4 py-8 text-center text-xs ${textMuted}`}>No EA stats found</td></tr>
                      : eaStats.map(row => (
                        <tr key={row.id} className={`border-b transition-colors ${darkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                          <td className={`px-4 py-3 font-medium ${textPrimary}`}>{row.date}</td>
                          <td className={`px-4 py-3 ${textMuted}`}>{row.total_signals ?? '—'}</td>
                          <td className="px-4 py-3 text-green-400">{row.buy_signals ?? '—'}</td>
                          <td className="px-4 py-3 text-red-400">{row.sell_signals ?? '—'}</td>
                          <td className={`px-4 py-3 ${textMuted}`}>{row.avg_confidence != null ? `${row.avg_confidence.toFixed(1)}%` : '—'}</td>
                          <td className="px-4 py-3 text-yellow-400">{row.win_rate != null ? `${row.win_rate.toFixed(1)}%` : '—'}</td>
                          <td className={`px-4 py-3 font-semibold ${row.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{row.total_pnl != null ? (row.total_pnl >= 0 ? '+' : '') + row.total_pnl.toFixed(2) : '—'}</td>
                          <td className={`px-4 py-3 text-xs ${textMuted}`}>{formatDate(row.updated_at)}</td>
                        </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (settingsLoading ? <Spinner /> : (
            <div className="space-y-5 max-w-2xl">
              {/* Announcement */}
              <div className={`rounded-xl border p-6 space-y-4 ${cardBg}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <Bell className="w-5 h-5 text-yellow-400" />
                  <h3 className={`font-semibold ${textPrimary}`}>Announcement Banner</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Enable Banner</p>
                    <p className={`text-xs ${textMuted}`}>Show announcement to all visitors</p>
                  </div>
                  <button onClick={() => setSiteSettings(s => ({ ...s, announcement: { ...s.announcement, enabled: !s.announcement.enabled } }))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${siteSettings.announcement.enabled ? 'bg-yellow-500' : darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteSettings.announcement.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Message</label>
                  <input value={siteSettings.announcement.message}
                    onChange={e => setSiteSettings(s => ({ ...s, announcement: { ...s.announcement, message: e.target.value } }))}
                    placeholder="Announcement message…" className={inputCls} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Type</label>
                  <div className="flex gap-2">
                    {(['info', 'warning', 'success'] as const).map(t => (
                      <button key={t} onClick={() => setSiteSettings(s => ({ ...s, announcement: { ...s.announcement, type: t } }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                          siteSettings.announcement.type === t
                            ? t === 'info' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : t === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-green-500/20 text-green-400 border-green-500/40'
                            : darkMode ? 'border-gray-700 text-gray-500 hover:border-gray-500' : 'border-gray-300 text-gray-500 hover:border-gray-400'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => saveSettings('announcement')} disabled={settingsSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500 text-gray-900 text-xs font-semibold hover:bg-yellow-400 disabled:opacity-50 transition-colors">
                  <Save className="w-3.5 h-3.5" />{settingsSaving ? 'Saving…' : 'Save Announcement'}
                </button>
              </div>

              {/* Maintenance Mode */}
              <div className={`rounded-xl border p-6 ${cardBg}`}>
                <div className="flex items-center gap-2.5 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <h3 className={`font-semibold ${textPrimary}`}>Maintenance Mode</h3>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Enable Maintenance</p>
                    <p className={`text-xs ${textMuted}`}>Temporarily take site offline for users</p>
                  </div>
                  <button onClick={() => {
                    if (!siteSettings.maintenance.enabled) {
                      if (!window.confirm('সত্যিই Maintenance Mode চালু করবেন? Users site দেখতে পাবেন না।')) return;
                    }
                    setSiteSettings(s => ({ ...s, maintenance: { enabled: !s.maintenance.enabled } }));
                  }}
                    className={`w-11 h-6 rounded-full transition-colors relative ${siteSettings.maintenance.enabled ? 'bg-orange-500' : darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteSettings.maintenance.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {siteSettings.maintenance.enabled && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                    <p className="text-xs text-orange-400">Maintenance mode is ON — users will see a maintenance page.</p>
                  </div>
                )}
                <button onClick={() => saveSettings('maintenance')} disabled={settingsSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold hover:bg-orange-500/30 disabled:opacity-50 transition-colors">
                  <Save className="w-3.5 h-3.5" />{settingsSaving ? 'Saving…' : 'Save Maintenance Setting'}
                </button>
              </div>

              {/* Quick Links */}
              <div className={`rounded-xl border p-6 ${cardBg}`}>
                <div className="flex items-center gap-2.5 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h3 className={`font-semibold ${textPrimary}`}>Quick Links</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'View Blog', href: '/blog' },
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'EA Analytics', href: '/ea-analytics' },
                    { label: 'MT5 Terminal', href: '/trade' },
                  ].map(l => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${darkMode ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}>
                      <Eye className="w-3.5 h-3.5" />{l.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Trade History Modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setTradeModal(null)}>
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
            onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <div>
                <h3 className={`font-bold text-base ${textPrimary}`}>{tradeModal.user.full_name ?? 'User'} — Trade History</h3>
                <p className={`text-xs ${textMuted}`}>{tradeModal.user.email ?? tradeModal.user.id.slice(0, 16)}</p>
              </div>
              <button onClick={() => setTradeModal(null)} className={`p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors ${textMuted}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {tradeModalLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tradeModal.trades.length === 0 ? (
                <p className={`py-12 text-center text-sm ${textMuted}`}>এই user এর কোনো trade নেই</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    {['Symbol', 'Type', 'Lots', 'Entry', 'Exit', 'P&L', 'Status', 'Date'].map(h =>
                      <th key={h} className={`px-3 py-2.5 text-left text-xs uppercase tracking-wider font-medium ${textMuted}`}>{h}</th>
                    )}
                  </tr></thead>
                  <tbody>
                    {tradeModal.trades.map(t => (
                      <tr key={t.id} className={`border-b ${darkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                        <td className={`px-3 py-2.5 font-medium text-xs ${textPrimary}`}>{t.symbol}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.type}</span>
                        </td>
                        <td className={`px-3 py-2.5 text-xs ${textMuted}`}>{t.lot_size ?? '—'}</td>
                        <td className={`px-3 py-2.5 text-xs ${textMuted}`}>{t.entry_price?.toFixed(5) ?? '—'}</td>
                        <td className={`px-3 py-2.5 text-xs ${textMuted}`}>{t.exit_price?.toFixed(5) ?? '—'}</td>
                        <td className={`px-3 py-2.5 text-xs font-semibold ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(t.pnl ?? 0) >= 0 ? '+' : ''}{(t.pnl ?? 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.status === 'open' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-600/40 text-gray-400'}`}>{t.status}</span>
                        </td>
                        <td className={`px-3 py-2.5 text-[10px] ${textMuted}`}>{new Date(t.opened_at).toLocaleDateString('en-GB')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
