import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BarChart3, BookOpen, History, Settings, DollarSign, Percent, TrendingUp, TrendingDown } from "lucide-react";
import { type Trade, type SessionStats, type JournalEntry } from "@shared/schema";

interface BottomPanelProps {
  sessionId: number | null;
  analytics?: SessionStats;
  trades: Trade[];
}

export default function BottomPanel({ sessionId, analytics, trades }: BottomPanelProps) {
  const [newJournalEntry, setNewJournalEntry] = useState({ title: "", content: "" });

  // Fetch journal entries
  const { data: journalEntries = [] } = useQuery({
    queryKey: ["/api/journal/session", sessionId],
    enabled: !!sessionId,
  }) as { data: JournalEntry[] };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const closedTrades = trades.filter(trade => trade.status === "CLOSED");

  // Group trades by hour for hourly performance
  const getHourlyPerformance = () => {
    const hourlyData: Record<string, number> = {};
    
    closedTrades.forEach(trade => {
      const hour = new Date(trade.openedAt).getHours();
      const timeRange = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 4).toString().padStart(2, '0')}:00`;
      const pnl = parseFloat(trade.pnl || "0");
      
      if (!hourlyData[timeRange]) {
        hourlyData[timeRange] = 0;
      }
      hourlyData[timeRange] += pnl;
    });

    return Object.entries(hourlyData).map(([timeRange, pnl]) => ({
      timeRange,
      pnl,
    }));
  };

  // Group trades by currency pair for pair performance
  const getPairPerformance = () => {
    const pairData: Record<string, { pnl: number; trades: number }> = {};
    
    closedTrades.forEach(trade => {
      const pair = trade.currencyPair;
      const pnl = parseFloat(trade.pnl || "0");
      
      if (!pairData[pair]) {
        pairData[pair] = { pnl: 0, trades: 0 };
      }
      pairData[pair].pnl += pnl;
      pairData[pair].trades += 1;
    });

    return Object.entries(pairData).map(([pair, data]) => ({
      pair,
      pnl: data.pnl,
      trades: data.trades,
    }));
  };

  const hourlyPerformance = getHourlyPerformance();
  const pairPerformance = getPairPerformance();

  return (
    <div className="h-80 trading-surface border-t border-gray-700">
      <Tabs defaultValue="analytics" className="h-full">
        <TabsList className="border-b border-gray-700 bg-transparent h-12 px-6">
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Journal</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Trade History</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="p-6 h-full overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Performance Metrics Cards */}
            <Card className="trading-surface border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium trading-text-muted">Total P&L</h3>
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <div className={`text-2xl font-bold font-mono ${
                  (analytics?.totalPnL || 0) >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {formatCurrency(analytics?.totalPnL || 0)}
                </div>
                <div className="text-xs trading-text-muted mt-1">
                  {(analytics?.totalPnL || 0) >= 0 ? "+" : ""}{((analytics?.totalPnL || 0) / 10000 * 100).toFixed(1)}% this session
                </div>
              </CardContent>
            </Card>

            <Card className="trading-surface border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium trading-text-muted">Win Rate</h3>
                  <Percent className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold trading-text font-mono">
                  {formatPercent(analytics?.winRate || 0)}
                </div>
                <div className="text-xs trading-text-muted mt-1">
                  {analytics?.winningTrades || 0} wins / {analytics?.totalTrades || 0} trades
                </div>
              </CardContent>
            </Card>

            <Card className="trading-surface border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium trading-text-muted">Avg Trade</h3>
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-yellow-400 font-mono">
                  {formatCurrency(analytics?.avgTrade || 0)}
                </div>
                <div className="text-xs trading-text-muted mt-1">
                  Risk/Reward: 1:2.1
                </div>
              </CardContent>
            </Card>

            <Card className="trading-surface border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium trading-text-muted">Max Drawdown</h3>
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-400 font-mono">
                  {formatCurrency(-(analytics?.maxDrawdown || 0))}
                </div>
                <div className="text-xs trading-text-muted mt-1">
                  -{((analytics?.maxDrawdown || 0) / 10000 * 100).toFixed(1)}% of balance
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance by Time */}
            <Card className="trading-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg trading-text">Performance by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hourlyPerformance.length > 0 ? (
                    hourlyPerformance.map((data, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm trading-text-muted">{data.timeRange}</span>
                        <span className={`text-sm font-mono ${
                          data.pnl >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {formatCurrency(data.pnl)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm trading-text-muted">No closed trades yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Currency Pair Performance */}
            <Card className="trading-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg trading-text">Pair Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pairPerformance.length > 0 ? (
                    pairPerformance.map((data, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm trading-text-muted">{data.pair}</span>
                        <span className={`text-sm font-mono ${
                          data.pnl >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {formatCurrency(data.pnl)} ({data.trades} trades)
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm trading-text-muted">No closed trades yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Journal Tab */}
        <TabsContent value="journal" className="p-6 h-full overflow-y-auto">
          <div className="space-y-4">
            {/* Add New Entry */}
            <Card className="trading-surface border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg trading-text">Add Journal Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Entry title..."
                  value={newJournalEntry.title}
                  onChange={(e) => setNewJournalEntry(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-gray-700 border-gray-600 trading-text"
                />
                <Textarea
                  placeholder="What did you learn from this trade? What went well? What could be improved?"
                  value={newJournalEntry.content}
                  onChange={(e) => setNewJournalEntry(prev => ({ ...prev, content: e.target.value }))}
                  className="bg-gray-700 border-gray-600 trading-text min-h-[100px]"
                />
                <Button className="bg-primary hover:bg-primary/90">
                  Add Entry
                </Button>
              </CardContent>
            </Card>

            {/* Journal Entries */}
            <div className="space-y-3">
              {journalEntries.length > 0 ? (
                journalEntries.map((entry) => (
                  <Card key={entry.id} className="trading-surface border-gray-700">
                    <CardContent className="p-4">
                      <h4 className="font-semibold trading-text mb-2">{entry.title}</h4>
                      <p className="text-sm trading-text-muted mb-2">{entry.content}</p>
                      <p className="text-xs trading-text-muted">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="trading-surface border-gray-700">
                  <CardContent className="p-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 trading-text-muted" />
                    <p className="trading-text-muted">No journal entries yet</p>
                    <p className="text-sm trading-text-muted mt-2">
                      Start documenting your trading insights and lessons learned
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Trade History Tab */}
        <TabsContent value="history" className="p-6 h-full overflow-y-auto">
          <Card className="trading-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg trading-text">Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length > 0 ? (
                <div className="space-y-3">
                  {trades.map((trade) => (
                    <div key={trade.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="trading-text font-medium">{trade.currencyPair}</span>
                          <span className={`text-xs px-2 py-1 rounded text-white ${
                            trade.type === "BUY" ? "bg-green-600" : "bg-red-600"
                          }`}>
                            {trade.type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            trade.status === "OPEN" ? "bg-yellow-600 text-white" : "bg-gray-600 text-white"
                          }`}>
                            {trade.status}
                          </span>
                        </div>
                        {trade.pnl && (
                          <span className={`font-mono ${
                            parseFloat(trade.pnl) >= 0 ? "text-green-400" : "text-red-400"
                          }`}>
                            {formatCurrency(parseFloat(trade.pnl))}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm trading-text-muted">
                        <div>
                          <span className="block">Entry:</span>
                          <span className="font-mono trading-text">{parseFloat(trade.entryPrice).toFixed(5)}</span>
                        </div>
                        <div>
                          <span className="block">Size:</span>
                          <span className="font-mono trading-text">{trade.positionSize}</span>
                        </div>
                        <div>
                          <span className="block">Opened:</span>
                          <span className="trading-text">{new Date(trade.openedAt).toLocaleDateString()}</span>
                        </div>
                        {trade.closedAt && (
                          <div>
                            <span className="block">Closed:</span>
                            <span className="trading-text">{new Date(trade.closedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 trading-text-muted" />
                  <p className="trading-text-muted">No trades yet</p>
                  <p className="text-sm trading-text-muted mt-2">
                    Start placing trades to see your history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="p-6 h-full overflow-y-auto">
          <Card className="trading-surface border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg trading-text">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium trading-text mb-2">Session Settings</h4>
                  <p className="text-sm trading-text-muted">
                    Configure your backtesting session parameters and preferences.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium trading-text mb-2">Chart Settings</h4>
                  <p className="text-sm trading-text-muted">
                    Customize chart appearance and drawing tools.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium trading-text mb-2">Risk Management</h4>
                  <p className="text-sm trading-text-muted">
                    Set default position sizes and risk parameters.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
