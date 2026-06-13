import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import AdvancedChart from '@/components/TradingView/AdvancedChart';
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  ChevronDown, BarChart2, Layers,
} from 'lucide-react';

// ── Pairs ──────────────────────────────────────────────────────────────────
const PAIRS = [
  { sym: 'XAUUSD', label: 'XAU/USD',  tvSym: 'OANDA:XAUUSD',    isJPY: false },
  { sym: 'EURUSD', label: 'EUR/USD',  tvSym: 'FX:EURUSD',        isJPY: false },
  { sym: 'GBPUSD', label: 'GBP/USD',  tvSym: 'FX:GBPUSD',        isJPY: false },
  { sym: 'USDJPY', label: 'USD/JPY',  tvSym: 'FX:USDJPY',        isJPY: true  },
  { sym: 'AUDUSD', label: 'AUD/USD',  tvSym: 'FX:AUDUSD',        isJPY: false },
  { sym: 'USDCAD', label: 'USD/CAD',  tvSym: 'FX:USDCAD',        isJPY: false },
  { sym: 'USDCHF', label: 'USD/CHF',  tvSym: 'FX:USDCHF',        isJPY: false },
  { sym: 'NZDUSD', label: 'NZD/USD',  tvSym: 'FX:NZDUSD',        isJPY: false },
  { sym: 'EURJPY', label: 'EUR/JPY',  tvSym: 'FX:EURJPY',        isJPY: true  },
  { sym: 'GBPJPY', label: 'GBP/JPY',  tvSym: 'FX:GBPJPY',        isJPY: true  },
  { sym: 'EURAUD', label: 'EUR/AUD',  tvSym: 'FX:EURAUD',        isJPY: false },
  { sym: 'EURCAD', label: 'EUR/CAD',  tvSym: 'FX:EURCAD',        isJPY: false },
  { sym: 'GBPCAD', label: 'GBP/CAD',  tvSym: 'FX:GBPCAD',        isJPY: false },
  { sym: 'EURCHF', label: 'EUR/CHF',  tvSym: 'FX:EURCHF',        isJPY: false },
  { sym: 'GBPCHF', label: 'GBP/CHF',  tvSym: 'FX:GBPCHF',        isJPY: false },
  { sym: 'XAGUSD', label: 'XAG/USD',  tvSym: 'OANDA:XAGUSD',    isJPY: false },
  { sym: 'BTCUSD', label: 'BTC/USD',  tvSym: 'BINANCE:BTCUSDT',  isJPY: false },
  { sym: 'US30',   label: 'US30',     tvSym: 'FOREXCOM:US30',    isJPY: false },
  { sym: 'NAS100', label: 'NAS100',   tvSym: 'NASDAQ:NDX',       isJPY: false },
  { sym: 'USOIL',  label: 'USOIL',   tvSym: 'NYMEX:CL1!',       isJPY: false },
] as const;

type PairSym = (typeof PAIRS)[number]['sym'];

// ── Timeframes ─────────────────────────────────────────────────────────────
const TIMEFRAMES = [
  { label: 'M1',  tv: '1'   },
  { label: 'M5',  tv: '5'   },
  { label: 'M15', tv: '15'  },
  { label: 'H1',  tv: '60'  },
  { label: 'H4',  tv: '240' },
  { label: 'D1',  tv: 'D'   },
] as const;

// ── Default TradingView studies ────────────────────────────────────────────
const TV_STUDIES = [
  'RSI@tv-basicstudies',
  'MACD@tv-basicstudies',
  'BB@tv-basicstudies',
  'Volume@tv-basicstudies',
];

// ── Price state ────────────────────────────────────────────────────────────
interface LivePrice {
  bid: string;
  ask: string;
  mid: number;
  prevMid: number;
}

export default function ForexMT5() {
  const { user } = useAuth();

  const [sym, setSym]           = useState<PairSym>('XAUUSD');
  const [tf, setTf]             = useState<string>('H1');
  const [viewMode, setViewMode] = useState<'tv' | 'custom'>('tv');
  const [livePrice, setLivePrice] = useState<LivePrice | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError]   = useState(false);

  const positionToDbId = useRef<Map<string, string>>(new Map());
  const prevMidRef     = useRef<number>(0);

  const pair = PAIRS.find(p => p.sym === sym)!;
  const tvInterval = TIMEFRAMES.find(t => t.label === tf)?.tv ?? '60';

  // ── Live price polling ────────────────────────────────────────────────────
  const fetchPrice = useCallback(async () => {
    try {
      const r = await fetch(`/api/oanda-prices?sym=${sym}`);
      if (!r.ok) return;
      const d = await r.json();
      const price = d.prices?.[0];
      if (!price) return;
      const bid = parseFloat(price.bids?.[0]?.price ?? '0');
      const ask = parseFloat(price.asks?.[0]?.price ?? '0');
      if (!bid || !ask) return;
      const mid = (bid + ask) / 2;
      const dec = pair.isJPY ? 3 : (sym === 'XAUUSD' || sym === 'XAGUSD' ? 2 : sym === 'BTCUSD' ? 1 : sym === 'US30' || sym === 'NAS100' || sym === 'USOIL' ? 2 : 5);
      setLivePrice(prev => ({
        bid: bid.toFixed(dec),
        ask: ask.toFixed(dec),
        mid,
        prevMid: prev?.mid ?? prevMidRef.current,
      }));
      prevMidRef.current = mid;
    } catch { /* silent */ }
  }, [sym, pair.isJPY]);

  useEffect(() => {
    setLivePrice(null);
    prevMidRef.current = 0;
    fetchPrice();
    const id = setInterval(fetchPrice, 5000);
    return () => clearInterval(id);
  }, [fetchPrice]);

  // ── Trade postMessage handler (for iframe custom mode) ────────────────────
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (!user) return;
      if (e.origin && e.origin !== window.location.origin && e.origin !== 'null') return;

      if (e.data?.type === 'TRADE_OPEN') {
        const { positionId, symbol, tradeType, lots, entryPrice } = e.data.trade;
        const { data } = await supabase
          .from('demo_trades')
          .insert({
            user_id: user.id,
            symbol,
            type: tradeType,
            entry_price: entryPrice,
            lot_size: lots,
            pnl: 0,
            status: 'open',
            opened_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (data?.id) positionToDbId.current.set(positionId, data.id);
      }

      if (e.data?.type === 'TRADE_CLOSE') {
        const { positionId, closePrice, pnl } = e.data;
        const dbId = positionToDbId.current.get(positionId);
        if (dbId) {
          await supabase
            .from('demo_trades')
            .update({
              exit_price: closePrice,
              pnl,
              status: 'closed',
              closed_at: new Date().toISOString(),
            })
            .eq('id', dbId);
          positionToDbId.current.delete(positionId);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [user]);

  // ── Derived price display ──────────────────────────────────────────────────
  const priceUp   = livePrice ? livePrice.mid > livePrice.prevMid : null;
  const priceColor = priceUp === null ? 'text-gray-400' : priceUp ? 'text-emerald-400' : 'text-red-400';

  const TOPBAR_H = 44; // px

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 56px)', background: '#07090e', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        style={{ height: TOPBAR_H, minHeight: TOPBAR_H, background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        className="flex items-center gap-2 px-3 flex-shrink-0 overflow-x-auto"
      >
        {/* Symbol selector */}
        <div className="relative flex-shrink-0">
          <select
            value={sym}
            onChange={e => setSym(e.target.value as PairSym)}
            className="appearance-none bg-[#161b22] border border-white/10 text-white text-xs font-bold rounded px-3 pr-7 py-1.5 cursor-pointer hover:border-indigo-500/50 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {PAIRS.map(p => (
              <option key={p.sym} value={p.sym}>{p.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 flex-shrink-0" />

        {/* Timeframe buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {TIMEFRAMES.map(t => (
            <button
              key={t.label}
              onClick={() => setTf(t.label)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                tf === t.label
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 flex-shrink-0" />

        {/* Live price */}
        {livePrice ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">BID</span>
              <span className={`text-xs font-bold tabular-nums ${priceColor}`}>{livePrice.bid}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">ASK</span>
              <span className={`text-xs font-bold tabular-nums ${priceColor}`}>{livePrice.ask}</span>
            </div>
            {priceUp !== null && (
              priceUp
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <RefreshCw className="w-3 h-3 text-gray-600 animate-spin" />
            <span className="text-xs text-gray-600">Live price...</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[#161b22] border border-white/10 rounded p-0.5 flex-shrink-0">
          <button
            onClick={() => setViewMode('tv')}
            title="TradingView Chart"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'tv'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            TradingView
          </button>
          <button
            onClick={() => setViewMode('custom')}
            title="Custom Chart (SMC + Trade Panel)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'custom'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>
      </div>

      {/* ── Chart area ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* TradingView mode */}
        {viewMode === 'tv' && (
          <div style={{ width: '100%', height: '100%' }}>
            <AdvancedChart
              symbol={pair.tvSym}
              interval={tvInterval}
              height="100%"
              studies={TV_STUDIES}
            />
          </div>
        )}

        {/* Custom (iframe) mode */}
        {viewMode === 'custom' && (
          <>
            {!iframeLoaded && !iframeError && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
                style={{ background: '#07090e' }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  Custom Terminal লোড হচ্ছে...
                </div>
                <p className="text-xs text-gray-600">SMC analysis ও trading panel প্রস্তুত করা হচ্ছে</p>
              </div>
            )}

            {iframeError && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
                style={{ background: '#07090e' }}
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-sm font-medium text-white">Terminal লোড করতে সমস্যা হয়েছে</p>
                <button
                  onClick={() => { setIframeError(false); setIframeLoaded(false); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  আবার চেষ্টা করুন
                </button>
              </div>
            )}

            <iframe
              key={iframeError ? 'retry' : 'frame'}
              src="/chart-view/index.html"
              title="Trading Bangla Custom Terminal"
              style={{
                width: '100%',
                height: '100%',
                border: 0,
                display: 'block',
                opacity: iframeLoaded ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
              allow="notifications"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
