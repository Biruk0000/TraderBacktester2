import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTradingStore } from "@/hooks/use-trading";
import { type CurrencyPair, type Trade, type SessionStats, type InsertTrade } from "@shared/schema";

interface SidebarProps {
  selectedPair: CurrencyPair;
  onPairChange: (pair: CurrencyPair) => void;
  activeTrades: Trade[];
  sessionStats?: SessionStats;
  currentSessionId: number | null;
  onOpenTradeModal: () => void;
}

const currencyPairs: CurrencyPair[] = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", 
  "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY"
];

export default function Sidebar({
  selectedPair,
  onPairChange,
  activeTrades,
  sessionStats,
  currentSessionId,
  onOpenTradeModal,
}: SidebarProps) {
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

  const placeTradeMutation = useMutation({
    mutationFn: async (tradeData: InsertTrade) => {
      const res = await apiRequest("POST", "/api/trades", tradeData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });

  const closeTradeMutation = useMutation({
    mutationFn: async ({ tradeId, exitPrice }: { tradeId: number; exitPrice: number }) => {
      const res = await apiRequest("PUT", `/api/trades/${tradeId}/close`, { exitPrice });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });

  const handlePlaceTrade = (type: "BUY" | "SELL") => {
    if (!currentSessionId) return;

    placeTradeMutation.mutate({
      sessionId: currentSessionId,
      currencyPair: selectedPair,
      type,
      positionSize,
      entryPrice,
      stopLoss: stopLoss || null,
      takeProfit: takeProfit || null,
    });
  };

  const handleCloseTrade = (trade: Trade) => {
    const currentPrice = parseFloat(entryPrice); // Using current entry price as mock current price
    closeTradeMutation.mutate({
      tradeId: trade.id,
      exitPrice: currentPrice,
    });
  };

  const formatCurrency = (value: string | number | null | undefined): string => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <aside className="w-80 trading-surface border-r border-gray-700 flex flex-col">
      {/* Currency Pair Selection */}
      <div className="p-4 border-b border-gray-700">
        <Label className="trading-text-muted">Currency Pair</Label>
        <Select value={selectedPair} onValueChange={onPairChange}>
          <SelectTrigger className="w-full bg-gray-700 border-gray-600 trading-text mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencyPairs.map((pair) => (
              <SelectItem key={pair} value={pair}>
                {pair}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trade Controls */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold mb-4 trading-text">Place Trade</h3>
        
        <div className="space-y-4">
          <div>
            <Label className="trading-text-muted">Position Size</Label>
            <Input
              type="number"
              step="0.01"
              value={positionSize}
              onChange={(e) => setPositionSize(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 trading-text font-mono mt-1"
            />
          </div>
          
          <div>
            <Label className="trading-text-muted">Entry Price</Label>
            <Input
              type="number"
              step="0.0001"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 trading-text font-mono mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="trading-text-muted">Stop Loss</Label>
              <Input
                type="number"
                step="0.0001"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-gray-700 border-gray-600 trading-text font-mono text-sm mt-1"
              />
            </div>
            <div>
              <Label className="trading-text-muted">Take Profit</Label>
              <Input
                type="number"
                step="0.0001"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-gray-700 border-gray-600 trading-text font-mono text-sm mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handlePlaceTrade("BUY")}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold"
              disabled={placeTradeMutation.isPending}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              BUY
            </Button>
            <Button
              onClick={() => handlePlaceTrade("SELL")}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 font-semibold"
              disabled={placeTradeMutation.isPending}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              SELL
            </Button>
          </div>
        </div>
      </div>

      {/* Active Trades */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold mb-4 trading-text">Active Trades</h3>
        
        <div className="space-y-3">
          {activeTrades.length === 0 ? (
            <p className="trading-text-muted text-sm">No active trades</p>
          ) : (
            activeTrades.map((trade) => (
              <div key={trade.id} className="bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium trading-text">{trade.currencyPair}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded text-white ${
                      trade.type === "BUY" ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    {trade.type}
                  </span>
                </div>
                <div className="text-xs trading-text-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Entry:</span>
                    <span className="font-mono">{parseFloat(trade.entryPrice).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-mono">{trade.positionSize}</span>
                  </div>
                  {trade.pnl && (
                    <div className="flex justify-between">
                      <span>P&L:</span>
                      <span className={`font-mono ${parseFloat(trade.pnl) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {formatCurrency(trade.pnl)}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleCloseTrade(trade)}
                  className="w-full mt-2 bg-gray-600 hover:bg-gray-500 text-white py-1 text-xs"
                  disabled={closeTradeMutation.isPending}
                >
                  Close Position
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4 trading-text">Session Stats</h3>
        {sessionStats ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="trading-text-muted">Total P&L:</span>
              <span className={`font-mono ${sessionStats.totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatCurrency(sessionStats.totalPnL)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="trading-text-muted">Win Rate:</span>
              <span className="font-mono trading-text">{formatPercent(sessionStats.winRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="trading-text-muted">Total Trades:</span>
              <span className="font-mono trading-text">{sessionStats.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="trading-text-muted">Max Drawdown:</span>
              <span className="font-mono text-red-400">{formatCurrency(-sessionStats.maxDrawdown)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="trading-text-muted">Total P&L:</span>
              <span className="font-mono text-green-400">$0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="trading-text-muted">Win Rate:</span>
              <span className="font-mono trading-text">0%</span>
            </div>
            <div className="flex justify-between">
              <span className="trading-text-muted">Total Trades:</span>
              <span className="font-mono trading-text">0</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
