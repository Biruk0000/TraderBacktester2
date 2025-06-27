# Forex Trading Backtest Platform

## Overview

This is a full-stack web application for forex trading backtesting and journaling. It allows traders to simulate trading strategies, track performance, and maintain trading journals. The app features a modern trading interface with real-time price simulation, trade management, and comprehensive analytics.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand for trading state management
- **Data Fetching**: TanStack React Query for server state management
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with custom trading-specific color variables
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon Database serverless)
- **API Design**: RESTful API with JSON responses
- **Session Storage**: Express sessions with PostgreSQL store

### Database Schema
- **Users**: Authentication and user management
- **Sessions**: Trading session tracking with starting/current balance
- **Trades**: Individual trade records with entry/exit prices, P&L
- **Journal Entries**: Trading notes and analysis linked to sessions/trades
- **Forex Prices**: Historical price data storage for backtesting

## Key Components

### Trading Interface
- **TradingChart**: Price visualization with timeframe selection and drawing tools
- **Sidebar**: Currency pair selection, position sizing, and trade placement
- **BottomPanel**: Tabbed interface for analytics, journal, and trade history
- **TradeModal**: Modal for detailed trade entry with stop loss/take profit

### Data Management
- **Storage Layer**: Abstracted storage interface with in-memory implementation
- **Price Generation**: Mock forex price data generation for backtesting
- **Analytics**: Session performance calculations and trade statistics

### UI Components
- **Responsive Design**: Mobile-first approach with trading-optimized dark theme
- **Component Library**: Full shadcn/ui component set for consistent UI
- **Trading-Specific Styling**: Custom CSS variables for trading colors (success/danger)

## Data Flow

1. **Session Creation**: Users create trading sessions with starting balance and currency pair
2. **Price Data**: Mock forex prices are generated for the selected timeframe
3. **Trade Execution**: Trades are placed with position sizing, entry price, and risk management
4. **P&L Calculation**: Real-time profit/loss tracking based on current prices
5. **Analytics**: Performance metrics calculated from closed trades
6. **Journaling**: Notes and analysis linked to specific trades or sessions

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for database connectivity
- **drizzle-orm**: Type-safe ORM for database operations with PostgreSQL dialect
- **@tanstack/react-query**: Server state management and caching
- **zustand**: Lightweight state management for client-side state

### UI Dependencies
- **@radix-ui/***: Headless UI primitives for accessibility and functionality
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library for trading interface
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Build tool with hot module replacement
- **typescript**: Type safety across the stack
- **esbuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Express API backend
- **Hot Reloading**: Vite HMR for frontend and tsx for backend file watching
- **Database**: PostgreSQL connection via DATABASE_URL environment variable

### Production Build
- **Frontend**: Vite build outputs static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Deployment**: Single-process deployment serving both API and static files
- **Platform**: Configured for Replit autoscale deployment

### Environment Configuration
- **Node.js 20**: Modern JavaScript runtime with ES modules support
- **PostgreSQL 16**: Database module provisioned in Replit environment
- **Port Configuration**: Backend serves on port 5000, proxied to port 80

## Changelog

```
Changelog:
- June 27, 2025. Initial setup
- June 27, 2025. Completed fully functional backtesting platform:
  * Professional dark theme trading interface with gradient backgrounds
  * Real-time chart rendering with HTML5 Canvas (line & candlestick modes)
  * Functional trade placement with BUY/SELL buttons
  * Live portfolio statistics and P&L tracking
  * Dynamic price data with 6 months historical simulation
  * Time controls for backtesting progression
  * Sample trading session with demonstration trades
  * Complete API integration for trades, sessions, and analytics
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```