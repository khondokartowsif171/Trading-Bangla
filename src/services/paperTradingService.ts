import { OHLC, getPrice } from './marketDataService';

export interface PaperTrade {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  lot: number;
  openPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  swap: number;
  openTime: string;
  pnl: number;
}

export interface PaperStats {
  totalTrades: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  todayProfit: number;
}

let balance = 10000;
let equity = 10000;
let trades: PaperTrade[] = [];
let ticketCounter = 100000;
let stats: PaperStats = {
  totalTrades: 0, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0,
  winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, todayProfit: 0,
};
const listeners = new Set<() => void>();

function notify() { listeners.forEach(cb => { try { cb(); } catch {} }); }

export function getBalance() { return balance; }
export function getEquity() { return equity; }
export function getTrades() { return [...trades]; }
export function getStats() { return { ...stats }; }

export function openTrade(symbol: string, type: 'BUY' | 'SELL', lot: number, price: number, sl: number, tp: number) {
  const trade: PaperTrade = {
    ticket: ++ticketCounter,
    symbol, type, lot: +lot.toFixed(2),
    openPrice: +price.toFixed(price > 100 ? 2 : 5),
    currentPrice: +price.toFixed(price > 100 ? 2 : 5),
    sl: +sl.toFixed(price > 100 ? 2 : 5),
    tp: +tp.toFixed(price > 100 ? 2 : 5),
    swap: -0.12, openTime: new Date().toLocaleTimeString('en-GB'),
    pnl: 0,
  };
  trades.push(trade);
  calculateEquity();
  notify();
}

export function closeTrade(ticket: number) {
  const idx = trades.findIndex(t => t.ticket === ticket);
  if (idx === -1) return;
  const trade = trades[idx];
  const pnl = trade.pnl;
  balance += pnl;
  stats.todayProfit += pnl;
  if (pnl > 0) { stats.wins++; stats.grossProfit += pnl; }
  else { stats.losses++; stats.grossLoss += Math.abs(pnl); }
  stats.totalTrades = stats.wins + stats.losses;
  stats.winRate = stats.totalTrades > 0 ? +((stats.wins / stats.totalTrades) * 100).toFixed(1) : 0;
  stats.avgWin = stats.wins > 0 ? +(stats.grossProfit / stats.wins).toFixed(2) : 0;
  stats.avgLoss = stats.losses > 0 ? +(stats.grossLoss / stats.losses).toFixed(2) : 0;
  stats.profitFactor = stats.grossLoss > 0 ? +(stats.grossProfit / stats.grossLoss).toFixed(2) : stats.grossProfit > 0 ? 999 : 0;
  trades.splice(idx, 1);
  calculateEquity();
  notify();
}

export function updateTradePrices() {
  trades.forEach(t => {
    const q = getPrice(t.symbol);
    if (q) {
      t.currentPrice = +q.bid.toFixed(t.openPrice > 100 ? 2 : 5);
      const diff = t.type === 'BUY' ? t.currentPrice - t.openPrice : t.openPrice - t.currentPrice;
      t.pnl = +(diff * t.lot * (t.symbol.includes('JPY') || t.symbol.includes('XAU') ? 100 : 10000)).toFixed(2);
      if (t.tp > 0 && ((t.type === 'BUY' && t.currentPrice >= t.tp) || (t.type === 'SELL' && t.currentPrice <= t.tp))) closeTrade(t.ticket);
      else if (t.sl > 0 && ((t.type === 'BUY' && t.currentPrice <= t.sl) || (t.type === 'SELL' && t.currentPrice >= t.sl))) closeTrade(t.ticket);
    }
  });
  calculateEquity();
  notify();
}

function calculateEquity() {
  const pnl = trades.reduce((s, t) => s + t.pnl, 0);
  equity = balance + pnl;
}

export function resetAccount() {
  balance = 10000;
  equity = 10000;
  trades = [];
  stats = { totalTrades: 0, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0, winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, todayProfit: 0 };
  notify();
}

export function onTradeUpdate(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
