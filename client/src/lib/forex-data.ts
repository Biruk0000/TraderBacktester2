import { type CurrencyPair, type ForexPrice } from "@shared/schema";

export const CURRENCY_PAIRS: CurrencyPair[] = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", 
  "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY"
];

export const getBasePriceForPair = (pair: CurrencyPair): number => {
  const basePrices: Record<CurrencyPair, number> = {
    'EUR/USD': 1.0850,
    'GBP/USD': 1.2650,
    'USD/JPY': 149.50,
    'AUD/USD': 0.6580,
    'USD/CAD': 1.3620,
    'NZD/USD': 0.6120,
    'EUR/GBP': 0.8580,
    'EUR/JPY': 162.30,
  };
  return basePrices[pair];
};

export const generateMockPriceData = (
  pair: CurrencyPair, 
  startTime: Date, 
  endTime: Date, 
  intervalMinutes: number = 60
): ForexPrice[] => {
  const prices: ForexPrice[] = [];
  let currentTime = new Date(startTime);
  let basePrice = getBasePriceForPair(pair);
  let id = 1;

  while (currentTime <= endTime) {
    const volatility = 0.001; // 0.1% volatility
    const change = (Math.random() - 0.5) * volatility * basePrice;
    basePrice += change;
    
    const high = basePrice + Math.random() * volatility * basePrice * 0.5;
    const low = basePrice - Math.random() * volatility * basePrice * 0.5;
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);
    
    prices.push({
      id: id++,
      pair,
      timestamp: new Date(currentTime),
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.floor(Math.random() * 100000) + 50000,
    });

    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
  }

  return prices;
};

export const formatPrice = (price: number, decimals: number = 5): string => {
  return price.toFixed(decimals);
};

export const calculatePriceChange = (current: number, previous: number): { change: number; percentage: number } => {
  const change = current - previous;
  const percentage = (change / previous) * 100;
  return { change, percentage };
};

export const calculatePipValue = (pair: CurrencyPair, lotSize: number = 1): number => {
  // Simplified pip value calculation
  // In reality, this would depend on account currency and current exchange rates
  const pipValues: Record<CurrencyPair, number> = {
    'EUR/USD': 10 * lotSize,
    'GBP/USD': 10 * lotSize,
    'USD/JPY': 10 * lotSize,
    'AUD/USD': 10 * lotSize,
    'USD/CAD': 10 * lotSize,
    'NZD/USD': 10 * lotSize,
    'EUR/GBP': 10 * lotSize,
    'EUR/JPY': 10 * lotSize,
  };
  return pipValues[pair];
};
