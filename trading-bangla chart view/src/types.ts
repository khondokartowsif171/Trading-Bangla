/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Candle {
  t: number; // timestamp in ms
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

export interface PairConfig {
  sym: string;      // EURUSD
  label: string;    // EUR/USD
  bnLabel: string;  // ইউরো / আমেরিকান ডলার
  base: number;     // base asset price
  pip: number;      // Pip movement value (e.g. 0.0001 or 0.01)
  dec: number;      // Decimal precision (e.g. 4 or 2)
  spread: number;   // Simulated dynamic spread in pips (e.g. 1.2)
  sparkline: Candle[]; // Cache for small list preview sparklines
}

export interface Position {
  id: string;
  sym: string;
  type: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  leverage: number;
  sl?: number;
  tp?: number;
  margin: number;
  time: number;
}

export interface TradeHistory {
  id: string;
  sym: string;
  type: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  exitTime: number;
  status: 'TP' | 'SL' | 'MANUAL';
}

export type ChartType = 'candle' | 'heikin' | 'bar' | 'line' | 'area' | 'hollow';

export interface DrawingTool {
  id: string;
  type: 'trend' | 'horizontal' | 'vertical' | 'fib' | 'rectangle' | 'ray' | 'channel'
      | 'extline' | 'pitchfork' | 'regression' | 'fibext' | 'pricerange' | 'daterange'
      | 'longpos' | 'shortpos';
  points: { index: number; price: number }[];
  color: string;
  label?: string;
}

export type IndicatorCategory = 'trend' | 'oscillator' | 'volume' | 'volatility' | 'smc';
export type IndicatorRenderType = 'overlay' | 'subpanel';

export interface IndicatorDef {
  id: string;
  label: string;
  category: IndicatorCategory;
  renderType: IndicatorRenderType;
  defaultParams: Record<string, number>;
  color: string;
  description?: string;
}

export interface IndicatorParams {
  [key: string]: number | string;
  color?: string;
}

export interface AccountState {
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  floatingPnl: number;
}

export interface NewsItem {
  id: string;
  time: string;
  title: string;
  titleBn: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  summary: string;
  impactColor: string;
}
