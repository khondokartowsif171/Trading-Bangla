/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * World-Class Candlestick Rendering Engine
 * Professional-grade TradingView-style candlestick rendering with real-time optimization
 */

import { Candle } from '../types';

export interface CandleRenderConfig {
  width: number;
  height: number;
  candleWidth: number;
  wickWidth: number;
  bullColor: string;
  bearColor: string;
  wickColor: string;
  showBorder: boolean;
  borderColor: string;
  borderWidth: number;
  antiAlias: boolean;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  highlightColor: string;
}

export interface PriceRange {
  min: number;
  max: number;
  padding: number;
}

export interface CandleCoordinates {
  x: number;
  y: number;
  height: number;
  wickX: number;
  open: number;
  close: number;
  high: number;
  low: number;
  isBull: boolean;
}

/**
 * World-class candlestick rendering engine
 * Optimized for real-time performance and professional appearance
 */
export class CandlestickRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: CandleRenderConfig;
  private dpr: number; // Device pixel ratio for high-DPI displays

  constructor(ctx: CanvasRenderingContext2D, config: Partial<CandleRenderConfig> = {}) {
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;

    // Default professional configuration
    this.config = {
      width: 800,
      height: 400,
      candleWidth: 10,
      wickWidth: 1,
      bullColor: '#00FF00',
      bearColor: '#FF0000',
      wickColor: '#888888',
      showBorder: true,
      borderColor: '#333333',
      borderWidth: 1,
      antiAlias: true,
      shadowEnabled: false,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowBlur: 2,
      highlightColor: 'rgba(255, 255, 0, 0.1)',
      ...config,
    };
  }

  /**
   * Calculate price range with optimal padding
   */
  public calculatePriceRange(candles: Candle[]): PriceRange {
    if (candles.length === 0) return { min: 0, max: 100, padding: 10 };

    const prices = candles.flatMap(c => [c.h, c.l]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    const padding = range * 0.05; // 5% padding

    return {
      min: minPrice - padding,
      max: maxPrice + padding,
      padding,
    };
  }

  /**
   * Convert price to canvas Y coordinate (inverted)
   */
  private priceToY(price: number, priceRange: PriceRange, chartHeight: number): number {
    const ratio = (price - priceRange.min) / (priceRange.max - priceRange.min);
    return chartHeight - (ratio * chartHeight);
  }

  /**
   * Calculate candlestick coordinates for rendering
   */
  public calculateCoordinates(
    candle: Candle,
    index: number,
    candles: Candle[],
    priceRange: PriceRange,
    chartWidth: number,
    chartHeight: number,
    offset: number
  ): CandleCoordinates {
    const candleIndex = index - offset;
    const x = candleIndex * this.config.candleWidth + this.config.candleWidth / 2;

    const open = this.priceToY(candle.o, priceRange, chartHeight);
    const close = this.priceToY(candle.c, priceRange, chartHeight);
    const high = this.priceToY(candle.h, priceRange, chartHeight);
    const low = this.priceToY(candle.l, priceRange, chartHeight);

    const isBull = candle.c >= candle.o;
    const bodyTop = isBull ? close : open;
    const bodyHeight = Math.abs(close - open) || 1; // Minimum 1px

    return {
      x,
      y: bodyTop,
      height: bodyHeight,
      wickX: x,
      open: candle.o,
      close: candle.c,
      high: candle.h,
      low: candle.l,
      isBull,
    };
  }

  /**
   * Render a single candlestick (optimized for performance)
   */
  public renderCandle(coords: CandleCoordinates): void {
    const halfWidth = this.config.candleWidth / 2 - 1;

    // Shadow (optional, for depth)
    if (this.config.shadowEnabled) {
      this.ctx.fillStyle = this.config.shadowColor;
      this.ctx.filter = `blur(${this.config.shadowBlur}px)`;
      this.ctx.fillRect(coords.x - halfWidth, coords.y, this.config.candleWidth - 2, coords.height);
      this.ctx.filter = 'none';
    }

    // Wick (high-low line)
    this.renderWick(coords);

    // Body (open-close rectangle)
    this.renderBody(coords, halfWidth);

    // Border (optional outline)
    if (this.config.showBorder) {
      this.renderBorder(coords, halfWidth);
    }
  }

  /**
   * Render candlestick wick (high-low line)
   */
  private renderWick(coords: CandleCoordinates): void {
    this.ctx.strokeStyle = this.config.wickColor;
    this.ctx.lineWidth = this.config.wickWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(coords.wickX, coords.y - Math.abs(coords.close - this.priceToY(coords.high, this.calculatePriceRange([]), this.config.height)));
    this.ctx.lineTo(coords.wickX, coords.y + Math.abs(this.priceToY(coords.low, this.calculatePriceRange([]), this.config.height) - coords.y));
    this.ctx.stroke();
  }

  /**
   * Render candlestick body (open-close rectangle)
   */
  private renderBody(coords: CandleCoordinates, halfWidth: number): void {
    const color = coords.isBull ? this.config.bullColor : this.config.bearColor;
    this.ctx.fillStyle = color;

    // Rounded corners for professional appearance
    const radius = 2;
    this.roundRect(
      coords.x - halfWidth,
      coords.y,
      this.config.candleWidth - 2,
      coords.height,
      radius
    );
    this.ctx.fill();
  }

  /**
   * Render candlestick border
   */
  private renderBorder(coords: CandleCoordinates, halfWidth: number): void {
    this.ctx.strokeStyle = this.config.borderColor;
    this.ctx.lineWidth = this.config.borderWidth;

    const radius = 2;
    this.roundRect(
      coords.x - halfWidth,
      coords.y,
      this.config.candleWidth - 2,
      coords.height,
      radius
    );
    this.ctx.stroke();
  }

  /**
   * Draw rounded rectangle (utility)
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Render multiple candlesticks (batch optimized)
   */
  public renderCandles(
    candles: Candle[],
    priceRange: PriceRange,
    chartWidth: number,
    chartHeight: number,
    offset: number,
    visibleRange: { start: number; end: number }
  ): void {
    // Only render visible candles for performance
    for (let i = visibleRange.start; i < visibleRange.end && i < candles.length; i++) {
      const coords = this.calculateCoordinates(
        candles[i],
        i,
        candles,
        priceRange,
        chartWidth,
        chartHeight,
        offset
      );

      if (coords.x + this.config.candleWidth / 2 > 0 && coords.x - this.config.candleWidth / 2 < chartWidth) {
        this.renderCandle(coords);
      }
    }
  }

  /**
   * Render Heikin-Ashi candlesticks
   */
  public renderHeikinAshi(
    candles: Candle[],
    priceRange: PriceRange,
    chartWidth: number,
    chartHeight: number,
    offset: number,
    visibleRange: { start: number; end: number }
  ): void {
    const ha = this.convertToHeikinAshi(candles);

    for (let i = visibleRange.start; i < visibleRange.end && i < ha.length; i++) {
      const coords = this.calculateCoordinates(
        ha[i],
        i,
        ha,
        priceRange,
        chartWidth,
        chartHeight,
        offset
      );

      if (coords.x + this.config.candleWidth / 2 > 0 && coords.x - this.config.candleWidth / 2 < chartWidth) {
        this.renderCandle(coords);
      }
    }
  }

  /**
   * Convert to Heikin-Ashi candles
   */
  private convertToHeikinAshi(candles: Candle[]): Candle[] {
    const ha: Candle[] = [];

    for (let i = 0; i < candles.length; i++) {
      const curr = candles[i];
      const ha_close = (curr.o + curr.h + curr.l + curr.c) / 4;
      const ha_open = i === 0 ? (curr.o + curr.c) / 2 : (ha[i - 1].o + ha[i - 1].c) / 2;
      const ha_high = Math.max(curr.h, ha_open, ha_close);
      const ha_low = Math.min(curr.l, ha_open, ha_close);

      ha.push({
        t: curr.t,
        o: ha_open,
        h: ha_high,
        l: ha_low,
        c: ha_close,
        v: curr.v,
      });
    }

    return ha;
  }

  /**
   * Render bar chart (OHLC bars)
   */
  public renderBars(
    candles: Candle[],
    priceRange: PriceRange,
    chartWidth: number,
    chartHeight: number,
    offset: number,
    visibleRange: { start: number; end: number }
  ): void {
    for (let i = visibleRange.start; i < visibleRange.end && i < candles.length; i++) {
      const candle = candles[i];
      const coords = this.calculateCoordinates(
        candle,
        i,
        candles,
        priceRange,
        chartWidth,
        chartHeight,
        offset
      );

      if (coords.x + this.config.candleWidth / 2 > 0 && coords.x - this.config.candleWidth / 2 < chartWidth) {
        const color = coords.isBull ? this.config.bullColor : this.config.bearColor;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.config.candleWidth - 2;
        this.ctx.lineCap = 'round';

        // Vertical line for high-low
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y - (this.priceToY(candle.h, priceRange, chartHeight) - coords.y));
        this.ctx.lineTo(coords.x, coords.y + (coords.y - this.priceToY(candle.l, priceRange, chartHeight)));
        this.ctx.stroke();

        // Horizontal marks for open-close
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x - this.config.candleWidth / 2, this.priceToY(candle.o, priceRange, chartHeight));
        this.ctx.lineTo(coords.x, this.priceToY(candle.o, priceRange, chartHeight));
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, this.priceToY(candle.c, priceRange, chartHeight));
        this.ctx.lineTo(coords.x + this.config.candleWidth / 2, this.priceToY(candle.c, priceRange, chartHeight));
        this.ctx.stroke();
      }
    }
  }

  /**
   * Render line chart
   */
  public renderLine(
    candles: Candle[],
    priceRange: PriceRange,
    chartWidth: number,
    chartHeight: number,
    offset: number,
    visibleRange: { start: number; end: number }
  ): void {
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();

    for (let i = visibleRange.start; i < visibleRange.end && i < candles.length; i++) {
      const candleIndex = i - offset;
      const x = candleIndex * this.config.candleWidth + this.config.candleWidth / 2;
      const y = this.priceToY(candles[i].c, priceRange, chartHeight);

      if (i === visibleRange.start) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();
  }

  /**
   * Render area chart (filled under the line)
   */
  public renderArea(
    candles: Candle[],
    priceRange: PriceRange,
    chartWidth: number,
    chartHeight: number,
    offset: number,
    visibleRange: { start: number; end: number }
  ): void {
    this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();

    for (let i = visibleRange.start; i < visibleRange.end && i < candles.length; i++) {
      const candleIndex = i - offset;
      const x = candleIndex * this.config.candleWidth + this.config.candleWidth / 2;
      const y = this.priceToY(candles[i].c, priceRange, chartHeight);

      if (i === visibleRange.start) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    // Close the path by going to the bottom-right, then bottom-left
    const lastCandleIndex = Math.min(visibleRange.end - 1, candles.length - 1) - offset;
    const lastX = lastCandleIndex * this.config.candleWidth + this.config.candleWidth / 2;
    
    this.ctx.lineTo(lastX, chartHeight);
    this.ctx.lineTo((visibleRange.start - offset) * this.config.candleWidth + this.config.candleWidth / 2, chartHeight);
    this.ctx.closePath();

    this.ctx.fill();
    this.ctx.stroke();
  }

  /**
   * Draw crosshair for price info
   */
  public drawCrosshair(x: number, y: number, chartWidth: number, chartHeight: number): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, chartHeight);
    this.ctx.stroke();

    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(chartWidth, y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  /**
   * Highlight a candlestick (for hover effects)
   */
  public highlightCandle(coords: CandleCoordinates, halfWidth: number): void {
    this.ctx.fillStyle = this.config.highlightColor;
    this.roundRect(
      coords.x - halfWidth,
      coords.y,
      this.config.candleWidth - 2,
      coords.height,
      2
    );
    this.ctx.fill();
  }

  /**
   * Clear canvas
   */
  public clear(): void {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);
  }

  /**
   * Draw grid lines for reference
   */
  public drawGrid(chartWidth: number, chartHeight: number, priceRange: PriceRange, gridSpacing: number = 50): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    // Horizontal grid
    for (let y = 0; y < chartHeight; y += gridSpacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(chartWidth, y);
      this.ctx.stroke();
    }

    // Vertical grid
    for (let x = 0; x < chartWidth; x += this.config.candleWidth * 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, chartHeight);
      this.ctx.stroke();
    }
  }
}
