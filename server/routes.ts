import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertTradeSchema, insertJournalEntrySchema, type CurrencyPair } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid session data", error });
    }
  });

  app.get("/api/sessions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getSessionsByUserId(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions", error });
    }
  });

  app.get("/api/sessions/detail/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session", error });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const session = await storage.updateSession(id, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session", error });
    }
  });

  // Trade routes
  app.post("/api/trades", async (req, res) => {
    try {
      const tradeData = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(tradeData);
      res.json(trade);
    } catch (error) {
      res.status(400).json({ message: "Invalid trade data", error });
    }
  });

  app.get("/api/trades/session/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const trades = await storage.getTradesBySessionId(sessionId);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trades", error });
    }
  });

  app.put("/api/trades/:id/close", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { exitPrice } = req.body;
      const trade = await storage.closeTrade(id, parseFloat(exitPrice), new Date());
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ message: "Failed to close trade", error });
    }
  });

  app.put("/api/trades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const trade = await storage.updateTrade(id, updates);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ message: "Failed to update trade", error });
    }
  });

  // Journal routes
  app.post("/api/journal", async (req, res) => {
    try {
      const entryData = insertJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry(entryData);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid journal entry data", error });
    }
  });

  app.get("/api/journal/session/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const entries = await storage.getJournalEntriesBySessionId(sessionId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch journal entries", error });
    }
  });

  app.put("/api/journal/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const entry = await storage.updateJournalEntry(id, updates);
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update journal entry", error });
    }
  });

  // Forex price routes
  app.get("/api/forex/prices/:pair", async (req, res) => {
    try {
      const pair = req.params.pair as CurrencyPair;
      const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
      const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
      
      const prices = await storage.getForexPrices(pair, startTime, endTime);
      res.json(prices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forex prices", error });
    }
  });

  app.get("/api/forex/current/:pair", async (req, res) => {
    try {
      const pair = req.params.pair as CurrencyPair;
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : null;
      
      if (sessionId) {
        // Get price for session's current time (backtesting)
        const session = await storage.getSession(sessionId);
        if (session && session.currentTime) {
          const historicalPrice = await storage.getHistoricalPrice(pair, session.currentTime);
          if (historicalPrice !== undefined) {
            return res.json({ pair, price: historicalPrice, timestamp: session.currentTime });
          }
        }
      }
      
      // Fallback to latest price
      const currentPrice = await storage.getCurrentPrice(pair);
      if (currentPrice === undefined) {
        return res.status(404).json({ message: "Price not found for pair" });
      }
      res.json({ pair, price: currentPrice });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current price", error });
    }
  });

  // Analytics routes
  app.get("/api/analytics/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const stats = await storage.getSessionStats(sessionId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics", error });
    }
  });

  // Backtesting routes
  app.post("/api/backtest/:sessionId/time", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { timestamp } = req.body;
      const session = await storage.setSessionTime(sessionId, new Date(timestamp));
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to set session time", error });
    }
  });

  app.post("/api/backtest/:sessionId/advance", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { minutes } = req.body;
      const session = await storage.advanceSessionTime(sessionId, parseInt(minutes));
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to advance session time", error });
    }
  });

  app.get("/api/backtest/:pair/price/:timestamp", async (req, res) => {
    try {
      const pair = req.params.pair as CurrencyPair;
      const timestamp = new Date(req.params.timestamp);
      const price = await storage.getHistoricalPrice(pair, timestamp);
      if (price === undefined) {
        return res.status(404).json({ message: "Price not found for timestamp" });
      }
      res.json({ pair, timestamp, price });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch historical price", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
