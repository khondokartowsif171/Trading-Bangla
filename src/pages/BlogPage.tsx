import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { FileText, Eye, Calendar, Tag } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

interface PublicPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  thumbnail_url: string | null;
  category: string;
  published_at: string | null;
  views: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-500/20 text-gray-400',
  education: 'bg-blue-500/20 text-blue-400',
  signals: 'bg-green-500/20 text-green-400',
  strategy: 'bg-purple-500/20 text-purple-400',
  news: 'bg-yellow-500/20 text-yellow-400',
};

const GRADIENT_FALLBACKS = [
  'from-indigo-600 to-purple-600',
  'from-yellow-500 to-orange-500',
  'from-green-500 to-teal-500',
  'from-blue-500 to-cyan-500',
  'from-pink-500 to-rose-500',
];

export default function BlogPage() {
  const { darkMode } = useApp();
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, thumbnail_url, category, published_at, views')
        .eq('published', true)
        .order('published_at', { ascending: false });
      setPosts((data as PublicPost[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const categories = ['all', ...Array.from(new Set(posts.map(p => p.category)))];
  const filtered = selectedCategory === 'all' ? posts : posts.filter(p => p.category === selectedCategory);

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">

        {/* Hero */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
            <FileText className="w-3.5 h-3.5" />
            Trading Bangla Blog
          </div>
          <h1 className={`text-3xl md:text-5xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            শিখুন, বুঝুন, ট্রেড করুন
          </h1>
          <p className={`text-base md:text-lg max-w-xl mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Trading strategies, signal analysis, education, and market insights — all in Bangla.
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                  selectedCategory === cat
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : darkMode
                      ? 'border-gray-700 text-gray-400 hover:border-indigo-500/50 hover:text-white'
                      : 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <FileText className={`w-14 h-14 mx-auto mb-4 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`} />
            <p className={`text-base font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              No posts yet. Check back soon!
            </p>
          </div>
        )}

        {/* Post Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post, idx) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className={`group rounded-2xl overflow-hidden border transition-all hover:-translate-y-1 hover:shadow-2xl ${
                  darkMode
                    ? 'border-gray-800 bg-gray-900 hover:border-indigo-500/40 hover:shadow-indigo-500/10'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-indigo-100'
                }`}
              >
                {/* Thumbnail */}
                <div className="h-44 overflow-hidden">
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${GRADIENT_FALLBACKS[idx % GRADIENT_FALLBACKS.length]} flex items-center justify-center`}>
                      <FileText className="w-10 h-10 text-white/50" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.general}`}>
                      <Tag className="w-2.5 h-2.5 inline mr-1" />{post.category}
                    </span>
                  </div>

                  <h2 className={`font-bold text-base mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className={`text-xs mb-4 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {post.excerpt.slice(0, 120)}{post.excerpt.length > 120 ? '...' : ''}
                    </p>
                  )}

                  <div className={`flex items-center justify-between text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(post.published_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.views.toLocaleString()} views
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
