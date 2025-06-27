import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Edit, Slash, Minus } from "lucide-react";
import { type CurrencyPair, type Trade, type ForexPrice } from "@shared/schema";

interface TradingChartProps {
  pair: CurrencyPair;
  currentPrice?: number;
  trades: Trade[];
}

const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D"];

export default function TradingChart({ pair, currentPrice, trades }: TradingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1H");
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch forex price data
  const { data: priceData = [] } = useQuery({
    queryKey: ["/api/forex/prices", pair],
  }) as { data: ForexPrice[] };

  const formatTime = (date: Date): string => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  };

  const formatPrice = (price: number): string => {
    return price.toFixed(5);
  };

  const calculatePriceChange = (): { change: number; percentage: number } => {
    if (priceData.length < 2) return { change: 0, percentage: 0 };
    
    const latest = parseFloat(priceData[priceData.length - 1]?.close || "0");
    const previous = parseFloat(priceData[priceData.length - 2]?.close || "0");
    const change = latest - previous;
    const percentage = (change / previous) * 100;
    
    return { change, percentage };
  };

  const { change, percentage } = calculatePriceChange();

  // Generate price levels for Y-axis
  const generatePriceLevels = (): number[] => {
    if (!currentPrice) return [];
    
    const levels = [];
    const basePrice = currentPrice;
    const step = 0.001; // 10 pips
    
    for (let i = -4; i <= 4; i++) {
      levels.push(basePrice + (i * step));
    }
    
    return levels.reverse();
  };

  const priceLevels = generatePriceLevels();

  return (
    <div className="flex-1 bg-gray-900 relative">
      {/* Chart Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 trading-surface rounded-lg p-2 border border-gray-700">
        <Button
          size="sm"
          variant={chartType === "line" ? "default" : "ghost"}
          onClick={() => setChartType("line")}
          className="text-xs"
        >
          <TrendingUp className="mr-1 h-3 w-3" />
          Line
        </Button>
        <Button
          size="sm"
          variant={chartType === "candle" ? "default" : "ghost"}
          onClick={() => setChartType("candle")}
          className="text-xs"
        >
          <BarChart3 className="mr-1 h-3 w-3" />
          Candle
        </Button>
        <div className="w-px h-6 bg-gray-600"></div>
        <Button size="sm" variant="ghost" className="text-xs" title="Drawing Tools">
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" title="Trend Line">
          <Slash className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" title="Support/Resistance">
          <Minus className="h-3 w-3" />
        </Button>
      </div>

      {/* Timeframe Selector */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-1 trading-surface rounded-lg p-1 border border-gray-700">
        {timeframes.map((timeframe) => (
          <Button
            key={timeframe}
            size="sm"
            variant={selectedTimeframe === timeframe ? "default" : "ghost"}
            onClick={() => setSelectedTimeframe(timeframe)}
            className="text-xs px-3 py-1"
          >
            {timeframe}
          </Button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="w-full h-full bg-gray-900 relative overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Chart Content */}
        <div className="absolute inset-0 p-8">
          {/* Y-axis price labels */}
          <div className="absolute right-4 top-20 bottom-20 flex flex-col justify-between text-xs trading-text-muted font-mono">
            {priceLevels.map((price, index) => (
              <span
                key={index}
                className={`${
                  index === Math.floor(priceLevels.length / 2) 
                    ? "text-yellow-400 font-semibold" 
                    : ""
                }`}
              >
                {formatPrice(price)}
              </span>
            ))}
          </div>
          
          {/* Chart Visualization */}
          <div className="h-full flex items-center justify-center">
            {priceData.length > 0 ? (
              <div className="w-full h-full relative">
                {chartType === "line" ? (
                  /* Line Chart */
                  <svg className="w-full h-full">
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      points={priceData
                        .slice(-100) // Show last 100 data points
                        .map((price, index) => {
                          const x = (index / 99) * 90 + 5; // 5% margin on each side
                          const minPrice = Math.min(...priceData.slice(-100).map(p => parseFloat(p.close)));
                          const maxPrice = Math.max(...priceData.slice(-100).map(p => parseFloat(p.close)));
                          const priceRange = maxPrice - minPrice || 1;
                          const y = 10 + ((maxPrice - parseFloat(price.close)) / priceRange) * 80; // 10% margin top/bottom
                          return `${x}%,${y}%`;
                        })
                        .join(" ")}
                    />
                    {/* Price action dots */}
                    {priceData.slice(-100).map((price, index) => {
                      const x = (index / 99) * 90 + 5;
                      const minPrice = Math.min(...priceData.slice(-100).map(p => parseFloat(p.close)));
                      const maxPrice = Math.max(...priceData.slice(-100).map(p => parseFloat(p.close)));
                      const priceRange = maxPrice - minPrice || 1;
                      const y = 10 + ((maxPrice - parseFloat(price.close)) / priceRange) * 80;
                      return (
                        <circle
                          key={price.id}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="2"
                          fill="#3b82f6"
                          opacity="0.7"
                        />
                      );
                    })}
                  </svg>
                ) : (
                  /* Candlestick Chart */
                  <svg className="w-full h-full">
                    {priceData.slice(-50).map((price, index) => {
                      const x = (index / 49) * 90 + 5;
                      const minPrice = Math.min(...priceData.slice(-50).map(p => Math.min(parseFloat(p.high), parseFloat(p.low))));
                      const maxPrice = Math.max(...priceData.slice(-50).map(p => Math.max(parseFloat(p.high), parseFloat(p.low))));
                      const priceRange = maxPrice - minPrice || 1;
                      
                      const open = parseFloat(price.open);
                      const close = parseFloat(price.close);
                      const high = parseFloat(price.high);
                      const low = parseFloat(price.low);
                      
                      const openY = 10 + ((maxPrice - open) / priceRange) * 80;
                      const closeY = 10 + ((maxPrice - close) / priceRange) * 80;
                      const highY = 10 + ((maxPrice - high) / priceRange) * 80;
                      const lowY = 10 + ((maxPrice - low) / priceRange) * 80;
                      
                      const isGreen = close > open;
                      const bodyTop = Math.min(openY, closeY);
                      const bodyHeight = Math.abs(closeY - openY) || 1;
                      
                      return (
                        <g key={price.id}>
                          {/* Wick */}
                          <line
                            x1={`${x}%`}
                            y1={`${highY}%`}
                            x2={`${x}%`}
                            y2={`${lowY}%`}
                            stroke={isGreen ? "#22c55e" : "#ef4444"}
                            strokeWidth="1"
                          />
                          {/* Body */}
                          <rect
                            x={`${x - 0.5}%`}
                            y={`${bodyTop}%`}
                            width="1%"
                            height={`${(bodyHeight / window.innerHeight) * 100 * 5}%`}
                            fill={isGreen ? "#22c55e" : "#ef4444"}
                            opacity="0.8"
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Loading Chart Data...</p>
                <p className="text-sm">Real-time {pair} forex visualization</p>
              </div>
            )}
          </div>
          
          {/* Trade Markers */}
          {trades.map((trade, index) => (
            <div
              key={trade.id}
              className={`absolute w-3 h-3 rounded-full border-2 border-white ${
                trade.type === "BUY" ? "bg-green-500" : "bg-red-500"
              }`}
              style={{
                left: `${30 + index * 10}%`,
                top: `${40 + (index % 3) * 10}%`,
              }}
              title={`${trade.type} Entry: ${parseFloat(trade.entryPrice).toFixed(4)}`}
            />
          ))}
        </div>
      </div>
      
      {/* Chart Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 trading-surface border-t border-gray-700 px-4 py-2 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-6 trading-text-muted">
          <span className="trading-text font-semibold">{pair}</span>
          {currentPrice && (
            <>
              <span className="font-mono trading-text text-lg">{formatPrice(currentPrice)}</span>
              <span className={`${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {change >= 0 ? "+" : ""}{change.toFixed(5)} ({percentage >= 0 ? "+" : ""}{percentage.toFixed(2)}%)
              </span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4 trading-text-muted text-xs">
          <span>Spread: 1.2</span>
          <span>Vol: {priceData[priceData.length - 1]?.volume?.toLocaleString() || "0"}</span>
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
}
