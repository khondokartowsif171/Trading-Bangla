import { WebSocketServer, WebSocket } from 'ws';
import { Signal } from './signalEngine';
import { RiskStats } from './riskManager';

export interface WsMessage {
  type: 'signal' | 'stats' | 'heartbeat' | 'error' | 'connected';
  data: unknown;
  timestamp: number;
}

export class WsPublisher {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private lastSignal: Signal | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  start(port: number): void {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected (total: ${this.clients.size})`);

      // Send welcome + last signal immediately
      this.send(ws, {
        type: 'connected',
        data: { message: 'Trading Bangla Signal Bot — XAU/USD Live Signals', clients: this.clients.size },
        timestamp: Date.now(),
      });

      if (this.lastSignal) {
        this.send(ws, { type: 'signal', data: this.lastSignal, timestamp: Date.now() });
      }

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected (total: ${this.clients.size})`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client error:', err.message);
        this.clients.delete(ws);
      });

      ws.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'ping') {
            this.send(ws, { type: 'heartbeat', data: { pong: true }, timestamp: Date.now() });
          }
        } catch {}
      });
    });

    this.wss.on('error', (err) => {
      console.error('[WS] Server error:', err.message);
    });

    // Heartbeat every 30s to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({ type: 'heartbeat', data: { alive: true, clients: this.clients.size }, timestamp: Date.now() });
    }, 30_000);

    console.log(`[WS] Signal server listening on ws://0.0.0.0:${port}`);
  }

  broadcastSignal(signal: Signal): void {
    this.lastSignal = signal;
    this.broadcast({ type: 'signal', data: signal, timestamp: Date.now() });
    console.log(`[WS] Signal broadcast: ${signal.direction} ${signal.symbol} @ ${signal.entry} (confidence: ${signal.confidence}%)`);
  }

  broadcastStats(stats: RiskStats): void {
    this.broadcast({ type: 'stats', data: stats, timestamp: Date.now() });
  }

  broadcast(msg: WsMessage): void {
    if (this.clients.size === 0) return;
    const payload = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload, (err) => {
          if (err) this.clients.delete(client);
        });
      }
    }
  }

  private send(ws: WebSocket, msg: WsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }

  stop(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.wss?.close();
    console.log('[WS] Server stopped');
  }
}
