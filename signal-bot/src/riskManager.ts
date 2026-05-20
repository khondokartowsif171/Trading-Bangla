export interface TradeResult {
  profit: number;
  isWin: boolean;
  entryPrice: number;
  exitPrice: number;
  openedAt: number;
  closedAt: number;
}

export interface RiskStats {
  startingBalance: number;
  currentBalance: number;
  peakBalance: number;
  totalDrawdown: number;
  dailyDrawdown: number;
  dailyStartBalance: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  activeTrades: number;
  isPaused: boolean;
  pauseReason: string;
}

export class RiskManager {
  private stats: RiskStats;
  private readonly maxDrawdown: number;
  private readonly dailyDrawdownLimit: number;
  private readonly riskPerTrade: number;
  private readonly maxConcurrentTrades: number;
  private lastDayReset: number;
  private grossProfit = 0;
  private grossLoss = 0;

  constructor(options: {
    startingBalance: number;
    maxDrawdownPercent?: number;
    dailyDrawdownLimit?: number;
    riskPerTrade?: number;
    maxConcurrentTrades?: number;
  }) {
    this.maxDrawdown = options.maxDrawdownPercent ?? 20;
    this.dailyDrawdownLimit = options.dailyDrawdownLimit ?? 3;
    this.riskPerTrade = options.riskPerTrade ?? 1;
    this.maxConcurrentTrades = options.maxConcurrentTrades ?? 2;

    this.stats = {
      startingBalance: options.startingBalance,
      currentBalance: options.startingBalance,
      peakBalance: options.startingBalance,
      totalDrawdown: 0,
      dailyDrawdown: 0,
      dailyStartBalance: options.startingBalance,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      profitFactor: 0,
      activeTrades: 0,
      isPaused: false,
      pauseReason: '',
    };

    this.lastDayReset = this.getTodayStart();
  }

  private getTodayStart(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  private checkDayReset(): void {
    const todayStart = this.getTodayStart();
    if (todayStart > this.lastDayReset) {
      this.stats.dailyStartBalance = this.stats.currentBalance;
      this.stats.dailyDrawdown = 0;
      this.lastDayReset = todayStart;
      // Resume if was paused only due to daily limit
      if (this.stats.isPaused && this.stats.pauseReason.includes('Daily')) {
        this.stats.isPaused = false;
        this.stats.pauseReason = '';
        console.log('[RiskManager] New trading day — daily limit reset, bot resumed');
      }
    }
  }

  canTrade(): { allowed: boolean; reason: string } {
    this.checkDayReset();

    if (this.stats.isPaused) {
      return { allowed: false, reason: this.stats.pauseReason };
    }

    if (this.stats.activeTrades >= this.maxConcurrentTrades) {
      return { allowed: false, reason: `Max concurrent trades (${this.maxConcurrentTrades}) reached` };
    }

    if (this.stats.totalDrawdown >= this.maxDrawdown) {
      this.stats.isPaused = true;
      this.stats.pauseReason = `Total drawdown ${this.stats.totalDrawdown.toFixed(2)}% exceeded ${this.maxDrawdown}% limit — manual review required`;
      return { allowed: false, reason: this.stats.pauseReason };
    }

    if (this.stats.dailyDrawdown >= this.dailyDrawdownLimit) {
      this.stats.isPaused = true;
      this.stats.pauseReason = `Daily drawdown ${this.stats.dailyDrawdown.toFixed(2)}% exceeded ${this.dailyDrawdownLimit}% limit`;
      return { allowed: false, reason: this.stats.pauseReason };
    }

    return { allowed: true, reason: '' };
  }

  // Returns lot size — scales with confidence (80-84% = 0.75x, 85-89% = 0.9x, 90%+ = full)
  calcPositionSize(balance: number, entryPrice: number, stopLossPrice: number, contractSize = 100, confidence = 80): number {
    const confidenceMultiplier = confidence >= 90 ? 1.0 : confidence >= 85 ? 0.9 : 0.75;
    const riskAmount = balance * (this.riskPerTrade / 100) * confidenceMultiplier;
    const pipRisk = Math.abs(entryPrice - stopLossPrice);
    if (pipRisk <= 0) return 0.01;
    const lots = riskAmount / (pipRisk * contractSize);
    // Round to 2 decimals, min 0.01, max 5.0 (conservative for XAU)
    return Math.min(Math.max(Math.round(lots * 100) / 100, 0.01), 5.0);
  }

  openTrade(): void {
    this.stats.activeTrades++;
  }

  closeTrade(result: TradeResult): void {
    this.stats.activeTrades = Math.max(0, this.stats.activeTrades - 1);
    this.stats.totalTrades++;
    this.stats.currentBalance += result.profit;

    if (result.profit > 0) {
      this.stats.wins++;
      this.grossProfit += result.profit;
    } else {
      this.stats.losses++;
      this.grossLoss += Math.abs(result.profit);
    }

    // Update peak and drawdown
    if (this.stats.currentBalance > this.stats.peakBalance) {
      this.stats.peakBalance = this.stats.currentBalance;
    }
    this.stats.totalDrawdown = Math.max(
      0,
      ((this.stats.peakBalance - this.stats.currentBalance) / this.stats.peakBalance) * 100
    );
    this.stats.dailyDrawdown = Math.max(
      0,
      ((this.stats.dailyStartBalance - this.stats.currentBalance) / this.stats.dailyStartBalance) * 100
    );

    this.stats.winRate = this.stats.totalTrades > 0
      ? (this.stats.wins / this.stats.totalTrades) * 100
      : 0;
    this.stats.profitFactor = this.grossLoss > 0
      ? this.grossProfit / this.grossLoss
      : this.grossProfit > 0 ? 999 : 0;

    console.log(
      `[RiskManager] Trade closed: ${result.isWin ? 'WIN' : 'LOSS'} ${result.profit.toFixed(2)} | ` +
      `Balance: ${this.stats.currentBalance.toFixed(2)} | ` +
      `Drawdown: ${this.stats.totalDrawdown.toFixed(2)}% | ` +
      `Win rate: ${this.stats.winRate.toFixed(1)}%`
    );
  }

  updateBalance(balance: number): void {
    this.stats.currentBalance = balance;
    if (balance > this.stats.peakBalance) this.stats.peakBalance = balance;
  }

  getStats(): RiskStats {
    return { ...this.stats };
  }

  isLosingTooMuch(): boolean {
    return this.stats.totalDrawdown >= this.maxDrawdown || this.stats.dailyDrawdown >= this.dailyDrawdownLimit;
  }
}
