import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Component, ReactNode } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';

// Global error boundary — catches component crashes, shows fallback instead of blank white
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-white text-xl font-bold mb-2">Page Error</h2>
            <p className="text-gray-400 text-sm mb-4">{(this.state.error as Error).message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import Navbar from '@/components/Navbar';
import LivePriceTicker from '@/components/LivePriceTicker';
import MobileBottomNav from '@/components/MobileBottomNav';
import AIChat from '@/components/AIChat';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import PortfolioPage from '@/pages/PortfolioPage';
import EAAnalytics from '@/pages/EAAnalytics';
import ForexMT5 from '@/pages/ForexMT5';
import AuraCrytox from '@/pages/AuraCrytox';
import EaDashboard from '@/pages/EaDashboard';
import UserProfile from '@/pages/UserProfile';
import AdminDashboard from '@/pages/AdminDashboard';
import BlogPage from '@/pages/BlogPage';
import BlogPost from '@/pages/BlogPost';

function AppContent() {
  const { darkMode } = useApp();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isTrade = location.pathname === '/trade' || location.pathname === '/ea-dashboard';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <Navbar />
      {!isTrade && <LivePriceTicker />}
      {/* Main content with mobile bottom padding */}
      <div className={isHome ? '' : 'pb-20 md:pb-0'}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trade" element={<Navigate to="/ea-dashboard" replace />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/ea-analytics" element={<EAAnalytics />} />
            <Route path="/ea-dashboard" element={<EaDashboard />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/forex" element={<ForexMT5 />} />
            <Route path="/crytox" element={<AuraCrytox />} />
            <Route path="/tb-admin-2026" element={<AdminDashboard />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
          </Routes>
        </ErrorBoundary>
      </div>
      {/* Desktop floating widgets */}
      <div className="hidden md:block">
        <AIChat />
        <WhatsAppFloat />
      </div>
      {/* Mobile bottom navigation + floating buttons */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
