import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import {
  LayoutDashboard, Users, Radio, BarChart3, FileText, Settings,
  ArrowLeft, TrendingUp, Activity, Search, CheckCircle, X,
  Trash2, Edit2, RefreshCw, DollarSign, Zap, Shield, LogOut,
  UserCheck, AlertCircle, Bell, Globe, TrendingDown,
  ChevronRight, Save, Eye, Plus, BarChart2,
} from 'lucide-react';

type Tab = 'overview' | 'users' | 'signals' | 'trades' | 'blog' | 'settings';

interface Profile { id: string; full_name: string | null; role: string; created_at: string; }
interface Signal { id: string; symbol: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; confidence: number; price: number; sl: number; tp: number; timeframe: string; source: string; created_at: string; }
interface DemoTrade { id: string; user_id: string; symbol: string; type: 'BUY' | 'SELL'; entry_price: number; exit_price: number | null; lot_size: number; pnl: number; status: string; opened_at: string; closed_at: string | null; }
interface BlogPost { id: string; title: string; slug: string; category: string; published: boolean; views: number; created_at: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4 hover:border-gray-700 transition-colors">
      <div className={`p-2.5 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
      <div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ stats, profiles, signals, trades }: {
  stats: any; profiles: Profile[]; signals: Signal[]; trades: DemoTrade[];
}) {
  const recent5Users = profiles.slice(0, 5);
  const recent5Signals = signals.slice(0, 8);
  const buySignals = signals.filter(s => s.signal === 'BUY').length;
  const sellSignals = signals.filter(s => s.signal === 'SELL').length;
  const closedTrades = trades.filter(t => t.status === 'closed');
  const openTrades = trades.filter(t => t.status === 'open');

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total Users" value={stats.totalUsers} sub="Registered members" color="bg-indigo-600" />
        <KpiCard icon={Radio} label="Total Signals" value={stats.totalSignals} sub={`${buySignals} BUY · ${sellSignals} SELL`} color="bg-emerald-600" />
        <KpiCard icon={BarChart3} label="Demo Trades" value={stats.totalTrades} sub={`${openTrades.length} open · ${closedTrades.length} closed`} color="bg-amber-600" />
        <KpiCard icon={DollarSign} label="Net P&L" value={`$${stats.netPnl.toFixed(2)}`} sub={`Win Rate: ${stats.winRate}%`} color={stats.netPnl >= 0 ? 'bg-green-600' : 'bg-red-600'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Users className="w-4 h-4 text-indigo-400" /> Recent Users</div>
            <span className="text-xs text-gray-500">{profiles.length} total</span>
          </div>
          <div className="divide-y divide-gray-800">
            {recent5Users.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-600 text-sm">No users yet</div>
            )}
            {recent5Users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {(u.full_name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{u.full_name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-amber-900/40 text-amber-400' : 'bg-indigo-900/40 text-indigo-400'}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Signals */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Radio className="w-4 h-4 text-emerald-400" /> Recent Signals</div>
            <span className="text-xs text-gray-500">{signals.length} total</span>
          </div>
          <div className="divide-y divide-gray-800">
            {recent5Signals.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-600 text-sm">No signals yet</div>
            )}
            {recent5Signals.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${s.signal === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                  {s.signal}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">{s.symbol}</div>
                  <div className="text-xs text-gray-500">{s.timeframe} · Conf: {s.confidence}%</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Signal bot status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4"><Activity className="w-4 h-4 text-cyan-400" /> Signal Bot Status</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'BUY Signals', value: buySignals, color: 'text-green-400' },
            { label: 'SELL Signals', value: sellSignals, color: 'text-red-400' },
            { label: 'Avg Confidence', value: signals.length ? `${Math.round(signals.reduce((s, x) => s + (x.confidence || 0), 0) / signals.length)}%` : '--', color: 'text-amber-400' },
            { label: 'Open Trades', value: openTrades.length, color: 'text-cyan-400' },
          ].map(item => (
            <div key={item.label} className="bg-gray-800 rounded-lg p-4">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ profiles, search, setSearch, reload, showToast }: {
  profiles: Profile[]; search: string; setSearch: (s: string) => void; reload: () => void; showToast: (m: string, t?: 'ok' | 'err') => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = profiles.filter(p =>
    !search || (p.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) { showToast('Role change failed', 'err'); return; }
    showToast(`Role changed to ${newRole}`, 'ok');
    reload();
  };

  const admins = profiles.filter(p => p.role === 'admin').length;
  const members = profiles.filter(p => p.role === 'member').length;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{profiles.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Users</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{members}</div>
          <div className="text-xs text-gray-500 mt-1">Members</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{admins}</div>
          <div className="text-xs text-gray-500 mt-1">Admins</div>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          <span className="text-xs text-gray-600">{filtered.length} found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Joined</th>
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-600">No users found</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {(u.full_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{u.full_name || 'No name'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-amber-900/40 text-amber-400 border border-amber-800' : 'bg-indigo-900/40 text-indigo-400 border border-indigo-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs font-mono">{u.id.slice(0, 8)}...</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => toggleRole(u.id, u.role)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700">
                      {u.role === 'admin' ? '→ Member' : '→ Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Signals Tab ──────────────────────────────────────────────────────────────
function SignalsTab({ signals, reload, showToast }: {
  signals: Signal[]; reload: () => void; showToast: (m: string, t?: 'ok' | 'err') => void;
}) {
  const [filter, setFilter] = useState('');
  const filtered = signals.filter(s =>
    !filter || s.symbol.toLowerCase().includes(filter.toLowerCase()) || s.signal.includes(filter.toUpperCase())
  );

  const bulkDelete = async () => {
    if (!window.confirm(`Delete all ${signals.length} signals? This cannot be undone.`)) return;
    const { error } = await supabase.from('signals').delete().neq('id', 0);
    if (error) { showToast('Delete failed', 'err'); return; }
    showToast('All signals deleted', 'ok');
    reload();
  };

  const buys = signals.filter(s => s.signal === 'BUY').length;
  const sells = signals.filter(s => s.signal === 'SELL').length;
  const avgConf = signals.length ? Math.round(signals.reduce((s, x) => s + (x.confidence || 0), 0) / signals.length) : 0;

  // By symbol count
  const bySymbol: Record<string, number> = {};
  signals.forEach(s => { bySymbol[s.symbol] = (bySymbol[s.symbol] || 0) + 1; });
  const topSymbols = Object.entries(bySymbol).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{signals.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Signals</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{buys}</div>
          <div className="text-xs text-gray-500 mt-1">BUY Signals</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{sells}</div>
          <div className="text-xs text-gray-500 mt-1">SELL Signals</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{avgConf}%</div>
          <div className="text-xs text-gray-500 mt-1">Avg Confidence</div>
        </div>
      </div>

      {/* Top symbols */}
      {topSymbols.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-indigo-400" /> Signals by Symbol</div>
          <div className="space-y-3">
            {topSymbols.map(([sym, count]) => (
              <div key={sym} className="flex items-center gap-3">
                <div className="text-sm text-gray-300 w-20">{sym}</div>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(count / signals.length) * 100}%` }} />
                </div>
                <div className="text-xs text-gray-500 w-8 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <Search className="w-4 h-4 text-gray-500" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by symbol or direction..." className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none" />
          {signals.length > 0 && (
            <button onClick={bulkDelete} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/60 transition-colors">
              <Trash2 className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Symbol</th>
                <th className="text-left px-5 py-3">Signal</th>
                <th className="text-left px-5 py-3">Confidence</th>
                <th className="text-left px-5 py-3">Price</th>
                <th className="text-left px-5 py-3">SL / TP</th>
                <th className="text-left px-5 py-3">Timeframe</th>
                <th className="text-left px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-600">
                  {signals.length === 0 ? 'No signals yet — signals will appear here when the bot generates them' : 'No matches'}
                </td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-white">{s.symbol}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded ${s.signal === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{s.signal}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${s.confidence || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{s.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-300 font-mono text-xs">{s.price}</td>
                  <td className="px-5 py-3 text-xs"><span className="text-red-400">{s.sl}</span> / <span className="text-green-400">{s.tp}</span></td>
                  <td className="px-5 py-3 text-xs text-gray-400">{s.timeframe}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Trades Tab ───────────────────────────────────────────────────────────────
function TradesTab({ trades, profiles }: { trades: DemoTrade[]; profiles: Profile[] }) {
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']));
  const closed = trades.filter(t => t.status === 'closed');
  const open = trades.filter(t => t.status === 'open');
  const wins = closed.filter(t => (t.pnl || 0) > 0);
  const netPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{trades.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Trades</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">{open.length}</div>
          <div className="text-xs text-gray-500 mt-1">Open</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{closed.length}</div>
          <div className="text-xs text-gray-500 mt-1">Closed · {closed.length ? Math.round(wins.length / closed.length * 100) : 0}% WR</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>${netPnl.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Net P&L</div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800 text-sm font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" /> Demo Trades — All Users
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Symbol</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Lot</th>
                <th className="text-left px-5 py-3">Entry</th>
                <th className="text-left px-5 py-3">Exit</th>
                <th className="text-left px-5 py-3">P&L</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {trades.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-600">No trades yet</td></tr>
              )}
              {trades.map(t => (
                <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-400">{profileMap[t.user_id] || t.user_id?.slice(0,8)}</td>
                  <td className="px-5 py-3 font-medium text-white">{t.symbol}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded ${t.type === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{t.type}</span></td>
                  <td className="px-5 py-3 text-gray-300 text-xs">{t.lot_size}</td>
                  <td className="px-5 py-3 text-gray-300 font-mono text-xs">{t.entry_price}</td>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{t.exit_price || '--'}</td>
                  <td className={`px-5 py-3 text-xs font-bold ${(t.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(t.pnl || 0) >= 0 ? '+' : ''}${(t.pnl || 0).toFixed(2)}</td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded ${t.status === 'open' ? 'bg-cyan-900/40 text-cyan-400' : 'bg-gray-800 text-gray-400'}`}>{t.status}</span></td>
                  <td className="px-5 py-3 text-xs text-gray-500">{new Date(t.opened_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Blog Tab ─────────────────────────────────────────────────────────────────
function BlogTab({ blogPosts, reload, showToast }: {
  blogPosts: BlogPost[]; reload: () => void; showToast: (m: string, t?: 'ok' | 'err') => void;
}) {
  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.from('blog_posts').update({
      published: !current,
      published_at: !current ? new Date().toISOString() : null,
    }).eq('id', id);
    if (error) { showToast('Failed', 'err'); return; }
    showToast(`Post ${!current ? 'published' : 'unpublished'}`, 'ok');
    reload();
  };

  const deletePost = async (id: string) => {
    if (!window.confirm('Delete this post?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) { showToast('Delete failed', 'err'); return; }
    showToast('Post deleted', 'ok');
    reload();
  };

  const published = blogPosts.filter(p => p.published).length;
  const totalViews = blogPosts.reduce((s, p) => s + (p.views || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{blogPosts.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Posts</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{published}</div>
          <div className="text-xs text-gray-500 mt-1">Published</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{totalViews}</div>
          <div className="text-xs text-gray-500 mt-1">Total Views</div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-400" /> Blog Posts</div>
          <Link to="/tb-admin-2026" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <Plus className="w-3 h-3" /> New Post
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {blogPosts.length === 0 && (
            <div className="px-5 py-12 text-center text-gray-600 text-sm">No blog posts yet</div>
          )}
          {blogPosts.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{p.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{p.category}</span>
                  <span className="text-xs text-gray-600">{p.views} views</span>
                  <span className="text-xs text-gray-600">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(p.id, p.published)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${p.published ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/60' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}>
                  {p.published ? '● Live' : '○ Draft'}
                </button>
                <Link to={`/blog/${p.slug}`} target="_blank" className="p-1.5 text-gray-500 hover:text-white transition-colors"><Eye className="w-3.5 h-3.5" /></Link>
                <button onClick={() => deletePost(p.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ announcement, setAnnouncement, announcementEnabled, setAnnouncementEnabled, showToast }: {
  announcement: string; setAnnouncement: (s: string) => void;
  announcementEnabled: boolean; setAnnouncementEnabled: (b: boolean) => void;
  showToast: (m: string, t?: 'ok' | 'err') => void;
}) {
  const [annType, setAnnType] = useState<'info' | 'warning' | 'success'>('info');
  const [maintenance, setMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveAnnouncement = async () => {
    setSaving(true);
    const { error } = await supabase.from('site_settings').upsert({
      key: 'announcement',
      value: { enabled: announcementEnabled, message: announcement, type: annType },
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { showToast('Save failed', 'err'); return; }
    showToast('Announcement saved!', 'ok');
  };

  const saveMaintenance = async () => {
    const { error } = await supabase.from('site_settings').upsert({
      key: 'maintenance',
      value: { enabled: maintenance },
      updated_at: new Date().toISOString(),
    });
    if (error) { showToast('Save failed', 'err'); return; }
    showToast(`Maintenance mode ${maintenance ? 'ON' : 'OFF'}`, 'ok');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Announcement */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-amber-400" /> Site Announcement</div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={announcementEnabled} onChange={e => setAnnouncementEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-700 peer-focus:ring-indigo-500 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['info', 'warning', 'success'] as const).map(t => (
                <button key={t} onClick={() => setAnnType(t)} className={`text-xs px-3 py-1.5 rounded-lg capitalize border transition-colors ${annType === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Message</label>
            <textarea
              value={announcement} onChange={e => setAnnouncement(e.target.value)}
              rows={3}
              placeholder="Enter announcement text..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <button onClick={saveAnnouncement} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Announcement'}
          </button>
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400" /> Maintenance Mode</div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={maintenance} onChange={e => setMaintenance(e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-700 peer-focus:ring-red-500 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>
        <p className="text-xs text-gray-500 mb-4">When enabled, visitors will see a maintenance page. Only admins can access the site.</p>
        <button onClick={saveMaintenance} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
          <Save className="w-4 h-4" /> Save Maintenance Setting
        </button>
      </div>

      {/* Site info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-sm font-semibold text-white flex items-center gap-2 mb-4"><Globe className="w-4 h-4 text-cyan-400" /> Site Information</div>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Production URL', value: 'https://www.tradingbangla.com' },
            { label: 'CRM URL', value: 'https://crm.tradingbangla.com' },
            { label: 'EA Dashboard', value: 'https://tradingbangla.com/ea-dashboard' },
            { label: 'Signal Bot', value: 'wss://signals.tradingbangla.com' },
            { label: 'Supabase Project', value: SUPABASE_URL },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-500 text-xs">{item.label}</span>
              <span className="text-gray-300 font-mono text-xs truncate max-w-xs">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ADMIN_EMAILS = ['admin@tradingbangla.com', 'khondokartowsif171@gmail.com'];

// ─── Main CRM ─────────────────────────────────────────────────────────────────
export default function CrmDashboard() {
  // ── Standalone session — independent from main site auth ──────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalSignals: 0, totalTrades: 0, totalBlogPosts: 0, winRate: 0, netPnl: 0 });
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);

  // ── CRM Login state ──────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('admin@tradingbangla.com');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const passRef = useRef<HTMLInputElement>(null);

  const handleCrmLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });
    setLoginLoading(false);
    if (error) {
      setLoginError(error.message === 'Invalid login credentials'
        ? 'Email বা password ভুল আছে।'
        : error.message);
    }
  };

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: s }, { data: t }, { data: b }, { data: settings }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('demo_trades').select('*').order('opened_at', { ascending: false }).limit(500),
        supabase.from('blog_posts').select('id,title,slug,category,published,views,created_at').order('created_at', { ascending: false }),
        supabase.from('site_settings').select('*'),
      ]);
      setProfiles(p || []);
      setSignals(s || []);
      setTrades(t || []);
      setBlogPosts(b || []);
      if (settings) {
        const ann = settings.find((x: any) => x.key === 'announcement');
        if (ann?.value) { setAnnouncement(ann.value.message || ''); setAnnouncementEnabled(ann.value.enabled || false); }
      }
      const closed = (t || []).filter((x: any) => x.status === 'closed');
      const wins = closed.filter((x: any) => (x.pnl || 0) > 0);
      setStats({
        totalUsers: (p || []).length,
        totalSignals: (s || []).length,
        totalTrades: (t || []).length,
        totalBlogPosts: (b || []).length,
        winRate: closed.length ? Math.round(wins.length / closed.length * 100) : 0,
        netPnl: closed.reduce((acc: number, x: any) => acc + (x.pnl || 0), 0),
      });
    } catch { showToast('Data load failed', 'err'); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) loadData(); }, [loadData, isAdmin]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Trading Bangla</h1>
            <p className="text-indigo-400 text-sm font-mono tracking-widest mt-1">CRM DASHBOARD</p>
          </div>

          {/* Login Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Admin Login</h2>
            <p className="text-gray-500 text-xs mb-6">crm.tradingbangla.com — Authorized access only</p>

            <form onSubmit={handleCrmLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 tracking-wide uppercase">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && passRef.current?.focus()}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder="admin@tradingbangla.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 tracking-wide uppercase">Password</label>
                <input
                  ref={passRef}
                  type="password"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder="••••••••••••"
                />
              </div>

              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/60 border border-red-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-300">{loginError}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Login to CRM
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Back link */}
          <div className="text-center mt-5">
            <Link to="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3 h-3" /> Back to tradingbangla.com
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const NAV = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users', count: stats.totalUsers },
    { id: 'signals', icon: Radio, label: 'Signals', count: stats.totalSignals },
    { id: 'trades', icon: BarChart3, label: 'Trades', count: stats.totalTrades },
    { id: 'blog', icon: FileText, label: 'Blog', count: stats.totalBlogPosts },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm text-white">Trading Bangla</span>
          </div>
          <div className="text-xs text-indigo-400 font-mono tracking-widest">CRM v1.0</div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${activeTab === item.id ? 'bg-indigo-500' : 'bg-gray-700 text-gray-400'}`}>{item.count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-800 space-y-0.5">
          <div className="px-3 py-2 text-xs text-gray-600 font-mono truncate">{session?.user?.email}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            <LogOut className="w-3 h-3" /> Logout
          </button>
          <a href="https://www.tradingbangla.com" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800">
            <ArrowLeft className="w-3 h-3" /> tradingbangla.com
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="sticky top-0 bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between z-10 flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white capitalize">{activeTab}</h1>
            <p className="text-xs text-gray-600">crm.tradingbangla.com</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" /> Admin
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'overview' && <OverviewTab stats={stats} profiles={profiles} signals={signals} trades={trades} />}
          {activeTab === 'users' && <UsersTab profiles={profiles} search={search} setSearch={setSearch} reload={loadData} showToast={showToast} />}
          {activeTab === 'signals' && <SignalsTab signals={signals} reload={loadData} showToast={showToast} />}
          {activeTab === 'trades' && <TradesTab trades={trades} profiles={profiles} />}
          {activeTab === 'blog' && <BlogTab blogPosts={blogPosts} reload={loadData} showToast={showToast} />}
          {activeTab === 'settings' && <SettingsTab announcement={announcement} setAnnouncement={setAnnouncement} announcementEnabled={announcementEnabled} setAnnouncementEnabled={setAnnouncementEnabled} showToast={showToast} />}
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-5 right-5 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shadow-2xl z-50 border ${toast.type === 'ok' ? 'bg-green-950 text-green-300 border-green-800' : 'bg-red-950 text-red-300 border-red-800'}`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
