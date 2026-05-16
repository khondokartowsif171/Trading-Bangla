import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import AIChat from '@/components/AIChat';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Trade from '@/pages/Trade';
import PortfolioPage from '@/pages/PortfolioPage';
import EAAnalytics from '@/pages/EAAnalytics';
import ForexMT5 from '@/pages/ForexMT5';

function AppContent() {
  const { darkMode } = useApp();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <Navbar />
      {/* Main content with mobile bottom padding */}
      <div className={isHome ? '' : 'pb-20 md:pb-0'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/ea-analytics" element={<EAAnalytics />} />
          <Route path="/forex" element={<ForexMT5 />} />
        </Routes>
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
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}
