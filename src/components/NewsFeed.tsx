import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MARKET_NEWS } from '@/data/marketData';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
}

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;

async function fetchFinnhubNews(): Promise<NewsItem[]> {
  if (!FINNHUB_KEY) return [];
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 3 * 24 * 3600; // last 3 days
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=forex&token=${FINNHUB_KEY}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data as { id: number; headline: string; summary: string; source: string; url: string; datetime: number; category: string }[])
      .slice(0, 20)
      .map(item => ({
        id: String(item.id),
        title: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        time: new Date(item.datetime * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        sentiment: detectSentiment(item.headline),
        category: item.category || 'market',
      }));
  } catch { return []; }
}

function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const pos = ['rise', 'gain', 'surge', 'rally', 'bullish', 'up', 'high', 'strong', 'beat', 'profit'];
  const neg = ['fall', 'drop', 'decline', 'crash', 'bearish', 'down', 'low', 'weak', 'miss', 'loss', 'risk'];
  if (pos.some(w => lower.includes(w))) return 'positive';
  if (neg.some(w => lower.includes(w))) return 'negative';
  return 'neutral';
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
  };
}

export default function NewsFeed() {
  const { darkMode, t } = useApp();
  const [news, setNews] = useState<NewsItem[]>(MARKET_NEWS.map(toNewsItem));
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const live = await fetchFinnhubNews();
    if (live.length > 0) { setNews(live); setIsLive(true); }
    else setNews(MARKET_NEWS.map(toNewsItem));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const sentimentIcon = (s: string) =>
    s === 'positive'
      ? <TrendingUp className="w-3 h-3 text-green-500 shrink-0" />
      : s === 'negative'
        ? <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />
        : <Minus className="w-3 h-3 text-gray-400 shrink-0" />;

  return (
    <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <Newspaper className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('news')}</h3>
          {isLive && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/20">LIVE</span>
          )}
        </div>
        <button onClick={refresh} disabled={loading}
          className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="divide-y overflow-y-auto max-h-[420px]">
        {news.map(item => (
          <a
            key={item.id}
            href={item.url !== '#' ? item.url : undefined}
            target={item.url !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={`flex items-start gap-3 px-4 py-3 hover:bg-opacity-50 transition-colors cursor-pointer ${
              darkMode ? 'hover:bg-gray-800/50 border-gray-800 divide-gray-800' : 'hover:bg-gray-50 border-gray-100 divide-gray-100'
            }`}
          >
            <div className="mt-0.5">{sentimentIcon(item.sentiment)}</div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm leading-snug line-clamp-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {item.category}
                </span>
                <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.source}</span>
                <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>{item.time}</span>
              </div>
            </div>
            {item.url !== '#' && <ExternalLink className="w-3 h-3 text-gray-500 shrink-0 mt-1" />}
          </a>
        ))}
      </div>
    </div>
  );
}
