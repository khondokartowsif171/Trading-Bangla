import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import AdvancedChart from '@/components/TradingView/AdvancedChart';
import { getCandles, onCandleUpdate, seedHistoricalData, getPrice, startMarketData, stopMarketData } from '@/services/marketDataService';
import { getRecentPatterns, CandlePattern } from '@/services/candlestickPatterns';
import { analyzeSMC, SMCAnalysis } from '@/services/smcEngine';
import type { OHLCV as PatternOHLCV } from '@/services/candlestickPatterns';
import {
  TrendingUp, TrendingDown, BarChart2, Activity, Layers, Zap,
  ChevronDown, ChevronUp, Eye, EyeOff, Search, Star, RefreshCw,
  Shield, Target, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

// ---- Indicator Catalog (100+ indicators) ----
interface IndicatorDef {
  id: string;
  name: string;
  category: string;
  tvStudy?: string; // TradingView study name
  custom?: boolean;
  description: string;
}

const INDICATOR_CATALOG: IndicatorDef[] = [
  // Trend Indicators (25)
  { id: 'EMA9', name: 'EMA (9)', category: 'Trend', tvStudy: 'MAExp@tv-basicstudies', description: 'Exponential Moving Average 9-period' },
  { id: 'EMA21', name: 'EMA (21)', category: 'Trend', tvStudy: 'MAExp@tv-basicstudies', description: 'Exponential Moving Average 21-period' },
  { id: 'EMA50', name: 'EMA (50)', category: 'Trend', tvStudy: 'MAExp@tv-basicstudies', description: 'Exponential Moving Average 50-period' },
  { id: 'EMA200', name: 'EMA (200)', category: 'Trend', tvStudy: 'MAExp@tv-basicstudies', description: 'Exponential Moving Average 200-period (key level)' },
  { id: 'SMA20', name: 'SMA (20)', category: 'Trend', tvStudy: 'MASimple@tv-basicstudies', description: 'Simple Moving Average 20-period' },
  { id: 'SMA50', name: 'SMA (50)', category: 'Trend', tvStudy: 'MASimple@tv-basicstudies', description: 'Simple Moving Average 50-period' },
  { id: 'SMA100', name: 'SMA (100)', category: 'Trend', tvStudy: 'MASimple@tv-basicstudies', description: 'Simple Moving Average 100-period' },
  { id: 'SMA200', name: 'SMA (200)', category: 'Trend', tvStudy: 'MASimple@tv-basicstudies', description: 'Simple Moving Average 200-period' },
  { id: 'WMA', name: 'WMA (14)', category: 'Trend', tvStudy: 'MAWeighted@tv-basicstudies', description: 'Weighted Moving Average' },
  { id: 'HMA', name: 'HMA (14)', category: 'Trend', tvStudy: 'HullMA@tv-basicstudies', description: 'Hull Moving Average — lag-reduced' },
  { id: 'VWMA', name: 'VWMA (20)', category: 'Trend', tvStudy: 'VWMA@tv-basicstudies', description: 'Volume-Weighted Moving Average' },
  { id: 'VWAP', name: 'VWAP', category: 'Trend', tvStudy: 'VWAP@tv-basicstudies', description: 'Volume-Weighted Average Price (intraday benchmark)' },
  { id: 'ICHIMOKU', name: 'Ichimoku Cloud', category: 'Trend', tvStudy: 'IchimokuCloud@tv-basicstudies', description: 'Ichimoku Kinko Hyo — all-in-one trend system' },
  { id: 'PSAR', name: 'Parabolic SAR', category: 'Trend', tvStudy: 'PSAR@tv-basicstudies', description: 'Parabolic Stop and Reverse' },
  { id: 'SUPERTREND', name: 'SuperTrend', category: 'Trend', tvStudy: 'Supertrend@tv-basicstudies', description: 'SuperTrend ATR-based trend filter' },
  { id: 'ADX', name: 'ADX (14)', category: 'Trend', tvStudy: 'ADX@tv-basicstudies', description: 'Average Directional Index — trend strength' },
  { id: 'AROON', name: 'Aroon (25)', category: 'Trend', tvStudy: 'Aroon@tv-basicstudies', description: 'Aroon Up/Down — trend direction' },
  { id: 'CCI', name: 'CCI (20)', category: 'Trend', tvStudy: 'CCI@tv-basicstudies', description: 'Commodity Channel Index' },
  { id: 'DEMA', name: 'DEMA (14)', category: 'Trend', tvStudy: 'DoubleEMA@tv-basicstudies', description: 'Double Exponential MA — less lag' },
  { id: 'TEMA', name: 'TEMA (14)', category: 'Trend', tvStudy: 'TripleEMA@tv-basicstudies', description: 'Triple Exponential MA — minimal lag' },
  { id: 'ZLEMA', name: 'ZLEMA (14)', category: 'Trend', tvStudy: 'ZLEMA@tv-basicstudies', description: 'Zero Lag EMA' },
  { id: 'ALMA', name: 'ALMA (21)', category: 'Trend', tvStudy: 'ALMA@tv-basicstudies', description: 'Arnaud Legoux Moving Average' },
  { id: 'MCGINLEY', name: 'McGinley Dynamic', category: 'Trend', tvStudy: 'McGinleyDynamic@tv-basicstudies', description: 'McGinley Dynamic — auto-adjusted MA' },
  { id: 'LAGUERRE', name: 'Laguerre RSI', category: 'Trend', tvStudy: 'LaguerreRSI@tv-basicstudies', description: 'Laguerre RSI filter' },
  { id: 'PIVOTS', name: 'Pivot Points', category: 'Trend', tvStudy: 'PivotPointsStandard@tv-basicstudies', description: 'Standard Pivot Points (S1/S2/R1/R2)' },

  // Oscillators (20)
  { id: 'RSI', name: 'RSI (14)', category: 'Oscillators', tvStudy: 'RSI@tv-basicstudies', description: 'Relative Strength Index — overbought/oversold' },
  { id: 'MACD', name: 'MACD (12,26,9)', category: 'Oscillators', tvStudy: 'MACD@tv-basicstudies', description: 'MACD — momentum & trend' },
  { id: 'STOCH', name: 'Stochastic (14)', category: 'Oscillators', tvStudy: 'Stochastic@tv-basicstudies', description: 'Stochastic oscillator — overbought/oversold' },
  { id: 'STOCHRSI', name: 'Stoch RSI (14)', category: 'Oscillators', tvStudy: 'StochasticRSI@tv-basicstudies', description: 'Stochastic RSI — RSI smoothed by Stochastic' },
  { id: 'WILLIAMS', name: 'Williams %R (14)', category: 'Oscillators', tvStudy: 'WilliamsR@tv-basicstudies', description: 'Williams %R — momentum oscillator' },
  { id: 'AO', name: 'Awesome Oscillator', category: 'Oscillators', tvStudy: 'AO@tv-basicstudies', description: 'Bill Williams Awesome Oscillator' },
  { id: 'MOM', name: 'Momentum (10)', category: 'Oscillators', tvStudy: 'MOM@tv-basicstudies', description: 'Momentum indicator' },
  { id: 'ROC', name: 'ROC (12)', category: 'Oscillators', tvStudy: 'ROC@tv-basicstudies', description: 'Rate of Change — percentage momentum' },
  { id: 'TRIX', name: 'TRIX (18)', category: 'Oscillators', tvStudy: 'TRIX@tv-basicstudies', description: 'Triple Smoothed EMA oscillator' },
  { id: 'MFI', name: 'MFI (14)', category: 'Oscillators', tvStudy: 'MFI@tv-basicstudies', description: 'Money Flow Index — volume-weighted RSI' },
  { id: 'CMF', name: 'CMF (20)', category: 'Oscillators', tvStudy: 'CMF@tv-basicstudies', description: 'Chaikin Money Flow' },
  { id: 'PPO', name: 'PPO (12,26)', category: 'Oscillators', tvStudy: 'PPO@tv-basicstudies', description: 'Percentage Price Oscillator' },
  { id: 'DPO', name: 'DPO (21)', category: 'Oscillators', tvStudy: 'DPO@tv-basicstudies', description: 'Detrended Price Oscillator' },
  { id: 'KST', name: 'KST (10,15,20)', category: 'Oscillators', tvStudy: 'KST@tv-basicstudies', description: 'Know Sure Thing oscillator' },
  { id: 'TSI', name: 'TSI (25,13)', category: 'Oscillators', tvStudy: 'TSI@tv-basicstudies', description: 'True Strength Index' },
  { id: 'UO', name: 'Ultimate Osc (7,14,28)', category: 'Oscillators', tvStudy: 'UO@tv-basicstudies', description: 'Ultimate Oscillator — multi-period' },
  { id: 'FISHER', name: 'Fisher Transform', category: 'Oscillators', tvStudy: 'FisherTransform@tv-basicstudies', description: 'Fisher Transform — Gaussian normal distribution' },
  { id: 'EFI', name: 'Elder Force Index', category: 'Oscillators', tvStudy: 'ElderForceIndex@tv-basicstudies', description: 'Elder Force Index — volume × change' },
  { id: 'BEAR_BULL', name: 'Bull Bear Power', category: 'Oscillators', tvStudy: 'BullBearPower@tv-basicstudies', description: 'Elder Bull Bear Power' },
  { id: 'KDJ', name: 'KDJ (9,3,3)', category: 'Oscillators', tvStudy: 'KDJ@tv-basicstudies', description: 'KDJ — enhanced Stochastic' },

  // Volume Indicators (14)
  { id: 'VOLUME', name: 'Volume', category: 'Volume', tvStudy: 'Volume@tv-basicstudies', description: 'Raw trading volume histogram' },
  { id: 'OBV', name: 'OBV', category: 'Volume', tvStudy: 'OBV@tv-basicstudies', description: 'On-Balance Volume — cumulative price/volume' },
  { id: 'AD', name: 'A/D Line', category: 'Volume', tvStudy: 'AccDist@tv-basicstudies', description: 'Accumulation/Distribution Line' },
  { id: 'CHAIKIN', name: 'Chaikin Osc', category: 'Volume', tvStudy: 'ChaikinOsc@tv-basicstudies', description: 'Chaikin Oscillator' },
  { id: 'PVT', name: 'PVT', category: 'Volume', tvStudy: 'PVT@tv-basicstudies', description: 'Price Volume Trend' },
  { id: 'EOBV', name: 'Ease of Movement', category: 'Volume', tvStudy: 'EOM@tv-basicstudies', description: 'Ease of Movement — price/volume relationship' },
  { id: 'VOLOSC', name: 'Volume Oscillator', category: 'Volume', tvStudy: 'VO@tv-basicstudies', description: 'Volume Oscillator — fast vs slow volume' },
  { id: 'VWAP_BANDS', name: 'VWAP Bands', category: 'Volume', tvStudy: 'VWAP@tv-basicstudies', description: 'VWAP with standard deviation bands' },
  { id: 'VOLPROFILE', name: 'Volume Profile', category: 'Volume', tvStudy: 'VolumeProfile@tv-volumestudies', description: 'Volume Profile — price levels with most volume' },
  { id: 'KLINGER', name: 'Klinger Osc', category: 'Volume', tvStudy: 'KlingerOscillator@tv-basicstudies', description: 'Klinger Volume Oscillator' },
  { id: 'NVI', name: 'NVI', category: 'Volume', tvStudy: 'NVI@tv-basicstudies', description: 'Negative Volume Index' },
  { id: 'PVI', name: 'PVI', category: 'Volume', tvStudy: 'PVI@tv-basicstudies', description: 'Positive Volume Index' },
  { id: 'TWAP', name: 'TWAP', category: 'Volume', tvStudy: 'TWAP@tv-basicstudies', description: 'Time-Weighted Average Price' },
  { id: 'WVAD', name: 'WVAD', category: 'Volume', tvStudy: 'WVAD@tv-basicstudies', description: 'Williams Variable Accumulation/Distribution' },

  // Volatility Indicators (12)
  { id: 'BB', name: 'Bollinger Bands', category: 'Volatility', tvStudy: 'BB@tv-basicstudies', description: 'Bollinger Bands (20,2) — dynamic support/resistance' },
  { id: 'ATR', name: 'ATR (14)', category: 'Volatility', tvStudy: 'ATR@tv-basicstudies', description: 'Average True Range — volatility measure' },
  { id: 'KELTNER', name: 'Keltner Channel', category: 'Volatility', tvStudy: 'KC@tv-basicstudies', description: 'Keltner Channel — ATR-based bands' },
  { id: 'DONCHIAN', name: 'Donchian Channel', category: 'Volatility', tvStudy: 'DONCH@tv-basicstudies', description: 'Donchian Channel — high/low range' },
  { id: 'STDDEV', name: 'Std Deviation', category: 'Volatility', tvStudy: 'StdDev@tv-basicstudies', description: 'Standard Deviation of price' },
  { id: 'CHAIKIN_VOL', name: 'Chaikin Volatility', category: 'Volatility', tvStudy: 'ChaikinVol@tv-basicstudies', description: 'Chaikin Volatility — EMA of H-L range' },
  { id: 'MASINDEX', name: 'Mass Index', category: 'Volatility', tvStudy: 'MassIndex@tv-basicstudies', description: 'Mass Index — reversal detection by volatility' },
  { id: 'HV', name: 'Historical Volatility', category: 'Volatility', tvStudy: 'HV@tv-basicstudies', description: 'Historical Volatility (annualized)' },
  { id: 'NATR', name: 'NATR (14)', category: 'Volatility', tvStudy: 'NATR@tv-basicstudies', description: 'Normalized ATR as % of price' },
  { id: 'RVI_VOL', name: 'RVI', category: 'Volatility', tvStudy: 'RVI@tv-basicstudies', description: 'Relative Volatility Index' },
  { id: 'ULCER', name: 'Ulcer Index', category: 'Volatility', tvStudy: 'UlcerIndex@tv-basicstudies', description: 'Ulcer Index — downside volatility/risk' },
  { id: 'BBW', name: 'BB Width', category: 'Volatility', tvStudy: 'BBW@tv-basicstudies', description: 'Bollinger Band Width — squeeze detection' },

  // Smart Money Concepts (10 — custom)
  { id: 'SMC_OB', name: 'Order Blocks', category: 'Smart Money', custom: true, description: 'Institutional order block detection' },
  { id: 'SMC_FVG', name: 'Fair Value Gaps', category: 'Smart Money', custom: true, description: 'Price imbalance / FVG zones' },
  { id: 'SMC_BOS', name: 'BOS / CHoCH', category: 'Smart Money', custom: true, description: 'Break of Structure & Change of Character' },
  { id: 'SMC_LIQ', name: 'Liquidity Zones', category: 'Smart Money', custom: true, description: 'Buy-side / sell-side liquidity pools' },
  { id: 'SMC_PD', name: 'Premium / Discount', category: 'Smart Money', custom: true, description: 'Optimal trade entry zones' },
  { id: 'SMC_MITIGATION', name: 'Mitigation Blocks', category: 'Smart Money', custom: true, description: 'Mitigated order blocks' },
  { id: 'SMC_BREAKER', name: 'Breaker Blocks', category: 'Smart Money', custom: true, description: 'Failed order blocks turned breakers' },
  { id: 'SMC_INDUCEMENT', name: 'Inducement', category: 'Smart Money', custom: true, description: 'Liquidity inducement before moves' },
  { id: 'SMC_DISPLACEMENT', name: 'Displacement', category: 'Smart Money', custom: true, description: 'Strong displacement candles' },
  { id: 'SMC_PROPULSION', name: 'Propulsion Blocks', category: 'Smart Money', custom: true, description: 'Propulsion candles within order flow' },

  // Candlestick Patterns (15 — custom)
  { id: 'CP_DOJI', name: 'Doji Patterns', category: 'Patterns', custom: true, description: 'Doji, Dragonfly, Gravestone' },
  { id: 'CP_HAMMER', name: 'Hammer / Pin Bar', category: 'Patterns', custom: true, description: 'Hammer, Inverted Hammer, Shooting Star' },
  { id: 'CP_ENGULF', name: 'Engulfing', category: 'Patterns', custom: true, description: 'Bullish & Bearish Engulfing' },
  { id: 'CP_HARAMI', name: 'Harami', category: 'Patterns', custom: true, description: 'Bullish & Bearish Harami inside bars' },
  { id: 'CP_STAR', name: 'Star Patterns', category: 'Patterns', custom: true, description: 'Morning/Evening Star, Doji Star' },
  { id: 'CP_3SOLDIERS', name: '3 Soldiers / Crows', category: 'Patterns', custom: true, description: 'Three White Soldiers, Three Black Crows' },
  { id: 'CP_PIERCING', name: 'Piercing / Dark Cloud', category: 'Patterns', custom: true, description: 'Piercing Line, Dark Cloud Cover' },
  { id: 'CP_MARUBOZU', name: 'Marubozu', category: 'Patterns', custom: true, description: 'Full-body bullish/bearish candles' },
  { id: 'CP_INSIDE', name: 'Inside Bar', category: 'Patterns', custom: true, description: 'Three Inside Up/Down patterns' },
  { id: 'CP_KICKER', name: 'Kicker', category: 'Patterns', custom: true, description: 'Bullish/Bearish Kicker gaps' },
  { id: 'CP_TWEEZER', name: 'Tweezer', category: 'Patterns', custom: true, description: 'Tweezer Top & Bottom' },
  { id: 'CP_BABY', name: 'Abandoned Baby', category: 'Patterns', custom: true, description: 'Abandoned Baby reversal patterns' },
  { id: 'CP_GAP', name: 'Gap Patterns', category: 'Patterns', custom: true, description: 'Upside Gap Two Crows & variants' },
  { id: 'CP_SPINNING', name: 'Spinning Top', category: 'Patterns', custom: true, description: 'Small body with equal shadows' },
  { id: 'CP_MARUBOZU2', name: 'Full Body', category: 'Patterns', custom: true, description: 'Marubozu & full-body continuation' },

  // Support & Resistance (8)
  { id: 'PIVOT_STD', name: 'Classic Pivots', category: 'S&R', tvStudy: 'PivotPointsStandard@tv-basicstudies', description: 'Classic daily/weekly pivot points' },
  { id: 'PIVOT_FIB', name: 'Fibonacci Pivots', category: 'S&R', tvStudy: 'PivotPointsFibonacci@tv-basicstudies', description: 'Fibonacci pivot levels' },
  { id: 'PIVOT_CAM', name: 'Camarilla Pivots', category: 'S&R', tvStudy: 'PivotPointsCamarilla@tv-basicstudies', description: 'Camarilla pivot levels' },
  { id: 'PIVOT_WOOD', name: 'Woodie Pivots', category: 'S&R', tvStudy: 'PivotPointsWoodie@tv-basicstudies', description: 'Woodie pivot levels' },
  { id: 'SWING_HL', name: 'Swing H/L', category: 'S&R', tvStudy: 'PivotPointsHighLow@tv-basicstudies', description: 'Swing high/low markers' },
  { id: 'FIBO', name: 'Auto Fibonacci', category: 'S&R', tvStudy: 'AutoFib@tv-basicstudies', description: 'Automatic Fibonacci retracement' },
  { id: 'ROUNDED', name: 'Round Numbers', category: 'S&R', custom: true, description: 'Psychological round-number levels' },
  { id: 'SD_ZONES', name: 'Supply/Demand', category: 'S&R', custom: true, description: 'Supply and demand zones' },
];

const CATEGORIES = ['All', 'Trend', 'Oscillators', 'Volume', 'Volatility', 'Smart Money', 'Patterns', 'S&R'];

const SYMBOLS = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD', 'NZD/USD', 'GBP/JPY', 'EUR/JPY', 'EUR/GBP', 'BTC/USD', 'ETH/USD'];
const TIMEFRAMES = [
  { label: '1m', tv: '1' },
  { label: '5m', tv: '5' },
  { label: '15m', tv: '15' },
  { label: '30m', tv: '30' },
  { label: '1H', tv: '60' },
  { label: '4H', tv: '240' },
  { label: '1D', tv: 'D' },
  { label: '1W', tv: 'W' },
];

// Default active indicators
const DEFAULT_ACTIVE = new Set(['EMA9', 'EMA21', 'EMA50', 'EMA200', 'RSI', 'MACD', 'BB', 'VOLUME', 'SUPERTREND', 'SMC_OB', 'SMC_FVG', 'SMC_BOS', 'CP_ENGULF', 'CP_HAMMER']);

function fmt(v: number, isXAU = false) {
  if (isXAU || v > 100) return v.toFixed(2);
  if (v < 0.01) return v.toFixed(6);
  return v.toFixed(5);
}

function patternIcon(type: CandlePattern['type']) {
  if (type === 'bullish') return <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />;
  if (type === 'bearish') return <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-yellow-400" />;
}

function strengthDot(s: CandlePattern['strength']) {
  const w = s === 'strong' ? 3 : s === 'moderate' ? 2 : 1;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= w ? (s === 'strong' ? 'bg-yellow-400' : 'bg-indigo-400') : 'bg-gray-700'}`} />
      ))}
    </span>
  );
}

interface IndicatorRowProps {
  ind: IndicatorDef;
  activeIndicators: Set<string>;
  favoriteIndicators: Set<string>;
  toggleIndicator: (id: string) => void;
  toggleFavorite: (id: string, e: React.MouseEvent) => void;
  darkMode: boolean;
  border: string;
}

function IndicatorRow({ ind, activeIndicators, favoriteIndicators, toggleIndicator, toggleFavorite, darkMode, border }: IndicatorRowProps) {
  const isActive = activeIndicators.has(ind.id);
  const isFav = favoriteIndicators.has(ind.id);
  return (
    <div
      onClick={() => toggleIndicator(ind.id)}
      title={ind.description}
      className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-all border-b last:border-b-0 ${border} ${
        isActive ? (darkMode ? 'bg-indigo-500/10' : 'bg-indigo-50') : (darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50')
      }`}>
      <div className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-indigo-500 border-indigo-500' : (darkMode ? 'border-gray-700' : 'border-gray-300')}`}>
        {isActive && <span className="text-white text-[8px] font-bold">✓</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-semibold truncate ${isActive ? 'text-indigo-400' : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>
          {ind.name}
          {ind.custom && <span className="ml-1 text-[8px] text-emerald-400">●</span>}
        </div>
      </div>
      <button
        onClick={(e) => toggleFavorite(ind.id, e)}
        className={`text-[11px] flex-shrink-0 transition-colors ${isFav ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}
        title={isFav ? 'Unfavorite' : 'Add to favorites'}
      >
        {isFav ? '★' : '☆'}
      </button>
      {isActive ? <Eye className="w-2.5 h-2.5 text-indigo-400 flex-shrink-0" /> : <EyeOff className="w-2.5 h-2.5 text-gray-600 flex-shrink-0" />}
    </div>
  );
}

export default function MT5ChartTerminal() {
  const { darkMode, lang } = useApp();
  const isBn = lang === 'bn';
  const [symbol, setSymbol] = useState('XAU/USD');
  const [timeframe, setTimeframe] = useState('60');
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set(DEFAULT_ACTIVE));
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [patterns, setPatterns] = useState<CandlePattern[]>([]);
  const [smc, setSmc] = useState<SMCAnalysis | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const prevPriceRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteIndicators, setFavoriteIndicators] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('tb_fav_mt5');
      return new Set(s ? JSON.parse(s) : []);
    } catch { return new Set(); }
  });

  useEffect(() => {
    startMarketData();
    seedHistoricalData(symbol).then(() => setIsLoading(false));
    return () => stopMarketData();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    seedHistoricalData(symbol).then(() => setIsLoading(false));
  }, [symbol]);

  const compute = useCallback(() => {
    const raw = getCandles(symbol);
    if (raw.length < 5) return;
    const candles: PatternOHLCV[] = raw.map(c => ({
      time: typeof c.time === 'number' ? c.time : Number(c.time),
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }));
    setPatterns(getRecentPatterns(candles, 6));
    setSmc(analyzeSMC(candles));
    const p = getPrice(symbol);
    if (p) {
      const bid = p.bid;
      if (prevPriceRef.current !== null) setPriceChange(bid - prevPriceRef.current);
      prevPriceRef.current = bid;
      setLivePrice(bid);
    }
  }, [symbol]);

  useEffect(() => {
    compute();
    const unsub = onCandleUpdate(s => { if (s === symbol) compute(); });
    const iv = setInterval(compute, 8000);
    return () => { unsub(); clearInterval(iv); };
  }, [symbol, compute]);

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIndicators(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('tb_fav_mt5', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const toggleSection = (sec: string) => setCollapsed(p => ({ ...p, [sec]: !p[sec] }));

  // Build TradingView studies from active TV indicators
  const tvStudies = [...activeIndicators]
    .map(id => INDICATOR_CATALOG.find(i => i.id === id))
    .filter((i): i is IndicatorDef => !!i && !!i.tvStudy && !i.custom)
    .map(i => i.tvStudy!);
  const uniqueStudies = [...new Set(tvStudies)];

  const filteredIndicators = INDICATOR_CATALOG.filter(i => {
    const matchCat = category === 'All' || i.category === category;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const byCategory = CATEGORIES.slice(1).reduce<Record<string, IndicatorDef[]>>((acc, cat) => {
    acc[cat] = filteredIndicators.filter(i => i.category === cat);
    return acc;
  }, {});

  const isXAU = symbol === 'XAU/USD' || symbol.includes('BTC') || symbol.includes('ETH');
  const biasColor = smc?.bias === 'bullish' ? 'text-green-400' : smc?.bias === 'bearish' ? 'text-red-400' : 'text-yellow-400';
  const biasScore = smc?.biasScore ?? 0;

  const card = `rounded-lg border p-2.5 ${darkMode ? 'border-gray-800/60 bg-gray-900/50' : 'border-gray-200 bg-white'}`;
  const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const border = darkMode ? 'border-gray-800' : 'border-gray-200';
  const text = darkMode ? 'text-white' : 'text-gray-900';
  const sub = darkMode ? 'text-gray-400' : 'text-gray-500';
  const panelBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

  return (
    <div className={`flex flex-col h-full min-h-screen ${bg}`}>
      {/* ── TOP BAR ── */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 border-b ${border} ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Symbol selector */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {SYMBOLS.slice(0, 6).map(s => (
            <button key={s} onClick={() => setSymbol(s)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap transition-all ${s === symbol ? 'bg-indigo-500 text-white' : (darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100')}`}>
              {s === 'XAU/USD' ? '🥇 ' : ''}{s}
            </button>
          ))}
          <select value={symbol} onChange={e => setSymbol(e.target.value)}
            className={`text-[11px] font-bold px-2 py-1 rounded-md border-0 outline-none ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Timeframes */}
        <div className="flex items-center gap-0.5 border-l pl-2 ${border}">
          {TIMEFRAMES.map(tf => (
            <button key={tf.tv} onClick={() => setTimeframe(tf.tv)}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${tf.tv === timeframe ? 'bg-indigo-500 text-white' : (darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700')}`}>
              {tf.label}
            </button>
          ))}
        </div>

        {/* Live price */}
        <div className="ml-auto flex items-center gap-2">
          {livePrice && (
            <div className="flex items-center gap-1.5">
              <span className={`font-mono font-bold text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(livePrice, isXAU)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${priceChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(isXAU ? 2 : 5)}
              </span>
            </div>
          )}
          {smc && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${smc.bias === 'bullish' ? 'border-green-500/30 bg-green-500/10 text-green-400' : smc.bias === 'bearish' ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'}`}>
              {smc.bias === 'bullish' ? '↑ BULL' : smc.bias === 'bearish' ? '↓ BEAR' : '→ NEUTRAL'}
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${livePrice ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
            {livePrice ? '● LIVE' : '○ —'}
          </span>
          {isLoading && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── LEFT: Indicator Library ── */}
        <div className={`flex-shrink-0 border-r ${border} flex flex-col transition-all duration-200 ${leftOpen ? 'w-56' : 'w-8'}`}>
          <button onClick={() => setLeftOpen(p => !p)}
            className={`flex items-center justify-between px-2 py-2 text-[10px] font-bold uppercase tracking-wider border-b ${border} ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}>
            {leftOpen ? <><Layers className="w-3 h-3 text-indigo-400" /><span className="ml-1">Indicators</span><span className="ml-auto text-indigo-400">{activeIndicators.size}</span></> : <Layers className="w-3 h-3 text-indigo-400 mx-auto" />}
          </button>

          {leftOpen && (
            <div className="flex-1 overflow-y-auto">
              {/* Search */}
              <div className={`px-2 py-1.5 border-b ${border}`}>
                <div className={`flex items-center gap-1 px-2 py-1 rounded border ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <Search className="w-3 h-3 text-gray-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className={`text-[10px] bg-transparent outline-none w-full ${darkMode ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`} />
                </div>
              </div>

              {/* Category filter */}
              <div className={`flex flex-wrap gap-1 px-2 py-1.5 border-b ${border}`}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-all ${cat === category ? 'bg-indigo-500 text-white' : (darkMode ? 'bg-gray-800 text-gray-500 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Favorites section */}
              {favoriteIndicators.size > 0 && !search && (
                <div>
                  <div className={`flex items-center gap-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-b ${border} text-amber-400`}>
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    Favorites ({favoriteIndicators.size})
                  </div>
                  {INDICATOR_CATALOG.filter(i => favoriteIndicators.has(i.id)).map(ind => (
                    <IndicatorRow key={ind.id} ind={ind} activeIndicators={activeIndicators} favoriteIndicators={favoriteIndicators}
                      toggleIndicator={toggleIndicator} toggleFavorite={toggleFavorite} darkMode={darkMode} border={border} />
                  ))}
                </div>
              )}

              {/* Indicator list by category */}
              {(category === 'All' ? CATEGORIES.slice(1) : [category]).map(cat => {
                const items = category === 'All' ? INDICATOR_CATALOG.filter(i => i.category === cat && (!search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))) : filteredIndicators;
                if (items.length === 0) return null;
                const isCollapsed = collapsed[cat];
                return (
                  <div key={cat}>
                    <button onClick={() => toggleSection(cat)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border-b ${border} ${darkMode ? 'text-gray-500 hover:bg-gray-800/50' : 'text-gray-400 hover:bg-gray-50'}`}>
                      <span className="flex items-center gap-1">
                        {cat === 'Trend' && <TrendingUp className="w-2.5 h-2.5 text-blue-400" />}
                        {cat === 'Oscillators' && <Activity className="w-2.5 h-2.5 text-purple-400" />}
                        {cat === 'Volume' && <BarChart2 className="w-2.5 h-2.5 text-cyan-400" />}
                        {cat === 'Volatility' && <Zap className="w-2.5 h-2.5 text-yellow-400" />}
                        {cat === 'Smart Money' && <Shield className="w-2.5 h-2.5 text-emerald-400" />}
                        {cat === 'Patterns' && <Star className="w-2.5 h-2.5 text-amber-400" />}
                        {cat === 'S&R' && <Target className="w-2.5 h-2.5 text-red-400" />}
                        {cat}
                      </span>
                      {isCollapsed ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
                    </button>
                    {!isCollapsed && items.filter(i => i.category === cat).map(ind => (
                      <IndicatorRow key={ind.id} ind={ind} activeIndicators={activeIndicators} favoriteIndicators={favoriteIndicators}
                        toggleIndicator={toggleIndicator} toggleFavorite={toggleFavorite} darkMode={darkMode} border={border} />
                    ))}
                  </div>
                );
              })}

              {/* Count */}
              <div className={`px-2 py-2 text-[9px] text-center ${sub}`}>
                {INDICATOR_CATALOG.length} indicators total · {activeIndicators.size} active
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER: TradingView Chart ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdvancedChart
            symbol={symbol}
            interval={timeframe}
            height="100%"
            studies={uniqueStudies.length > 0 ? uniqueStudies : ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'Volume@tv-basicstudies']}
          />
        </div>

        {/* ── RIGHT: SMC + Patterns ── */}
        <div className={`flex-shrink-0 border-l ${border} flex flex-col transition-all duration-200 ${rightOpen ? 'w-60' : 'w-8'}`}>
          <button onClick={() => setRightOpen(p => !p)}
            className={`flex items-center justify-between px-2 py-2 text-[10px] font-bold uppercase tracking-wider border-b ${border} ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}>
            {rightOpen ? <><Shield className="w-3 h-3 text-emerald-400" /><span className="ml-1">SMC + Patterns</span></> : <Shield className="w-3 h-3 text-emerald-400 mx-auto" />}
          </button>

          {rightOpen && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">

              {/* SMC Bias Gauge */}
              {smc && (
                <div className={card}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${sub}`}>SMC Bias</span>
                    <span className={`text-xs font-black ${biasColor}`}>
                      {smc.bias === 'bullish' ? '↑ BULLISH' : smc.bias === 'bearish' ? '↓ BEARISH' : '→ NEUTRAL'}
                    </span>
                  </div>
                  {/* Score bar */}
                  <div className={`h-1.5 rounded-full overflow-hidden mb-1.5 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className={`h-full rounded-full transition-all ${biasScore >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.abs(biasScore)}%`, marginLeft: biasScore < 0 ? `${100 - Math.abs(biasScore)}%` : '0' }} />
                  </div>
                  <div className={`text-[9px] ${sub}`}>Score: {biasScore > 0 ? '+' : ''}{biasScore}</div>
                </div>
              )}

              {/* Structure Points */}
              {smc && smc.structurePoints.length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <Activity className="w-2.5 h-2.5 text-purple-400" />Structure
                  </div>
                  <div className="space-y-1">
                    {smc.structurePoints.slice(-3).map((sp, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sp.type === 'CHoCH' ? 'bg-amber-500/20 text-amber-400' : (sp.direction === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}`}>
                          {sp.type}
                        </span>
                        <span className={`text-[9px] font-mono ${sp.direction === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                          {fmt(sp.price, isXAU)}
                        </span>
                        <span className={`text-[8px] ${sub}`}>{sp.direction === 'bullish' ? '↑' : '↓'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Blocks */}
              {smc && activeIndicators.has('SMC_OB') && smc.orderBlocks.filter(ob => !ob.mitigated).length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <Shield className="w-2.5 h-2.5 text-emerald-400" />Order Blocks
                  </div>
                  <div className="space-y-1">
                    {smc.orderBlocks.filter(ob => !ob.mitigated).slice(-3).map((ob, i) => (
                      <div key={i} className={`flex items-center justify-between text-[9px] px-1.5 py-1 rounded ${ob.type === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <span className={`font-bold ${ob.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>{ob.type === 'bullish' ? '▲ Bull' : '▼ Bear'} OB</span>
                        <span className="font-mono text-gray-400">{fmt(ob.low, isXAU)}–{fmt(ob.high, isXAU)}</span>
                        <span className="text-yellow-400">{ob.strength}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fair Value Gaps */}
              {smc && activeIndicators.has('SMC_FVG') && smc.fairValueGaps.filter(g => !g.filled).length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <Zap className="w-2.5 h-2.5 text-yellow-400" />Fair Value Gaps
                  </div>
                  <div className="space-y-1">
                    {smc.fairValueGaps.filter(g => !g.filled).slice(-3).map((fvg, i) => (
                      <div key={i} className={`flex items-center justify-between text-[9px] px-1.5 py-1 rounded ${fvg.type === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <span className={`font-bold ${fvg.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>{fvg.type === 'bullish' ? '↑ Bull' : '↓ Bear'} FVG</span>
                        <span className="font-mono text-gray-400">{fmt(fvg.bottom, isXAU)}–{fmt(fvg.top, isXAU)}</span>
                        <span className="text-cyan-400">{fvg.fillPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Premium/Discount */}
              {smc?.premiumDiscount && activeIndicators.has('SMC_PD') && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <Target className="w-2.5 h-2.5 text-blue-400" />Premium/Discount
                  </div>
                  <div className="space-y-1 text-[9px] font-mono">
                    <div className="flex justify-between"><span className="text-red-400">Premium:</span><span className={text}>{fmt(smc.premiumDiscount.premium, isXAU)}</span></div>
                    <div className="flex justify-between"><span className="text-yellow-400">EQ:</span><span className={text}>{fmt(smc.premiumDiscount.equilibrium, isXAU)}</span></div>
                    <div className="flex justify-between"><span className="text-green-400">Discount:</span><span className={text}>{fmt(smc.premiumDiscount.discount, isXAU)}</span></div>
                    {livePrice && (
                      <div className={`mt-1 text-[9px] font-bold ${livePrice > smc.premiumDiscount.equilibrium ? 'text-red-400' : 'text-green-400'}`}>
                        Price in {livePrice > smc.premiumDiscount.premium ? 'PREMIUM' : livePrice < smc.premiumDiscount.discount ? 'DISCOUNT' : 'EQUILIBRIUM'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Liquidity Zones */}
              {smc && activeIndicators.has('SMC_LIQ') && smc.liquidityZones.filter(z => !z.swept).length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />Liquidity
                  </div>
                  <div className="space-y-1">
                    {smc.liquidityZones.filter(z => !z.swept).slice(-4).map((z, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px]">
                        <span className={`${z.type === 'buy-side' ? 'text-green-400' : 'text-red-400'}`}>
                          {z.type === 'buy-side' ? '▲ BSL' : '▼ SSL'}
                        </span>
                        <span className="font-mono text-gray-400">{fmt(z.price, isXAU)}</span>
                        <span className={`text-[8px] ${sub}`}>{z.strength}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mitigation Blocks */}
              {smc && activeIndicators.has('SMC_MITIGATION') && smc.mitigationBlocks.length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <span className="w-2.5 h-2.5 inline-block rounded-sm bg-purple-500/50" />Mitigation Blocks
                  </div>
                  <div className="space-y-1">
                    {smc.mitigationBlocks.slice(-3).map((mb, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px] px-1.5 py-1 rounded bg-purple-500/10">
                        <span className="font-bold text-purple-400">{mb.type === 'bullish' ? '▲' : '▼'} Mit.</span>
                        <span className="font-mono text-gray-400">{fmt(mb.low, isXAU)}–{fmt(mb.high, isXAU)}</span>
                        <span className="text-purple-300 text-[8px]">Mitigated</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Breaker Blocks */}
              {smc && activeIndicators.has('SMC_BREAKER') && smc.breakerBlocks.length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <span className="w-2.5 h-2.5 inline-block rounded-sm bg-orange-500/50" />Breaker Blocks
                  </div>
                  <div className="space-y-1">
                    {smc.breakerBlocks.slice(-3).map((bb, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px] px-1.5 py-1 rounded bg-orange-500/10">
                        <span className="font-bold text-orange-400">{bb.type === 'bullish' ? '▲' : '▼'} Brk</span>
                        <span className="font-mono text-gray-400">{fmt(bb.low, isXAU)}–{fmt(bb.high, isXAU)}</span>
                        <span className="text-orange-300 text-[8px]">{bb.flipDirection === 'now-resistance' ? 'Res.' : 'Sup.'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inducement */}
              {smc && activeIndicators.has('SMC_INDUCEMENT') && smc.inducementLevels.length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <span className="w-2.5 h-2.5 inline-block rounded-sm bg-fuchsia-500/50" />Inducement
                  </div>
                  <div className="space-y-1">
                    {smc.inducementLevels.slice(-3).map((ind, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px]">
                        <span className={`${ind.type === 'buy-side' ? 'text-fuchsia-400' : 'text-pink-400'}`}>
                          {ind.type === 'buy-side' ? '▲ BSL' : '▼ SSL'} Trap
                        </span>
                        <span className="font-mono text-gray-400">{fmt(ind.price, isXAU)}</span>
                        <span className={`text-[8px] ${sub}`}>Swept</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Displacement */}
              {smc && activeIndicators.has('SMC_DISPLACEMENT') && smc.displacementCandles.length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <Zap className="w-2.5 h-2.5 text-lime-400" />Displacement
                  </div>
                  <div className="space-y-1">
                    {smc.displacementCandles.slice(-3).map((dc, i) => (
                      <div key={i} className={`flex items-center justify-between text-[9px] px-1.5 py-1 rounded ${dc.type === 'bullish' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <span className={`font-bold ${dc.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                          {dc.type === 'bullish' ? '▲' : '▼'} Disp.
                        </span>
                        <span className="font-mono text-gray-400">{fmt(dc.close, isXAU)}</span>
                        <span className="text-lime-400">×{dc.bodyRatio.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Propulsion Blocks */}
              {smc && activeIndicators.has('SMC_PROPULSION') && smc.propulsionBlocks.length > 0 && (
                <div className={card}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                    <span className="w-2.5 h-2.5 inline-block rounded-sm bg-cyan-500/50" />Propulsion
                  </div>
                  <div className="space-y-1">
                    {smc.propulsionBlocks.slice(-3).map((pb, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px] px-1.5 py-1 rounded bg-cyan-500/10">
                        <span className="font-bold text-cyan-400">{pb.type === 'bullish' ? '▲' : '▼'} Prop</span>
                        <span className="font-mono text-gray-400">{fmt(pb.low, isXAU)}–{fmt(pb.high, isXAU)}</span>
                        <span className="text-cyan-300 text-[8px]">Pre-FVG</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Candlestick Patterns */}
              <div className={card}>
                <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                  <Star className="w-2.5 h-2.5 text-amber-400" />Candle Patterns
                  <span className="ml-auto text-[8px] text-gray-600">(last 6 bars)</span>
                </div>
                {patterns.length === 0 ? (
                  <div className={`text-[9px] text-center py-2 ${sub}`}>No patterns detected</div>
                ) : (
                  <div className="space-y-1">
                    {patterns.map((p, i) => (
                      <div key={i} className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[9px] ${
                        p.type === 'bullish' ? 'bg-green-500/10' : p.type === 'bearish' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                      }`}>
                        {patternIcon(p.type)}
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-[10px] truncate ${p.type === 'bullish' ? 'text-green-300' : p.type === 'bearish' ? 'text-red-300' : 'text-yellow-300'}`}>
                            {p.name}
                          </div>
                          <div className={`text-[8px] truncate ${sub}`}>{p.description.split('—')[0]}</div>
                        </div>
                        {strengthDot(p.strength)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Indicators summary */}
              <div className={card}>
                <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${sub}`}>
                  <Activity className="w-2.5 h-2.5 text-indigo-400" />Active ({activeIndicators.size})
                </div>
                <div className="flex flex-wrap gap-1">
                  {[...activeIndicators].slice(0, 12).map(id => {
                    const ind = INDICATOR_CATALOG.find(i => i.id === id);
                    if (!ind) return null;
                    return (
                      <span key={id} className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${ind.custom ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        {ind.name.split(' ')[0]}
                      </span>
                    );
                  })}
                  {activeIndicators.size > 12 && <span className={`text-[8px] ${sub}`}>+{activeIndicators.size - 12}</span>}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
