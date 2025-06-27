import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type CurrencyPair, type InsertSession, type SessionStats, type InsertTrade, type TradeType } from "@shared/schema";
import RandomChart from "@/components/random-chart";

export default function MobileBacktestPage() {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>("EUR/USD");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [positionSize, setPositionSize] = useState("1.00");

  const queryClient = useQueryClient();

  // Queries
  const { data: currentPrice } = useQuery({
    queryKey: ["/api/forex/current", selectedPair],
    refetchInterval: 3000,
  });

  const { data: session } = useQuery({
    queryKey: ["/api/sessions/detail"],
    select: (data: any[]) => data.find(s => s.id === currentSessionId),
  });

  const { data: analytics } = useQuery<SessionStats>({
    queryKey: ["/api/analytics"],
    enabled: !!currentSessionId,
  });

  const { data: trades } = useQuery({
    queryKey: ["/api/trades/session"],
    enabled: !!currentSessionId,
  });

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async (data: InsertSession) => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (newSession) => {
      setCurrentSessionId(newSession.id);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/detail"] });
    },
  });

  const placeTradeMutation = useMutation({
    mutationFn: async (tradeData: InsertTrade) => {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });

  // Backtesting control functions
  const handleStepForward = async () => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${currentSessionId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: 60 * playbackSpeed }),
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/sessions/detail"] });
        setBacktestProgress(prev => Math.min(prev + 2, 100));
      }
    } catch (error) {
      console.error("Failed to step forward:", error);
    }
  };

  const handleStepBackward = async () => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${currentSessionId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: -60 * playbackSpeed }),
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/sessions/detail"] });
        setBacktestProgress(prev => Math.max(prev - 2, 0));
      }
    } catch (error) {
      console.error("Failed to step backward:", error);
    }
  };

  const handleRunStrategy = async () => {
    if (!currentSessionId) return;
    
    setIsPlaying(true);
    
    const runInterval = setInterval(async () => {
      try {
        const shouldTrade = Math.random() > 0.85;
        
        if (shouldTrade) {
          const tradeType: TradeType = Math.random() > 0.5 ? "BUY" : "SELL";
          const currentPrice = 1.08500 + (Math.random() - 0.5) * 0.001;
          
          const tradeData: InsertTrade = {
            sessionId: currentSessionId,
            currencyPair: selectedPair,
            type: tradeType,
            positionSize: "1.00",
            entryPrice: currentPrice.toString(),
            stopLoss: tradeType === "BUY" ? (currentPrice - 0.002).toString() : (currentPrice + 0.002).toString(),
            takeProfit: tradeType === "BUY" ? (currentPrice + 0.003).toString() : (currentPrice - 0.003).toString(),
            notes: `Strategy auto-trade: ${tradeType} at ${currentPrice.toFixed(5)}`,
          };

          await fetch("/api/trades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tradeData),
          });
        }

        await handleStepForward();
        
        if (backtestProgress >= 98) {
          clearInterval(runInterval);
          setIsPlaying(false);
        }
        
      } catch (error) {
        console.error("Strategy execution error:", error);
        clearInterval(runInterval);
        setIsPlaying(false);
      }
    }, 1000 / playbackSpeed);

    setTimeout(() => {
      clearInterval(runInterval);
      setIsPlaying(false);
    }, 30000);
  };

  const handleNewSession = () => {
    createSessionMutation.mutate({
      userId: 1,
      name: `Mobile Backtest ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      currencyPair: selectedPair,
      startingBalance: "10000.00",
      currentBalance: "10000.00",
      isActive: true,
      isBacktesting: true,
      currentTime: new Date('2024-01-01'),
    });
    setBacktestProgress(0);
  };

  const handlePlaceTrade = async (type: TradeType) => {
    if (!currentSessionId) return;

    const currentPriceValue = typeof currentPrice === 'number' ? currentPrice : 1.08500;
    const tradeData: InsertTrade = {
      sessionId: currentSessionId,
      currencyPair: selectedPair,
      type,
      positionSize,
      entryPrice: currentPriceValue.toString(),
      stopLoss: type === "BUY" ? (currentPriceValue - 0.002).toString() : (currentPriceValue + 0.002).toString(),
      takeProfit: type === "BUY" ? (currentPriceValue + 0.003).toString() : (currentPriceValue - 0.003).toString(),
      notes: `Mobile ${type} trade at ${currentPriceValue.toFixed(5)}`,
    };

    placeTradeMutation.mutate(tradeData);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Forex Backtest</h1>
          <button 
            onClick={handleNewSession}
            disabled={createSessionMutation.isPending}
            className="min-h-12 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium transition-all disabled:cursor-not-allowed rounded-lg text-sm"
          >
            {createSessionMutation.isPending ? "Creating..." : "New Session"}
          </button>
        </div>
        
        {/* Mobile Currency Pair Selector */}
        <select 
          value={selectedPair} 
          onChange={(e) => setSelectedPair(e.target.value as CurrencyPair)}
          className="w-full min-h-12 text-lg p-3 bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        >
          <option value="EUR/USD">EUR/USD</option>
          <option value="GBP/USD">GBP/USD</option>
          <option value="USD/JPY">USD/JPY</option>
          <option value="AUD/USD">AUD/USD</option>
          <option value="USD/CAD">USD/CAD</option>
          <option value="NZD/USD">NZD/USD</option>
          <option value="EUR/GBP">EUR/GBP</option>
          <option value="EUR/JPY">EUR/JPY</option>
        </select>
      </div>

      {/* Mobile Price Display */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 p-4 flex-shrink-0">
        <div className="text-center">
          <div className="text-sm text-gray-400 mb-1">{selectedPair}</div>
          <div className="text-3xl font-bold text-white mb-2">
            {typeof currentPrice === 'number' ? currentPrice.toFixed(5) : "1.08500"}
          </div>
          <div className="text-sm text-green-400">+0.0012 (+0.11%)</div>
        </div>
      </div>

      {/* Mobile Chart Container */}
      <div className="flex-1 bg-gray-900/30 min-h-0">
        <RandomChart pair={selectedPair} sessionId={currentSessionId} />
      </div>

      {/* Mobile Trading Controls */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-t border-gray-700/50 p-4 flex-shrink-0">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button 
            onClick={() => handlePlaceTrade("BUY")}
            disabled={!currentSessionId || placeTradeMutation.isPending}
            className="min-h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold text-lg transition-all rounded-lg active:scale-95"
          >
            {placeTradeMutation.isPending ? "..." : "BUY"}
          </button>
          <button 
            onClick={() => handlePlaceTrade("SELL")}
            disabled={!currentSessionId || placeTradeMutation.isPending}
            className="min-h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold text-lg transition-all rounded-lg active:scale-95"
          >
            {placeTradeMutation.isPending ? "..." : "SELL"}
          </button>
        </div>

        {/* Position Size Input */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300 block mb-2">Position Size (Lots)</label>
          <input 
            type="number" 
            step="0.01" 
            min="0.01" 
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            className="w-full min-h-12 text-lg p-3 bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
          />
        </div>

        {/* Mobile Portfolio Summary */}
        {analytics && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Portfolio Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-gray-400 text-xs">Balance</div>
                <div className="text-white font-medium text-lg">$10,000</div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-gray-400 text-xs">P&L</div>
                <div className={`font-medium text-lg ${analytics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${analytics.totalPnL.toFixed(0)}
                </div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-gray-400 text-xs">Win Rate</div>
                <div className="text-blue-400 font-medium text-lg">{analytics.winRate.toFixed(0)}%</div>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                <div className="text-gray-400 text-xs">Trades</div>
                <div className="text-white font-medium text-lg">{analytics.totalTrades}</div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Backtesting Controls */}
        <div className="border-t border-gray-700/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">
              Time: <span className="text-white font-mono text-xs">{session?.currentTime ? new Date(session.currentTime).toLocaleDateString() : 'Jan 1, 2024'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleStepBackward}
                disabled={!currentSessionId}
                className="min-h-10 min-w-10 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg transition-colors active:scale-95"
              >
                <svg className="w-4 h-4 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0L2.586 11a2 2 0 010-2.828L6.293 4.465a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={!currentSessionId}
                className={`min-h-10 min-w-10 ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg transition-colors active:scale-95`}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button 
                onClick={handleStepForward}
                disabled={!currentSessionId}
                className="min-h-10 min-w-10 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg transition-colors active:scale-95"
              >
                <svg className="w-4 h-4 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4.707 4.707a1 1 0 010 1.414l-4.707 4.707a1 1 0 01-1.414-1.414L15.586 11H3a1 1 0 110-2h12.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <select 
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white min-h-10"
            >
              <option value={1}>1x Speed</option>
              <option value={2}>2x Speed</option>
              <option value={4}>4x Speed</option>
              <option value={8}>8x Speed</option>
            </select>
            <button 
              onClick={handleRunStrategy}
              disabled={!currentSessionId}
              className="min-h-10 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-4 rounded-lg text-white font-medium transition-all text-sm active:scale-95"
            >
              Run Strategy
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
              style={{width: `${backtestProgress}%`}}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Jan 2024</span>
            <span>Current</span>
            <span>Dec 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
}