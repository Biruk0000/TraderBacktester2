import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { CurrencyPair, ForexPrice } from "@shared/schema";

interface RealTimeChartProps {
  pair: CurrencyPair;
  sessionId: number | null;
}

export default function RealTimeChart({ pair, sessionId }: RealTimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
  const [timeframe, setTimeframe] = useState('1H');

  // Fetch price data
  const { data: priceData = [] } = useQuery({
    queryKey: ["/api/forex/prices", pair],
    refetchInterval: 2000,
  }) as { data: ForexPrice[] };

  // Current price
  const { data: currentPrice } = useQuery({
    queryKey: ["/api/forex/current", pair, sessionId],
    queryFn: async () => {
      const url = sessionId 
        ? `/api/forex/current/${pair}?sessionId=${sessionId}`
        : `/api/forex/current/${pair}`;
      const res = await fetch(url);
      return res.json();
    },
    refetchInterval: 500,
  }) as { data: { price: number } | undefined };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !priceData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Chart configuration
    const padding = { top: 20, right: 80, bottom: 40, left: 20 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    // Get recent data points
    const recentData = priceData.slice(-100);
    if (recentData.length === 0) return;

    // Calculate price range
    const prices = recentData.map(d => [parseFloat(d.high), parseFloat(d.low)]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 0.001;

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight / 10) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    if (chartType === 'line') {
      // Draw line chart
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      recentData.forEach((point, index) => {
        const x = padding.left + (index / (recentData.length - 1)) * chartWidth;
        const price = parseFloat(point.close);
        const y = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw price points
      ctx.fillStyle = '#3b82f6';
      recentData.forEach((point, index) => {
        const x = padding.left + (index / (recentData.length - 1)) * chartWidth;
        const price = parseFloat(point.close);
        const y = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

    } else {
      // Draw candlestick chart
      const candleWidth = Math.max(2, chartWidth / recentData.length - 2);

      recentData.forEach((point, index) => {
        const x = padding.left + (index / (recentData.length - 1)) * chartWidth;
        const open = parseFloat(point.open);
        const close = parseFloat(point.close);
        const high = parseFloat(point.high);
        const low = parseFloat(point.low);

        const openY = padding.top + chartHeight - ((open - minPrice) / priceRange) * chartHeight;
        const closeY = padding.top + chartHeight - ((close - minPrice) / priceRange) * chartHeight;
        const highY = padding.top + chartHeight - ((high - minPrice) / priceRange) * chartHeight;
        const lowY = padding.top + chartHeight - ((low - minPrice) / priceRange) * chartHeight;

        const isGreen = close > open;
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

    // Draw price levels on the right
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * i;
      const y = padding.top + chartHeight - (i / 5) * chartHeight;
      
      ctx.fillText(price.toFixed(5), padding.left + chartWidth + 10, y + 4);
    }

    // Highlight current price
    if (currentPrice) {
      const currentY = padding.top + chartHeight - ((currentPrice.price - minPrice) / priceRange) * chartHeight;
      
      // Current price line
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
      ctx.fillText(currentPrice.price.toFixed(5), padding.left + chartWidth + 10, currentY + 4);
    }

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

      {/* Main Chart Canvas */}
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading State */}
      {!priceData.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading market data...</p>
          </div>
        </div>
      )}

      {/* Chart Info */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 text-sm">
        <div className="text-gray-400">Current Price</div>
        <div className="text-lg font-mono text-yellow-400">
          {currentPrice ? currentPrice.price.toFixed(5) : '---'}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {priceData.length} data points
        </div>
      </div>
    </div>
  );
}