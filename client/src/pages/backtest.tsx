import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import HeaderNavigation from "@/components/header-navigation";
import Sidebar from "@/components/sidebar";
import TradingChart from "@/components/trading-chart";
import BottomPanel from "@/components/bottom-panel";
import TradeModal from "@/components/trade-modal";
import TimeControls from "@/components/time-controls";
import { useTradingStore } from "@/hooks/use-trading";
import { apiRequest } from "@/lib/queryClient";
import { type CurrencyPair, type InsertSession, type SessionStats } from "@shared/schema";

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

  // Fetch current forex price
  const { data: currentPriceData } = useQuery({
    queryKey: ["/api/forex/current", selectedPair],
    refetchInterval: isPlaying ? 1000 : 5000, // Faster updates when playing
  }) as { data: { pair: string; price: number } | undefined };

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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <HeaderNavigation onNewSession={handleNewSession} />
      
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <Sidebar
          selectedPair={selectedPair}
          onPairChange={handlePairChange}
          activeTrades={activeTrades}
          sessionStats={analytics}
          currentSessionId={currentSessionId}
          onOpenTradeModal={() => setShowTradeModal(true)}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <TradingChart
            pair={selectedPair}
            currentPrice={currentPriceData?.price}
            trades={trades}
          />
          
          <TimeControls
            sessionId={currentSessionId}
            currentTime={session && session.currentTime ? new Date(session.currentTime) : undefined}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
          />
          
          <BottomPanel
            sessionId={currentSessionId}
            analytics={analytics}
            trades={trades}
          />
        </main>
      </div>

      {showTradeModal && (
        <TradeModal
          isOpen={showTradeModal}
          onClose={() => setShowTradeModal(false)}
          selectedPair={selectedPair}
          sessionId={currentSessionId}
        />
      )}
    </div>
  );
}
