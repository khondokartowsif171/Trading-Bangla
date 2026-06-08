import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { MARKET_NEWS } from '@/data/marketData';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, RefreshCw, Radio } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
}

type CategoryFilter = 'all' | 'forex' | 'gold' | 'crypto' | 'general';

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;
const AUTO_REFRESH_MS = 2 * 60 * 1000; // 2 minutes

async function fetchFinnhubNews(category: string): Promise<NewsItem[]> {
  if (!FINNHUB_KEY) return [];
  try {
    const cat = category === 'crypto' ? 'crypto' : 'forex';
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=${cat}&token=${FINNHUB_KEY}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data as { id: number; headline: string; summary: string; source: string; url: string; datetime: number; category: string }[])
      .slice(0, 25)
      .map(item => ({
        id: String(item.id),
        title: item.headline,
        summary: item.summary || '',
        source: item.source,
        url: item.url,
        time: new Date(item.datetime * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        sentiment: detectSentiment(item.headline),
        category: item.category || 'market',
        impact: detectImpact(item.headline),
      }));
  } catch { return []; }
}

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const pos = ['rise', 'gain', 'surge', 'rally', 'bullish', 'up', 'high', 'strong', 'beat', 'profit', 'recovery', 'boost', 'growth', 'record'];
  const neg = ['fall', 'drop', 'decline', 'crash', 'bearish', 'down', 'low', 'weak', 'miss', 'loss', 'risk', 'slump', 'fear', 'recession', 'warn'];
  if (pos.some(w => lower.includes(w))) return 'positive';
  if (neg.some(w => lower.includes(w))) return 'negative';
  return 'neutral';
}

function detectImpact(text: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const lower = text.toLowerCase();
  const high = ['fed', 'fomc', 'nfp', 'cpi', 'inflation', 'rate hike', 'rate cut', 'ecb', 'boe', 'boj', 'gdp', 'recession', 'crash', 'surge', 'record'];
  const med = ['pmi', 'jobs', 'employment', 'sales', 'trade', 'deficit', 'surplus', 'gold', 'oil', 'rally', 'decline'];
  if (high.some(w => lower.includes(w))) return 'HIGH';
  if (med.some(w => lower.includes(w))) return 'MEDIUM';
  return 'LOW';
}

function toNewsItem(raw: typeof MARKET_NEWS[0]): NewsItem {
  return {
    id: raw.id,
    title: raw.title,
    summary: '',
    source: raw.source,
    url: '#',
    time: raw.time,
    sentiment: raw.sentiment as 'positive' | 'negative' | 'neutral',
    category: raw.category,
    impact: detectImpact(raw.title),
  };
}

function filterByCategory(items: NewsItem[], cat: CategoryFilter): NewsItem[] {
  if (cat === 'all') return items;
  const map: Record<CategoryFilter, string[]> = {
    all: [],
    forex: ['forex', 'currency', 'usd', 'eur', 'gbp', 'jpy'],
    gold: ['gold', 'xau', 'silver', 'commodity', 'metal'],
    crypto: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth'],
    general: ['general', 'market', 'economy', 'stock'],
  };
  const keywords = map[cat];
  return items.filter(item =>
    keywords.some(kw =>
      item.category.toLowerCase().includes(kw) ||
      item.title.toLowerCase().includes(kw)
    )
  );
}

const IMPACT_STYLES = {
  HIGH: { border: 'border-l-red-500', badge: 'bg-red-500/15 text-red-400 border-red-500/25' },
  MEDIUM: { border: 'border-l-yellow-500', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  LOW: { border: 'border-l-gray-600', badge: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
};

export default function NewsFeed() {
  const { darkMode, t } = useApp();
  const [allNews, setAllNews] = useState<NewsItem[]>(MARKET_NEWS.map(toNewsItem));
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [catFilter, setCatFilter] = useState<CategoryFilter>('all');
  const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setCountdown(AUTO_REFRESH_MS / 1000);
    const live = await fetchFinnhubNews(catFilter);
    if (live.length > 0) { setAllNews(live); setIsLive(true); }
    else { setAllNews(MARKET_NEWS.map(toNewsItem)); setIsLive(false); }
    setLoading(false);
  }, [catFilter]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, AUTO_REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refresh]);

  // Countdown ticker
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : AUTO_REFRESH_MS / 1000), 1000);
    return () => clearInterval(t);
  }, []);

  const displayed = filterByCategory(allNews, catFilter).slice(0, 20);

  const sentimentIcon = (s: string) =>
    s === 'positive'
      ? <TrendingUp className="w-3 h-3 text-green-400 shrink-0" />
      : s === 'negative'
        ? <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
        : <Minus className="w-3 h-3 text-gray-500 shrink-0" />;

  const CATS: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'সব' },
    { key: 'forex', label: 'Forex' },
    { key: 'gold', label: 'Gold' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'general', label: 'Market' },
  ];

  return (
    <div className={`rounded-2xl border overflow-hidden flex flex-col ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Newspaper className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('news')}</h3>
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/20">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLive && !loading && (
            <span className={`text-[9px] tabular-nums ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </span>
          )}
          <button onClick={refresh} disabled={loading}
            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className={`flex gap-1 px-3 py-2 border-b ${darkMode ? 'border-gray-800/60' : 'border-gray-100'}`}>
        {CATS.map(c => (
          <button key={c.key} onClick={() => setCatFilter(c.key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              catFilter === c.key
                ? darkMode ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            }`}>{c.label}</button>
        ))}
      </div>

      {/* News List */}
      <div className={`divide-y overflow-y-auto max-h-[420px] ${darkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
        {displayed.length === 0 ? (
          <div className={`py-10 text-center text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            কোনো খবর পাওয়া যায়নি
          </div>
        ) : displayed.map(item => {
          const impact = item.impact ?? 'LOW';
          const impStyle = IMPACT_STYLES[impact];
          return (
            <a
              key={item.id}
              href={item.url !== '#' ? item.url : undefined}
              target={item.url !== '#' ? '_blank' : undefined}
              rel="noopener noreferrer"
              className={`flex items-start gap-3 pl-3 pr-4 py-3 border-l-2 hover:bg-opacity-50 transition-colors cursor-pointer ${impStyle.border} ${
                darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'
              }`}
            >
              <div className="mt-0.5 shrink-0">{sentimentIcon(item.sentiment)}</div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] leading-snug line-clamp-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {item.title}
                </p>
                {item.summary && (
                  <p className={`text-[10px] mt-0.5 line-clamp-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{item.summary}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {impact !== 'LOW' && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${impStyle.badge}`}>
                      {impact}
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    {item.category}
                  </span>
                  <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.source}</span>
                  <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{item.time}</span>
                </div>
              </div>
              {item.url !== '#' && <ExternalLink className="w-3 h-3 text-gray-500 shrink-0 mt-1" />}
            </a>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`px-4 py-1.5 text-[9px] border-t flex items-center justify-between ${
        darkMode ? 'border-gray-800 text-gray-700 bg-gray-900/40' : 'border-gray-100 text-gray-400 bg-gray-50'
      }`}>
        <span>{isLive ? `Finnhub Live — ${displayed.length} টি খবর` : 'Static — Finnhub key যোগ করলে Live হবে'}</span>
        <span>↻ প্রতি ২ মিনিটে আপডেট</span>
      </div>
    </div>
  );
}
