import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useTradingStore } from "@/hooks/use-trading";
import { type CurrencyPair, type InsertTrade } from "@shared/schema";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPair: CurrencyPair;
  sessionId: number | null;
}

export default function TradeModal({ isOpen, onClose, selectedPair, sessionId }: TradeModalProps) {
  const queryClient = useQueryClient();
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
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
      onClose();
    },
  });

  const handlePlaceTrade = () => {
    if (!sessionId) return;

    placeTradeMutation.mutate({
      sessionId,
      currencyPair: selectedPair,
      type: tradeType,
      positionSize,
      entryPrice,
      stopLoss: stopLoss || null,
      takeProfit: takeProfit || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="trading-surface border-gray-700 trading-text">
        <DialogHeader>
          <DialogTitle>Confirm Trade</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="trading-text-muted">Pair:</span>
                <span className="font-mono ml-2">{selectedPair}</span>
              </div>
              <div>
                <span className="trading-text-muted">Direction:</span>
                <span className={`ml-2 ${tradeType === "BUY" ? "text-green-400" : "text-red-400"}`}>
                  {tradeType}
                </span>
              </div>
              <div>
                <span className="trading-text-muted">Size:</span>
                <span className="font-mono ml-2">{positionSize}</span>
              </div>
              <div>
                <span className="trading-text-muted">Entry:</span>
                <span className="font-mono ml-2">{parseFloat(entryPrice).toFixed(5)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="trading-text-muted">Trade Type</Label>
              <Select value={tradeType} onValueChange={(value: "BUY" | "SELL") => setTradeType(value)}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 trading-text mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  className="w-full bg-gray-700 border-gray-600 trading-text font-mono mt-1"
                />
              </div>
              <div>
                <Label className="trading-text-muted">Take Profit</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-gray-700 border-gray-600 trading-text font-mono mt-1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handlePlaceTrade}
              disabled={placeTradeMutation.isPending}
              className={`flex-1 text-white py-2 ${
                tradeType === "BUY" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {placeTradeMutation.isPending ? "Placing..." : "Place Trade"}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
