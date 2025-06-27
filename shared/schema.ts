import { pgTable, text, serial, integer, boolean, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  currencyPair: text("currency_pair").notNull(),
  startingBalance: decimal("starting_balance", { precision: 10, scale: 2 }).notNull(),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  currentTime: timestamp("current_time"),
  timeSpeed: integer("time_speed").default(1),
  isBacktesting: boolean("is_backtesting").default(true),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  currencyPair: text("currency_pair").notNull(),
  type: text("type").notNull(), // 'BUY' | 'SELL'
  positionSize: decimal("position_size", { precision: 10, scale: 2 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 5 }).notNull(),
  stopLoss: decimal("stop_loss", { precision: 10, scale: 5 }),
  takeProfit: decimal("take_profit", { precision: 10, scale: 5 }),
  exitPrice: decimal("exit_price", { precision: 10, scale: 5 }),
  pnl: decimal("pnl", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("OPEN"), // 'OPEN' | 'CLOSED'
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  tradeId: integer("trade_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forexPrices = pgTable("forex_prices", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 10, scale: 5 }).notNull(),
  high: decimal("high", { precision: 10, scale: 5 }).notNull(),
  low: decimal("low", { precision: 10, scale: 5 }).notNull(),
  close: decimal("close", { precision: 10, scale: 5 }).notNull(),
  volume: integer("volume").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  openedAt: true,
  closedAt: true,
  pnl: true,
}).extend({
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
});

export const insertForexPriceSchema = createInsertSchema(forexPrices).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type ForexPrice = typeof forexPrices.$inferSelect;
export type InsertForexPrice = z.infer<typeof insertForexPriceSchema>;

// Additional types for frontend
export type TradeType = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED';

export type SessionStats = {
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  avgTrade: number;
  winningTrades: number;
  losingTrades: number;
};

export type CurrencyPair = 'EUR/USD' | 'GBP/USD' | 'USD/JPY' | 'AUD/USD' | 'USD/CAD' | 'NZD/USD' | 'EUR/GBP' | 'EUR/JPY';
