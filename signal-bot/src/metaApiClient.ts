import MetaApi from 'metaapi.cloud';
import { Candle } from './indicators';

export type MT5Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
}

export interface MT5Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  swap: number;
  openTime: Date;
}

export class MetaApiClient {
  private api: InstanceType<typeof MetaApi>;
  private connection: any = null;
  private account: any = null;
  private isConnected = false;

  constructor(token: string) {
    this.api = new MetaApi(token);
  }

  async connect(accountId: string): Promise<void> {
    console.log('[MetaAPI] Connecting to MT5 account...');
    this.account = await this.api.metatraderAccountApi.getAccount(accountId);

    const state = this.account.state;
    if (!['DEPLOYING', 'DEPLOYED'].includes(state)) {
      console.log('[MetaAPI] Deploying account...');
      await this.account.deploy();
    }

    console.log('[MetaAPI] Waiting for API server connection...');
    await this.account.waitConnected();

    this.connection = this.account.getRPCConnection();
    await this.connection.connect();
    await this.connection.waitSynchronized();

    this.isConnected = true;
    console.log('[MetaAPI] Connected and synchronized!');
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.isConnected = false;
      console.log('[MetaAPI] Disconnected');
    }
  }

  async getCandles(symbol: string, timeframe: MT5Timeframe, count = 300): Promise<Candle[]> {
    if (!this.isConnected) throw new Error('MetaAPI not connected');

    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - this.minutesForCount(timeframe, count));

    try {
      const candles = await this.connection.getHistoricalCandles(symbol, timeframe, startTime, count);
      return candles.map((c: any) => ({
        time: new Date(c.time).getTime(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.tickVolume,
      }));
    } catch (err) {
      console.error(`[MetaAPI] Failed to fetch ${symbol} ${timeframe} candles:`, err);
      return [];
    }
  }

  async getAccountInfo(): Promise<AccountInfo | null> {
    if (!this.isConnected) return null;
    try {
      const info = await this.connection.getAccountInformation();
      return {
        balance: info.balance,
        equity: info.equity,
        margin: info.margin,
        freeMargin: info.freeMargin,
        leverage: info.leverage,
        currency: info.currency,
      };
    } catch (err) {
      console.error('[MetaAPI] Failed to get account info:', err);
      return null;
    }
  }

  async getOpenTrades(symbol?: string): Promise<MT5Trade[]> {
    if (!this.isConnected) return [];
    try {
      const positions = await this.connection.getPositions();
      return positions
        .filter((p: any) => !symbol || p.symbol === symbol)
        .map((p: any) => ({
          id: p.id,
          symbol: p.symbol,
          type: p.type === 'POSITION_TYPE_BUY' ? 'buy' : 'sell',
          volume: p.volume,
          openPrice: p.openPrice,
          currentPrice: p.currentPrice,
          profit: p.profit,
          swap: p.swap,
          openTime: p.time,
        }));
    } catch (err) {
      console.error('[MetaAPI] Failed to get open trades:', err);
      return [];
    }
  }

  async getCurrentPrice(symbol: string): Promise<{ bid: number; ask: number } | null> {
    if (!this.isConnected) return null;
    try {
      const price = await this.connection.getSymbolPrice(symbol);
      return { bid: price.bid, ask: price.ask };
    } catch (err) {
      console.error(`[MetaAPI] Failed to get price for ${symbol}:`, err);
      return null;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  private minutesForCount(timeframe: MT5Timeframe, count: number): number {
    const multipliers: Record<MT5Timeframe, number> = {
      '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440,
    };
    return (multipliers[timeframe] ?? 60) * count;
  }
}
