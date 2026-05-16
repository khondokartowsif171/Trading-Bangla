const BINANCE_BASE = 'https://api.binance.com';
const cache: { tickers: any[]; timestamp: number } = { tickers: [], timestamp: 0 };
const CACHE_TTL = 15000;

const STABLECOINS = new Set([
  'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'FDUSD', 'PAX', 'GUSD', 'HUSD',
  'USDN', 'USDP', 'USTC', 'USDD', 'FRAX', 'LUSD', 'MIM',
]);

const TOP_COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOGE', 'DOT', 'LINK', 'SUI', 'APT', 'ARB', 'OP', 'NEAR', 'ATOM'];

export interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume: number;
  marketCap: number;
  color: string;
}

const COLOR_MAP: Record<string, string> = {
  BTC: '#F7931A', ETH: '#627EEA', BNB: '#F0B90B', SOL: '#9945FF',
  XRP: '#00AAE4', ADA: '#0033AD', AVAX: '#E84142', DOGE: '#C2A633',
  DOT: '#E6007A', LINK: '#2A5ADA', SUI: '#4DA2FF', APT: '#00BFA5',
  ARB: '#28A0F0', OP: '#FF0420', NEAR: '#00C08B', ATOM: '#2E3148',
};

async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchCryptoTickers(): Promise<CryptoAsset[]> {
  if (Date.now() - cache.timestamp < CACHE_TTL && cache.tickers.length) {
    return cache.tickers;
  }
  try {
    const res = await fetchWithTimeout(`${BINANCE_BASE}/api/v3/ticker/24hr`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all: any[] = await res.json();

    const usdtPairs = all
      .filter((t: any) => t.symbol.endsWith('USDT'))
      .filter((t: any) => {
        const base = t.symbol.replace('USDT', '');
        return !STABLECOINS.has(base) && !base.includes('UP') && !base.includes('DOWN') && !base.includes('BULL') && !base.includes('BEAR');
      })
      .filter((t: any) => parseFloat(t.quoteVolume) > 500000)
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));

    const assets: CryptoAsset[] = usdtPairs.map((t: any) => {
      const sym = t.symbol.replace('USDT', '');
      return {
        symbol: sym,
        name: sym,
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChange),
        changePercent24h: parseFloat(t.priceChangePercent),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
        volume24h: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume),
        marketCap: parseFloat(t.lastPrice) * parseFloat(t.volume),
        color: COLOR_MAP[sym] || '#6366f1',
      };
    });

    const topFirst = assets.filter(a => TOP_COINS.includes(a.symbol));
    const rest = assets.filter(a => !TOP_COINS.includes(a.symbol));
    const sorted = [...topFirst.sort((a, b) => TOP_COINS.indexOf(a.symbol) - TOP_COINS.indexOf(b.symbol)), ...rest];

    cache.tickers = sorted;
    cache.timestamp = Date.now();
    return sorted;
  } catch {
    if (cache.tickers.length) return cache.tickers;
    return getFallbackAssets();
  }
}

function getFallbackAssets(): CryptoAsset[] {
  const now = Date.now();
  return [
    { symbol: 'BTC', name: 'Bitcoin', price: 97842, change24h: 2234, changePercent24h: 2.34, high24h: 98500, low24h: 95200, volume24h: 48200000000, quoteVolume: 48200000000, marketCap: 1920000000000, color: '#F7931A' },
    { symbol: 'ETH', name: 'Ethereum', price: 3456, change24h: -42, changePercent24h: -1.23, high24h: 3520, low24h: 3380, volume24h: 21500000000, quoteVolume: 21500000000, marketCap: 415000000000, color: '#627EEA' },
    { symbol: 'BNB', name: 'BNB', price: 698, change24h: 6, changePercent24h: 0.87, high24h: 705, low24h: 690, volume24h: 2100000000, quoteVolume: 2100000000, marketCap: 104000000000, color: '#F0B90B' },
    { symbol: 'SOL', name: 'Solana', price: 198, change24h: 11, changePercent24h: 5.67, high24h: 202, low24h: 188, volume24h: 8900000000, quoteVolume: 8900000000, marketCap: 89000000000, color: '#9945FF' },
    { symbol: 'XRP', name: 'XRP', price: 2.45, change24h: -0.01, changePercent24h: -0.56, high24h: 2.52, low24h: 2.38, volume24h: 5600000000, quoteVolume: 5600000000, marketCap: 78000000000, color: '#00AAE4' },
    { symbol: 'ADA', name: 'Cardano', price: 1.12, change24h: 0.04, changePercent24h: 3.45, high24h: 1.15, low24h: 1.08, volume24h: 3200000000, quoteVolume: 3200000000, marketCap: 39000000000, color: '#0033AD' },
    { symbol: 'AVAX', name: 'Avalanche', price: 42.67, change24h: -1.23, changePercent24h: -2.89, high24h: 44.5, low24h: 41.2, volume24h: 1800000000, quoteVolume: 1800000000, marketCap: 16000000000, color: '#E84142' },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.3845, change24h: 0.031, changePercent24h: 8.12, high24h: 0.395, low24h: 0.355, volume24h: 4500000000, quoteVolume: 4500000000, marketCap: 56000000000, color: '#C2A633' },
    { symbol: 'DOT', name: 'Polkadot', price: 8.92, change24h: 0.11, changePercent24h: 1.23, high24h: 9.15, low24h: 8.75, volume24h: 890000000, quoteVolume: 890000000, marketCap: 12500000000, color: '#E6007A' },
    { symbol: 'LINK', name: 'Chainlink', price: 18.45, change24h: -0.59, changePercent24h: -3.21, high24h: 19.2, low24h: 18.1, volume24h: 1200000000, quoteVolume: 1200000000, marketCap: 11000000000, color: '#2A5ADA' },
  ];
}
