# Trading Bangla — Complete Project Memory
**Owner:** Masud Bhai (khondokartowsif171@gmail.com)
**Built by:** Aura Agentic AI (Claude)
**Last updated:** 2026-05-22 — v10 deployed
**Production URL:** https://crm.tradingbangla.com
**VPS:** 195.35.7.154
**GitHub repo:** Trading-Bangla (main branch)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 7 + Tailwind v4 + TypeScript |
| Auth / DB | Supabase (auth = user counting only, no payment) |
| Deployment | Vercel (production alias: crm.tradingbangla.com) |
| Sub-projects | React 19 + Vite 6 + Tailwind v4 (embedded as iframes) |
| Animations | Framer Motion |
| Charts | Chart.js + react-chartjs-2, Canvas API (ProChart) |

---

## Project Root
```
D:/Trading Bangla/
├── src/
│   ├── pages/          ← all route pages
│   ├── components/     ← shared UI components
│   ├── services/       ← signal engines, API layers
│   ├── hooks/          ← useForexData, useSignalBot, etc.
│   ├── context/        ← AppContext, AuthContext
│   ├── data/           ← eaData.ts, static datasets
│   └── lib/            ← supabase.ts client
├── public/
│   ├── chart-view/     ← built output of sub-project 1 (iframe)
│   ├── mt5-signals/    ← built output of sub-project 2 (iframe)
│   ├── mt5-terminal/   ← static HTML terminal placeholder
│   └── ea-dashboard/   ← EA dashboard static assets
├── trading-bangla chart view/   ← sub-project 1 source
├── tradingbangla-mt5-signals/   ← sub-project 2 source
└── vercel.json
```

---

## Routes (App.tsx)

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Home | CRM subdomain → redirects to `/crm` |
| `/dashboard` | Dashboard | Main user dashboard |
| `/trade` | → redirect | Goes to `/ea-dashboard` |
| `/portfolio` | PortfolioPage | Paper trading portfolio |
| `/ea-analytics` | EAAnalytics | Signal scanner (login to unlock iframe) |
| `/ea-dashboard` | EaDashboard | EA live bot dashboard (requires login) |
| `/profile` | UserProfile | Supabase auth profile |
| `/forex` | ForexMT5 | **Full-screen iframe** → `/chart-view/index.html` |
| `/crytox` | AuraCrytox | Crypto dashboard |
| `/tb-admin-2026` | AdminDashboard | Admin only (blog editor + user stats) |
| `/crm` | CrmDashboard | CRM subdomain entry point |
| `/blog` | BlogPage | Blog list |
| `/blog/:slug` | BlogPost | Blog post detail |

### isTrade flag (hides LivePriceTicker)
```tsx
const isTrade = location.pathname === '/trade'
  || location.pathname === '/ea-dashboard'
  || location.pathname === '/forex'   // ← added v10
  || isCrm;
```

---

## Sub-Project 1: Chart View → `/forex`

**Source:** `D:/Trading Bangla/trading-bangla chart view/`
**Build output → copy to:** `D:/Trading Bangla/public/chart-view/`
**vite.config.ts must have:** `base: '/chart-view/'`

### Features
- WatchList (XAUUSD, EURUSD, GBPUSD, USDJPY, AUDUSD, BTCUSD)
- Canvas charts — 1 / 2 / 4 grid layouts
- SMC overlays (Order Blocks, FVG, BOS)
- AI Analyst panel → **"Aura AI মার্কেট অ্যানালিস্ট"** (Google GenAI, degrades on Vercel)
- News Feed
- Trade Simulation panel

### Live Price Feeds (App.tsx of sub-project)
```tsx
// 1. Gold-API.com — XAUUSD ONLY, every 10s
fetch('https://data-asg.goldprice.org/dbXRates/USD')
// → liveRef.current['XAUUSD'] = price

// 2. Binance WebSocket — BTCUSD ONLY
wss://stream.binance.com:9443/stream?streams=btcusdt@ticker
// → liveRef.current['BTCUSD'] = price

// 3. Twelve Data WebSocket — Forex pairs (NOT XAU, NOT BTC)
wss://ws.twelvedata.com/v1/quotes/price?apikey=dd5f8e4e70e0445e96119e5182040118
// symbols: EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD
// → liveRef.current[sym] = price  (sym = 'EURUSD', 'GBPUSD' etc)
```

**CRITICAL RULE — NEVER BREAK:**
> Binance WebSocket must NEVER touch XAUUSD. Gold uses gold-api.com EXCLUSIVELY.
> Twelve Data is for forex only — never subscribe XAU or BTC.

### Tick Engine pattern (useRef avoids re-render storms)
```tsx
const liveRef = useRef<Record<string, number>>({});
// In 500ms tick: if liveRef.current[sym] exists → use live + tiny noise
//               else → random walk simulation
```

### Base prices (forexPairs.ts)
- XAUUSD: 3350.00
- BTCUSD: 95000.00
- EURUSD: 1.0875 etc.

---

## Sub-Project 2: MT5 Signals → `/ea-analytics`

**Source:** `D:/Trading Bangla/tradingbangla-mt5-signals/`
**Build output → copy to:** `D:/Trading Bangla/public/mt5-signals/`
**vite.config.ts must have:** `base: '/mt5-signals/'`

### Features
- Live Signal Scanner (browser simulation, no server needed)
- Timeframe filter: M5 / M15 / H1 / H4
- Market Sessions: Tokyo / London / New York
- Signal table with pips counter
- Header branding: **"Trading Bangla Aura AI"** / **"World-Class XAU/USD & Forex Signals"**

### XAUUSD Signal Engine (useSignals.ts)
```ts
// World-class gold signal generator
function generateXauSignal(goldPrice: number): TradeSignal {
  const tf = Math.random() > 0.4
    ? (Math.random() > 0.5 ? 'H1' : 'H4')  // prefer H1/H4
    : 'M15';
  const atr = 20 + Math.random() * 15;       // $20–35 ATR range
  const rrRatio = 2.5 + Math.random() * 0.8; // 2.5–3.3 R:R
  const slDist = atr * (0.45 + Math.random() * 0.15);
  const tpDist = slDist * rrRatio;
  // entry/SL/TP calculated from live goldPrice
}

// Gold-API.com updates XAUUSD every 10s in active signals
// goldPriceRef used in tick simulation for XAUUSD
```

### Pip Multiplier (CRITICAL — never use 10000 for gold)
```ts
function getPipMultiplier(symbol: string): number {
  if (symbol === 'XAUUSD') return 10;    // 1 pip = $0.10
  if (symbol.includes('JPY')) return 100; // JPY pairs
  return 10000;                           // standard forex
}
```

---

## How Iframes Load (Vercel Architecture)

### vercel.json — CRITICAL, do not change back to rewrites
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```
- `handle: filesystem` → serves static files first (chart-view/, mt5-signals/)
- SPA catch-all second → React router handles `/forex`, `/ea-analytics` etc.
- **If changed to `rewrites`:** iframes will show blank (static paths get intercepted)

### EAAnalytics.tsx — iframe embed
```tsx
// Top of isLoggedIn section:
<motion.div ...>
  <div className="flex items-center gap-2 mb-2 px-1">
    <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
      Aura AI · Live MT5 Signal Scanner
    </span>
    <span className="ml-auto text-[10px] text-gray-500">
      XAU/USD · EUR/USD · GBP/USD · USD/JPY
    </span>
  </div>
  <div className="rounded-2xl overflow-hidden border border-purple-500/20 shadow-2xl">
    <iframe
      src="/mt5-signals/index.html"
      title="Aura AI MT5 Signals"
      style={{ width: '100%', height: '640px', border: 0, display: 'block' }}
      allow="notifications"
    />
  </div>
</motion.div>
```

### ForexMT5.tsx — full iframe
```tsx
export default function ForexMT5() {
  return (
    <iframe
      src="/chart-view/index.html"
      title="Trading Bangla Chart View"
      style={{ width: '100%', height: 'calc(100vh - 56px)', border: 0, display: 'block' }}
      allow="notifications"
    />
  );
}
```

---

## Build & Deploy Procedure

### When sub-projects change:
```bash
# Step 1 — Build chart-view (vite.config.ts has base: '/chart-view/')
cd "D:/Trading Bangla/trading-bangla chart view"
npm run build
# dist/index.html should have: src="/chart-view/assets/..."

# Step 2 — Build mt5-signals (vite.config.ts has base: '/mt5-signals/')
cd "D:/Trading Bangla/tradingbangla-mt5-signals"
npm run build
# dist/index.html should have: src="/mt5-signals/assets/..."

# Step 3 — Copy to public/
rm -rf "D:/Trading Bangla/public/chart-view"
cp -r "D:/Trading Bangla/trading-bangla chart view/dist/." "D:/Trading Bangla/public/chart-view/"
rm -rf "D:/Trading Bangla/public/mt5-signals"
cp -r "D:/Trading Bangla/tradingbangla-mt5-signals/dist/." "D:/Trading Bangla/public/mt5-signals/"
```

### Main project build + deploy:
```bash
cd "D:/Trading Bangla"
npm run build            # verify no errors
npx vercel --prod --yes  # deploy to production
```

### IMPORTANT — Git Bash path conversion bug:
> Never pass `--base=/chart-view/` as CLI flag in Git Bash.
> Git Bash converts `/chart-view/` → `C:/Program Files/Git/chart-view/` (POSIX→Windows).
> Always set `base` in `vite.config.ts` directly instead.

### GitHub push issue:
```bash
# Fix credential error (run once in terminal):
git config --global credential.helper manager
# Then push normally — or just use npx vercel --prod --yes to bypass git
```

---

## Auth System (Supabase)

- **Purpose:** User count tracking only — NO payment, NO subscription
- Login = free for everyone
- `isLoggedIn` gates:
  - `/ea-analytics`: MT5 Signal Scanner iframe (shows LoginModal when logged out)
  - `/ea-dashboard`: Redirects to `/ea-analytics` when logged out
- `useAuth()` hook → `{ isLoggedIn, loading, user, signIn, signOut }`
- Supabase project: configured in `src/lib/supabase.ts`

---

## APIs Used

| API | For | Rule |
|-----|-----|------|
| gold-api.com (`data-asg.goldprice.org/dbXRates/USD`) | XAUUSD live price | ONLY gold source |
| Binance WebSocket (`stream.binance.com:9443`) | BTCUSD live price | NEVER use for forex/gold |
| Twelve Data WebSocket (`ws.twelvedata.com`) | EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD | key: dd5f8e4e70e0445e96119e5182040118 |
| Google GenAI (Gemini) | AI Analyst in chart-view | Degrades gracefully on Vercel |
| Supabase | Auth + user data + blog | See src/lib/supabase.ts |

---

## Branding Rules

- All AI references → **"Aura AI"** (never "Gemini", "Google AI", "OpenAI" etc.)
- Signal scanner header → **"Trading Bangla Aura AI"**
- AI analyst panel → **"Aura AI মার্কেট অ্যানালিস্ট"**
- Signal tagline → **"World-Class XAU/USD & Forex Signals"**

---

## Admin Panel

- URL: `/tb-admin-2026` (hidden — not in public nav)
- Features: Blog editor (create/edit/delete posts), user stats, signal broadcast
- Auth: Supabase admin role check
- Blog posts stored in Supabase, rendered at `/blog` and `/blog/:slug`

---

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| ProChart | `src/components/ProChart.tsx` | Canvas-based price chart |
| SignalCenter | `src/components/SignalCenter.tsx` | Signal display panel |
| LivePriceTicker | `src/components/LivePriceTicker.tsx` | Top price ribbon (hidden on /forex, /ea-dashboard) |
| AIChat | `src/components/AIChat.tsx` | Floating AI chat widget |
| LoginModal | `src/components/LoginModal.tsx` | Supabase login overlay |
| AgenticSignalPanel | `src/components/AgenticSignalPanel.tsx` | Agentic signal engine UI |
| IndicatorTools | `src/components/IndicatorTools.tsx` | SuperTrend + indicator config |

---

## Common Errors & Fixes (History)

| Error | Cause | Fix |
|-------|-------|-----|
| Iframe blank on `/forex` and `/ea-analytics` | `vercel.json` had `rewrites` catch-all intercepting static paths | Changed to `routes` with `handle: filesystem` |
| Asset paths `/Program Files/Git/chart-view/...` | Git Bash converts `--base=/x/` CLI flag to Windows path | Set `base` in `vite.config.ts` directly |
| ProChart white flash / disposal crash | Canvas context disposed before cleanup | Added `isDisposed` ref guard in useEffect cleanup |
| `toFixed` crash on undefined | ForexMT5/EAAnalytics receiving null price | Added `?.toFixed(2) ?? '0.00'` guards |
| XAUUSD showing wrong pip values | Was using 10000 multiplier (forex) for gold | `getPipMultiplier('XAUUSD') = 10` |
| `git push` credential error | `credential-manager-core` not found | Use `npx vercel --prod --yes` OR `git config --global credential.helper manager` |
| EA Dashboard gold showing wrong price | Was using Binance BTC feed | Switched to gold-api.com polling |

---

## Version History

| Version | Key Change |
|---------|-----------|
| v7 | ProChart crash fix, EAAnalytics login guard |
| v8 | SuperTrend + IndicatorTools, EA bot live signals |
| v9 | gold-api.com for XAU, BDT timezone clock, AdminDashboard blog editor |
| v10 | Chart-view + MT5-signals sub-projects as iframes, vercel.json routing fix, world-class XAU signals, Aura AI branding |
