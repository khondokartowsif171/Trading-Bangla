export interface Asset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'forex';
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  high: number;
  low: number;
  prevClose: number;
}

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export const STOCKS: Asset[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 198.45, change: 2.34, changePercent: 1.19, volume: '45.2M', high: 200.12, low: 196.80, prevClose: 196.11 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', price: 428.15, change: -3.22, changePercent: -0.75, volume: '22.8M', high: 432.50, low: 426.00, prevClose: 431.37 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', price: 176.80, change: 1.45, changePercent: 0.83, volume: '18.5M', high: 178.20, low: 175.30, prevClose: 175.35 },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', price: 248.90, change: -8.45, changePercent: -3.28, volume: '89.3M', high: 258.00, low: 245.10, prevClose: 257.35 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', price: 135.60, change: 4.20, changePercent: 3.20, volume: '52.1M', high: 137.80, low: 132.40, prevClose: 131.40 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', price: 185.75, change: 0.85, changePercent: 0.46, volume: '32.7M', high: 187.20, low: 184.10, prevClose: 184.90 },
  { symbol: 'META', name: 'Meta Platforms', type: 'stock', price: 512.30, change: 6.80, changePercent: 1.34, volume: '15.4M', high: 515.00, low: 506.50, prevClose: 505.50 },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 104000.00, change: 1250.00, changePercent: 1.22, volume: '28.5B', high: 105200.00, low: 102500.00, prevClose: 102750.00 },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 3450.80, change: -45.20, changePercent: -1.29, volume: '12.3B', high: 3520.00, low: 3420.00, prevClose: 3496.00 },
  { symbol: 'BNB', name: 'Binance Coin', type: 'crypto', price: 598.30, change: 8.50, changePercent: 1.44, volume: '2.1B', high: 605.00, low: 590.00, prevClose: 589.80 },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', price: 142.60, change: 3.40, changePercent: 2.44, volume: '3.8B', high: 146.00, low: 138.50, prevClose: 139.20 },
  { symbol: 'XRP', name: 'Ripple', type: 'crypto', price: 0.6230, change: 0.0120, changePercent: 1.96, volume: '1.5B', high: 0.6350, low: 0.6100, prevClose: 0.6110 },
  { symbol: 'EUR/USD', name: 'Euro/US Dollar', type: 'forex', price: 1.0845, change: 0.0015, changePercent: 0.14, volume: '125.6B', high: 1.0870, low: 1.0820, prevClose: 1.0830 },
  { symbol: 'GBP/USD', name: 'Pound/US Dollar', type: 'forex', price: 1.2630, change: -0.0020, changePercent: -0.16, volume: '98.3B', high: 1.2660, low: 1.2600, prevClose: 1.2650 },
  { symbol: 'USD/JPY', name: 'US Dollar/Yen', type: 'forex', price: 151.45, change: 0.35, changePercent: 0.23, volume: '145.2B', high: 151.80, low: 150.90, prevClose: 151.10 },
  { symbol: 'USD/BDT', name: 'US Dollar/Taka', type: 'forex', price: 117.50, change: 0.25, changePercent: 0.21, volume: '2.1B', high: 117.80, low: 117.10, prevClose: 117.25 },
  { symbol: 'XAU/USD', name: 'Gold/US Dollar', type: 'forex', price: 3315.00, change: 12.40, changePercent: 0.38, volume: '85.3B', high: 3330.00, low: 3295.00, prevClose: 3302.60 },
];

export function generateCandles(basePrice: number, count: number = 200): CandleData[] {
  const candles: CandleData[] = [];
  let price = basePrice;
  const now = new Date();
  
  for (let i = count; i >= 0; i--) {
    const date = new Date(now);
    date.setMinutes(date.getMinutes() - i * 5);
    
    const volatility = price * 0.003;
    const open = price + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.floor(Math.random() * 1000000) + 500000;
    
    candles.push({
      time: date.toISOString().slice(0, 19),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
    
    price = close;
  }
  
  return candles;
}

export const MARKET_NEWS = [
  { id: 1, title: 'Federal Reserve Signals Potential Rate Cut in September', source: 'Financial Times', time: '2h ago', sentiment: 'positive', category: 'Macro' },
  { id: 2, title: 'NVIDIA Stock Surges After Record-Breaking AI Chip Sales', source: 'Bloomberg', time: '3h ago', sentiment: 'positive', category: 'Stocks' },
  { id: 3, title: 'Bitcoin Breaks $68K Resistance, Analysts Eye $75K Target', source: 'CoinDesk', time: '4h ago', sentiment: 'positive', category: 'Crypto' },
  { id: 4, title: 'Asian Markets Mixed as Investors Digest Fed Minutes', source: 'Reuters', time: '5h ago', sentiment: 'neutral', category: 'Global' },
  { id: 5, title: 'Oil Prices Drop Amid Ceasefire Hopes in Middle East', source: 'CNBC', time: '6h ago', sentiment: 'negative', category: 'Commodities' },
  { id: 6, title: 'Bangladesh Bank Announces New Monetary Policy to Tackle Inflation', source: 'The Daily Star', time: '8h ago', sentiment: 'neutral', category: 'Bangladesh' },
  { id: 7, title: 'EUR/USD Holds Steady Above 1.08 as ECB Meeting Approaches', source: 'ForexLive', time: '9h ago', sentiment: 'neutral', category: 'Forex' },
  { id: 8, title: 'Gold Hits New All-Time High Above $2,400 per Ounce', source: 'Kitco', time: '10h ago', sentiment: 'positive', category: 'Commodities' },
];
