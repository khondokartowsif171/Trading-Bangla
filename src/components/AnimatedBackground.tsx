import { useEffect, useRef } from 'react';

interface Candle {
  x: number;
  openY: number;
  highY: number;
  lowY: number;
  closeY: number;
  width: number;
  speed: number;
  opacity: number;
  isUp: boolean;
}

interface GridLine {
  y: number;
  opacity: number;
}

function generateCandles(canvasW: number, canvasH: number): Candle[] {
  const candles: Candle[] = [];
  const count = Math.floor(canvasW / 28);
  let price = canvasH / 2;

  for (let i = 0; i < count; i++) {
    const x = i * 28 + 40;
    const volatility = 12 + Math.random() * 18;
    const open = price + (Math.random() - 0.5) * volatility * 2;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    
    candles.push({
      x,
      openY: open,
      highY: high,
      lowY: low,
      closeY: close,
      width: 6 + Math.random() * 10,
      speed: 0.15 + Math.random() * 0.5,
      opacity: 0.06 + Math.random() * 0.1,
      isUp: close >= open,
    });
    price = close;
  }
  return candles;
}

function generateGrid(_canvasW: number, canvasH: number): GridLine[] {
  const lines: GridLine[] = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    lines.push({
      y: (canvasH / count) * i + canvasH * 0.08,
      opacity: 0.015 + Math.random() * 0.02,
    });
  }
  return lines;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let candles: Candle[] = [];
    let grid: GridLine[] = [];
    let offset = 0;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      candles = generateCandles(canvas!.width, canvas!.height);
      grid = generateGrid(canvas!.width, canvas!.height);
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      offset += 0.15;

      // Draw grid lines
      grid.forEach(g => {
        const y = (g.y + offset * 0.5) % canvas!.height;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(canvas!.width, y);
        ctx!.strokeStyle = `rgba(99, 102, 241, ${g.opacity})`;
        ctx!.lineWidth = 1;
        ctx!.setLineDash([4, 20]);
        ctx!.stroke();
        ctx!.setLineDash([]);
      });

      // Draw and animate candles
      candles.forEach((c, i) => {
        // Float each candle up-down with sine wave
        const floatOffset = Math.sin(offset * 0.8 + i * 0.3) * 18;
        const oy = c.openY + floatOffset;
        const hy = c.highY + floatOffset;
        const ly = c.lowY + floatOffset;
        const cy = c.closeY + floatOffset;

        const bodyTop = Math.min(oy, cy);
        const bodyH = Math.max(Math.abs(cy - oy), 1);
        const color = c.isUp ? '0, 255, 140' : '255, 80, 80';

        // Wick
        ctx!.beginPath();
        ctx!.moveTo(c.x + c.width / 2, ly);
        ctx!.lineTo(c.x + c.width / 2, hy);
        ctx!.strokeStyle = `rgba(${color}, ${c.opacity * 1.2})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();

        // Body
        ctx!.fillStyle = `rgba(${color}, ${c.opacity})`;
        ctx!.fillRect(c.x, bodyTop, c.width, bodyH);

        // Glow on body
        const glow = ctx!.createRadialGradient(c.x + c.width / 2, bodyTop + bodyH / 2, 0, c.x + c.width / 2, bodyTop + bodyH / 2, c.width * 1.5);
        glow.addColorStop(0, `rgba(${color}, ${c.opacity * 0.5})`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        ctx!.fillStyle = glow;
        ctx!.fillRect(c.x - c.width, bodyTop - 5, c.width * 3, bodyH + 10);
      });

      // Draw moving price line
      ctx!.beginPath();
      const lineY = ((Math.sin(offset * 0.4) * 80 + canvas!.height / 2) % canvas!.height);
      ctx!.moveTo(0, lineY);
      for (let x = 0; x < canvas!.width; x += 2) {
        const waveY = lineY + Math.sin(x * 0.008 + offset * 0.6) * 30 + Math.cos(x * 0.003 + offset * 0.3) * 20;
        ctx!.lineTo(x, waveY);
      }
      ctx!.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // Moving dots on the wave
      for (let i = 0; i < 3; i++) {
        const dotX = (offset * 30 + i * canvas!.width / 3) % canvas!.width;
        const dotY = lineY + Math.sin(dotX * 0.008 + offset * 0.6) * 30 + Math.cos(dotX * 0.003 + offset * 0.3) * 20;
        ctx!.beginPath();
        ctx!.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(139, 92, 246, 0.25)';
        ctx!.fill();
      }

      animId = requestAnimationFrame(animate);
    }

    resize();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}
