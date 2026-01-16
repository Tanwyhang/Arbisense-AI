# ARBISENSE Backend - Quick Start Guide

Real-time multi-agent arbitrage analysis backend powered by FastAPI and advanced quantitative engines.

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Create & Activate Virtual Environment
```bash
# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Start the Backend Server
```bash
# Option 1: Start with auto-reload (recommended for development)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Option 2: Start without auto-reload
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Option 3: Run directly
python -m app.main
```

### Step 5: Verify Backend is Running
```bash
# Test health endpoint
curl http://localhost:8000/health

# Expected output:
# {"status":"healthy","service":"ARBISENSE"}
```

## 📊 API Endpoints

### Health Check
```bash
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "service": "ARBISENSE"
}
```

### Arbitrage Simulation
```bash
POST /simulate
Content-Type: application/json

{
  "pair": "USDC-USDT",
  "dex_a": "Camelot",
  "dex_b": "Sushiswap"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "pair": "USDC-USDT",
    "dex_a": "Camelot",
    "dex_b": "Sushiswap"
  }'
```

**Response includes:**
- **Opportunity Data**: Trading pair, prices, spread, liquidity
- **Monte Carlo Simulation**: 80 paths with Lévy flights, risk metrics (CVaR, VaR, skewness, kurtosis)
- **Multi-Agent Consensus**: 3 specialized agents (Risk, Gas, Alpha) with 2/3 approval protocol
- **Kelly Criterion**: Optimal position sizing with correlation adjustments
- **Revenue Projections**: 30-day P&L across 4 stress scenarios

### Root Endpoint
```bash
GET /
```
**Response:**
```json
{
  "service": "ARBISENSE",
  "description": "Real-Time Multi-Agent Arbitrage Oracle",
  "endpoints": {
    "health": "/health",
    "simulate": "/simulate (POST)"
  }
}
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend root (optional):
```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
RELOAD=true

# Performance Settings
NUM_MONTE_CARLO_PATHS=80
MAX_COMPUTE_TIME_MS=1100

# CORS Settings (for production)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Server Port
To change the default port (8000):
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

## 🏗️ Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application & endpoints
│   ├── models.py            # Pydantic models (request/response)
│   ├── engines/
│   │   ├── monte_carlo.py   # Monte Carlo simulation with Lévy flights
│   │   ├── agents.py        # Multi-agent consensus system
│   │   ├── kelly.py         # Kelly position sizing optimizer
│   │   └── revenue.py       # Revenue projection engine
│   └── utils/
│       └── synthetic.py     # Synthetic data generator
├── venv/                    # Virtual environment
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 🔍 Development

### Auto-Reload Mode
The `--reload` flag automatically restarts the server when you save changes to Python files:
```bash
python -m uvicorn app.main:app --reload
```

### Viewing Logs
Server logs will appear in your terminal showing:
- Startup messages (warm-up status)
- HTTP requests and responses
- Error messages
- Computation times

### Testing the Simulation
```bash
# Using the built-in Python HTTP client
python -c "
import requests
response = requests.post('http://localhost:8000/simulate', json={
    'pair': 'USDC-USDT',
    'dex_a': 'Camelot',
    'dex_b': 'Sushiswap'
})
print(response.json())
"
```

## 🐛 Troubleshooting

### Port 8000 Already in Use
```bash
# Kill process on port 8000 (macOS/Linux)
kill -9 $(lsof -ti:8000)

# OR use a different port
python -m uvicorn app.main:app --port 8001 --reload
```

### Module Not Found Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CORS Errors (Frontend Can't Connect)
The backend allows all origins by default (`allow_origins=["*"]`). For production, edit `app/main.py` line 49:
```python
allow_origins=["https://your-frontend-domain.com"],
```

### Slow Performance
- Reduce Monte Carlo paths in `app/main.py` line 84:
  ```python
  monte_carlo_result = run_monte_carlo(opportunity, num_paths=40)  # Reduced from 80
  ```

### Backend Won't Start
```bash
# Check Python version (must be 3.9+)
python --version

# Verify virtual environment is activated
which python  # Should point to venv/bin/python

# Check for syntax errors
python -m py_compile app/main.py
```

## 🔒 Production Deployment

### Using Gunicorn (Recommended)
```bash
pip install gunicorn

gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

### Using Docker
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment-Specific Settings
```bash
# Production
export ENV=production
export ALLOWED_ORIGINS=https://yourdomain.com
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Development
export ENV=development
export ALLOWED_ORIGINS=*
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 📈 Performance Monitoring

The backend tracks computation time for each request:
- **Target**: < 1100ms per simulation
- **Warm-up**: Runs on startup to reduce cold start latency
- **Metrics**: Included in `/simulate` response

Monitor computation times in the console:
```
INFO: 127.0.0.1:xxxxx - "POST /simulate HTTP/1.1" 200 OK
```

## 🛑 Stopping the Server

```bash
# Press Ctrl+C in the terminal running the server

# OR kill by port
kill -9 $(lsof -ti:8000)

# OR kill by process ID
ps aux | grep uvicorn
kill -9 <PID>
```

## 📚 Additional Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Uvicorn Docs**: https://www.uvicorn.org/
- **Pydantic Docs**: https://docs.pydantic.dev/

## 🤝 Frontend Integration

The frontend connects to the backend via:
```typescript
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const response = await fetch(`${backendUrl}/simulate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ pair, dex_a, dex_b }),
  cache: "no-store"
});
```

**Frontend Environment Variable:**
```env
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

**Ready to serve!** 🚀

For issues or questions, refer to the main project README or contact the development team.
