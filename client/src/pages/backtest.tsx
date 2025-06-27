import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RealTimeChart from "@/components/real-time-chart";
import { useTradingStore } from "@/hooks/use-trading";
import { apiRequest } from "@/lib/queryClient";
import { type CurrencyPair, type InsertSession, type SessionStats, type InsertTrade, type TradeType } from "@shared/schema";

export default function BacktestPage() {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>("EUR/USD");
  const [isPlaying, setIsPlaying] = useState(false);
  
  const queryClient = useQueryClient();
  const {
    positionSize,
    setPositionSize,
    entryPrice,
    setEntryPrice,
    stopLoss,
    setStopLoss,
    takeProfit,
    setTakeProfit,
  } = useTradingStore();

  // Create default session on mount
  const createSessionMutation = useMutation({
    mutationFn: async (data: InsertSession) => {
      const res = await apiRequest("POST", "/api/sessions", data);
      return res.json();
    },
    onSuccess: (session) => {
      setCurrentSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  useEffect(() => {
    if (!currentSessionId) {
      createSessionMutation.mutate({
        userId: 1, // Mock user ID
        name: `Trading Session ${new Date().toLocaleDateString()}`,
        currencyPair: selectedPair,
        startingBalance: "10000.00",
        currentBalance: "10000.00",
        isActive: true,
      });
    }
  }, []);

  // Fetch current session
  const { data: session } = useQuery({
    queryKey: ["/api/sessions/detail", currentSessionId],
    enabled: !!currentSessionId,
  }) as { data: any };

  // Fetch trades for current session
  const { data: trades = [] } = useQuery({
    queryKey: ["/api/trades/session", currentSessionId],
    enabled: !!currentSessionId,
  }) as { data: any[] };

  // Fetch session analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics", currentSessionId],
    enabled: !!currentSessionId,
  }) as { data: SessionStats | undefined };

  // Fetch current forex price based on session time
  const { data: currentPriceData } = useQuery({
    queryKey: ["/api/forex/current", selectedPair, currentSessionId],
    queryFn: async () => {
      const url = currentSessionId 
        ? `/api/forex/current/${selectedPair}?sessionId=${currentSessionId}`
        : `/api/forex/current/${selectedPair}`;
      const res = await fetch(url);
      return res.json();
    },
    refetchInterval: isPlaying ? 500 : 2000, // Faster updates when playing
    enabled: !!selectedPair,
  }) as { data: { pair: string; price: number; timestamp?: string } | undefined };

  // Update entry price when current price changes
  useEffect(() => {
    if (currentPriceData?.price) {
      setEntryPrice(currentPriceData.price.toString());
    }
  }, [currentPriceData?.price, setEntryPrice]);

  // Auto-advance time when playing
  useEffect(() => {
    if (!isPlaying || !currentSessionId) return;

    const interval = setInterval(async () => {
      try {
        await apiRequest("POST", `/api/backtest/${currentSessionId}/advance`, { minutes: 60 });
        queryClient.invalidateQueries({ queryKey: ["/api/sessions/detail"] });
        queryClient.invalidateQueries({ queryKey: ["/api/forex/current"] });
      } catch (error) {
        console.error("Failed to advance time:", error);
        setIsPlaying(false);
      }
    }, 2000); // Advance 1 hour every 2 seconds

    return () => clearInterval(interval);
  }, [isPlaying, currentSessionId, queryClient]);

  const handlePairChange = (pair: CurrencyPair) => {
    setSelectedPair(pair);
    if (currentSessionId) {
      // Update session currency pair
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/detail", currentSessionId] });
    }
  };

  // Trade placement mutation
  const placeTradeMutation = useMutation({
    mutationFn: async (tradeData: InsertTrade) => {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeData),
      });
      if (!response.ok) throw new Error("Failed to place trade");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      // Reset form
      setPositionSize("1.00");
      setStopLoss("");
      setTakeProfit("");
    },
  });

  const handlePlaceTrade = async (type: TradeType) => {
    if (!currentSessionId || !currentPriceData?.price || !positionSize) return;

    const entryPrice = currentPriceData.price;
    
    const tradeData: InsertTrade = {
      sessionId: currentSessionId,
      currencyPair: selectedPair,
      type,
      positionSize,
      entryPrice: entryPrice.toString(),
      stopLoss: stopLoss || null,
      takeProfit: takeProfit || null,
      notes: `${type} trade placed at ${entryPrice.toFixed(5)}`,
    };

    placeTradeMutation.mutate(tradeData);
  };

  const handleNewSession = () => {
    createSessionMutation.mutate({
      userId: 1,
      name: `Trading Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      currencyPair: selectedPair,
      startingBalance: "10000.00",
      currentBalance: "10000.00",
      isActive: true,
    });
  };

  const activeTrades = trades.filter((trade: any) => trade.status === "OPEN");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
      {/* Professional Header */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Forex Backtester Pro
              </h1>
              <p className="text-sm text-gray-400">Professional Trading Strategy Testing Platform</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
              LIVE DATA
            </div>
            <button 
              onClick={handleNewSession}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              New Session
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-5rem)]">
        {/* Left Sidebar - Trading Controls */}
        <div className="w-80 bg-gray-900/50 backdrop-blur-sm border-r border-gray-700/50 flex flex-col">
          {/* Currency Pair Selection */}
          <div className="p-6 border-b border-gray-700/50">
            <h3 className="text-lg font-semibold mb-4 text-white">Currency Pair</h3>
            <select 
              value={selectedPair} 
              onChange={(e) => setSelectedPair(e.target.value as CurrencyPair)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
            
            {/* Current Price Display */}
            <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Current Price</div>
              <div className="text-2xl font-mono font-bold text-blue-400">
                {currentPriceData?.price ? currentPriceData.price.toFixed(5) : '1.08500'}
              </div>
              <div className="text-sm text-green-400">+0.0025 (+0.23%)</div>
            </div>
          </div>

          {/* Trade Entry Form */}
          <div className="p-6 border-b border-gray-700/50">
            <h3 className="text-lg font-semibold mb-4 text-white">Place Trade</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Position Size</label>
                <input
                  type="number"
                  step="0.01"
                  value={positionSize}
                  onChange={(e) => setPositionSize(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="1.00"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Stop Loss</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Take Profit</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => handlePlaceTrade('BUY')}
                  disabled={!currentSessionId || !positionSize}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  BUY
                </button>
                <button 
                  onClick={() => handlePlaceTrade('SELL')}
                  disabled={!currentSessionId || !positionSize}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  SELL
                </button>
              </div>
            </div>
          </div>

          {/* Portfolio Stats */}
          <div className="p-6 flex-1">
            <h3 className="text-lg font-semibold mb-4 text-white">Portfolio</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Balance</div>
                <div className="text-xl font-bold text-white">
                  ${session?.currentBalance || "10,000.00"}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">P&L</div>
                <div className={`text-xl font-bold ${analytics?.totalPnL && analytics.totalPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {analytics?.totalPnL ? `$${analytics.totalPnL.toFixed(2)}` : "$0.00"}
                </div>
                <div className={`text-sm ${analytics?.totalPnL && analytics.totalPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {analytics?.totalPnL ? `${((analytics.totalPnL / 10000) * 100).toFixed(2)}%` : "0%"}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Win Rate</div>
                <div className="text-xl font-bold text-blue-400">
                  {analytics?.winRate ? `${analytics.winRate.toFixed(1)}%` : "0%"}
                </div>
                <div className="text-sm text-gray-400">
                  {analytics?.totalTrades ? `${analytics.winningTrades}/${analytics.totalTrades} trades` : "No trades yet"}
                </div>
              </div>

              {/* Active Trades */}
              {activeTrades.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-3">Active Trades</div>
                  <div className="space-y-2">
                    {activeTrades.slice(0, 3).map((trade: any) => (
                      <div key={trade.id} className="flex justify-between items-center text-xs">
                        <div className={`font-bold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.type} {trade.currencyPair}
                        </div>
                        <div className="text-white">{trade.positionSize}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Chart Header */}
          <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <h2 className="text-xl font-bold text-white">{selectedPair}</h2>
                <div className="flex space-x-1">
                  {['1M', '5M', '15M', '1H', '4H', '1D'].map((tf) => (
                    <button
                      key={tf}
                      className="px-3 py-1 text-sm rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">
                  Market: <span className="text-green-400 font-medium">OPEN</span>
                </div>
                <div className="text-sm text-gray-400">
                  Spread: <span className="text-white font-mono">1.2</span>
                </div>
              </div>
            </div>
          </div>

          <RealTimeChart pair={selectedPair} sessionId={currentSessionId} />

          {/* Time Controls */}
          <div className="bg-gray-900/50 backdrop-blur-sm border-t border-gray-700/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">
                  Backtest Time: <span className="text-white font-mono">Dec 15, 2024 14:30 UTC</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0L2.586 11a2 2 0 010-2.828L6.293 4.465a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4.707 4.707a1 1 0 010 1.414l-4.707 4.707a1 1 0 01-1.414-1.414L15.586 11H3a1 1 0 110-2h12.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">Speed:</div>
                <select className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white">
                  <option>1x</option>
                  <option>2x</option>
                  <option>4x</option>
                  <option>8x</option>
                </select>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{width: '35%'}}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Start</span>
                <span>Current Position</span>
                <span>End</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
