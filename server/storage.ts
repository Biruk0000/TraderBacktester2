import { users, sessions, trades, journalEntries, forexPrices, type User, type InsertUser, type Session, type InsertSession, type Trade, type InsertTrade, type JournalEntry, type InsertJournalEntry, type ForexPrice, type InsertForexPrice, type SessionStats, type CurrencyPair } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getSessionsByUserId(userId: number): Promise<Session[]>;
  updateSession(id: number, updates: Partial<Session>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;

  // Trade methods
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTrade(id: number): Promise<Trade | undefined>;
  getTradesBySessionId(sessionId: number): Promise<Trade[]>;
  updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined>;
  closeTrade(id: number, exitPrice: number, closedAt: Date): Promise<Trade | undefined>;

  // Journal methods
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntriesBySessionId(sessionId: number): Promise<JournalEntry[]>;
  updateJournalEntry(id: number, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;

  // Forex price methods
  getForexPrices(pair: CurrencyPair, startTime?: Date, endTime?: Date): Promise<ForexPrice[]>;
  getCurrentPrice(pair: CurrencyPair): Promise<number | undefined>;

  // Analytics methods
  getSessionStats(sessionId: number): Promise<SessionStats>;

  // Backtesting methods
  getHistoricalPrice(pair: CurrencyPair, timestamp: Date): Promise<number | undefined>;
  setSessionTime(sessionId: number, timestamp: Date): Promise<Session | undefined>;
  advanceSessionTime(sessionId: number, minutes: number): Promise<Session | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<number, Session>;
  private trades: Map<number, Trade>;
  private journalEntries: Map<number, JournalEntry>;
  private forexPrices: Map<string, ForexPrice[]>;
  private currentIds: { user: number; session: number; trade: number; journal: number; price: number };

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.trades = new Map();
    this.journalEntries = new Map();
    this.forexPrices = new Map();
    this.currentIds = { user: 1, session: 1, trade: 1, journal: 1, price: 1 };
    
    // Initialize with some forex price data
    this.initializeForexData();
  }

  private initializeForexData() {
    const pairs: CurrencyPair[] = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY'];
    const now = new Date();
    
    pairs.forEach(pair => {
      const prices: ForexPrice[] = [];
      let basePrice = this.getBasePriceForPair(pair);
      
      // Generate extensive historical data - 6 months of hourly data (4380 hours)
      const hoursOfData = 4380; // 6 months
      
      for (let i = hoursOfData - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        
        // Add realistic market patterns
        const hour = timestamp.getHours();
        const dayOfWeek = timestamp.getDay();
        
        // Higher volatility during market open hours and major sessions
        let volatilityMultiplier = 1;
        
        // London session (8-16 GMT) - higher volatility
        if (hour >= 8 && hour <= 16) {
          volatilityMultiplier = 1.5;
        }
        // New York session (13-21 GMT) - highest volatility
        if (hour >= 13 && hour <= 21) {
          volatilityMultiplier = 2.0;
        }
        // Asian session (0-8 GMT) - lower volatility
        if (hour >= 0 && hour <= 8) {
          volatilityMultiplier = 0.7;
        }
        
        // Weekend gaps (lower activity)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          volatilityMultiplier *= 0.3;
        }
        
        // Base volatility varies by pair
        let baseVolatility = 0.0008; // 0.08% base volatility
        if (pair === 'GBP/USD' || pair === 'EUR/GBP') {
          baseVolatility = 0.0012; // More volatile pairs
        }
        if (pair === 'USD/JPY') {
          baseVolatility = 0.0006; // Less volatile
        }
        
        const volatility = baseVolatility * volatilityMultiplier;
        
        // Add trend bias (some periods trending up/down)
        const trendCycle = Math.sin((i / 168) * Math.PI * 2); // Weekly trend cycle
        const trendBias = trendCycle * 0.0002;
        
        // Random walk with trend bias
        const change = (Math.random() - 0.5) * volatility * basePrice + trendBias * basePrice;
        basePrice += change;
        
        // Ensure price doesn't drift too far from realistic levels
        const originalPrice = this.getBasePriceForPair(pair);
        if (Math.abs(basePrice - originalPrice) > originalPrice * 0.15) {
          basePrice = originalPrice + (basePrice - originalPrice) * 0.5;
        }
        
        // Generate OHLC data
        const spread = volatility * basePrice * 0.3;
        const high = basePrice + Math.random() * spread;
        const low = basePrice - Math.random() * spread;
        const open = low + Math.random() * (high - low);
        const close = low + Math.random() * (high - low);
        
        // Ensure OHLC relationships are valid
        const validHigh = Math.max(open, close, high);
        const validLow = Math.min(open, close, low);
        
        // Add realistic volume patterns
        let volume = 50000 + Math.random() * 100000;
        volume *= volatilityMultiplier; // Higher volume during active sessions
        
        // Add volume spikes during major moves
        if (Math.abs(change) > volatility * basePrice * 0.7) {
          volume *= 1.5 + Math.random();
        }
        
        prices.push({
          id: this.currentIds.price++,
          pair,
          timestamp,
          open: open.toFixed(5),
          high: validHigh.toFixed(5),
          low: validLow.toFixed(5),
          close: close.toFixed(5),
          volume: Math.floor(volume),
        });
        
        // Update base price for next candle
        basePrice = close;
      }
      
      this.forexPrices.set(pair, prices);
    });
  }

  private getBasePriceForPair(pair: CurrencyPair): number {
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
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.user++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Session methods
  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.currentIds.session++;
    const now = new Date();
    const session: Session = {
      id,
      userId: insertSession.userId,
      name: insertSession.name,
      currencyPair: insertSession.currencyPair,
      startingBalance: insertSession.startingBalance,
      currentBalance: insertSession.currentBalance,
      createdAt: now,
      updatedAt: now,
      isActive: insertSession.isActive ?? false,
      currentTime: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Start 30 days ago for backtesting
      timeSpeed: 1,
      isBacktesting: true,
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getSessionsByUserId(userId: number): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  async updateSession(id: number, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, updatedAt: new Date() };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Trade methods
  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.currentIds.trade++;
    const trade: Trade = {
      id,
      sessionId: insertTrade.sessionId,
      currencyPair: insertTrade.currencyPair,
      type: insertTrade.type,
      positionSize: insertTrade.positionSize,
      entryPrice: insertTrade.entryPrice,
      stopLoss: insertTrade.stopLoss ?? null,
      takeProfit: insertTrade.takeProfit ?? null,
      exitPrice: null,
      pnl: null,
      status: "OPEN",
      openedAt: new Date(),
      closedAt: null,
      notes: insertTrade.notes ?? null,
    };
    this.trades.set(id, trade);
    return trade;
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async getTradesBySessionId(sessionId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(trade => trade.sessionId === sessionId);
  }

  async updateTrade(id: number, updates: Partial<Trade>): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { ...trade, ...updates };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  async closeTrade(id: number, exitPrice: number, closedAt: Date): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;

    const entryPrice = parseFloat(trade.entryPrice);
    const positionSize = parseFloat(trade.positionSize);
    const pnl = trade.type === 'BUY' 
      ? (exitPrice - entryPrice) * positionSize * 100000 // Assuming standard lot size
      : (entryPrice - exitPrice) * positionSize * 100000;

    const updatedTrade = {
      ...trade,
      status: "CLOSED" as const,
      exitPrice: exitPrice.toString(),
      pnl: pnl.toFixed(2),
      closedAt,
    };
    
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  // Journal methods
  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const id = this.currentIds.journal++;
    const entry: JournalEntry = {
      id,
      sessionId: insertEntry.sessionId,
      tradeId: insertEntry.tradeId ?? null,
      title: insertEntry.title,
      content: insertEntry.content,
      createdAt: new Date(),
    };
    this.journalEntries.set(id, entry);
    return entry;
  }

  async getJournalEntriesBySessionId(sessionId: number): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values()).filter(entry => entry.sessionId === sessionId);
  }

  async updateJournalEntry(id: number, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.get(id);
    if (!entry) return undefined;
    
    const updatedEntry = { ...entry, ...updates };
    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    return this.journalEntries.delete(id);
  }

  // Forex price methods
  async getForexPrices(pair: CurrencyPair, startTime?: Date, endTime?: Date): Promise<ForexPrice[]> {
    const prices = this.forexPrices.get(pair) || [];
    
    if (!startTime && !endTime) {
      return prices;
    }
    
    return prices.filter(price => {
      if (startTime && price.timestamp < startTime) return false;
      if (endTime && price.timestamp > endTime) return false;
      return true;
    });
  }

  async getCurrentPrice(pair: CurrencyPair): Promise<number | undefined> {
    const prices = this.forexPrices.get(pair) || [];
    const latestPrice = prices[prices.length - 1];
    return latestPrice ? parseFloat(latestPrice.close) : undefined;
  }

  // Analytics methods
  async getSessionStats(sessionId: number): Promise<SessionStats> {
    const trades = await this.getTradesBySessionId(sessionId);
    const closedTrades = trades.filter(trade => trade.status === 'CLOSED');
    
    let totalPnL = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;
    let peak = 0;

    closedTrades.forEach(trade => {
      const pnl = parseFloat(trade.pnl || "0");
      totalPnL += pnl;
      runningPnL += pnl;
      
      if (pnl > 0) {
        winningTrades++;
      } else {
        losingTrades++;
      }
      
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    const totalTrades = closedTrades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

    return {
      totalPnL,
      winRate,
      totalTrades,
      maxDrawdown,
      avgTrade,
      winningTrades,
      losingTrades,
    };
  }

  // Backtesting methods
  async getHistoricalPrice(pair: CurrencyPair, timestamp: Date): Promise<number | undefined> {
    const prices = this.forexPrices.get(pair) || [];
    
    // Find the closest price data to the requested timestamp
    let closestPrice = null;
    let minTimeDiff = Infinity;
    
    for (const price of prices) {
      const timeDiff = Math.abs(price.timestamp.getTime() - timestamp.getTime());
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestPrice = price;
      }
    }
    
    return closestPrice ? parseFloat(closestPrice.close) : undefined;
  }

  async setSessionTime(sessionId: number, timestamp: Date): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    const updatedSession = { 
      ...session, 
      currentTime: timestamp,
      updatedAt: new Date() 
    };
    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  async advanceSessionTime(sessionId: number, minutes: number): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentTime) return undefined;
    
    const newTime = new Date(session.currentTime.getTime() + minutes * 60 * 1000);
    const updatedSession = { 
      ...session, 
      currentTime: newTime,
      updatedAt: new Date() 
    };
    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
