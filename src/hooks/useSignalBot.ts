import { useEffect, useRef, useState, useCallback } from 'react';

export interface BotSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  riskReward: number;
  reasons: string[];
  timeframes: string[];
  indicators: {
    ema20: number;
    ema50: number;
    ema200: number;
    rsi: number;
    macd: number;
    macdHistogram: number;
    atr: number;
    bbUpper: number;
    bbLower: number;
    currentPrice: number;
    trend: 'UP' | 'DOWN' | 'NEUTRAL';
  };
  timestamp: number;
  expiresAt: number;
}

export interface BotStats {
  currentBalance: number;
  totalDrawdown: number;
  dailyDrawdown: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  activeTrades: number;
  isPaused: boolean;
  pauseReason: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const BOT_WS_URL = import.meta.env.VITE_SIGNAL_BOT_URL ?? 'ws://localhost:8080';

export function useSignalBot() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [latestSignal, setLatestSignal] = useState<BotSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<BotSignal[]>([]);
  const [botStats, setBotStats] = useState<BotStats | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(2000);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(BOT_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectDelay.current = 2000;
      console.log('[SignalBot] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'signal' && msg.data?.direction !== 'NEUTRAL') {
          const signal: BotSignal = msg.data;
          setLatestSignal(signal);
          setSignalHistory(prev => [signal, ...prev].slice(0, 50));
        } else if (msg.type === 'stats') {
          setBotStats(msg.data);
        }
      } catch {}
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
      // Auto-reconnect with exponential backoff (max 30s)
      const delay = Math.min(reconnectDelay.current, 30_000);
      reconnectDelay.current = delay * 2;
      console.log(`[SignalBot] Disconnected — reconnecting in ${delay / 1000}s`);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      setStatus('error');
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { status, latestSignal, signalHistory, botStats };
}
