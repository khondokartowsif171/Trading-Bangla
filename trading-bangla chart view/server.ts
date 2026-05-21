/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits for payload handling
  app.use(express.json({ limit: "5mb" }));

  // Lazily instantiate the Google GenAI SDK to avoid boot crash when key is missing
  let aiClient: GoogleGenAI | null = null;
  function getGenAI() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // 1. Core AI Forex Analyzer endpoint
  app.post("/api/analyze", async (req, res) => {
    const { pair, candles, timeframe } = req.body;
    if (!pair || !candles || !Array.isArray(candles)) {
      return res.status(400).json({ error: "Invalid currency data struct" });
    }

    const last100 = candles.slice(-100);
    const summary = last100.map((c, i) => ({
      i,
      t: new Date(c.t).toISOString().slice(11, 16),
      o: Number(c.o.toFixed(5)),
      h: Number(c.h.toFixed(5)),
      l: Number(c.l.toFixed(5)),
      c: Number(c.c.toFixed(5)),
      v: Math.round(c.v),
    }));

    // Beautiful simulated bilingual fallback response if API keys are not supplied.
    const mockResponse = `## **Trading Bangla AI বিশ্লেষণ (সিমুলেশন মোড)**

**১. বর্তমান বাজার ট্রেন্ড (Market Trend Analysis):**
বর্তমানে **${pair}** জোড়াটি টাইমফ্রেম **${timeframe || 'M1'}** অনুযায়ী একটি মাঝারি আকারের রিভার্সাল মেকানিজমে অবস্থান করছে। বিগত ১০০ ক্যান্ডেলের প্যাটার্ন অন্বেষণে দেখা যায় যে বিক্রেতাদের চাপ বা সেলিং মোমেন্টাম ধীরে ধীরে দুর্বল হয়ে আসছে এবং ক্রেতারা মার্কেটে পুনরায় পুশ করার চেষ্টা করছে।

**২. কারিগরি সাপোর্ট ও রেজিস্ট্যান্স লেভেল ও কী-সুইং জোন:**
- **শক্তিশালী সাপোর্ট (Key Support Area):** ${last100[last100.length - 1]?.l.toFixed(5)} লেভেল।
- **প্রধান রেজিস্ট্যান্স (Key Resistance Area):** ${(last100[last100.length - 1]?.h * 1.0015).toFixed(5)} জোন।
- **বাজারের চরম হাই ও লো সুইং:** হাই জোন ${(last100[last100.length - 1]?.c * 1.003).toFixed(5)} এবং লো জোন ${(last100[last100.length - 1]?.c * 0.997).toFixed(5)}।

**৩. স্মার্ট মানি কনসেপ্ট (Smart Money Concepts / SMC - ICT Insight):**
- **বুলিশ অর্ডার ব্লক (Bullish OB):** মার্কেট ${last100[last100.length - 1]?.l.toFixed(5)} এর সীমানায় নতুন করে পজিশন সংকুচিত করেছে যা রিয়েল-টাইম বাই জোনের ইঙ্গিত বহন করে।
- **লিকুইডিটি ওয়াশআউট (Liquidity Grab):** বিগত ২০ ক্যান্ডেল আগে ফেয়ার ভ্যালু গ্যাপ (FVG) আংশিকভাবে পূরণ হয়ে মার্কেট উপরের দিকে রওনা দিয়েছে। এটি একটি ট্রেইল মার্কেট সেটআপ।

**৪. টেকনিক্যাল সিগন্যাল ও ট্রেড পরামর্শ (Suggested Action):**
- **অ্যাকশন:** **BUY / LONG**
- **সুবিধাজনক এন্ট্রি পয়েন্ট:** ${last100[last100.length - 1]?.c.toFixed(5)}
- **স্টপ লস (SL):** ${(last100[last100.length - 1]?.c * 0.9985).toFixed(5)}
- **টেক প্রফিট (TP):** ${(last100[last100.length - 1]?.c * 1.0035).toFixed(5)}

*সতর্কতা: এটি এআই-এর মক বিশ্লেষণ। ট্রেড করার আগে অবশ্যই আপনার ঝুঁকি সচেতনতা নিজে নিরূপণ করে ড্রয়িং টুল ব্যবহার করুন।*`;

    const ai = getGenAI();
    if (!ai) {
      return res.json({
        analysis: `⚠️ **Gemini API Key খুঁজে পাওয়া যায়নি!**\n\nরিয়েল-টাইম এআই মডেল কানেকশনের জন্য এআই স্টুডিওর **Settings > Secrets** থেকে **GEMINI_API_KEY** যুক্ত করুন। সাময়িক পরীক্ষার স্বার্থে তৈরি মক ডেমো এআই বিশ্লেষণ নিচে উপস্থাপন করা হল:\n\n${mockResponse}`,
      });
    }

    try {
      const prompt = `You are Trading Bangla AI, an elite Forex advisor versed in Smart Money Concepts (SMC), ICT rules, order blocks, FVG (Fair Value Gap), and volume layout.
Carefully inspect the last 100 Candlestick records for ${pair} in timeframe ${timeframe || 'M1'}:
- Evaluate and summarize overall Trend (Strong Bullish, Mild Bullish, Consolidated, Range Bound, or Bearish).
- Detect key Support and Resistance boundaries visible from this array.
- Detail the potential SMC / Volume block structures (e.g., is there a recognizable Bullish/Bearish Order-Block, Liquidity hunting, or premium pricing zone?).
- Point out an actionable simulation trade recommendation specifying clear entry zones, Stop Loss parameters, and Take Profit targets.

Explain your findings and outlook primarily in polite, highly advanced Bengali (বাংলা), but you can supplement with major technical names in English.
Make sure the tone is informative and the formatting is in clean Markdown lists/sections.

Candle stream structure:
${JSON.stringify(summary)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed calling Gemini AI engine." });
    }
  });

  // 2. Integration of Vite Dev Middleware / Static Build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express dev-server listening on host 0.0.0.0 and port ${PORT}`);
  });
}

startServer();
