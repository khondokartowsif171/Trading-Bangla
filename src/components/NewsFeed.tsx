import { useApp } from '@/context/AppContext';
import { MARKET_NEWS } from '@/data/marketData';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function NewsFeed() {
  const { darkMode, t } = useApp();

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
    }`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        darkMode ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <Newspaper className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('news')}
          </h3>
        </div>
      </div>
      <div className="divide-y overflow-y-auto max-h-[420px] custom-scrollbar">
        {MARKET_NEWS.map(item => {
          const sentimentIcon = item.sentiment === 'positive'
            ? <TrendingUp className="w-3 h-3 text-green-500" />
            : item.sentiment === 'negative'
              ? <TrendingDown className="w-3 h-3 text-red-500" />
              : <Minus className="w-3 h-3 text-gray-400" />;

          return (
            <div
              key={item.id}
              className={`px-4 py-3 hover:bg-opacity-50 transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-gray-800/50 border-gray-800' : 'hover:bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{sentimentIcon}</div>
                <div className="min-w-0">
                  <p className={`text-sm leading-snug line-clamp-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.category}
                    </span>
                    <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {item.source}
                    </span>
                    <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      {item.time}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-gray-500 shrink-0 mt-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
