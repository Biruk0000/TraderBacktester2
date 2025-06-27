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
      
      // Generate 100 price points for the last 100 hours
      for (let i = 99; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const volatility = 0.001; // 0.1% volatility
        const change = (Math.random() - 0.5) * volatility * basePrice;
        basePrice += change;
        
        const high = basePrice + Math.random() * volatility * basePrice * 0.5;
        const low = basePrice - Math.random() * volatility * basePrice * 0.5;
        const open = low + Math.random() * (high - low);
        const close = low + Math.random() * (high - low);
        
        prices.push({
          id: this.currentIds.price++,
          pair,
          timestamp,
          open: open.toFixed(5),
          high: high.toFixed(5),
          low: low.toFixed(5),
          close: close.toFixed(5),
          volume: Math.floor(Math.random() * 100000) + 50000,
        });
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
}

export const storage = new MemStorage();
