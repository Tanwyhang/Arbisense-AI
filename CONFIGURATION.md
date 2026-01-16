# Configuration Guide

ARBISENSE uses a two-tier configuration system:

## 1. Application Settings (`backend/config.json`)

Non-sensitive configuration settings are stored in `config.json`:

- **Environment**: development/production
- **Server settings**: host, port, reload
- **Performance tuning**: max compute time, Monte Carlo paths
- **CORS settings**: allowed origins, methods, headers
- **Simulation defaults**: default trading pairs, DEXes

### Example:
```json
{
  "environment": "development",
  "server": {
    "host": "0.0.0.0",
    "port": 8000
  },
  "performance": {
    "max_compute_time_ms": 1100,
    "monte_carlo_paths": 80
  }
}
```

## 2. Credentials (`.env`)

Sensitive API keys and credentials are stored in `.env` (never committed to git):

- API keys (OpenAI, Anthropic, etc.)
- Database connection strings
- Private keys
- Third-party service credentials

### Setup:
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
# OPENAI_API_KEY=sk-...
```

## Usage in Code

### Backend (Python)
```python
from app.config import config

# Access configuration
max_time = config.max_compute_time_ms
port = config.server_port

# Access environment variables (for credentials)
import os
api_key = os.getenv('OPENAI_API_KEY')
```

### Frontend (Next.js)
Frontend configuration uses environment variables prefixed with `NEXT_PUBLIC_`:

```bash
# .env.local (for frontend)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Best Practices

1. **Never commit `.env`** - It's in `.gitignore`
2. **Update `.env.example`** when adding new credentials
3. **Update `config.json`** for application settings
4. **Use `config.py`** to access settings in Python code
5. **Document changes** in this file when modifying configuration structure
