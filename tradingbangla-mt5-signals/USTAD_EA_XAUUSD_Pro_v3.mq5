//+------------------------------------------------------------------+
//|              USTAD_EA_XAUUSD_Pro_v3.mq5                         |
//|      World Class XAUUSD Signal EA for MetaTrader 5              |
//|  Real Signal + Real Price Matching + Win Rate Dashboard          |
//|   Special 11-Point Signal | Bengali Dashboard | Trading Bangla   |
//+------------------------------------------------------------------+
#property copyright   "USTAD EA - Trading Bangla | v3.0"
#property link        "https://crm.tradingbangla.com"
#property version     "3.00"
#property description "World Class XAUUSD EA - Trading Bangla"
#property description "11-Point Signal | Real Price Match | Win Rate"
#property description "RSI+MACD+EMA+BB+Stoch+ATR+PA+Volume+Candle"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>

//+------------------------------------------------------------------+
//|  INPUT PARAMETERS                                                |
//+------------------------------------------------------------------+

input group "════════ RISK MANAGEMENT ════════"
input double   RiskPercent        = 1.5;    // Risk Per Trade (%)
input double   RR_Ratio           = 2.0;    // Risk:Reward Ratio
input double   FixedLot           = 0.01;   // Fixed Lot (if AutoLot OFF)
input bool     UseAutoLot         = true;   // Auto Lot by Risk%
input int      MaxOpenTrades      = 3;      // Max Simultaneous Trades
input int      MaxDailyLoss_PCT   = 5;      // Max Daily Loss % (0=OFF)
input bool     UseBreakEven       = true;   // Move SL to BreakEven
input double   BE_TriggerRR       = 1.0;    // BreakEven Trigger (xRR)
input bool     UseTrailingStop    = false;  // Trailing Stop
input double   TrailATR_Mult      = 1.0;    // Trail Distance (ATR x)

input group "════════ SIGNAL SETTINGS ════════"
input int      RSI_Period         = 14;     // RSI Period
input int      RSI_OB             = 70;     // RSI Overbought Level
input int      RSI_OS             = 30;     // RSI Oversold Level
input int      EMA_Fast           = 8;      // Fast EMA
input int      EMA_Slow           = 21;     // Slow EMA
input int      EMA_Trend          = 50;     // Trend EMA (200 for LT)
input int      EMA_LongTrend      = 200;    // Long-Term EMA
input int      MACD_Fast          = 12;     // MACD Fast
input int      MACD_Slow          = 26;     // MACD Slow
input int      MACD_Signal        = 9;      // MACD Signal
input int      BB_Period          = 20;     // Bollinger Period
input double   BB_Dev             = 2.0;    // Bollinger StdDev
input int      ATR_Period         = 14;     // ATR Period
input double   ATR_SL_Mult        = 1.5;    // ATR x SL Distance
input double   ATR_TP_Mult        = 3.0;    // ATR x TP Distance (overrides RR if >0)
input int      Stoch_K            = 5;      // Stochastic %K
input int      Stoch_D            = 3;      // Stochastic %D
input int      Stoch_Slow         = 3;      // Stochastic Slowing
input int      VOL_Period         = 20;     // Volume MA Period

input group "════════ SPECIAL SIGNAL ════════"
input int      Min_Signal_Score   = 5;      // Min Score to Trade (1-11)
input bool     MultiTF_Analysis   = true;   // Multi-Timeframe Confirm
input ENUM_TIMEFRAMES HTF_Period  = PERIOD_H1; // Higher Timeframe
input bool     TrendFilter        = true;   // EMA50 Trend Filter
input bool     LongTrendFilter    = false;  // EMA200 Long Trend Filter
input bool     SessionFilter      = false;  // London+NY Session Only
input int      Signal_Cooldown    = 3;      // Bars between signals
input bool     VolConfirm         = true;   // Volume Confirmation
input bool     CandlePatterns     = true;   // Candle Pattern Signals
input bool     SRLevels           = true;   // Support/Resistance Filter

input group "════════ PRICE MATCHING ════════"
input bool     PriceMatchFilter   = true;   // Real Price Match Filter
input double   MinATR_Filter      = 0.5;    // Min ATR for trade (0=OFF)
input double   MaxSpread_Points   = 50;     // Max Spread to allow trade
input bool     FibLevels          = true;   // Fibonacci Level Filter
input int      Fib_Period         = 50;     // Fibonacci Look-back period
input double   FibZone_Buffer     = 0.15;   // Fib Zone buffer (% of ATR)

input group "════════ DISPLAY & ALERTS ════════"
input bool     ShowDashboard      = true;   // Show Main Dashboard
input bool     ShowPriceLevels    = true;   // Show Key Price Levels
input bool     AlertOnSignal      = true;   // Alert on Signal
input bool     PushNotification   = false;  // Mobile Push
input bool     ShowSignalArrows   = true;   // Draw Signal Arrows
input bool     ShowHeatmap        = true;   // Signal Strength Bar
input color    BullColor          = clrLime;    // Buy Color
input color    BearColor          = clrRed;     // Sell Color
input color    DashBG             = C'5,10,25'; // Dashboard BG
input color    HeaderBG           = C'0,60,140';// Header BG
input int      MagicNumber        = 20260608;   // EA Magic Number
input string   EA_Comment         = "TradingBangla"; // Trade Comment

//+------------------------------------------------------------------+
//|  GLOBAL VARIABLES                                                |
//+------------------------------------------------------------------+
CTrade        trade;
CPositionInfo posInfo;
CSymbolInfo   symInfo;

// Handles — Current TF
int h_RSI, h_MACD, h_EMA_F, h_EMA_S, h_EMA_T, h_EMA_LT;
int h_BB, h_ATR, h_Stoch, h_VOL;

// Handles — Higher TF
int h_HTF_RSI, h_HTF_MACD, h_HTF_EMA_F, h_HTF_EMA_S, h_HTF_ATR;

// Buffers — Current TF
double rsi[], macd[], macdSig[], emaF[], emaS[], emaT[], emaLT[];
double bbU[], bbM[], bbL[], atr[], stK[], stD[], vol[];

// Buffers — Higher TF
double htfRsi[], htfMacd[], htfMacdSig[], htfEmaF[], htfEmaS[], htfAtr[];

// Stats
int    stat_W = 0, stat_L = 0, stat_Signals = 0;
double stat_Profit = 0, stat_Best = 0, stat_Worst = 0;
double stat_DayStart = 0;
double stat_MaxDD    = 0;
double stat_MaxEquity= 0;

// State
datetime lastBar   = 0;
datetime lastSigBar= 0;
string   lastDir   = "NONE";
int      lastScore = 0;
int      arrowN    = 0;

// Computed Levels
double fibH = 0, fibL = 0;
double keySupport = 0, keyResist = 0;
double swingH = 0, swingL = 0;

//+------------------------------------------------------------------+
//|  ONIT                                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("╔══════════════════════════════════════════╗");
   Print("║  USTAD EA XAUUSD Pro v3.0                ║");
   Print("║  Trading Bangla World Class MT5 EA       ║");
   Print("╚══════════════════════════════════════════╝");

   if(!symInfo.Name(_Symbol)){ Alert("Symbol error"); return INIT_FAILED; }

   // Current TF handles
   h_RSI   = iRSI   (_Symbol, PERIOD_CURRENT, RSI_Period, PRICE_CLOSE);
   h_MACD  = iMACD  (_Symbol, PERIOD_CURRENT, MACD_Fast, MACD_Slow, MACD_Signal, PRICE_CLOSE);
   h_EMA_F = iMA    (_Symbol, PERIOD_CURRENT, EMA_Fast,  0, MODE_EMA, PRICE_CLOSE);
   h_EMA_S = iMA    (_Symbol, PERIOD_CURRENT, EMA_Slow,  0, MODE_EMA, PRICE_CLOSE);
   h_EMA_T = iMA    (_Symbol, PERIOD_CURRENT, EMA_Trend, 0, MODE_EMA, PRICE_CLOSE);
   h_EMA_LT= iMA    (_Symbol, PERIOD_CURRENT, EMA_LongTrend, 0, MODE_EMA, PRICE_CLOSE);
   h_BB    = iBands (_Symbol, PERIOD_CURRENT, BB_Period, 0, BB_Dev, PRICE_CLOSE);
   h_ATR   = iATR   (_Symbol, PERIOD_CURRENT, ATR_Period);
   h_Stoch = iStochastic(_Symbol, PERIOD_CURRENT, Stoch_K, Stoch_D, Stoch_Slow, MODE_SMA, STO_LOWHIGH);
   h_VOL   = iMA    (_Symbol, PERIOD_CURRENT, VOL_Period, 0, MODE_SMA, VOLUME_TICK);

   // Higher TF handles
   if(MultiTF_Analysis)
   {
      h_HTF_RSI   = iRSI (_Symbol, HTF_Period, RSI_Period, PRICE_CLOSE);
      h_HTF_MACD  = iMACD(_Symbol, HTF_Period, MACD_Fast, MACD_Slow, MACD_Signal, PRICE_CLOSE);
      h_HTF_EMA_F = iMA  (_Symbol, HTF_Period, EMA_Fast,  0, MODE_EMA, PRICE_CLOSE);
      h_HTF_EMA_S = iMA  (_Symbol, HTF_Period, EMA_Slow,  0, MODE_EMA, PRICE_CLOSE);
      h_HTF_ATR   = iATR (_Symbol, HTF_Period, ATR_Period);
   }

   // Validate
   if(h_RSI==INVALID_HANDLE || h_MACD==INVALID_HANDLE || h_EMA_F==INVALID_HANDLE
      || h_BB==INVALID_HANDLE || h_ATR==INVALID_HANDLE)
   { Alert("USTAD EA: Handle Error!"); return INIT_FAILED; }

   // Set series
   int arrCount = 0;
   double *arrs[] = {rsi, macd, macdSig, emaF, emaS, emaT, emaLT,
                     bbU, bbM, bbL, atr, stK, stD, vol,
                     htfRsi, htfMacd, htfMacdSig, htfEmaF, htfEmaS, htfAtr};
   for(int i = 0; i < 20; i++) ArraySetAsSeries(*arrs[i], true);

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(80);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   stat_DayStart = AccountInfoDouble(ACCOUNT_BALANCE);
   stat_MaxEquity= stat_DayStart;

   RefreshStats();
   if(ShowDashboard) BuildDashboard();

   Print("USTAD EA v3: Ready | MinScore=", Min_Signal_Score, " | Magic=", MagicNumber);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//|  ONDEINIT                                                        |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   int h[] = {h_RSI,h_MACD,h_EMA_F,h_EMA_S,h_EMA_T,h_EMA_LT,h_BB,h_ATR,h_Stoch,h_VOL};
   for(int i=0;i<10;i++) if(h[i]!=INVALID_HANDLE) IndicatorRelease(h[i]);
   if(MultiTF_Analysis)
   {
      IndicatorRelease(h_HTF_RSI); IndicatorRelease(h_HTF_MACD);
      IndicatorRelease(h_HTF_EMA_F); IndicatorRelease(h_HTF_EMA_S);
      IndicatorRelease(h_HTF_ATR);
   }
   ObjectsDeleteAll(0, "UEA_");
   Comment("");
   Print("USTAD EA v3 Off | Trades:", stat_W+stat_L,
         " | Win:", WinRate(), "% | Net:$", DoubleToString(stat_Profit,2));
}

//+------------------------------------------------------------------+
//|  ONTICK                                                          |
//+------------------------------------------------------------------+
void OnTick()
{
   // Always: Breakeven + Trailing
   if(UseBreakEven)    ManageBreakEven();
   if(UseTrailingStop) ManageTrailing();

   // Max Equity tracking for drawdown calc
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > stat_MaxEquity) stat_MaxEquity = eq;
   double dd = stat_MaxEquity - eq;
   if(dd > stat_MaxDD) stat_MaxDD = dd;

   RefreshStats();
   if(ShowDashboard) UpdateDashboard();

   // ── New bar only ──
   datetime barTime = iTime(_Symbol, PERIOD_CURRENT, 0);
   if(barTime == lastBar) return;
   lastBar = barTime;

   if(!CopyBuffers()) return;

   // Update key levels
   UpdateKeyLevels();

   // Session filter
   if(SessionFilter && !IsSession()) return;

   // Daily loss
   if(MaxDailyLoss_PCT > 0 && DailyLoss()) return;

   // Spread filter
   double spreadPts = (SymbolInfoDouble(_Symbol,SYMBOL_ASK)-SymbolInfoDouble(_Symbol,SYMBOL_BID))/_Point;
   if(MaxSpread_Points > 0 && spreadPts > MaxSpread_Points) return;

   // ATR filter
   if(MinATR_Filter > 0 && atr[1] < MinATR_Filter) return;

   // ── Score analysis ──
   int bullScore=0, bearScore=0;
   Analyze(bullScore, bearScore);

   // ── Determine signal ──
   string sig = "NEUTRAL";
   int score = 0;
   if(bullScore >= Min_Signal_Score && bullScore > bearScore)
   { sig="BUY";  score=bullScore; }
   else if(bearScore >= Min_Signal_Score && bearScore > bullScore)
   { sig="SELL"; score=bearScore; }

   // ── Cooldown ──
   if(sig != "NEUTRAL")
   {
      int barsGone = (int)((barTime-lastSigBar) / PeriodSeconds(PERIOD_CURRENT));
      if(barsGone < Signal_Cooldown && lastDir==sig) sig="NEUTRAL";
   }

   lastDir   = (sig!="NEUTRAL") ? sig : lastDir;
   lastScore = (sig!="NEUTRAL") ? score : lastScore;

   if(sig != "NEUTRAL")
   {
      lastSigBar = barTime;
      stat_Signals++;
      if(ShowSignalArrows) DrawArrow(sig, score);
      DoAlert(sig, score);
      ExecuteTrade(sig, score);
   }
}

//+------------------------------------------------------------------+
//|  COPY ALL BUFFERS                                                |
//+------------------------------------------------------------------+
bool CopyBuffers()
{
   if(CopyBuffer(h_RSI,  0,0,6,rsi)    <6) return false;
   if(CopyBuffer(h_MACD, 0,0,6,macd)   <6) return false;
   if(CopyBuffer(h_MACD, 1,0,6,macdSig)<6) return false;
   if(CopyBuffer(h_EMA_F,0,0,6,emaF)   <6) return false;
   if(CopyBuffer(h_EMA_S,0,0,6,emaS)   <6) return false;
   if(CopyBuffer(h_EMA_T,0,0,6,emaT)   <6) return false;
   if(CopyBuffer(h_EMA_LT,0,0,6,emaLT) <6) return false;
   if(CopyBuffer(h_BB,  0,0,6,bbM)     <6) return false;
   if(CopyBuffer(h_BB,  1,0,6,bbU)     <6) return false;
   if(CopyBuffer(h_BB,  2,0,6,bbL)     <6) return false;
   if(CopyBuffer(h_ATR, 0,0,6,atr)     <6) return false;
   if(CopyBuffer(h_Stoch,0,0,6,stK)    <6) return false;
   if(CopyBuffer(h_Stoch,1,0,6,stD)    <6) return false;
   if(CopyBuffer(h_VOL, 0,0,6,vol)     <6) return false;

   if(MultiTF_Analysis)
   {
      if(CopyBuffer(h_HTF_RSI,  0,0,4,htfRsi)    <4) return false;
      if(CopyBuffer(h_HTF_MACD, 0,0,4,htfMacd)   <4) return false;
      if(CopyBuffer(h_HTF_MACD, 1,0,4,htfMacdSig)<4) return false;
      if(CopyBuffer(h_HTF_EMA_F,0,0,4,htfEmaF)   <4) return false;
      if(CopyBuffer(h_HTF_EMA_S,0,0,4,htfEmaS)   <4) return false;
      if(CopyBuffer(h_HTF_ATR,  0,0,4,htfAtr)    <4) return false;
   }
   return true;
}

//+------------------------------------------------------------------+
//|  UPDATE KEY S/R LEVELS & SWING POINTS                           |
//+------------------------------------------------------------------+
void UpdateKeyLevels()
{
   int lookback = MathMax(Fib_Period, 50);

   double highs[], lows[];
   ArraySetAsSeries(highs, true);
   ArraySetAsSeries(lows,  true);
   CopyHigh(_Symbol, PERIOD_CURRENT, 1, lookback, highs);
   CopyLow (_Symbol, PERIOD_CURRENT, 1, lookback, lows);

   fibH   = highs[ArrayMaximum(highs, 0, lookback-1)];
   fibL   = lows [ArrayMinimum(lows,  0, lookback-1)];
   swingH = fibH;
   swingL = fibL;

   // Recent S/R from last 20 bars
   double rH[], rL[];
   ArraySetAsSeries(rH,true); ArraySetAsSeries(rL,true);
   CopyHigh(_Symbol,PERIOD_CURRENT,1,20,rH);
   CopyLow (_Symbol,PERIOD_CURRENT,1,20,rL);
   keyResist = rH[ArrayMaximum(rH,0,20)];
   keySupport= rL[ArrayMinimum(rL,0,20)];

   if(ShowPriceLevels) DrawPriceLevels();
}

//+------------------------------------------------------------------+
//|  11-POINT SIGNAL ANALYSIS ENGINE                                |
//+------------------------------------------------------------------+
void Analyze(int &bull, int &bear)
{
   bull = 0; bear = 0;
   double bid   = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double c1    = iClose(_Symbol,PERIOD_CURRENT,1);
   double c2    = iClose(_Symbol,PERIOD_CURRENT,2);
   double c3    = iClose(_Symbol,PERIOD_CURRENT,3);
   double o1    = iOpen (_Symbol,PERIOD_CURRENT,1);
   double o2    = iOpen (_Symbol,PERIOD_CURRENT,2);
   double h1    = iHigh (_Symbol,PERIOD_CURRENT,1);
   double h2    = iHigh (_Symbol,PERIOD_CURRENT,2);
   double l1    = iLow  (_Symbol,PERIOD_CURRENT,1);
   double l2    = iLow  (_Symbol,PERIOD_CURRENT,2);
   double volCur= iVolume(_Symbol,PERIOD_CURRENT,1);
   double volAvg= vol[1];

   // ═══════════════════════════════════════════════════════
   // SIGNAL 1: RSI Momentum + Zone Analysis (weight 1)
   // ═══════════════════════════════════════════════════════
   bool rsi_bull = (rsi[2] < RSI_OS && rsi[1] > RSI_OS) ||  // Oversold exit
                   (rsi[1] < 50     && rsi[0] > 50);         // Midline cross up
   bool rsi_bear = (rsi[2] > RSI_OB && rsi[1] < RSI_OB) ||  // Overbought exit
                   (rsi[1] > 50     && rsi[0] < 50);         // Midline cross down
   if(rsi_bull) bull++; else if(rsi_bear) bear++;

   // ═══════════════════════════════════════════════════════
   // SIGNAL 2: MACD — Crossover + Histogram momentum (weight 1)
   // ═══════════════════════════════════════════════════════
   bool macd_bull_x = (macd[1]>macdSig[1]) && (macd[2]<=macdSig[2]);
   bool macd_bear_x = (macd[1]<macdSig[1]) && (macd[2]>=macdSig[2]);
   if(macd_bull_x)                                bull++;
   else if(macd_bear_x)                           bear++;
   else if(macd[1]>macdSig[1] && macd[1]>0)      bull++;
   else if(macd[1]<macdSig[1] && macd[1]<0)      bear++;

   // ═══════════════════════════════════════════════════════
   // SIGNAL 3: EMA 8/21 Crossover + Alignment (weight 1)
   // ═══════════════════════════════════════════════════════
   bool ema_bull_x = (emaF[1]>emaS[1]) && (emaF[2]<=emaS[2]);
   bool ema_bear_x = (emaF[1]<emaS[1]) && (emaF[2]>=emaS[2]);
   if(ema_bull_x)                                          bull++;
   else if(ema_bear_x)                                     bear++;
   else if(emaF[1]>emaS[1] && bid>emaF[1])                bull++;
   else if(emaF[1]<emaS[1] && bid<emaF[1])                bear++;

   // ═══════════════════════════════════════════════════════
   // SIGNAL 4: EMA50 Primary Trend Filter (weight 1)
   // ═══════════════════════════════════════════════════════
   if(TrendFilter)
   {
      if(bid > emaT[0] && emaF[0]>emaT[0] && emaS[0]>emaT[0]) bull++;
      else if(bid < emaT[0] && emaF[0]<emaT[0] && emaS[0]<emaT[0]) bear++;
   }
   else { if(emaF[0]>emaS[0]) bull++; else bear++; }

   // ═══════════════════════════════════════════════════════
   // SIGNAL 5: EMA200 Long-Term Trend (weight 1)
   // ═══════════════════════════════════════════════════════
   if(LongTrendFilter)
   {
      if(bid > emaLT[0]) bull++; else bear++;
   }
   else
   {
      // Replace with BB middle cross
      if(c1 > bbM[1] && c2 < bbM[2]) bull++;
      else if(c1 < bbM[1] && c2 > bbM[2]) bear++;
   }

   // ═══════════════════════════════════════════════════════
   // SIGNAL 6: Bollinger Bands — Squeeze & Bounce (weight 1)
   // ═══════════════════════════════════════════════════════
   double bbRange = bbU[1] - bbL[1];
   double bbPct   = bbRange > 0 ? (c1 - bbL[1]) / bbRange : 0.5;
   double bbSqueeze = bbRange / (atr[1] > 0 ? atr[1] : 1);

   if(bbPct < 0.2  && c1 > c2)      bull++;  // Near lower band + up
   else if(bbPct > 0.8 && c1 < c2)  bear++;  // Near upper band + down
   else if(bbSqueeze < 2.0 && c1>c2) bull++;  // Squeeze breakout up
   else if(bbSqueeze < 2.0 && c1<c2) bear++;  // Squeeze breakout down

   // ═══════════════════════════════════════════════════════
   // SIGNAL 7: Stochastic %K/%D Crossover (weight 1)
   // ═══════════════════════════════════════════════════════
   bool st_bull = (stK[1]<25) && (stK[1]>stD[1]) && (stK[2]<=stD[2]);
   bool st_bear = (stK[1]>75) && (stK[1]<stD[1]) && (stK[2]>=stD[2]);
   if(st_bull) bull++; else if(st_bear) bear++;

   // ═══════════════════════════════════════════════════════
   // SIGNAL 8: Price Action — Swing Structure (weight 1)
   // ═══════════════════════════════════════════════════════
   bool hh_hl = (h1>h2) && (l1>l2);   // Bullish structure
   bool lh_ll = (h1<h2) && (l1<l2);   // Bearish structure
   if(hh_hl) bull++; else if(lh_ll) bear++;

   // ═══════════════════════════════════════════════════════
   // SIGNAL 9: Candlestick Patterns (weight 1)
   // ═══════════════════════════════════════════════════════
   if(CandlePatterns)
   {
      double body1 = MathAbs(c1-o1), body2 = MathAbs(c2-o2);
      double range1 = h1-l1;
      double atrVal = atr[1];

      // Hammer / Bullish Engulfing / Bullish Pin Bar
      bool hammer   = (c1>o1) && (o1-l1 > body1*2) && (h1-c1 < body1*0.5);
      bool bullEng  = (c2<o2) && (c1>o1) && (c1>o2) && (o1<c2);
      bool bullPin  = (c1>o1) && ((l1-MathMin(o1,c1)) > range1*0.6);

      // Shooting Star / Bearish Engulfing / Bearish Pin Bar
      bool shootStar= (c1<o1) && (h1-o1 > body1*2) && (c1-l1 < body1*0.5);
      bool bearEng  = (c2>o2) && (c1<o1) && (c1<o2) && (o1>c2);
      bool bearPin  = (c1<o1) && ((MathMax(o1,c1)-h1) > range1*0.6);

      // Doji (indecision — ignore)
      bool doji = body1 < atrVal * 0.1;

      if(!doji)
      {
         if(hammer || bullEng || bullPin) bull++;
         else if(shootStar || bearEng || bearPin) bear++;
      }
   }

   // ═══════════════════════════════════════════════════════
   // SIGNAL 10: Volume Confirmation (weight 1)
   // ═══════════════════════════════════════════════════════
   if(VolConfirm && volAvg > 0)
   {
      bool highVol = (volCur > volAvg * 1.3);  // Above average volume
      if(highVol && c1>o1) bull++;
      else if(highVol && c1<o1) bear++;
   }
   else
   {
      // ATR momentum as fallback
      double bodySize = MathAbs(c1-o1);
      double atrAvg   = 0;
      for(int i=1;i<=5;i++) atrAvg+=atr[i];
      atrAvg/=5;
      if(bodySize > atrAvg*0.5 && c1>o1) bull++;
      else if(bodySize > atrAvg*0.5 && c1<o1) bear++;
   }

   // ═══════════════════════════════════════════════════════
   // SIGNAL 11: Multi-Timeframe Confirmation (weight 2)
   // ═══════════════════════════════════════════════════════
   if(MultiTF_Analysis)
   {
      bool htf_bull = (htfRsi[1]>52) && (htfMacd[1]>htfMacdSig[1]) && (htfEmaF[1]>htfEmaS[1]);
      bool htf_bear = (htfRsi[1]<48) && (htfMacd[1]<htfMacdSig[1]) && (htfEmaF[1]<htfEmaS[1]);
      if(htf_bull)      bull += 2;  // Double weight
      else if(htf_bear) bear += 2;
   }

   // ═══════════════════════════════════════════════════════
   // PRICE MATCH FILTER — subtract if price at bad level
   // ═══════════════════════════════════════════════════════
   if(PriceMatchFilter && FibLevels && fibH > fibL)
   {
      double fibRange = fibH - fibL;
      double pct = (bid - fibL) / fibRange;

      // Fib levels: 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0
      double fibLevs[] = {0.0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0};
      double buf = FibZone_Buffer * atr[1];
      bool atFibLevel = false;
      for(int f=0; f<7; f++)
      {
         double fibPrice = fibL + fibRange * fibLevs[f];
         if(MathAbs(bid - fibPrice) < buf) { atFibLevel=true; break; }
      }
      // Bonus point if price is at a Fib level
      if(atFibLevel)
      {
         if(pct < 0.5) bull++;  // Below mid = potential bounce up
         else          bear++;  // Above mid = potential drop
      }
   }

   // S/R filter — penalise if going into a wall
   if(SRLevels)
   {
      double buf2 = atr[1] * 0.3;
      if(bull > bear)
      {
         // Bearish if price near strong resistance
         if(MathAbs(bid - keyResist) < buf2) bull = MathMax(0, bull-1);
      }
      else if(bear > bull)
      {
         // Bullish if price near strong support
         if(MathAbs(bid - keySupport) < buf2) bear = MathMax(0, bear-1);
      }
   }
}

//+------------------------------------------------------------------+
//|  EXECUTE TRADE                                                   |
//+------------------------------------------------------------------+
void ExecuteTrade(string dir, int score)
{
   if(CountTrades() >= MaxOpenTrades) return;
   if(HasDir(dir)) return;

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   int    dig = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double atrV= atr[1];

   double slDist = NormalizeDouble(atrV * ATR_SL_Mult, dig);
   double tpDist = (ATR_TP_Mult > 0)
                   ? NormalizeDouble(atrV * ATR_TP_Mult, dig)
                   : NormalizeDouble(slDist * RR_Ratio, dig);

   double lot = LotSize(slDist);
   string cmt = StringFormat("%s_%s_S%d", EA_Comment, dir, score);

   bool ok = false;
   if(dir=="BUY")
   {
      double sl = NormalizeDouble(ask - slDist, dig);
      double tp = NormalizeDouble(ask + tpDist, dig);
      ok = trade.Buy(lot, _Symbol, ask, sl, tp, cmt);
   }
   else
   {
      double sl = NormalizeDouble(bid + slDist, dig);
      double tp = NormalizeDouble(bid - tpDist, dig);
      ok = trade.Sell(lot, _Symbol, bid, sl, tp, cmt);
   }

   if(ok)
      Print("✅ USTAD v3 | ", dir, " | Lot:", lot,
            " SL:", NormalizeDouble(slDist,dig),
            " TP:", NormalizeDouble(tpDist,dig),
            " Score:", score, "/11 | ATR:", NormalizeDouble(atrV,dig));
   else
      Print("❌ Trade Fail: ", trade.ResultRetcodeDescription());
}

//+------------------------------------------------------------------+
//|  LOT SIZE CALC                                                   |
//+------------------------------------------------------------------+
double LotSize(double slDist)
{
   if(!UseAutoLot) return NormLot(FixedLot);
   double bal    = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmt= bal * RiskPercent / 100.0;
   double tv     = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double ts     = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tv<=0||ts<=0) return NormLot(FixedLot);
   double vpp = tv / ts;
   return NormLot(riskAmt / (slDist * vpp));
}

double NormLot(double lot)
{
   double mn = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double mx = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double st = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lot = MathFloor(lot/st)*st;
   return NormalizeDouble(MathMax(mn, MathMin(mx, lot)), 2);
}

//+------------------------------------------------------------------+
//|  BREAKEVEN                                                       |
//+------------------------------------------------------------------+
void ManageBreakEven()
{
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(!posInfo.SelectByIndex(i)) continue;
      if(posInfo.Magic()!=MagicNumber || posInfo.Symbol()!=_Symbol) continue;
      double op=posInfo.PriceOpen(), sl=posInfo.StopLoss(), tp=posInfo.TakeProfit();
      double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
      double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
      int dig=(int)SymbolInfoInteger(_Symbol,SYMBOL_DIGITS);
      double tpDist=MathAbs(tp-op);
      double beTrig=tpDist*BE_TriggerRR/RR_Ratio;
      if(posInfo.PositionType()==POSITION_TYPE_BUY)
      { if(bid>=op+beTrig && sl<op) trade.PositionModify(posInfo.Ticket(),op+_Point*3,tp); }
      else
      { if(ask<=op-beTrig && sl>op) trade.PositionModify(posInfo.Ticket(),op-_Point*3,tp); }
   }
}

//+------------------------------------------------------------------+
//|  TRAILING STOP                                                   |
//+------------------------------------------------------------------+
void ManageTrailing()
{
   if(!UseTrailingStop) return;
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(!posInfo.SelectByIndex(i)) continue;
      if(posInfo.Magic()!=MagicNumber || posInfo.Symbol()!=_Symbol) continue;
      double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
      double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
      int dig=(int)SymbolInfoInteger(_Symbol,SYMBOL_DIGITS);
      double trailDist = atr[1] * TrailATR_Mult;
      double tp = posInfo.TakeProfit();
      if(posInfo.PositionType()==POSITION_TYPE_BUY)
      {
         double newSL = NormalizeDouble(bid - trailDist, dig);
         if(newSL > posInfo.StopLoss() + _Point)
            trade.PositionModify(posInfo.Ticket(), newSL, tp);
      }
      else
      {
         double newSL = NormalizeDouble(ask + trailDist, dig);
         if(newSL < posInfo.StopLoss() - _Point || posInfo.StopLoss()==0)
            trade.PositionModify(posInfo.Ticket(), newSL, tp);
      }
   }
}

//+------------------------------------------------------------------+
//|  HELPERS                                                         |
//+------------------------------------------------------------------+
int CountTrades()
{
   int n=0;
   for(int i=PositionsTotal()-1;i>=0;i--)
      if(posInfo.SelectByIndex(i) && posInfo.Magic()==MagicNumber && posInfo.Symbol()==_Symbol)
         n++;
   return n;
}

bool HasDir(string dir)
{
   ENUM_POSITION_TYPE t = (dir=="BUY")?POSITION_TYPE_BUY:POSITION_TYPE_SELL;
   for(int i=PositionsTotal()-1;i>=0;i--)
      if(posInfo.SelectByIndex(i) && posInfo.Magic()==MagicNumber &&
         posInfo.Symbol()==_Symbol && posInfo.PositionType()==t) return true;
   return false;
}

bool IsSession()
{
   MqlDateTime dt; TimeToStruct(TimeGMT(),dt);
   return (dt.hour>=8 && dt.hour<21);
}

bool DailyLoss()
{
   double eq=AccountInfoDouble(ACCOUNT_EQUITY);
   return (stat_DayStart - eq > stat_DayStart * MaxDailyLoss_PCT / 100.0);
}

double WinRate()
{
   int tot=stat_W+stat_L;
   return tot>0 ? NormalizeDouble((double)stat_W/tot*100,1) : 0;
}

//+------------------------------------------------------------------+
//|  REFRESH STATISTICS                                              |
//+------------------------------------------------------------------+
void RefreshStats()
{
   static int lastDeals=-1;
   HistorySelect(0, TimeCurrent());
   int deals=HistoryDealsTotal();
   if(deals==lastDeals) return;
   lastDeals=deals;
   stat_W=0; stat_L=0; stat_Profit=0; stat_Best=0; stat_Worst=0;
   for(int i=0;i<deals;i++)
   {
      ulong tk=HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(tk,DEAL_MAGIC)!=MagicNumber) continue;
      if(HistoryDealGetString(tk,DEAL_SYMBOL)!=_Symbol)    continue;
      if(HistoryDealGetInteger(tk,DEAL_ENTRY)!=DEAL_ENTRY_OUT) continue;
      double p=HistoryDealGetDouble(tk,DEAL_PROFIT)
              +HistoryDealGetDouble(tk,DEAL_SWAP)
              +HistoryDealGetDouble(tk,DEAL_COMMISSION);
      if(p>0){ stat_W++; if(p>stat_Best)  stat_Best=p; }
      else   { stat_L++; if(p<stat_Worst) stat_Worst=p; }
      stat_Profit+=p;
   }
}

//+------------------------------------------------------------------+
//|  SEND ALERT                                                      |
//+------------------------------------------------------------------+
void DoAlert(string dir, int score)
{
   double price = SymbolInfoDouble(_Symbol, dir=="BUY"?SYMBOL_ASK:SYMBOL_BID);
   double sl    = (dir=="BUY")
                  ? price - atr[1]*ATR_SL_Mult
                  : price + atr[1]*ATR_SL_Mult;
   double tp    = (dir=="BUY")
                  ? price + atr[1]*(ATR_TP_Mult>0?ATR_TP_Mult:ATR_SL_Mult*RR_Ratio)
                  : price - atr[1]*(ATR_TP_Mult>0?ATR_TP_Mult:ATR_SL_Mult*RR_Ratio);

   string msg = StringFormat(
      "★ USTAD EA v3 — Trading Bangla ★\n"
      "Symbol: %s | TF: %s\n"
      "Signal: %s | Score: %d/11\n"
      "Price:  %.5f\n"
      "SL:     %.5f | TP: %.5f\n"
      "Win Rate: %.1f%% (%d/%d)\n"
      "Fib Hi: %.5f | Fib Lo: %.5f",
      _Symbol, EnumToString(PERIOD_CURRENT),
      dir, score, price, sl, tp,
      WinRate(), stat_W, stat_W+stat_L,
      fibH, fibL
   );
   if(AlertOnSignal)    Alert(msg);
   if(PushNotification) SendNotification(msg);
   Print("★ SIGNAL: ", dir, " S:", score, "/11 P:", price, " WR:", WinRate(), "%");
}

//+------------------------------------------------------------------+
//|  DRAW SIGNAL ARROW                                               |
//+------------------------------------------------------------------+
void DrawArrow(string dir, int score)
{
   arrowN++;
   string an  = "UEA_A_" + IntegerToString(arrowN);
   string ln  = "UEA_L_" + IntegerToString(arrowN);
   string sn  = "UEA_S_" + IntegerToString(arrowN);
   datetime t = iTime(_Symbol, PERIOD_CURRENT, 1);
   double   p, offset = atr[1]*0.6;
   ENUM_OBJECT ao;
   color ac;

   if(dir=="BUY")
   { p=iLow(_Symbol,PERIOD_CURRENT,1)-offset; ao=OBJ_ARROW_BUY;  ac=BullColor; }
   else
   { p=iHigh(_Symbol,PERIOD_CURRENT,1)+offset; ao=OBJ_ARROW_SELL; ac=BearColor; }

   ObjectCreate(0,an,ao,0,t,p);
   ObjectSetInteger(0,an,OBJPROP_COLOR,ac);
   ObjectSetInteger(0,an,OBJPROP_WIDTH,3);
   ObjectSetString(0,an,OBJPROP_TOOLTIP,StringFormat("%s %d/11",dir,score));

   // Score badge
   ObjectCreate(0,ln,OBJ_TEXT,0,t,p);
   ObjectSetString(0,ln,OBJPROP_TEXT, StringFormat("%s %d★",dir,score));
   ObjectSetInteger(0,ln,OBJPROP_COLOR,ac);
   ObjectSetString(0,ln,OBJPROP_FONT,"Arial Black");
   ObjectSetInteger(0,ln,OBJPROP_FONTSIZE,9);

   // Signal score bar (heatmap visual)
   if(ShowHeatmap)
   {
      string hm = "UEA_HM_" + IntegerToString(arrowN);
      double barH = (double)score / 11.0;
      ObjectCreate(0,hm,OBJ_TEXT,0,t, dir=="BUY" ? p-offset*0.5 : p+offset*0.5);
      string stars = "";
      for(int s=0;s<score;s++) stars+="█";
      ObjectSetString(0,hm,OBJPROP_TEXT,stars);
      ObjectSetInteger(0,hm,OBJPROP_COLOR, score>=8?clrLimeGreen:score>=5?clrYellow:clrOrange);
      ObjectSetString(0,hm,OBJPROP_FONT,"Courier New");
      ObjectSetInteger(0,hm,OBJPROP_FONTSIZE,7);
   }

   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//|  DRAW KEY PRICE LEVELS                                           |
//+------------------------------------------------------------------+
void DrawPriceLevels()
{
   struct LevelDef { string name; double price; color col; string lbl; };
   LevelDef levels[] = {
      {"UEA_FIBH",   fibH,       clrRed,         "Swing High"},
      {"UEA_FIBL",   fibL,       clrLimeGreen,   "Swing Low"},
      {"UEA_FIB618", fibL+(fibH-fibL)*0.618, clrGold, "Fib 61.8%"},
      {"UEA_FIB50",  fibL+(fibH-fibL)*0.5,   clrAqua, "Fib 50.0%"},
      {"UEA_FIB382", fibL+(fibH-fibL)*0.382, clrPlum, "Fib 38.2%"},
      {"UEA_RES",    keyResist,  clrOrangeRed,   "Resistance"},
      {"UEA_SUP",    keySupport, clrDodgerBlue,  "Support"},
   };

   for(int i=0;i<7;i++)
   {
      string n = levels[i].name;
      if(ObjectFind(0,n)<0)
      {
         ObjectCreate(0,n,OBJ_HLINE,0,0,0);
         ObjectSetInteger(0,n,OBJPROP_STYLE, STYLE_DASH);
         ObjectSetInteger(0,n,OBJPROP_WIDTH, 1);
         ObjectSetInteger(0,n,OBJPROP_RAY_RIGHT,true);
         ObjectSetString(0,n,OBJPROP_TOOLTIP,levels[i].lbl);
      }
      ObjectSetDouble(0,n,OBJPROP_PRICE,levels[i].price);
      ObjectSetInteger(0,n,OBJPROP_COLOR,levels[i].col);
   }
}

//+------------------------------------------------------------------+
//|  BUILD DASHBOARD (initial rectangles)                            |
//+------------------------------------------------------------------+
void BuildDashboard()
{
   // Main panel
   CreateR("UEA_BG",  8, 25, 308, 420, DashBG,     C'0,150,255', 2);
   CreateR("UEA_HD",  8, 25, 308,  45, HeaderBG,   C'0,180,255', 0);
   CreateR("UEA_SIG", 8, 75, 308,  65, C'0,40,80', C'0,150,200', 1);
   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//|  UPDATE DASHBOARD (every tick)                                   |
//+------------------------------------------------------------------+
void UpdateDashboard()
{
   double bid   = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask   = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double spread= (ask-bid)/_Point;
   double eq    = AccountInfoDouble(ACCOUNT_EQUITY);
   double bal   = AccountInfoDouble(ACCOUNT_BALANCE);
   double dd    = bal>0 ? (bal-eq)/bal*100 : 0;
   double wr    = WinRate();
   int    trades= CountTrades();
   int    total = stat_W+stat_L;
   double pnl   = 0;
   for(int i=PositionsTotal()-1;i>=0;i--)
      if(posInfo.SelectByIndex(i) && posInfo.Magic()==MagicNumber && posInfo.Symbol()==_Symbol)
         pnl += posInfo.Profit() + posInfo.Swap();

   // Signal display
   color sigC = clrGray;
   string sigT = "── NEUTRAL / WAIT";
   if(lastDir=="BUY")  { sigC=BullColor; sigT="▲▲ BUY  ▲▲"; }
   if(lastDir=="SELL") { sigC=BearColor;  sigT="▼▼ SELL ▼▼"; }

   // Score bar: ████████░░ 8/11
   string scoreBar = "";
   for(int s=0;s<11;s++) scoreBar += (s<lastScore) ? "█" : "░";
   string scoreStr = scoreBar + " " + IntegerToString(lastScore) + "/11";

   // Win rate color
   color wrC = (wr>=65)?clrLimeGreen:(wr>=50)?clrYellow:clrOrangeRed;
   color pnlC = (stat_Profit>=0)?clrLimeGreen:clrRed;
   color plC  = (pnl>=0)?clrLimeGreen:clrRed;
   color ddC  = (dd<3)?clrLimeGreen:(dd<7)?clrOrange:clrRed;
   color eqC  = (eq>=bal)?clrLimeGreen:clrOrangeRed;

   // HTF status
   string htfSt = "OFF";
   color htfC = clrGray;
   if(MultiTF_Analysis && ArraySize(htfRsi)>1)
   {
      if(htfRsi[1]>52 && htfMacd[1]>htfMacdSig[1] && htfEmaF[1]>htfEmaS[1])
      { htfSt="BULLISH ▲"; htfC=BullColor; }
      else if(htfRsi[1]<48 && htfMacd[1]<htfMacdSig[1] && htfEmaF[1]<htfEmaS[1])
      { htfSt="BEARISH ▼"; htfC=BearColor; }
      else { htfSt="NEUTRAL"; htfC=clrYellow; }
   }

   // RSI status
   string rsiSt = "Neutral";
   color rsiC = clrSilver;
   if(ArraySize(rsi)>1)
   {
      if(rsi[1]>RSI_OB)         { rsiSt="Overbought"; rsiC=BearColor; }
      else if(rsi[1]<RSI_OS)    { rsiSt="Oversold";   rsiC=BullColor; }
      else if(rsi[1]>55)        { rsiSt="Bullish";     rsiC=clrLimeGreen; }
      else if(rsi[1]<45)        { rsiSt="Bearish";     rsiC=clrOrangeRed; }
   }

   struct R { string n; string t; color c; int y; };
   R rows[] = {
      // Header
      {"UEA_R00", "  ★ USTAD EA v3 — Trading Bangla ★",  C'0,220,255', 33  },
      // Signal block
      {"UEA_R01", "  " + sigT,                             sigC,          83  },
      {"UEA_R02", "  Score: " + scoreStr,
       (lastScore>=7)?clrLimeGreen:(lastScore>=5)?clrYellow:clrOrange,    97  },
      {"UEA_R03", "  Min Required: " + IntegerToString(Min_Signal_Score) + "/11",
       clrDimGray, 111 },
      // Price Section
      {"UEA_R04", "  ─────────── REAL PRICE ───────────", C'0,60,120',   130 },
      {"UEA_R05", "  BID  : " + DoubleToString(bid,_Digits),  clrWhite,  145 },
      {"UEA_R06", "  ASK  : " + DoubleToString(ask,_Digits),  C'180,180,180', 160},
      {"UEA_R07", "  SPREAD: " + DoubleToString(spread,1) + " pts",
       (spread<=30)?clrLimeGreen:(spread<=50)?clrYellow:clrRed,           175 },
      {"UEA_R08", "  ATR  : " + DoubleToString(ArraySize(atr)>1?atr[1]:0,_Digits),
       clrAqua, 190 },
      // Indicators
      {"UEA_R09", "  ─────────── INDICATORS ───────────", C'0,60,120',   209 },
      {"UEA_R10", "  RSI(" + IntegerToString(RSI_Period) + "): "
                  + DoubleToString(ArraySize(rsi)>1?rsi[1]:0,1) + " [" + rsiSt + "]",
       rsiC, 224 },
      {"UEA_R11", "  MACD: " + (ArraySize(macd)>1&&macd[1]>macdSig[1]?"▲ Bullish":"▼ Bearish"),
       (ArraySize(macd)>1&&macd[1]>macdSig[1])?clrLimeGreen:clrOrangeRed, 239},
      {"UEA_R12", "  EMA: " + (ArraySize(emaF)>1&&emaF[1]>emaS[1]?"8>21 ▲":"8<21 ▼"),
       (ArraySize(emaF)>1&&emaF[1]>emaS[1])?clrLimeGreen:clrOrangeRed,    254},
      {"UEA_R13", "  HTF(" + EnumToString(HTF_Period) + "): " + htfSt,
       htfC, 269 },
      // Key Levels
      {"UEA_R14", "  ──────── KEY PRICE LEVELS ────────", C'0,60,120',   288 },
      {"UEA_R15", "  Support: " + DoubleToString(keySupport,_Digits),
       clrDodgerBlue, 303 },
      {"UEA_R16", "  Resist : " + DoubleToString(keyResist,_Digits),
       clrOrangeRed,  318 },
      {"UEA_R17", "  Fib 61.8%: " + DoubleToString(fibL+(fibH-fibL)*0.618,_Digits),
       clrGold, 333 },
      // Account
      {"UEA_R18", "  ─────────── WIN RATE ─────────────", C'0,60,120',   352 },
      {"UEA_R19", "  WIN RATE : " + DoubleToString(wr,1) + "%  ("
                  + IntegerToString(stat_W) + "W/" + IntegerToString(stat_L) + "L)",
       wrC, 367 },
      {"UEA_R20", "  Net P&L  : $" + DoubleToString(stat_Profit,2),      pnlC, 382},
      {"UEA_R21", "  Open P&L : $" + DoubleToString(pnl,2),              plC,  397},
      {"UEA_R22", "  Drawdown : " + DoubleToString(dd,1) + "%",          ddC,  412},
      {"UEA_R23", "  Equity   : $" + DoubleToString(eq,2),               eqC,  427},
      {"UEA_R24", "  Open Trades: " + IntegerToString(trades),           clrSilver, 442},
   };

   for(int i=0; i<25; i++)
   {
      string n=rows[i].n;
      if(ObjectFind(0,n)<0)
      {
         ObjectCreate(0,n,OBJ_LABEL,0,0,0);
         ObjectSetInteger(0,n,OBJPROP_CORNER,    CORNER_LEFT_UPPER);
         ObjectSetInteger(0,n,OBJPROP_XDISTANCE, 12);
         ObjectSetInteger(0,n,OBJPROP_BACK,      false);
         ObjectSetInteger(0,n,OBJPROP_SELECTABLE,false);
         ObjectSetString(0,n,OBJPROP_FONT,       "Consolas");
         ObjectSetInteger(0,n,OBJPROP_FONTSIZE,  8);
      }
      ObjectSetInteger(0,n,OBJPROP_YDISTANCE, rows[i].y);
      ObjectSetString(0,n,OBJPROP_TEXT,          rows[i].t);
      ObjectSetInteger(0,n,OBJPROP_COLOR,        rows[i].c);
   }
   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//|  CREATE RECTANGLE                                                |
//+------------------------------------------------------------------+
void CreateR(string name, int x, int y, int w, int h,
             color bg, color border, int bw)
{
   if(ObjectFind(0,name)>=0) ObjectDelete(0,name);
   ObjectCreate(0,name,OBJ_RECTANGLE_LABEL,0,0,0);
   ObjectSetInteger(0,name,OBJPROP_CORNER,    CORNER_LEFT_UPPER);
   ObjectSetInteger(0,name,OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0,name,OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0,name,OBJPROP_XSIZE,     w);
   ObjectSetInteger(0,name,OBJPROP_YSIZE,     h);
   ObjectSetInteger(0,name,OBJPROP_BGCOLOR,   bg);
   ObjectSetInteger(0,name,OBJPROP_BORDER_COLOR,border);
   ObjectSetInteger(0,name,OBJPROP_BORDER_TYPE,BORDER_FLAT);
   ObjectSetInteger(0,name,OBJPROP_WIDTH,     bw);
   ObjectSetInteger(0,name,OBJPROP_BACK,      false);
   ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
}

//+------------------------------------------------------------------+
//|  TRADE TRANSACTION (close detection)                             |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
      RefreshStats();
}
//+------------------------------------------------------------------+
// END — USTAD_EA_XAUUSD_Pro_v3.mq5 — Trading Bangla World Class EA
//+------------------------------------------------------------------+
