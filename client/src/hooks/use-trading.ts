import { create } from 'zustand';
import { type CurrencyPair, type TradeType } from '@shared/schema';

interface TradingState {
  // Trade form state
  positionSize: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  tradeType: TradeType;
  
  // UI state
  selectedTimeframe: string;
  chartType: 'line' | 'candle';
  isDrawingMode: boolean;
  
  // Actions
  setPositionSize: (size: string) => void;
  setEntryPrice: (price: string) => void;
  setStopLoss: (price: string) => void;
  setTakeProfit: (price: string) => void;
  setTradeType: (type: TradeType) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setChartType: (type: 'line' | 'candle') => void;
  setIsDrawingMode: (isDrawing: boolean) => void;
  resetTradeForm: () => void;
}

const defaultTradeForm = {
  positionSize: "1.00",
  entryPrice: "1.0850",
  stopLoss: "",
  takeProfit: "",
  tradeType: "BUY" as TradeType,
};

export const useTradingStore = create<TradingState>((set) => ({
  // Initial state
  ...defaultTradeForm,
  selectedTimeframe: "1H",
  chartType: "line",
  isDrawingMode: false,
  
  // Actions
  setPositionSize: (size) => set({ positionSize: size }),
  setEntryPrice: (price) => set({ entryPrice: price }),
  setStopLoss: (price) => set({ stopLoss: price }),
  setTakeProfit: (price) => set({ takeProfit: price }),
  setTradeType: (type) => set({ tradeType: type }),
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  setChartType: (type) => set({ chartType: type }),
  setIsDrawingMode: (isDrawing) => set({ isDrawingMode: isDrawing }),
  resetTradeForm: () => set(defaultTradeForm),
}));

// Custom hook for trade form management
export const useTradeForm = () => {
  const {
    positionSize,
    entryPrice,
    stopLoss,
    takeProfit,
    tradeType,
    setPositionSize,
    setEntryPrice,
    setStopLoss,
    setTakeProfit,
    setTradeType,
    resetTradeForm,
  } = useTradingStore();

  const isValidForm = () => {
    return (
      positionSize &&
      entryPrice &&
      parseFloat(positionSize) > 0 &&
      parseFloat(entryPrice) > 0
    );
  };

  const calculateRiskReward = () => {
    if (!stopLoss || !takeProfit || !entryPrice) return null;

    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);

    return risk > 0 ? reward / risk : 0;
  };

  return {
    positionSize,
    entryPrice,
    stopLoss,
    takeProfit,
    tradeType,
    setPositionSize,
    setEntryPrice,
    setStopLoss,
    setTakeProfit,
    setTradeType,
    resetTradeForm,
    isValidForm,
    calculateRiskReward,
  };
};

// Export the trading store for use throughout the app
