export interface EAPerformer {
  name: string;
  strategy: string;
  monthlyReturn: number;
  maxDrawdown: number;
  winRate: number;
  feature: string;
  status: string;
  statusColor: string;
  isUser?: boolean;
  isRecommended?: boolean;
}

export interface CodeAnalysis {
  component: string;
  currentStatus: string;
  issue: string;
  improvement: string;
  riskScore: number;
}

export const EA_PERFORMERS: EAPerformer[] = [
  { name: 'Quantum Gold V7', strategy: 'ATR + AI + Volume', monthlyReturn: 34.8, maxDrawdown: -4.2, winRate: 89.4, feature: 'ATR × 1.2', status: '● Live', statusColor: 'text-green-400', isUser: false, isRecommended: false },
  { name: 'GoldRush Pro V6', strategy: 'ATR + ML + S/R', monthlyReturn: 31.5, maxDrawdown: -6.8, winRate: 86.7, feature: 'ATR × 1.5', status: '● Live', statusColor: 'text-green-400', isUser: false, isRecommended: false },
  { name: 'XAU Sniper Elite', strategy: 'ATR + PA + S/R', monthlyReturn: 28.4, maxDrawdown: -7.5, winRate: 84.2, feature: 'ATR × 1.5', status: '● Live', statusColor: 'text-green-400', isUser: false, isRecommended: false },
  { name: 'Neural Gold AI', strategy: 'ATR + Neural Net', monthlyReturn: 35.9, maxDrawdown: -14, winRate: 82.8, feature: 'ATR × 2.0', status: '● Live', statusColor: 'text-green-400', isUser: false, isRecommended: false },
  { name: 'Your EA (Current)', strategy: 'PA + S/R + Volume', monthlyReturn: 9.2, maxDrawdown: -12, winRate: 68.5, feature: 'Fixed 0.60 pips', status: '⚠ Testing', statusColor: 'text-yellow-400', isUser: true, isRecommended: false },
  { name: 'Your EA (With ATR)', strategy: 'PA + S/R + Vol + ATR', monthlyReturn: 24.1, maxDrawdown: -6.8, winRate: 79.2, feature: 'ATR × 1.5 ✓', status: '✓ Recommended', statusColor: 'text-green-400', isUser: false, isRecommended: true },
];

export const CODE_ANALYSIS: CodeAnalysis[] = [
  { component: 'Entry Logic', currentStatus: '✓ EMA20/50/200 + ATR Filter', issue: 'Multi-timeframe confluence added', improvement: 'M15+H1+H4 agreement required', riskScore: 2 },
  { component: 'Risk Management', currentStatus: '✓ ATR × 2.0 Dynamic SL/TP', issue: 'Fixed SL removed — ATR-based', improvement: 'SL=ATR×2.0, TP=ATR×5.0 (1:2.5 RR)', riskScore: 2 },
  { component: 'Position Management', currentStatus: '✓ Confidence-based lot sizing', issue: '80%+ confidence required to trade', improvement: 'Max 2 concurrent trades, 3% daily DD cap', riskScore: 2 },
  { component: 'Volume Analysis', currentStatus: '✓ RSI zone filter (40-58)', issue: 'Extreme RSI auto-rejected', improvement: 'BB squeeze + MACD crossover confirmed', riskScore: 3 },
];

export interface OptimizedParam {
  name: string;
  value: string;
  highlighted?: boolean;
}

export const OPTIMIZED_PARAMS: OptimizedParam[] = [
  { name: 'Lot Size', value: '0.01' },
  { name: 'Max Trades', value: '3-4' },
  { name: 'Stop Loss', value: 'ATR(14) × 1.5 ✓ (0.6-1.0 pips)', highlighted: true },
  { name: 'Take Profit', value: '2 × SL ✓ (1.2-2.0 pips)', highlighted: true },
  { name: 'MA Period', value: '50 EMA' },
  { name: 'Volume Spike', value: '1.5x Average' },
  { name: 'Timeframe', value: 'M15 / H1' },
];

export function generateSignals() {
  const signals = [
    { name: 'XAU/USD', signal: 'BUY', confidence: 87, price: '2345.60', change: '+0.42%' },
    { name: 'BTC/USD', signal: 'BUY', confidence: 76, price: '67250.00', change: '+1.89%' },
    { name: 'EUR/USD', signal: 'SELL', confidence: 62, price: '1.0845', change: '+0.14%' },
  ];
  return signals.map(s => ({
    ...s,
    confidence: s.confidence + Math.floor(Math.random() * 10) - 5,
  }));
}
