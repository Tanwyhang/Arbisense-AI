# ARBISENSE

Real-Time Multi-Agent Arbitrage Oracle with Revenue Stress Testing. ARBISENSE combines institutional-grade quantitative analysis with a state-of-the-art multi-ai agent orchestration for unbiased judgement inspired by the ring algorithm, terminal-inspired user interface and live WebSocket market data.

## 🚀 Quick Start (Recommended)

The easiest way to run ARBISENSE is using Docker:

```bash
# 1. Clone the repository
git clone <repository-url>
cd arbisense-ai

# 2. Setup your environment
cp .env.example .env

# 3. Start everything
docker-compose up --build
```

Visit:
- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

---

## 🛠 Manual Setup

### 1. Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend (Next.js + Bun)
```bash
cd frontend
bun install
bun run dev
```

---

## 🏗️ Architecture & Core Components

### 🧠 Quant & Arbitrage Engines (FastAPI)
- **Arbitrage Engine**: Real-time cross-platform spread detection between Polymarket & Limitless Exchange. Includes fee-adjusted profit calculation and signal generation.
- **WebSocket Manager**: High-performance broadcasting system with connection pooling and automatic reconnection (exponential backoff).
- **Polymarket Service**: Live CLOB data integration (trades, orderbooks, and price changes).
- **Limitless Service**: Dynamic pricing feed via Limitlex REST API.
- **Monte Carlo Engine**: Non-uniform sampling with Lévy flights (α=1.7) for fat-tail modeling.
- **Multi-Agent Judge**: Specialized Risk, Gas, and Alpha agents with a 2/3 consensus protocol.
- **Kelly Optimizer**: Correlation-adjusted position sizing with strict safety caps.

### 🖥️ Premium Dashboard (Next.js 14)
- **Live Market Data**: Fully integrated WebSockets for real-time price discovery and orderbook visualization.
- **Modular Grid**: Fully customizable drag-and-drop layout powered by `@dnd-kit`.
- **Expanded Layout Presets**:
    - `TRADING`: Live market feeds from Polymarket & Limitless.
    - `ARBITRAGE`: Focused on cross-platform spreads and profit calculators.
    - `ANALYTICS`: Deep evaluation with backtest summaries and statistical tests.
    - `COMPREHENSIVE`: The full institutional view encompassing all widgets.
- **Rich Visualization**: Glassmorphic panels, real-time SVG charts, and interactive arbitrage alerts.

---

## 🔧 Configuration System

ARBISENSE uses a dual-layer configuration approach:

1.  **Application Config (`backend/config.json`)**: Non-sensitive settings like performance targets and server defaults.
2.  **Environment Variables (`.env`)**: Sensitive credentials (API keys) and WebSocket URLs.
    - `NEXT_PUBLIC_WS_URL`: WebSocket endpoint for market data.
    - `POLYMARKET_WS_URL`: External CLOB WebSocket feed.
    - `LIMITLESS_API_URL`: Limitless Exchange endpoint.

---

## 📊 Performance Targets

- **Total Arbitrage Pipeline**: < 1,100ms
- **WebSocket Latency**: < 50ms (Internal Broadcaster)
- **Monte Carlo Pathfinding**: < 300ms
- **Agentic Consensus**: < 100ms
- **Position Optimization**: < 50ms

---

## 🏗️ Evaluation & Backtesting
Integrated testing suite for quantitative models:
- **Model Variant Comparison**: Directly compare different hyperparameters (e.g., Lévy Alpha, Kelly Fraction).
- **Stress Test Scenarios**: Evaluate performance against historical (2008, 2020) and synthetic Black Swan events.
- **Statistical Tests**: Built-in Jarque-Bera (Normality), ADF (Stationarity), and Ljung-Box (Autocorrelation) diagnostics.

---

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Serverless
- **Backend**: Fly.io (`fly deploy`)
- **Frontend**: Vercel (`vercel --prod`)

---

## ⚠️ Disclaimer
This is an institutional-grade demonstration project. While it uses live data feeds, the execution logic is for simulation purposes. This is not financial advice.

## 📄 License
MIT
