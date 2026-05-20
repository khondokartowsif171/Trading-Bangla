import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Eye, Calendar, Tag, FileText } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { darkMode } = useApp();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    const load = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data as Post);
        // Fire-and-forget view increment
        supabase
          .from('blog_posts')
          .update({ views: (data as Post).views + 1 })
          .eq('id', (data as Post).id)
          .then(() => {});
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const renderContent = (content: string) => {
    return content.split('\n\n').map((para, i) => (
      <p key={i} className={`whitespace-pre-wrap leading-relaxed mb-5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {para}
      </p>
    ));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center p-10">
          <FileText className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`} />
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Post পাওয়া যায়নি</h1>
          <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            এই post হয়তো সরিয়ে নেওয়া হয়েছে অথবা unpublish করা হয়েছে।
          </p>
          <button
            onClick={() => navigate('/blog')}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Blog-এ ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AnimatedBackground />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Back */}
        <button
          onClick={() => navigate('/blog')}
          className={`inline-flex items-center gap-2 text-sm mb-8 transition-colors ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Blog
        </button>

        {/* Thumbnail */}
        {post.thumbnail_url && (
          <div className="rounded-2xl overflow-hidden mb-8 h-64 md:h-80">
            <img
              src={post.thumbnail_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.general}`}>
            <Tag className="w-3 h-3 inline mr-1" />
            {post.category}
          </span>
          <span className={`flex items-center gap-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(post.published_at)}
          </span>
          <span className={`flex items-center gap-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <Eye className="w-3.5 h-3.5" />
            {post.views.toLocaleString()} views
          </span>
        </div>

        {/* Title */}
        <h1 className={`text-2xl md:text-3xl font-bold mb-6 leading-snug ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <div className={`border-l-4 border-indigo-500 pl-4 mb-8 italic text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {post.excerpt}
          </div>
        )}

        {/* Divider */}
        <div className={`border-t mb-8 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} />

        {/* Content */}
        <article className="text-sm md:text-base">
          {post.content ? renderContent(post.content) : (
            <p className={`text-sm italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Content not available.
            </p>
          )}
        </article>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <button
            onClick={() => navigate('/blog')}
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            সব posts দেখুন
          </button>
        </div>
      </div>
    </div>
  );
}
