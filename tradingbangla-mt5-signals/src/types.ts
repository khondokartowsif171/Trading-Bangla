export type ActionType = 'BUY' | 'SELL';
export type SignalStatus = 'ACTIVE' | 'PENDING' | 'PROFIT' | 'LOSS';
export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4' | 'D1';

export interface TradeSignal {
  id: string;
  pair: string;
  action: ActionType;
  status: SignalStatus;
  timeframe: Timeframe;
  entryPrice: number;
  currentPrice: number;
  takeProfit: number;
  stopLoss: number;
  pips: number;
  time: number;
  precision: number; // For formatting decimal places (e.g., JPY pairs vs others)
  history: number[]; // History of prices for charting
}
