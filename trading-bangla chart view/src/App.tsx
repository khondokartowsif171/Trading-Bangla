/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Candle,
  Position,
  TradeHistory,
  AccountState,
  PairConfig,
  DrawingTool,
} from './types';
import { MAJOR_FOREX_PAIRS } from './data/forexPairs';
import WatchList from './components/WatchList';
import ChartingTool from './components/ChartingTool';
import TradePanel from './components/TradePanel';
import AiAnalyst from './components/AiAnalyst';
import NewsFeed from './components/NewsFeed';
import {
  TrendingUp,
  Brain,
  Newspaper,
  LayoutGrid,
  Info,
  Sliders,
  DollarSign,
  User,
  Activity,
  History,
  Workflow,
  Sparkles,
  List,
  Coins,
  Cpu,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';

// Seeder helper to generate realistic historical data drift
function seedCandles(baseClass: number, count = 200, pipValue = 0.0001): Candle[] {
  const dataset: Candle[] = [];
  let price = baseClass;
  const timeMinute = 60 * 1000;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const isUp = Math.random() > 0.49;
    const bodySize = (Math.random() * 4 + 1.2) * pipValue;
    const wickSize = (Math.random() * 3 + 0.5) * pipValue;

    const op = price;
    const cl = isUp ? price + bodySize : price - bodySize;
    const hi = Math.max(op, cl) + wickSize;
    const lo = Math.min(op, cl) - wickSize;
    const vol = Math.floor(Math.random() * 1400 + 200);

    dataset.push({
      t: now - (count - i) * timeMinute,
      o: Number(op.toFixed(5)),
      h: Number(hi.toFixed(5)),
      l: Number(lo.toFixed(5)),
      c: Number(cl.toFixed(5)),
      v: vol,
    });
    price = cl;
  }
  return dataset;
}

export default function App() {
  // Live price ref — updated by real API feeds, read by tick engine (no re-render)
  const liveRef = useRef<Record<string, number>>({});
  const [isAnyLive, setIsAnyLive] = useState(false);

  // 1. DYNAMIC ASSET SEED SEEDS
  const [pairsMap, setPairsMap] = useState<Record<string, PairConfig>>(() => {
    const map: Record<string, PairConfig> = {};
    MAJOR_FOREX_PAIRS.forEach((item) => {
      const series = seedCandles(item.base, 1000, item.pip);
      map[item.sym] = {
        ...item,
        sparkline: series,
      };
    });
    return map;
  });

  // Watchlist array representation
  const pairsList = useMemo(() => Object.values(pairsMap), [pairsMap]);

  // Main UI Grid layout toggles
  const [activeLayout, setActiveLayout] = useState<'1-chart' | '2-charts' | '4-charts'>('1-chart');

  // Panel settings configurations
  const [panel1SelectedSym, setPanel1SelectedSym] = useState('EURUSD');
  const [panel2SelectedSym, setPanel2SelectedSym] = useState('GBPUSD');
  const [panel3SelectedSym, setPanel3SelectedSym] = useState('USDJPY');
  const [panel4SelectedSym, setPanel4SelectedSym] = useState('XAUUSD');

  const [panel1TF, setPanel1TF] = useState('M1');
  const [panel2TF, setPanel2TF] = useState('M5');
  const [panel3TF, setPanel3TF] = useState('M15');
  const [panel4TF, setPanel4TF] = useState('H1');

  // Shared drawings states
  const [panel1Drawings, setPanel1Drawings] = useState<DrawingTool[]>([]);
  const [panel2Drawings, setPanel2Drawings] = useState<DrawingTool[]>([]);
  const [panel3Drawings, setPanel3Drawings] = useState<DrawingTool[]>([]);
  const [panel4Drawings, setPanel4Drawings] = useState<DrawingTool[]>([]);

  const [showPanel1SMC, setShowPanel1SMC] = useState(true);
  const [showPanel2SMC, setShowPanel2SMC] = useState(false);
  const [showPanel3SMC, setShowPanel3SMC] = useState(true);
  const [showPanel4SMC, setShowPanel4SMC] = useState(false);

  // Active secondary helper tabs (AI Analyst vs News economic feed)
  const [helperTab, setHelperTab] = useState<'ai' | 'news'>('ai');

  // Workspace Multitasking Layout Section Toggles (4 main blocks)
  const [showWatchlist, setShowWatchlist] = useState<boolean>(true);
  const [showChart, setShowChart] = useState<boolean>(true);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(true);
  const [showTradePanel, setShowTradePanel] = useState<boolean>(true);

  // Custom panel sizes (min/max customization parameters)
  const [watchlistWidth, setWatchlistWidth] = useState<number>(285);
  const [tradePanelWidth, setTradePanelWidth] = useState<number>(315);
  const [analysisHeight, setAnalysisHeight] = useState<number>(260);

  // 2. DETAILED DEMO BROKER PORTFOLIO BALANCE STATES
  const [account, setAccount] = useState<AccountState>({
    balance: 10000.0, // starting clean demo funds
    equity: 10000.0,
    usedMargin: 0.0,
    freeMargin: 10000.0,
    floatingPnl: 0.0,
  });

  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);

  // Sound effects emulation using context fallback or quick flash banner
  const [alertNotify, setAlertNotify] = useState<string>('');

  // ── REAL-TIME LIVE FEEDS ──────────────────────────────────────────────────
  // Gold-API.com — XAUUSD only (Binance MUST NOT touch gold)
  useEffect(() => {
    const fetchGold = async () => {
      try {
        const res = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
        const data = await res.json();
        const price = Number(data?.items?.[0]?.xauPrice);
        if (price > 1000) {
          liveRef.current['XAUUSD'] = price;
          setIsAnyLive(true);
        }
      } catch { /* graceful fallback to simulation */ }
    };
    fetchGold();
    const iv = setInterval(fetchGold, 10000);
    return () => clearInterval(iv);
  }, []);

  // Binance WebSocket — BTCUSD only
  useEffect(() => {
    let ws: WebSocket;
    const connect = () => {
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=btcusdt@ticker');
        ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data);
            const price = parseFloat(d?.data?.c);
            if (price > 0) { liveRef.current['BTCUSD'] = price; setIsAnyLive(true); }
          } catch { /* ignore parse errors */ }
        };
        ws.onclose = () => { setTimeout(connect, 4000); };
      } catch { /* ignore */ }
    };
    connect();
    return () => { try { ws?.close(); } catch { /* ignore */ } };
  }, []);

  // Twelve Data WebSocket — forex pairs only (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD)
  useEffect(() => {
    let ws: WebSocket;
    const connect = () => {
      try {
        ws = new WebSocket('wss://ws.twelvedata.com/v1/quotes/price?apikey=dd5f8e4e70e0445e96119e5182040118');
        ws.onopen = () => {
          ws.send(JSON.stringify({
            action: 'subscribe',
            params: { symbols: 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD,EUR/JPY,GBP/JPY,USD/CHF,EUR/CHF,NZD/USD,EUR/CAD,EUR/AUD' }
          }));
        };
        ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data);
            if (d.event === 'price' && d.symbol && d.price) {
              const sym = (d.symbol as string).replace('/', '');
              const price = parseFloat(d.price);
              if (price > 0) { liveRef.current[sym] = price; setIsAnyLive(true); }
            }
          } catch { /* ignore */ }
        };
        ws.onclose = () => { setTimeout(connect, 4000); };
      } catch { /* ignore */ }
    };
    connect();
    return () => { try { ws?.close(); } catch { /* ignore */ } };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // 3. SECURE CENTRAL TICK VOLATILITY LOOP ENGINE
  const tickCounterRef = useRef<number>(0);

  useEffect(() => {
    const runTick = () => {
      tickCounterRef.current += 1;
      const shouldSpawnNewCandle = tickCounterRef.current % 35 === 0; // Speed up real-time candle spawning

      setPairsMap((prevMap) => {
        const nextMap: Record<string, PairConfig> = {};

        Object.keys(prevMap).forEach((symbolKey) => {
          const config = prevMap[symbolKey];
          const list = [...config.sparkline];
          let newest = { ...list[list.length - 1] };

          // Use live price if available, else simulate
          const livePx = liveRef.current[symbolKey];
          let updatedClose: number;
          if (livePx !== undefined) {
            // Real API price: add tiny noise for natural movement
            const noise = (Math.random() - 0.5) * config.pip * 0.3;
            updatedClose = livePx + noise;
          } else {
            // Simulation: random walk volatility drift
            const shiftValue = (Math.random() - 0.49) * 1.4 * config.pip;
            updatedClose = newest.c + shiftValue;
          }

          newest.c = Number(updatedClose.toFixed(config.dec));
          newest.h = Number(Math.max(newest.h, updatedClose).toFixed(config.dec));
          newest.l = Number(Math.min(newest.l, updatedClose).toFixed(config.dec));
          newest.v += Math.floor(Math.random() * 8 + 1);

          if (shouldSpawnNewCandle) {
            // Seal previous and spawn new M1/M5 candle frame
            const timestamp = Date.now();
            list.push({
              t: timestamp,
              o: newest.c,
              h: newest.c,
              l: newest.c,
              c: newest.c,
              v: Math.floor(Math.random() * 200 + 30),
            });
            // Keep window size aligned
            if (list.length > 1200) {
              list.shift();
            }
          } else {
            list[list.length - 1] = newest;
          }

          nextMap[symbolKey] = {
            ...config,
            sparkline: list,
          };
        });

        return nextMap;
      });
    };

    const intervalId = setInterval(runTick, 500);
    return () => clearInterval(intervalId);
  }, []);

  // 4. TICK MONITOR TO UPDATE PORTFOLIO FLOATING PNL, LEVERAGES AND SL/TP TRIGGERS
  useEffect(() => {
    if (positions.length === 0) {
      setAccount((prev) => ({
        ...prev,
        equity: prev.balance,
        usedMargin: 0,
        freeMargin: prev.balance,
        floatingPnl: 0,
      }));
      return;
    }

    let totalPnL = 0;
    let totalMargin = 0;
    const closedTriggers: string[] = [];

    const updatedPositions = positions.map((p) => {
      const activeData = pairsMap[p.sym];
      if (!activeData) return p;

      const currentCandle = activeData.sparkline[activeData.sparkline.length - 1];
      const curPrice = currentCandle.c;

      // Contract lots scale calculations
      let multiplier = 100000;
      if (p.sym.includes('JPY')) multiplier = 1000;
      else if (p.sym.includes('Gold') || p.sym.includes('XAU')) multiplier = 100;
      else if (p.sym.includes('BTC') || p.sym.includes('Bitcoin')) multiplier = 1;

      // Unpack trade type delta
      const delta = p.type === 'BUY' ? (curPrice - p.entryPrice) : (p.entryPrice - curPrice);
      const singlePnL = delta * multiplier * p.lots;

      totalPnL += singlePnL;
      totalMargin += p.margin;

      // Check Stop Loss / Take profit triggers limits
      if (p.sl !== undefined) {
        if (p.type === 'BUY' && curPrice <= p.sl) {
          closedTriggers.push(p.id);
        } else if (p.type === 'SELL' && curPrice >= p.sl) {
          closedTriggers.push(p.id);
        }
      }

      if (p.tp !== undefined) {
        if (p.type === 'BUY' && curPrice >= p.tp) {
          closedTriggers.push(p.id);
        } else if (p.type === 'SELL' && curPrice <= p.tp) {
          closedTriggers.push(p.id);
        }
      }

      return p;
    });

    if (closedTriggers.length > 0) {
      // Execute auto stop-outs
      closedTriggers.forEach((triggeredId) => {
        closePosition(triggeredId, 'TP/SL Triggered');
      });
    } else {
      setAccount((prev) => {
        const nextEquity = prev.balance + totalPnL;
        return {
          ...prev,
          equity: nextEquity,
          usedMargin: totalMargin,
          freeMargin: Math.max(0, nextEquity - totalMargin),
          floatingPnl: totalPnL,
        };
      });
    }
  }, [pairsMap, positions]);

  // Handle opening new simulated demo trade order
  const handleOpenPosition = (
    type: 'BUY' | 'SELL',
    lots: number,
    leverageValue: number,
    slPrice?: number,
    tpPrice?: number
  ) => {
    // Locate target pair details based on main Panel 1 selected asset
    const assetCfg = pairsMap[panel1SelectedSym];
    if (!assetCfg) return;

    const currentQuote = assetCfg.sparkline[assetCfg.sparkline.length - 1].c;

    // Margin = (Price * Contract Size * Lots) / Leverage
    let rawContract = 100000;
    if (panel1SelectedSym.includes('JPY')) rawContract = 100000; // standard base units
    else if (panel1SelectedSym.includes('Gold') || panel1SelectedSym.includes('XAU')) rawContract = 100;
    else if (panel1SelectedSym.includes('BTC')) rawContract = 1;

    const calculatedMargin = (currentQuote * rawContract * lots) / leverageValue;

    if (calculatedMargin > account.freeMargin) {
      flashNotification('⚠️ ট্রেড খুলতে পর্যাপ্ত ফ্রি মার্জিন (Free Margin) নেই!');
      return;
    }

    const newPosition: Position = {
      id: `pos-${Date.now()}`,
      sym: panel1SelectedSym,
      type,
      lots,
      entryPrice: currentQuote,
      leverage: leverageValue,
      sl: slPrice,
      tp: tpPrice,
      margin: calculatedMargin,
      time: Date.now(),
    };

    setPositions((prev) => [...prev, newPosition]);
    flashNotification(`📈 ${type} ${lots} Lots ${panel1SelectedSym} ট্রেড সফলভাবে ওপেন হয়েছে!`);
  };

  // Close simulated trade and settle returns
  const closePosition = (id: string, customReason?: string) => {
    setPositions((prevPositions) => {
      const targetPos = prevPositions.find((p) => p.id === id);
      if (!targetPos) return prevPositions;

      const activeData = pairsMap[targetPos.sym];
      if (!activeData) return prevPositions.filter((p) => p.id !== id);

      const quote = activeData.sparkline[activeData.sparkline.length - 1].c;

      let multiplier = 100000;
      if (targetPos.sym.includes('JPY')) multiplier = 1000;
      else if (targetPos.sym.includes('Gold') || targetPos.sym.includes('XAU')) multiplier = 100;
      else if (targetPos.sym.includes('BTC')) multiplier = 1;

      const diff = targetPos.type === 'BUY' ? (quote - targetPos.entryPrice) : (targetPos.entryPrice - quote);
      const settlePnL = diff * multiplier * targetPos.lots;

      // Settle balances values
      setAccount((prevAcc) => {
        const nextBalance = prevAcc.balance + settlePnL;
        return {
          ...prevAcc,
          balance: nextBalance,
          equity: nextBalance,
          floatingPnl: prevAcc.floatingPnl - settlePnL,
        };
      });

      // Save records history
      const newHistoryItem: TradeHistory = {
        id: `hist-${Date.now()}`,
        sym: targetPos.sym,
        type: targetPos.type,
        lots: targetPos.lots,
        entryPrice: targetPos.entryPrice,
        exitPrice: quote,
        pnl: settlePnL,
        exitTime: Date.now(),
        status: customReason ? 'TP' : 'MANUAL',
      };

      setHistory((prevHist) => [newHistoryItem, ...prevHist]);
      flashNotification(`Closed ${targetPos.sym} PnL: $${settlePnL.toFixed(2)} [${customReason || 'Manual'}]`);

      return prevPositions.filter((p) => p.id !== id);
    });
  };

  const handleResetHistory = () => {
    setHistory([]);
    setAccount({
      balance: 10000.0,
      equity: 10000.0,
      usedMargin: 0,
      freeMargin: 10000.0,
      floatingPnl: 0,
    });
    setPositions([]);
  };

  const flashNotification = (txt: string) => {
    setAlertNotify(txt);
    setTimeout(() => {
      setAlertNotify((prev) => (prev === txt ? '' : prev));
    }, 4500);
  };

  // Helper shortcuts to trigger asset switches secure matching active grids
  const onSelectPairFromWatchlist = (symKey: string) => {
    setPanel1SelectedSym(symKey);
  };

  const activePair = pairsMap[panel1SelectedSym] || pairsList[0];
  const lastCandle = activePair && activePair.sparkline && activePair.sparkline.length > 0 
    ? activePair.sparkline[activePair.sparkline.length - 1] 
    : null;
  const curPrice = lastCandle ? lastCandle.c : (activePair?.base || 0);
  const isUp = lastCandle ? lastCandle.c >= activePair.base : true;
  const diffVal = lastCandle ? lastCandle.c - activePair.base : 0;
  const pctVal = lastCandle ? (diffVal / activePair.base) * 100 : 0;

  const displaySymbolPart1 = activePair ? (activePair.label.split('/')[0] || '') : '';
  const displaySymbolPart2 = activePair ? ((activePair.label.split('/')[1] || '').split(' ')[0] || '') : '';

  return (
    <div className="h-screen w-screen bg-[#020203] text-[#F0F0F0] flex flex-col font-sans select-none antialiased p-2 md:p-3 pb-3 overflow-hidden">
      {/* Smart Screen Glass Frame / Precision Bezel Chasis */}
      <div className="flex-1 flex flex-col bg-[#07090e] rounded-xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.92)] relative min-h-0">
        
        {/* 1. COMPACT COCKPIT NAV HEADER */}
        <header className="bg-[#090b11] border-b border-white/10 px-5 py-3 flex flex-row items-center justify-between shrink-0 select-none gap-4">
          <div className="flex items-center space-x-6">
            {/* Visual Brand logo tag */}
            <div className="flex items-center space-x-2 border-r border-white/10 pr-6 shrink-0">
              <div className="w-5.5 h-5.5 rounded bg-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                <span className="text-[10px] font-black text-white">TB</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-[0.25em] text-[#d085ff] font-sans font-black">TRADING BANGLA</span>
                <span className="text-[7.5px] font-mono tracking-wider -mt-0.5 flex items-center gap-1">
                  {isAnyLive
                    ? <><span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] shadow-[0_0_6px_#00FF41] animate-pulse inline-block" /><span className="text-[#00FF41]">LIVE</span></>
                    : <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /><span className="text-amber-400/70">SIM</span></>
                  }
                </span>
              </div>
            </div>

            {/* Asset identity */}
            <div className="flex flex-col shrink-0">
              <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold font-sans">ACTIVE ASSET</span>
              <h1 className="text-lg md:text-2xl font-black tracking-tighter leading-none text-white select-all">
                {displaySymbolPart1}<span className="text-white/20">/</span>{displaySymbolPart2}
              </h1>
            </div>
            
            {/* Elegant high-precision live updates badge */}
            <div className="flex items-center space-x-3 bg-black/45 border border-white/5 py-1 px-3 rounded shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full ${isUp ? 'bg-[#00FF41] shadow-[0_0_8px_#00FF41]' : 'bg-[#FF3131] shadow-[0_0_8px_#FF3131]'}`} />
              <span className={`text-base md:text-lg font-mono font-black tracking-tight ${isUp ? 'text-[#00FF41]' : 'text-[#FF3131]'}`}>
                {curPrice.toFixed(activePair?.dec || 5)}
              </span>
              <span className={`text-[10px] font-mono font-bold ${isUp ? 'text-[#00FF41]' : 'text-[#FF3131]'}`}>
                {isUp ? '▲' : '▼'} {pctVal.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Integrated live account indices */}
          <div className="hidden lg:flex items-center space-x-6">
            <div className="flex flex-col text-right">
              <span className="text-[8.5px] uppercase tracking-wider text-white/40 font-bold font-sans">BALANCE (ব্যালেন্স)</span>
              <span className="text-xs md:text-sm font-mono font-black text-white">${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[8.5px] uppercase tracking-wider text-white/40 font-bold font-sans">EQUITY (ইকুইটি)</span>
              <span className="text-xs md:text-sm font-mono font-black text-[#d085ff]">${account.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[8.5px] uppercase tracking-wider text-white/40 font-bold font-sans">FLOATING PNL</span>
              <span className={`text-xs md:text-sm font-mono font-black ${account.floatingPnl >= 0 ? 'text-[#00FF41]' : 'text-[#FF3131]'}`}>
                {account.floatingPnl >= 0 ? '+' : ''}${account.floatingPnl.toFixed(2)}
              </span>
            </div>

            {history.length > 0 && (
              <div className="flex flex-col text-right border-l border-white/10 pl-6">
                <span className="text-[8.5px] uppercase tracking-wider text-white/40 font-bold font-sans">WIN RATE</span>
                <span className={`text-xs md:text-sm font-mono font-black ${Math.round((history.filter(h => h.pnl > 0).length / history.length) * 100) >= 50 ? 'text-[#00FF41]' : 'text-[#FF3131]'}`}>
                  {Math.round((history.filter(h => h.pnl > 0).length / history.length) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Settings & Layout panel controls */}
          <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
            {/* MULTITASKING WORKSPACE SECTION CONTROL BUTTONS */}
            <div className="flex items-center space-x-1 border border-white/10 p-1 bg-black/55 rounded-lg">
              <span className="text-[7.5px] text-white/50 font-sans tracking-[0.2em] font-black uppercase px-2 hidden xl:inline border-r border-white/5 mr-1">
                MULTITASK:
              </span>

              {/* 1. Watchlist Toggle */}
              <button
                onClick={() => setShowWatchlist(!showWatchlist)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition ${
                  showWatchlist
                    ? 'bg-purple-950/60 text-[#d085ff] border border-purple-800/40 shadow shadow-purple-950/60 font-black'
                    : 'text-gray-500 border border-transparent hover:text-white hover:bg-white/5'
                }`}
                title="ওয়াচলিস্ট দেখান/লুকান (Toggle Watchlist Panel)"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${showWatchlist ? 'bg-purple-500 shadow-[0_0_6px_#c084fc]' : 'bg-gray-600'}`} />
                <List className="w-3.5 h-3.5" />
                <span className="text-[9px] font-sans font-bold uppercase tracking-tight hidden sm:inline">ওয়াচলিস্ট</span>
              </button>

              {/* 2. Chart Section Toggle */}
              <button
                onClick={() => setShowChart(!showChart)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition ${
                  showChart
                    ? 'bg-cyan-950/60 text-[#00d4ff] border border-cyan-800/40 shadow shadow-cyan-950/60 font-black'
                    : 'text-gray-500 border border-transparent hover:text-white hover:bg-white/5'
                }`}
                title="প্রধান চার্ট সেকশন দেখান/লুকান (Toggle Main Chart Panel)"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${showChart ? 'bg-[#00d4ff] shadow-[0_0_6px_#00d4ff]' : 'bg-gray-600'}`} />
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[9px] font-sans font-bold uppercase tracking-tight hidden sm:inline">চার্ট</span>
              </button>

              {/* 3. Bottom Analysis Section Toggle */}
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition ${
                  showAnalysis
                    ? 'bg-emerald-950/60 text-[#00e676] border border-emerald-800/40 shadow shadow-emerald-950/60 font-black'
                    : 'text-gray-500 border border-transparent hover:text-white hover:bg-white/5'
                }`}
                title="এআই ও নিউজ প্যানেল দেখান/লুকান (Toggle Bottom AI/News Board)"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${showAnalysis ? 'bg-[#00e676] shadow-[0_0_6px_#00e676]' : 'bg-gray-600'}`} />
                <Cpu className="w-3.5 h-3.5" />
                <span className="text-[9px] font-sans font-bold uppercase tracking-tight hidden sm:inline">এআই-প্যানেল</span>
              </button>

              {/* 4. Trade Panel Toggle */}
              <button
                onClick={() => setShowTradePanel(!showTradePanel)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded transition ${
                  showTradePanel
                    ? 'bg-amber-950/60 text-[#ffc107] border border-amber-800/40 shadow shadow-amber-950/60 font-black'
                    : 'text-gray-500 border border-transparent hover:text-white hover:bg-white/5'
                }`}
                title="ডানপাশের সিমুলেশন প্যানেল দেখান/লুকান (Toggle Simulation Panel)"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${showTradePanel ? 'bg-[#ffc107] shadow-[0_0_6px_#ffc107]' : 'bg-gray-600'}`} />
                <Coins className="w-3.5 h-3.5" />
                <span className="text-[9px] font-sans font-bold uppercase tracking-tight hidden sm:inline">ট্রেড-প্যানেল</span>
              </button>
            </div>

            <div className="flex items-center space-x-0.5 border border-white/10 p-0.5 bg-black/45 rounded">
              {(['1-chart', '2-charts', '4-charts'] as const).map((lay) => (
                <button
                  key={lay}
                  onClick={() => setActiveLayout(lay)}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all duration-150 ${
                    activeLayout === lay
                      ? 'bg-purple-600 border border-purple-400/20 text-white shadow-md font-extrabold scale-[1.02]'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {lay === '1-chart' ? '1 Chart' : lay === '2-charts' ? '2 Split' : '4 Grid'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Absolute Floating alert updates */}
        {alertNotify && (
          <div className="absolute top-[65px] left-1/2 transform -translate-x-1/2 z-50 bg-[#090b11]/95 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)] rounded px-4 py-2.5 max-w-[420px] flex items-center gap-3 animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-[#d085ff] animate-pulse shrink-0" />
            <span className="text-[10px] font-sans font-black tracking-wider text-white uppercase">{alertNotify}</span>
          </div>
        )}

        {/* 2. BODY IMMERSIVE CONTENT GRID */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-[#090b11]">
          
          {/* Watchlist Collapsed Sidebar strip trigger */}
          {!showWatchlist && (
            <div className="w-11 bg-[#050505] border-r border-white/10 hidden md:flex flex-col items-center py-4 space-y-4 shrink-0 transition-all duration-300">
              <button
                onClick={() => setShowWatchlist(true)}
                className="p-1.5 bg-purple-950/50 text-[#d085ff] border border-purple-800/40 rounded hover:bg-purple-950 hover:text-white transition-all transform active:scale-95"
                title="ওয়াচলিস্ট মেলুন (Expand Watchlist Panel)"
              >
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
              <div 
                className="text-white/40 text-[9px] font-black uppercase tracking-[0.25em] font-sans whitespace-nowrap select-none hover:text-[#d085ff] cursor-pointer transition-colors"
                style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
                onClick={() => setShowWatchlist(true)}
              >
                ওয়াচলিস্ট (Watchlist) ➕
              </div>
            </div>
          )}

          {/* LEFT COMPONENT: Watchlist Currencies (Collapsible multitasking element) */}
          <aside 
            className={`transition-all duration-300 ease-in-out border-r border-white/10 bg-[#07090e]/95 flex flex-col shrink-0 select-none overflow-hidden hidden md:flex opacity-100 ${
              !showWatchlist ? 'w-0 border-r-0 opacity-0 pointer-events-none' : ''
            }`}
            style={{ width: showWatchlist ? `${watchlistWidth}px` : '0px' }}
          >
            <WatchList
              pairs={pairsList}
              selectedSym={panel1SelectedSym}
              onSelectPair={onSelectPairFromWatchlist}
              onClose={() => setShowWatchlist(false)}
              currentWidth={watchlistWidth}
              onWidthChange={setWatchlistWidth}
            />
          </aside>

          {/* CENTER COMPONENT: Chart grids with different bento splittings */}
          <main className="flex-1 flex flex-col bg-[#07090e] overflow-hidden min-h-0">
            
            {/* Responsive multitasking chart wrapper */}
            {showChart ? (
              <>
                {/* Layout split screens */}
                {activeLayout === '1-chart' && (
                  <div className="flex-1 flex flex-col min-h-0 relative">
                    <ChartingTool
                      pair={pairsMap[panel1SelectedSym]}
                      candles={pairsMap[panel1SelectedSym]?.sparkline || []}
                      timeframe={panel1TF}
                      onTimeframeChange={setPanel1TF}
                      drawings={panel1Drawings}
                      setDrawings={setPanel1Drawings}
                      showSMC={showPanel1SMC}
                      onClose={() => setShowChart(false)}
                    />
                  </div>
                )}

                {activeLayout === '2-charts' && (
                  <div className="flex-1 flex flex-col divide-y divide-[#1e273d] min-h-0">
                    {/* Chart top half */}
                    <div className="flex-1 flex flex-col relative min-h-0">
                      <div className="absolute top-1 right-24 z-10 flex items-center space-x-1 bg-[#0a0d14]/80 p-0.5 rounded border border-gray-800/30">
                        <select
                          value={panel1SelectedSym}
                          onChange={(e) => setPanel1SelectedSym(e.target.value)}
                          className="bg-transparent text-[10px] text-[#05d5ff] font-extrabold focus:outline-none focus:ring-0 border-none p-1 shrink-0"
                        >
                          {pairsList.map((item) => <option key={item.sym} value={item.sym}>{item.label}</option>)}
                        </select>
                        <button
                          onClick={() => setShowPanel1SMC(!showPanel1SMC)}
                          className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold transition ${showPanel1SMC ? 'bg-[#a855f7]' : 'bg-gray-800'}`}
                        >
                          SMC OB
                        </button>
                      </div>
                      <ChartingTool
                        pair={pairsMap[panel1SelectedSym]}
                        candles={pairsMap[panel1SelectedSym]?.sparkline || []}
                        timeframe={panel1TF}
                        onTimeframeChange={setPanel1TF}
                        drawings={panel1Drawings}
                        setDrawings={setPanel1Drawings}
                        showSMC={showPanel1SMC}
                        onClose={() => setShowChart(false)}
                      />
                    </div>

                    {/* Chart bottom half */}
                    <div className="flex-1 flex flex-col relative min-h-0">
                      <div className="absolute top-1 right-24 z-10 flex items-center space-x-1 bg-[#0a0d14]/80 p-0.5 rounded border border-gray-800/30">
                        <select
                          value={panel2SelectedSym}
                          onChange={(e) => setPanel2SelectedSym(e.target.value)}
                          className="bg-transparent text-[10px] text-[#05d5ff] font-extrabold focus:outline-none focus:ring-0 border-none p-1 shrink-0"
                        >
                          {pairsList.map((item) => <option key={item.sym} value={item.sym}>{item.label}</option>)}
                        </select>
                        <button
                          onClick={() => setShowPanel2SMC(!showPanel2SMC)}
                          className={`text-[9px] px-1.5 py-0.5 rounded text-white font-bold transition ${showPanel2SMC ? 'bg-[#a855f7]' : 'bg-gray-800'}`}
                        >
                          SMC OB
                        </button>
                      </div>
                      <ChartingTool
                        pair={pairsMap[panel2SelectedSym]}
                        candles={pairsMap[panel2SelectedSym]?.sparkline || []}
                        timeframe={panel2TF}
                        onTimeframeChange={setPanel2TF}
                        drawings={panel2Drawings}
                        setDrawings={setPanel2Drawings}
                        showSMC={showPanel2SMC}
                        onClose={() => setShowChart(false)}
                      />
                    </div>
                  </div>
                )}

                {activeLayout === '4-charts' && (
                  <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 bg-[#12151e] p-1 h-full min-h-0 overflow-hidden">
                    {/* grid cell 1 */}
                    <div className="flex flex-col relative bg-[#070b12] rounded overflow-hidden border border-gray-800/20 min-h-0">
                      <div className="absolute top-1 right-12 z-20 flex bg-[#0a0d14]/80 items-center p-0.5 rounded text-[9.5px]">
                        <select value={panel1SelectedSym} onChange={(e) => setPanel1SelectedSym(e.target.value)} className="bg-transparent text-[#05d5ff] font-bold border-none py-0.5 focus:ring-0 focus:outline-none">
                          {pairsList.map((item) => <option key={item.sym} value={item.sym}>{item.label}</option>)}
                        </select>
                      </div>
                      <ChartingTool
                        pair={pairsMap[panel1SelectedSym]}
                        candles={pairsMap[panel1SelectedSym]?.sparkline || []}
                        timeframe={panel1TF}
                        onTimeframeChange={setPanel1TF}
                        drawings={panel1Drawings}
                        setDrawings={setPanel1Drawings}
                        showSMC={showPanel1SMC}
                        onClose={() => setShowChart(false)}
                      />
                    </div>

                    {/* grid cell 2 */}
                    <div className="flex flex-col relative bg-[#070b12] rounded overflow-hidden border border-gray-800/20 min-h-0">
                      <div className="absolute top-1 right-12 z-20 flex bg-[#0a0d14]/80 items-center p-0.5 rounded text-[9.5px]">
                        <select value={panel2SelectedSym} onChange={(e) => setPanel2SelectedSym(e.target.value)} className="bg-transparent text-[#05d5ff] font-bold border-none py-0.5 focus:ring-0 focus:outline-none">
                          {pairsList.map((item) => <option key={item.sym} value={item.sym}>{item.label}</option>)}
                        </select>
                      </div>
                      <ChartingTool
                        pair={pairsMap[panel2SelectedSym]}
                        candles={pairsMap[panel2SelectedSym]?.sparkline || []}
                        timeframe={panel2TF}
                        onTimeframeChange={setPanel2TF}
                        drawings={panel2Drawings}
                        setDrawings={setPanel2Drawings}
                        showSMC={showPanel2SMC}
                        onClose={() => setShowChart(false)}
                      />
                    </div>

                    {/* grid cell 3 */}
                    <div className="flex flex-col relative bg-[#070b12] rounded overflow-hidden border border-gray-800/20 min-h-0">
                      <div className="absolute top-1 right-12 z-20 flex bg-[#0a0d14]/80 items-center p-0.5 rounded text-[9.5px]">
                        <select value={panel3SelectedSym} onChange={(e) => setPanel3SelectedSym(e.target.value)} className="bg-transparent text-[#05d5ff] font-bold border-none py-0.5 focus:ring-0 focus:outline-none">
                          {pairsList.map((item) => <option key={item.sym} value={item.sym}>{item.label}</option>)}
                        </select>
                      </div>
                      <ChartingTool
                        pair={pairsMap[panel3SelectedSym]}
                        candles={pairsMap[panel3SelectedSym]?.sparkline || []}
                        timeframe={panel3TF}
                        onTimeframeChange={setPanel3TF}
                        drawings={panel3Drawings}
                        setDrawings={setPanel3Drawings}
                        showSMC={showPanel3SMC}
                        onClose={() => setShowChart(false)}
                      />
                    </div>

                    {/* grid cell 4 */}
                    <div className="flex flex-col relative bg-[#070b12] rounded overflow-hidden border border-gray-800/20 min-h-0">
                      <div className="absolute top-1 right-12 z-20 flex bg-[#0a0d14]/80 items-center p-0.5 rounded text-[9.5px]">
                        <select value={panel4SelectedSym} onChange={(e) => setPanel4SelectedSym(e.target.value)} className="bg-transparent text-[#05d5ff] font-bold border-none py-0.5 focus:ring-0 focus:outline-none">
                          {pairsList.map((item) => <option key={item.sym} value={item.sym}>{item.label}</option>)}
                        </select>
                      </div>
                      <ChartingTool
                        pair={pairsMap[panel4SelectedSym]}
                        candles={pairsMap[panel4SelectedSym]?.sparkline || []}
                        timeframe={panel4TF}
                        onTimeframeChange={setPanel4TF}
                        drawings={panel4Drawings}
                        setDrawings={setPanel4Drawings}
                        showSMC={showPanel4SMC}
                        onClose={() => setShowChart(false)}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#06080d] select-none relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,transparent_60%)]" />
                <div className="z-10 max-w-sm bg-black/55 border border-cyan-500/15 p-6 rounded-xl shadow-2xl backdrop-blur-md">
                  <div className="w-11 h-11 rounded-full bg-cyan-950/50 border border-cyan-500/35 flex items-center justify-center mx-auto mb-3.5 text-[#00d4ff]">
                    <LayoutGrid className="w-5.5 h-5.5" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1.5">প্রধান চার্ট মিনিমাইজড</h3>
                  <p className="text-[10px] text-gray-400 font-sans tracking-wide leading-relaxed mb-4">
                    মাল্টিটাস্কিংয়ের জন্য আপনি চার্টটি সাময়িকভাবে বন্ধ করেছেন। এটি এখন আপনার এআই অ্যানালিস্ট ও গ্লোবাল নিউজ ফিডকে বড় স্থান দিচ্ছে।
                  </p>
                  <button
                    onClick={() => setShowChart(true)}
                    className="px-4 py-2 bg-[#00d4ff]/15 hover:bg-[#00d4ff]/25 border border-[#00d4ff]/40 text-[#00d4ff] font-sans text-[10px] font-black uppercase tracking-wider rounded transition-transform active:scale-95"
                  >
                    চার্ট পুনঃস্থাপন করুন (Restore Chart)
                  </button>
                </div>
              </div>
            )}

            {/* Analysis Collapsed Bottom Bar trigger */}
            {!showAnalysis && (
              <div className="h-9 bg-[#050505] border-t border-white/10 flex items-center justify-between px-4 shrink-0 transition-all duration-300 select-none">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00e676] font-sans">
                    এআই মার্কেট পূর্বাভাস ও নিউজ ফিড
                  </span>
                  <span className="text-[9px] text-white/30 font-sans tracking-tight">
                    (মিনিমাইজড)
                  </span>
                </div>
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="flex items-center space-x-1 px-3 py-1 bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-800/40 text-[#00e676] rounded text-[9.5px] font-black uppercase tracking-wider transition-all transform active:scale-95"
                  title="এআই ও নিউজ প্যানেল মেলুন (Expand AI forecasts)"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span>মেলুন ➕</span>
                </button>
              </div>
            )}

            {/* LOWER ANALYSIS BAR: AI Intelligent assistant and calendar feed (Collapsible) */}
            <section 
              className={`transition-all duration-300 ease-in-out border-t border-white/10 bg-[#07090e]/95 flex flex-col shrink-0 overflow-hidden select-none opacity-100 ${
                !showAnalysis ? 'h-0 border-t-0 opacity-0 pointer-events-none' : ''
              }`}
              style={{ height: showAnalysis ? `${analysisHeight}px` : '0px' }}
            >
              {/* selection headers */}
              <div className="h-10 bg-black/40 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setHelperTab('ai')}
                    className={`px-4 h-10 text-[10.5px] font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
                      helperTab === 'ai'
                        ? 'border-[#00FF41] text-[#00FF41] bg-white/5'
                        : 'border-transparent text-white/40 hover:text-white'
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" /> এআই মার্কেট ফোরকাস্ট অ্যানালিস্ট
                  </button>
                  <button
                    onClick={() => setHelperTab('news')}
                    className={`px-4 h-10 text-[10.5px] font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
                      helperTab === 'news'
                        ? 'border-[#00FF41] text-[#00FF41] bg-white/5'
                        : 'border-transparent text-white/40 hover:text-white'
                    }`}
                  >
                    <Newspaper className="w-3.5 h-3.5" /> গ্লোবাল নিউজ ফিউশন
                  </button>
                </div>

                {/* Small details with minimize button */}
                <div className="flex items-center gap-2.5 text-[10px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#00FF41]" />
                    <span>ফলাফল টাইমফ্রেম: {panel1TF}</span>
                  </div>

                  {/* BOTTOM PANEL HEIGHT RESIZER */}
                  <div className="flex items-center space-x-0.5 bg-black/40 border border-white/10 rounded overflow-hidden">
                    <button
                      onClick={() => setAnalysisHeight(Math.max(120, analysisHeight - 30))}
                      className="w-5 h-5 flex items-center justify-center text-[10px] text-[#00FF41] hover:text-white hover:bg-white/5 font-bold transition-colors animate-pulse"
                      title="উচ্চতা ছোট করুন (Decrease height)"
                    >
                      ➖
                    </button>
                    <span className="text-[8.5px] text-white/45 font-mono px-1">
                      {analysisHeight}px
                    </span>
                    <button
                      onClick={() => setAnalysisHeight(Math.min(550, analysisHeight + 30))}
                      className="w-5 h-5 flex items-center justify-center text-[10px] text-[#00FF41] hover:text-white hover:bg-white/5 font-bold transition-colors animate-pulse"
                      title="উচ্চতা বড় করুন (Increase height)"
                    >
                      ➕
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAnalysis(false)}
                    className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition"
                    title="মিনিমাইজ করুন (Minimize AI Panel)"
                  >
                    <ChevronDown className="w-4 h-4 text-[#00FF41]" />
                  </button>
                </div>
              </div>

              {/* active tab component container */}
              <div className="flex-1 overflow-hidden">
                {helperTab === 'ai' ? (
                  <AiAnalyst
                    pair={pairsMap[panel1SelectedSym]}
                    candles={pairsMap[panel1SelectedSym]?.sparkline || []}
                    timeframe={panel1TF}
                  />
                ) : (
                  <NewsFeed />
                )}
              </div>
            </section>
          </main>

          {/* RIGHT COMPONENT: Trading transaction controls panel (Collapsible) */}
          <aside 
            className={`transition-all duration-300 ease-in-out border-l border-white/10 bg-[#07090e]/95 flex flex-col shrink-0 select-none overflow-hidden opacity-100 ${
              !showTradePanel ? 'w-0 border-l-0 opacity-0 pointer-events-none' : ''
            }`}
            style={{ width: showTradePanel ? `${tradePanelWidth}px` : '0px' }}
          >
            <TradePanel
              pair={pairsMap[panel1SelectedSym]}
              currentPrice={pairsMap[panel1SelectedSym]?.sparkline[pairsMap[panel1SelectedSym].sparkline.length - 1]?.c || 0}
              positions={positions}
              history={history}
              account={account}
              onOpenPosition={handleOpenPosition}
              onClosePosition={closePosition}
              onResetAccount={handleResetHistory}
              onClose={() => setShowTradePanel(false)}
              currentWidth={tradePanelWidth}
              onWidthChange={setTradePanelWidth}
            />
          </aside>

          {/* Trade Simulator collapsed sidebar strip trigger */}
          {!showTradePanel && (
            <div className="w-11 bg-[#050505] border-l border-white/10 flex flex-col items-center py-4 space-y-4 shrink-0 transition-all duration-300">
              <button
                onClick={() => setShowTradePanel(true)}
                className="p-1.5 bg-amber-950/50 text-[#ffc107] border border-amber-800/40 rounded hover:bg-amber-950 hover:text-white transition-all transform active:scale-95"
                title="ট্রেড প্যানেল মেলুন (Expand Trade Panel)"
              >
                <ChevronLeft className="w-4 h-4 animate-pulse" />
              </button>
              <div 
                className="text-white/40 text-[9px] font-black uppercase tracking-[0.25em] font-sans whitespace-nowrap select-none hover:text-[#ffc107] cursor-pointer transition-colors"
                style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
                onClick={() => setShowTradePanel(true)}
              >
                সিমুলেশন (Trade Sandbox) ➕
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
