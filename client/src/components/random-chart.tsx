import { useState, useEffect, useRef } from "react";
import { CurrencyPair } from "@shared/schema";

interface RandomChartProps {
  pair: CurrencyPair;
  sessionId: number | null;
}

interface RandomCandle {
  time: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

export default function RandomChart({ pair }: RandomChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
  const [priceData, setPriceData] = useState<RandomCandle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(1.08500);

  useEffect(() => {
    const basePrices: Record<CurrencyPair, number> = {
      'EUR/USD': 1.08500,
      'GBP/USD': 1.26800,
      'USD/JPY': 149.250,
      'AUD/USD': 0.67800,
      'USD/CAD': 1.35200,
      'NZD/USD': 0.61500,
      'EUR/GBP': 0.85600,
      'EUR/JPY': 161.850,
    };

    let basePrice = basePrices[pair];
    let lastPrice = basePrice;
    
    // Generate initial random candles
    const initialData: RandomCandle[] = [];
    for (let i = 0; i < 80; i++) {
      const volatility = basePrice * 0.0005;
      const change = (Math.random() - 0.5) * volatility * 3;
      
      const open = lastPrice;
      const close = open + change;
      const range = Math.abs(change) * (1 + Math.random());
      const high = Math.max(open, close) + (Math.random() * range);
      const low = Math.min(open, close) - (Math.random() * range);
      
      initialData.push({
        time: Date.now() - (80 - i) * 60000,
        open,
        close,
        high,
        low,
      });
      
      lastPrice = close;
    }
    
    setPriceData(initialData);
    setCurrentPrice(lastPrice);

    // Update with new random candles every second
    const interval = setInterval(() => {
      setPriceData(prev => {
        if (prev.length === 0) return prev;
        
        const lastCandle = prev[prev.length - 1];
        const volatility = basePrice * 0.0003;
        const change = (Math.random() - 0.5) * volatility * 2;
        
        const open = lastCandle.close;
        const close = open + change;
        const range = Math.abs(change) * (1 + Math.random() * 0.5);
        const high = Math.max(open, close) + (Math.random() * range);
        const low = Math.min(open, close) - (Math.random() * range);
        
        const newCandle: RandomCandle = {
          time: Date.now(),
          open,
          close,
          high,
          low,
        };

        setCurrentPrice(close);
        
        // Keep last 80 candles
        return [...prev.slice(-79), newCandle];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pair]);

  // Chart rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const padding = { top: 20, right: 80, bottom: 40, left: 20 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Calculate price range
    const prices = priceData.map(d => [d.high, d.low]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 0.001;

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight / 10) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    if (chartType === 'line') {
      // Line chart
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      priceData.forEach((point, index) => {
        const x = padding.left + (index / (priceData.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((point.close - minPrice) / priceRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Price points
      ctx.fillStyle = '#3b82f6';
      priceData.forEach((point, index) => {
        const x = padding.left + (index / (priceData.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((point.close - minPrice) / priceRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });

    } else {
      // Candlestick chart
      const candleWidth = Math.max(3, chartWidth / priceData.length - 1);

      priceData.forEach((point, index) => {
        const x = padding.left + (index / (priceData.length - 1)) * chartWidth;
        
        const openY = padding.top + chartHeight - ((point.open - minPrice) / priceRange) * chartHeight;
        const closeY = padding.top + chartHeight - ((point.close - minPrice) / priceRange) * chartHeight;
        const highY = padding.top + chartHeight - ((point.high - minPrice) / priceRange) * chartHeight;
        const lowY = padding.top + chartHeight - ((point.low - minPrice) / priceRange) * chartHeight;

        const isGreen = point.close > point.open;
        const color = isGreen ? '#22c55e' : '#ef4444';

        // Draw wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw body
        ctx.fillStyle = color;
        const bodyHeight = Math.abs(closeY - openY) || 1;
        const bodyY = Math.min(openY, closeY);
        ctx.fillRect(x - candleWidth/2, bodyY, candleWidth, bodyHeight);
      });
    }

    // Price levels on right
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * i;
      const y = padding.top + chartHeight - (i / 5) * chartHeight;
      ctx.fillText(price.toFixed(5), padding.left + chartWidth + 10, y + 4);
    }

    // Current price line
    const currentY = padding.top + chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight;
    
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(padding.left + chartWidth, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(currentPrice.toFixed(5), padding.left + chartWidth + 10, currentY + 4);

  }, [priceData, chartType, currentPrice]);

  return (
    <div className="flex-1 bg-gray-900/30 relative overflow-hidden">
      {/* Chart Controls */}
      <div className="absolute top-4 left-4 flex space-x-2 z-10">
        <button
          onClick={() => setChartType('line')}
          className={`px-3 py-1 text-sm rounded ${chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Line
        </button>
        <button
          onClick={() => setChartType('candlestick')}
          className={`px-3 py-1 text-sm rounded ${chartType === 'candlestick' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          Candles
        </button>
      </div>

      {/* Chart Canvas */}
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Chart Info */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 text-sm">
        <div className="text-gray-400">Live Price</div>
        <div className="text-lg font-mono text-yellow-400">
          {currentPrice.toFixed(5)}
        </div>
        <div className="text-xs text-green-400 mt-1">
          +{((Math.random() - 0.5) * 0.0050).toFixed(4)} ({((Math.random() - 0.5) * 0.5).toFixed(2)}%)
        </div>
      </div>
    </div>
  );
}