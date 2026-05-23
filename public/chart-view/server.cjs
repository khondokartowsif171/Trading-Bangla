var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "5mb" }));
  let aiClient = null;
  function getGenAI() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      aiClient = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return aiClient;
  }
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
      v: Math.round(c.v)
    }));
    const mockResponse = `## **Trading Bangla AI \u09AC\u09BF\u09B6\u09CD\u09B2\u09C7\u09B7\u09A3 (\u09B8\u09BF\u09AE\u09C1\u09B2\u09C7\u09B6\u09A8 \u09AE\u09CB\u09A1)**

**\u09E7. \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09AC\u09BE\u099C\u09BE\u09B0 \u099F\u09CD\u09B0\u09C7\u09A8\u09CD\u09A1 (Market Trend Analysis):**
\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 **${pair}** \u099C\u09CB\u09DC\u09BE\u099F\u09BF \u099F\u09BE\u0987\u09AE\u09AB\u09CD\u09B0\u09C7\u09AE **${timeframe || "M1"}** \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u098F\u0995\u099F\u09BF \u09AE\u09BE\u099D\u09BE\u09B0\u09BF \u0986\u0995\u09BE\u09B0\u09C7\u09B0 \u09B0\u09BF\u09AD\u09BE\u09B0\u09CD\u09B8\u09BE\u09B2 \u09AE\u09C7\u0995\u09BE\u09A8\u09BF\u099C\u09AE\u09C7 \u0985\u09AC\u09B8\u09CD\u09A5\u09BE\u09A8 \u0995\u09B0\u099B\u09C7\u0964 \u09AC\u09BF\u0997\u09A4 \u09E7\u09E6\u09E6 \u0995\u09CD\u09AF\u09BE\u09A8\u09CD\u09A1\u09C7\u09B2\u09C7\u09B0 \u09AA\u09CD\u09AF\u09BE\u099F\u09BE\u09B0\u09CD\u09A8 \u0985\u09A8\u09CD\u09AC\u09C7\u09B7\u09A3\u09C7 \u09A6\u09C7\u0996\u09BE \u09AF\u09BE\u09DF \u09AF\u09C7 \u09AC\u09BF\u0995\u09CD\u09B0\u09C7\u09A4\u09BE\u09A6\u09C7\u09B0 \u099A\u09BE\u09AA \u09AC\u09BE \u09B8\u09C7\u09B2\u09BF\u0982 \u09AE\u09CB\u09AE\u09C7\u09A8\u09CD\u099F\u09BE\u09AE \u09A7\u09C0\u09B0\u09C7 \u09A7\u09C0\u09B0\u09C7 \u09A6\u09C1\u09B0\u09CD\u09AC\u09B2 \u09B9\u09DF\u09C7 \u0986\u09B8\u099B\u09C7 \u098F\u09AC\u0982 \u0995\u09CD\u09B0\u09C7\u09A4\u09BE\u09B0\u09BE \u09AE\u09BE\u09B0\u09CD\u0995\u09C7\u099F\u09C7 \u09AA\u09C1\u09A8\u09B0\u09BE\u09DF \u09AA\u09C1\u09B6 \u0995\u09B0\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u099B\u09C7\u0964

**\u09E8. \u0995\u09BE\u09B0\u09BF\u0997\u09B0\u09BF \u09B8\u09BE\u09AA\u09CB\u09B0\u09CD\u099F \u0993 \u09B0\u09C7\u099C\u09BF\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8 \u09B2\u09C7\u09AD\u09C7\u09B2 \u0993 \u0995\u09C0-\u09B8\u09C1\u0987\u0982 \u099C\u09CB\u09A8:**
- **\u09B6\u0995\u09CD\u09A4\u09BF\u09B6\u09BE\u09B2\u09C0 \u09B8\u09BE\u09AA\u09CB\u09B0\u09CD\u099F (Key Support Area):** ${last100[last100.length - 1]?.l.toFixed(5)} \u09B2\u09C7\u09AD\u09C7\u09B2\u0964
- **\u09AA\u09CD\u09B0\u09A7\u09BE\u09A8 \u09B0\u09C7\u099C\u09BF\u09B8\u09CD\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8 (Key Resistance Area):** ${(last100[last100.length - 1]?.h * 1.0015).toFixed(5)} \u099C\u09CB\u09A8\u0964
- **\u09AC\u09BE\u099C\u09BE\u09B0\u09C7\u09B0 \u099A\u09B0\u09AE \u09B9\u09BE\u0987 \u0993 \u09B2\u09CB \u09B8\u09C1\u0987\u0982:** \u09B9\u09BE\u0987 \u099C\u09CB\u09A8 ${(last100[last100.length - 1]?.c * 1.003).toFixed(5)} \u098F\u09AC\u0982 \u09B2\u09CB \u099C\u09CB\u09A8 ${(last100[last100.length - 1]?.c * 0.997).toFixed(5)}\u0964

**\u09E9. \u09B8\u09CD\u09AE\u09BE\u09B0\u09CD\u099F \u09AE\u09BE\u09A8\u09BF \u0995\u09A8\u09B8\u09C7\u09AA\u09CD\u099F (Smart Money Concepts / SMC - ICT Insight):**
- **\u09AC\u09C1\u09B2\u09BF\u09B6 \u0985\u09B0\u09CD\u09A1\u09BE\u09B0 \u09AC\u09CD\u09B2\u0995 (Bullish OB):** \u09AE\u09BE\u09B0\u09CD\u0995\u09C7\u099F ${last100[last100.length - 1]?.l.toFixed(5)} \u098F\u09B0 \u09B8\u09C0\u09AE\u09BE\u09A8\u09BE\u09DF \u09A8\u09A4\u09C1\u09A8 \u0995\u09B0\u09C7 \u09AA\u099C\u09BF\u09B6\u09A8 \u09B8\u0982\u0995\u09C1\u099A\u09BF\u09A4 \u0995\u09B0\u09C7\u099B\u09C7 \u09AF\u09BE \u09B0\u09BF\u09DF\u09C7\u09B2-\u099F\u09BE\u0987\u09AE \u09AC\u09BE\u0987 \u099C\u09CB\u09A8\u09C7\u09B0 \u0987\u0999\u09CD\u0997\u09BF\u09A4 \u09AC\u09B9\u09A8 \u0995\u09B0\u09C7\u0964
- **\u09B2\u09BF\u0995\u09C1\u0987\u09A1\u09BF\u099F\u09BF \u0993\u09DF\u09BE\u09B6\u0986\u0989\u099F (Liquidity Grab):** \u09AC\u09BF\u0997\u09A4 \u09E8\u09E6 \u0995\u09CD\u09AF\u09BE\u09A8\u09CD\u09A1\u09C7\u09B2 \u0986\u0997\u09C7 \u09AB\u09C7\u09DF\u09BE\u09B0 \u09AD\u09CD\u09AF\u09BE\u09B2\u09C1 \u0997\u09CD\u09AF\u09BE\u09AA (FVG) \u0986\u0982\u09B6\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u09AA\u09C2\u09B0\u09A3 \u09B9\u09DF\u09C7 \u09AE\u09BE\u09B0\u09CD\u0995\u09C7\u099F \u0989\u09AA\u09B0\u09C7\u09B0 \u09A6\u09BF\u0995\u09C7 \u09B0\u0993\u09A8\u09BE \u09A6\u09BF\u09DF\u09C7\u099B\u09C7\u0964 \u098F\u099F\u09BF \u098F\u0995\u099F\u09BF \u099F\u09CD\u09B0\u09C7\u0987\u09B2 \u09AE\u09BE\u09B0\u09CD\u0995\u09C7\u099F \u09B8\u09C7\u099F\u0986\u09AA\u0964

**\u09EA. \u099F\u09C7\u0995\u09A8\u09BF\u0995\u09CD\u09AF\u09BE\u09B2 \u09B8\u09BF\u0997\u09A8\u09CD\u09AF\u09BE\u09B2 \u0993 \u099F\u09CD\u09B0\u09C7\u09A1 \u09AA\u09B0\u09BE\u09AE\u09B0\u09CD\u09B6 (Suggested Action):**
- **\u0985\u09CD\u09AF\u09BE\u0995\u09B6\u09A8:** **BUY / LONG**
- **\u09B8\u09C1\u09AC\u09BF\u09A7\u09BE\u099C\u09A8\u0995 \u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF \u09AA\u09DF\u09C7\u09A8\u09CD\u099F:** ${last100[last100.length - 1]?.c.toFixed(5)}
- **\u09B8\u09CD\u099F\u09AA \u09B2\u09B8 (SL):** ${(last100[last100.length - 1]?.c * 0.9985).toFixed(5)}
- **\u099F\u09C7\u0995 \u09AA\u09CD\u09B0\u09AB\u09BF\u099F (TP):** ${(last100[last100.length - 1]?.c * 1.0035).toFixed(5)}

*\u09B8\u09A4\u09B0\u09CD\u0995\u09A4\u09BE: \u098F\u099F\u09BF \u098F\u0986\u0987-\u098F\u09B0 \u09AE\u0995 \u09AC\u09BF\u09B6\u09CD\u09B2\u09C7\u09B7\u09A3\u0964 \u099F\u09CD\u09B0\u09C7\u09A1 \u0995\u09B0\u09BE\u09B0 \u0986\u0997\u09C7 \u0985\u09AC\u09B6\u09CD\u09AF\u0987 \u0986\u09AA\u09A8\u09BE\u09B0 \u099D\u09C1\u0981\u0995\u09BF \u09B8\u099A\u09C7\u09A4\u09A8\u09A4\u09BE \u09A8\u09BF\u099C\u09C7 \u09A8\u09BF\u09B0\u09C2\u09AA\u09A3 \u0995\u09B0\u09C7 \u09A1\u09CD\u09B0\u09DF\u09BF\u0982 \u099F\u09C1\u09B2 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964*`;
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        analysis: `\u26A0\uFE0F **Gemini API Key \u0996\u09C1\u0981\u099C\u09C7 \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF!**

\u09B0\u09BF\u09AF\u09BC\u09C7\u09B2-\u099F\u09BE\u0987\u09AE \u098F\u0986\u0987 \u09AE\u09A1\u09C7\u09B2 \u0995\u09BE\u09A8\u09C7\u0995\u09B6\u09A8\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u098F\u0986\u0987 \u09B8\u09CD\u099F\u09C1\u09A1\u09BF\u0993\u09B0 **Settings > Secrets** \u09A5\u09C7\u0995\u09C7 **GEMINI_API_KEY** \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C1\u09A8\u0964 \u09B8\u09BE\u09AE\u09AF\u09BC\u09BF\u0995 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0 \u09B8\u09CD\u09AC\u09BE\u09B0\u09CD\u09A5\u09C7 \u09A4\u09C8\u09B0\u09BF \u09AE\u0995 \u09A1\u09C7\u09AE\u09CB \u098F\u0986\u0987 \u09AC\u09BF\u09B6\u09CD\u09B2\u09C7\u09B7\u09A3 \u09A8\u09BF\u099A\u09C7 \u0989\u09AA\u09B8\u09CD\u09A5\u09BE\u09AA\u09A8 \u0995\u09B0\u09BE \u09B9\u09B2:

${mockResponse}`
      });
    }
    try {
      const prompt = `You are Trading Bangla AI, an elite Forex advisor versed in Smart Money Concepts (SMC), ICT rules, order blocks, FVG (Fair Value Gap), and volume layout.
Carefully inspect the last 100 Candlestick records for ${pair} in timeframe ${timeframe || "M1"}:
- Evaluate and summarize overall Trend (Strong Bullish, Mild Bullish, Consolidated, Range Bound, or Bearish).
- Detect key Support and Resistance boundaries visible from this array.
- Detail the potential SMC / Volume block structures (e.g., is there a recognizable Bullish/Bearish Order-Block, Liquidity hunting, or premium pricing zone?).
- Point out an actionable simulation trade recommendation specifying clear entry zones, Stop Loss parameters, and Take Profit targets.

Explain your findings and outlook primarily in polite, highly advanced Bengali (\u09AC\u09BE\u0982\u09B2\u09BE), but you can supplement with major technical names in English.
Make sure the tone is informative and the formatting is in clean Markdown lists/sections.

Candle stream structure:
${JSON.stringify(summary)}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      res.json({ analysis: response.text });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed calling Gemini AI engine." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express dev-server listening on host 0.0.0.0 and port ${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
