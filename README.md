# ARBISENSE

Real-Time Multi-Agent Arbitrage Oracle for Arbitrum with Revenue Stress Testing

## 🚀 Quick Start

### Local Development (Docker)

```bash
# Clone the repository
git clone <repository-url>
cd arbisense-ai

# Create .env file
cp .env.example .env

# Start all services
docker compose up --build
```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🏗️ Architecture

### Backend (Python FastAPI)
- **Monte Carlo Engine**: Non-uniform sampling with Lévy flights (α=1.7) for fat-tail modeling
- **Multi-Agent Judge**: Risk, Gas, and Alpha agents with 2/3 consensus protocol
- **Kelly Optimizer**: Correlation-adjusted position sizing with 5% safety cap
- **Revenue Projector**: 30-day P&L across 4 stress scenarios

### Frontend (Next.js 14)
- Server-side rendering for zero-JS core visuals
- SVG visualizations for Monte Carlo paths and revenue projections
- Real-time computation time tracking

## 📊 Features

- ⚡ **< 1,100ms Pipeline**: Full quant analysis in under 1.1 seconds
- 🎯 **Institutional-Grade**: CVaR, Kelly Criterion, stress testing
- 🤖 **Multi-Agent Validation**: Quantitative consensus protocol
- 📈 **Revenue Forecasting**: Best/Average/Stress/Black Swan scenarios
- 🎨 **Premium UI**: Glassmorphism, gradients, server-side SVG

## 🚢 Deployment

### Backend (Fly.io)
```bash
cd backend
fly deploy --remote-only
```

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

Set environment variable:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.fly.dev
```

## 📝 API Endpoints

- `POST /simulate` - Run full arbitrage simulation
- `GET /health` - Health check

## 🧪 Performance Targets

- Total pipeline: < 1,100ms
- Monte Carlo: < 300ms
- Multi-Agent: < 100ms
- Kelly Optimizer: < 50ms
- Revenue Projector: < 400ms

## ⚠️ Disclaimer

This is a demonstration project using synthetic data. Not financial advice.

## 📄 License

MIT
