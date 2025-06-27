import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, User } from "lucide-react";

interface HeaderNavigationProps {
  onNewSession: () => void;
}

export default function HeaderNavigation({ onNewSession }: HeaderNavigationProps) {
  return (
    <header className="trading-surface border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between max-w-full mx-auto">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold trading-text">Traders Casa</h1>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-primary hover:text-primary/80 transition-colors border-b-2 border-primary pb-1">
              Backtest
            </a>
            <a href="#" className="trading-text-muted hover:text-white transition-colors">
              Analytics
            </a>
            <a href="#" className="trading-text-muted hover:text-white transition-colors">
              Journal
            </a>
            <a href="#" className="trading-text-muted hover:text-white transition-colors">
              Live Trades
            </a>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button onClick={onNewSession} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Button>
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="text-gray-300 h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
