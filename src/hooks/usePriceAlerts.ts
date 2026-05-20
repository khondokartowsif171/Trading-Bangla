import { useState, useEffect, useCallback } from 'react';
import { useAllPrices } from './useMarketData';

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

const STORAGE_KEY = 'tb_price_alerts';

function loadAlerts(): PriceAlert[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);
  const livePrices = useAllPrices();

  // Request notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check alerts against live prices
  useEffect(() => {
    if (!alerts.length) return;
    let changed = false;
    const next = alerts.map(alert => {
      if (alert.triggered) return alert;
      const q = livePrices[alert.symbol];
      if (!q) return alert;
      const hit =
        alert.condition === 'above' ? q.bid >= alert.price : q.bid <= alert.price;
      if (hit) {
        changed = true;
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⚡ Price Alert — ${alert.symbol}`, {
              body: `${alert.symbol} is ${alert.condition === 'above' ? '▲ above' : '▼ below'} ${alert.price.toFixed(alert.symbol.includes('XAU') || alert.symbol.includes('BTC') ? 2 : 5)}`,
              icon: '/favicon.ico',
            });
          } catch {}
        }
        return { ...alert, triggered: true, triggeredAt: Date.now() };
      }
      return alert;
    });
    if (changed) {
      setAlerts(next);
      saveAlerts(next);
    }
  }, [livePrices]);

  const addAlert = useCallback((symbol: string, condition: 'above' | 'below', price: number) => {
    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}`,
      symbol, condition, price,
      createdAt: Date.now(),
      triggered: false,
    };
    setAlerts(prev => {
      const next = [...prev, newAlert];
      saveAlerts(next);
      return next;
    });
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id);
      saveAlerts(next);
      return next;
    });
  }, []);

  const clearTriggered = useCallback(() => {
    setAlerts(prev => {
      const next = prev.filter(a => !a.triggered);
      saveAlerts(next);
      return next;
    });
  }, []);

  const pendingCount = alerts.filter(a => !a.triggered).length;
  const triggeredCount = alerts.filter(a => a.triggered).length;

  return { alerts, addAlert, removeAlert, clearTriggered, pendingCount, triggeredCount };
}
