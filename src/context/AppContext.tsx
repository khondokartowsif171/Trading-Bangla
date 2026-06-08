import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Asset, STOCKS, generateCandles, CandleData } from '@/data/marketData';
import { Lang, translations, TranslationKey } from '@/i18n/translations';

interface PortfolioHolding {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

interface Order {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop';
  quantity: number;
  price: number;
  status: 'filled' | 'pending' | 'cancelled';
  timestamp: Date;
}

interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: Date;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AppContextType {
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;
  
  // Language
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  
  // Market Data
  assets: Asset[];
  selectedAsset: Asset | null;
  setSelectedAsset: (asset: Asset) => void;
  candles: CandleData[];
  
  // Portfolio
  portfolio: PortfolioHolding[];
  balance: number;
  orders: Order[];
  trades: Trade[];
  placeOrder: (symbol: string, type: 'buy' | 'sell', orderType: 'market' | 'limit' | 'stop', quantity: number, price?: number) => boolean;
  
  // AI Chat
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => void;
  
  // Watchlist
  watchlist: string[];
  toggleWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  
  // Active tab on dashboard
  activeMarketTab: 'stocks' | 'crypto' | 'forex';
  setActiveMarketTab: (tab: 'stocks' | 'crypto' | 'forex') => void;
}

const AppContext = createContext<AppContextType | null>(null);

const AI_RESPONSES: Record<string, string> = {
  'hello': 'Hello! I\'m Aura, your AI Trading Intelligence agent. I can help you with market analysis, trading strategies, and platform navigation. How can I help you today?',
  'hi': 'Hi there! 👋 How can I assist you with your trading today?',
  'market': 'The market is showing mixed signals today. Tech stocks are performing well with NVDA leading gains. BTC is trading above $67K showing bullish momentum. Would you like a detailed analysis of any specific asset?',
  'trade': 'To place a trade:\n1. Select an asset from the watchlist\n2. Choose Market/Limit/Stop order\n3. Enter quantity\n4. Click Buy or Sell\n\nRemember: Always use stop-loss for risk management!',
  'analysis': 'Based on current market data:\n\n📊 **Top Gainers:** NVDA (+3.20%), SOL (+2.44%), XRP (+1.96%)\n📉 **Top Losers:** TSLA (-3.28%), ETH (-1.29%)\n\nWould you like me to analyze a specific symbol?',
  'risk': 'Risk management tips:\n• Never risk more than 1-2% per trade\n• Always set stop-loss orders\n• Diversify across sectors\n• Keep a trading journal\n• Don\'t trade with emotions',
  'bitcoin': 'Bitcoin (BTC) is currently trading at $67,250 with a 1.89% gain today. The trend is bullish with strong support at $65,800 and resistance at $68,100. Volume is healthy at $28.5B.',
  'bn': 'বাংলাদেশের বাজারে আজ মিশ্র প্রবণতা দেখা যাচ্ছে। আপনি কোন নির্দিষ্ট স্টক বা ক্রিপ্টো সম্পর্কে জানতে চান?',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(true);
  const [lang, setLang] = useState<Lang>('en');
  const [assets, setAssets] = useState<Asset[]>(STOCKS);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(() => STOCKS.find(a => a.type === 'forex') || STOCKS[11]);
  const [candles, setCandles] = useState<CandleData[]>(() => generateCandles(STOCKS.find(a => a.type === 'forex')!.price));
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>(() => [
    { symbol: 'EUR/USD', quantity: 10000, avgPrice: 1.0820 },
    { symbol: 'XAU/USD', quantity: 50, avgPrice: 3315.00 },
    { symbol: 'BTC', quantity: 0.05, avgPrice: 104000.00 },
    { symbol: 'AAPL', quantity: 50, avgPrice: 185.00 },
  ]);
  const [balance, setBalance] = useState(100000);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! 👋 I\'m Aura, your AI Trading Intelligence agent. I can help with market analysis, trading strategies, asset prices, and platform navigation. How can I assist you today?', timestamp: new Date() },
  ]);
  const [watchlist, setWatchlist] = useState<string[]>(['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/BDT', 'BTC', 'XAU/USD']);
  const [activeMarketTab, setActiveMarketTab] = useState<'stocks' | 'crypto' | 'forex'>('forex');

  const t = useCallback((key: TranslationKey) => {
    return translations[lang][key] || key;
  }, [lang]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prev => prev.map(asset => {
        const volatility = asset.price * 0.001;
        const newPrice = asset.price + (Math.random() - 0.5) * volatility * 2;
        const change = newPrice - asset.prevClose;
        const changePercent = (change / asset.prevClose) * 100;
        return {
          ...asset,
          price: Math.round(newPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update candles when selected asset changes
  useEffect(() => {
    setCandles(generateCandles(selectedAsset.price));
  }, [selectedAsset.symbol]);

  const placeOrder = useCallback((
    symbol: string,
    type: 'buy' | 'sell',
    orderType: 'market' | 'limit' | 'stop',
    quantity: number,
    price?: number
  ): boolean => {
    const asset = assets.find(a => a.symbol === symbol);
    if (!asset) return false;
    
    const orderPrice = price || asset.price;
    const total = orderPrice * quantity;
    
    if (type === 'buy' && total > balance) return false;

    const orderId = `ORD-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      symbol,
      type,
      orderType,
      quantity,
      price: orderPrice,
      status: 'filled',
      timestamp: new Date(),
    };

    const newTrade: Trade = {
      id: `TRD-${Date.now()}`,
      symbol,
      type,
      quantity,
      price: orderPrice,
      total,
      timestamp: new Date(),
    };

    setOrders(prev => [newOrder, ...prev]);
    setTrades(prev => [newTrade, ...prev]);
    
    if (type === 'buy') {
      setBalance(prev => prev - total);
      setPortfolio(prev => {
        const existing = prev.find(h => h.symbol === symbol);
        if (existing) {
          const newQty = existing.quantity + quantity;
          const newAvg = ((existing.avgPrice * existing.quantity) + total) / newQty;
          return prev.map(h => h.symbol === symbol ? { ...h, quantity: newQty, avgPrice: newAvg } : h);
        }
        return [...prev, { symbol, quantity, avgPrice: orderPrice }];
      });
    } else {
      setBalance(prev => prev + total);
      setPortfolio(prev => {
        return prev.map(h => {
          if (h.symbol === symbol) {
            const remaining = h.quantity - quantity;
            return remaining > 0 ? { ...h, quantity: remaining } : null;
          }
          return h;
        }).filter(Boolean) as PortfolioHolding[];
      });
    }

    return true;
  }, [assets, balance]);

  const sendChatMessage = useCallback((content: string) => {
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);

    // Simulate AI response
    setTimeout(() => {
      let response = 'I\'m not sure about that. Could you ask about market analysis, specific assets, or trading strategies?';
      
      const lower = content.toLowerCase();
      for (const [key, val] of Object.entries(AI_RESPONSES)) {
        if (lower.includes(key)) {
          response = val;
          break;
        }
      }

      // Asset-specific responses
      const matchedAsset = assets.find(a => 
        lower.includes(a.symbol.toLowerCase()) || lower.includes(a.name.toLowerCase())
      );
      if (matchedAsset) {
        response = `${matchedAsset.name} (${matchedAsset.symbol}) — Current: $${matchedAsset.price} | Change: ${matchedAsset.changePercent > 0 ? '+' : ''}${matchedAsset.changePercent}% | Volume: ${matchedAsset.volume}\n\n24h Range: $${matchedAsset.low} - $${matchedAsset.high}\nPrev Close: $${matchedAsset.prevClose}`;
      }

      const aiMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMsg]);
    }, 800);
  }, [assets]);

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  }, []);

  const isInWatchlist = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  return (
    <AppContext.Provider value={{
      darkMode, toggleDarkMode,
      lang, setLang, t,
      assets, selectedAsset, setSelectedAsset, candles,
      portfolio, balance, orders, trades, placeOrder,
      chatOpen, setChatOpen, chatMessages, sendChatMessage,
      watchlist, toggleWatchlist, isInWatchlist,
      activeMarketTab, setActiveMarketTab,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
