# Python Backend Development Best Practices (2025)

## Table of Contents
1. [Architecture & Design Patterns](#architecture--design-patterns)
2. [Framework Selection Guidelines](#framework-selection-guidelines)
3. [Security Best Practices](#security-best-practices)
4. [API Design Principles](#api-design-principles)
5. [Error Handling & Exception Management](#error-handling--exception-management)
6. [Logging & Monitoring](#logging--monitoring)
7. [Code Organization & Structure](#code-organization--structure)
8. [Performance & Scalability](#performance--scalability)
9. [Production Readiness](#production-readiness)
10. [Testing Best Practices](#testing-best-practices)
11. [Development Workflow](#development-workflow)

---

## Architecture & Design Patterns

### Core Architectural Principles

#### 1. Clean Architecture
- **Separation of Concerns**: Divide your application into distinct layers (presentation, business logic, data access)
- **Dependency Inversion**: High-level modules should not depend on low-level modules; both should depend on abstractions
- **Domain-Driven Design**: Organize code around business domains and bounded contexts

#### 2. SOLID Principles
- **Single Responsibility Principle**: Each class/module should have one reason to change
- **Open/Closed Principle**: Open for extension, closed for modification
- **Liskov Substitution Principle**: Derived classes must be substitutable for their base classes
- **Interface Segregation Principle**: Clients shouldn't depend on interfaces they don't use
- **Dependency Inversion Principle**: Depend on abstractions, not concretions

#### 3. Modern Architectural Patterns (2025)
- **Microservices**: Mature approach with managed complexity
  - Use when you have multiple independent teams
  - Each service should own its database
  - Implement service mesh for inter-service communication
- **Serverless Architecture**: Becoming mainstream
  - Ideal for event-driven workloads
  - Consider cold start times for critical paths
  - Use for sporadic or unpredictable traffic
- **Event-Driven Architecture**: Gaining popularity
  - Decouple services using message queues (RabbitMQ, Kafka, Redis)
  - Implement eventual consistency patterns
  - Use for async processing and real-time updates

### Project Structure

```
project-root/
├── src/
│   ├── api/              # API endpoints, routes, controllers
│   ├── core/             # Configuration, security, dependencies
│   ├── models/           # Database models, schemas
│   ├── services/         # Business logic layer
│   ├── repositories/     # Data access layer
│   ├── utils/            # Helper functions, utilities
│   └── middleware/       # Custom middleware
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── alembic/              # Database migrations (if using)
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── .env.example          # Environment variables template
├── requirements.txt      # Production dependencies
├── requirements-dev.txt  # Development dependencies
├── pyproject.toml        # Project metadata & tool config
└── README.md
```

---

## Framework Selection Guidelines

### FastAPI (Recommended for Modern APIs)

**When to Use:**
- Building high-performance REST APIs
- Require automatic OpenAPI documentation
- Need async support for I/O-bound operations
- Want type hints and validation out of the box

**Key Features:**
- Native async/await support
- Automatic data validation with Pydantic
- Built-in Swagger UI and ReDoc
- High performance (on par with NodeJS and Go)

**Best Practices:**
```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI(
    title="My API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use dependency injection for shared logic
def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

@app.get("/items/{item_id}")
async def read_item(item_id: int, db: Session = Depends(get_db)):
    return {"item_id": item_id}
```

### Django (Best for Full-Stack Applications)

**When to Use:**
- Need a complete framework with batteries included
- Building traditional web applications with server-side rendering
- Require built-in admin interface
- Working with a large team needing structure

**Best Practices:**
- Use Django REST Framework for APIs
- Follow Django's app structure for modularity
- Leverage Django's ORM for complex queries
- Use Django's built-in authentication and permissions

### Flask (Ideal for Lightweight Services)

**When to Use:**
- Building microservices
- Need maximum flexibility and minimal dependencies
- Simple APIs without complex requirements
- Learning or prototyping

**Best Practices:**
- Use blueprints for organization
- Implement application factories
- Use Flask extensions carefully (avoid dependency bloat)
- Structure similar to FastAPI but without automatic validation

---

## Security Best Practices

### 1. Authentication & Authorization

#### JWT (JSON Web Tokens)
```python
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

#### OAuth2 with FastAPI
```python
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_token(token)
```

### 2. Input Validation & Sanitization
- **Never trust user input**: Always validate and sanitize
- **Use Pydantic models**: For request/response validation
- **SQL Injection prevention**: Use parameterized queries or ORM
- **XSS prevention**: Sanitize HTML output, use Content Security Policy
- **CSRF protection**: Implement CSRF tokens for state-changing operations

```python
from pydantic import BaseModel, Field, validator

class UserCreate(BaseModel):
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    password: str = Field(..., min_length=8)
    username: str = Field(..., min_length=3, max_length=50)

    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        return v
```

### 3. Security Headers
```python
# FastAPI Security Middleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["example.com", "*.example.com"]
)
app.add_middleware(HTTPSRedirectMiddleware)

# Security headers response
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

### 4. Secrets Management
- **Never hardcode secrets**: Use environment variables
- **Use `.env` files**: Add to `.gitignore`
- **Rotate secrets regularly**: Implement automated rotation
- **Use vault services**: HashiCorp Vault, AWS Secrets Manager
- **Audit access**: Log all secret access

```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

### 5. Dependencies & Vulnerability Scanning
```bash
# Use safety to check for known vulnerabilities
pip install safety
safety check

# Use pip-audit
pip install pip-audit
pip-audit

# Regular updates
pip list --outdated
```

---

## API Design Principles

### 1. RESTful Best Practices
- **Use HTTP verbs correctly**:
  - `GET`: Retrieve resources (idempotent, safe)
  - `POST`: Create resources
  - `PUT`: Update resources (idempotent)
  - `PATCH`: Partial updates (non-idempotent)
  - `DELETE`: Remove resources (idempotent)

- **Resource naming**: Use nouns, not verbs
  - ✅ `/users`, `/users/123/posts`
  - ❌ `/getUsers`, `/createUser`

- **Use plural nouns**: `/users` not `/user`

- **Nest resources logically**:
  - `/users/{user_id}/posts/{post_id}/comments`

### 2. Status Codes
```python
# Success
200 OK          # GET, PUT, PATCH
201 Created     # POST
204 No Content  # DELETE, PUT

# Client Error
400 Bad Request           # Invalid input
401 Unauthorized          # Not authenticated
403 Forbidden             # Authenticated but not authorized
404 Not Found             # Resource doesn't exist
409 Conflict              # Resource already exists
422 Unprocessable Entity  # Validation error (FastAPI)
429 Too Many Requests     # Rate limit exceeded

# Server Error
500 Internal Server Error  # Unhandled error
503 Service Unavailable    # Service down
```

### 3. Versioning
```python
# URL versioning (recommended)
app.include_router(v1_router, prefix="/api/v1")
app.include_router(v2_router, prefix="/api/v2")

# Header versioning
@app.get("/items", headers={"X-API-Version": "2"})
```

### 4. Pagination
```python
from fastapi import Query

@app.get("/items")
async def get_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    items = db.query(Item).offset(skip).limit(limit).all()
    total = db.query(Item).count()
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }
```

### 5. Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/items")
@limiter.limit("10/minute")
async def get_items(request: Request):
    return {"items": []}
```

---

## Error Handling & Exception Management

### 1. Structured Exception Handling
```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

# Custom exception class
class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail

# Exception handler
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "path": str(request.url)}
    )

# Usage
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id < 1:
        raise AppException(status_code=400, detail="Invalid item ID")
    return {"item_id": item_id}
```

### 2. Global Exception Handler
```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )
```

### 3. Try-Except Best Practices
```python
# ✅ Good: Specific exceptions
try:
    user = db.query(User).filter(User.id == user_id).one()
except NoResultFound:
    logger.warning(f"User not found: {user_id}")
    raise HTTPException(status_code=404, detail="User not found")
except Exception as e:
    logger.error(f"Database error: {e}")
    raise HTTPException(status_code=500, detail="Database error")

# ❌ Bad: Bare except
try:
    user = db.query(User).filter(User.id == user_id).one()
except:
    pass
```

### 4. HTTP Status Code Consistency
- Always use appropriate HTTP status codes
- Include error details in response body
- Log all errors with sufficient context
- Never expose stack traces in production

---

## Logging & Monitoring

### 1. Structured Logging
```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
```

### 2. Logging Best Practices
```python
# ✅ Good: Structured with context
logger.info(
    "User logged in",
    extra={
        "user_id": user.id,
        "ip_address": request.client.host,
        "user_agent": request.headers.get("user-agent")
    }
)

# ✅ Good: Appropriate log levels
logger.debug("Detailed debugging info")
logger.info("Normal operation")
logger.warning("Something unexpected but recoverable")
logger.error("Error occurred but application continues")
logger.critical("Critical error, service may be unavailable")

# ❌ Bad: String concatenation, no context
logger.info("User logged in: " + str(user.id))
```

### 3. Using Loguru (Modern Alternative)
```python
from loguru import logger
import sys

# Remove default handler
logger.remove()

# Add custom handlers
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    level="INFO"
)

logger.add(
    "logs/app_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="30 days",
    level="ERROR"
)

# Usage
logger.info("User created", user_id=123, email="user@example.com")
```

### 4. Monitoring & Observability

#### Health Checks
```python
@app.get("/health")
async def health_check():
    # Check database connection
    try:
        db.execute("SELECT 1")
    except:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Check external services
    # Check disk space, memory, etc.

    return {"status": "healthy"}

@app.get("/health/ready")
async def readiness_check():
    # Check if service can accept traffic
    return {"ready": True}

@app.get("/health/live")
async def liveness_check():
    # Check if service is running
    return {"alive": True}
```

#### Metrics with Prometheus
```python
from prometheus_client import Counter, Histogram, generate_latest

request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")
```

### 5. Distributed Tracing
- Implement OpenTelemetry for distributed tracing
- Use Jaeger or Zipkin for trace visualization
- Correlate logs with traces using trace IDs

---

## Code Organization & Structure

### 1. Dependency Injection Pattern
```python
from fastapi import Depends
from typing import Generator

# Database session dependency
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Service layer dependency
class UserService:
    def __init__(self, db: Session):
        self.db = db

def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)

# Usage in endpoint
@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    user_service: UserService = Depends(get_user_service)
):
    return user_service.get_user(user_id)
```

### 2. Repository Pattern
```python
from abc import ABC, abstractmethod

class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: int) -> User:
        pass

    @abstractmethod
    def create(self, user: UserCreate) -> User:
        pass

class SQLUserRepository(UserRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User:
        return self.db.query(User).filter(User.id == user_id).first()

    def create(self, user: UserCreate) -> User:
        db_user = User(**user.dict())
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
```

### 3. Service Layer Pattern
```python
class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def get_user(self, user_id: int) -> User:
        user = self.user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    def create_user(self, user_data: UserCreate) -> User:
        # Business logic validation
        if self.user_repository.email_exists(user_data.email):
            raise HTTPException(status_code=400, detail="Email already exists")
        return self.user_repository.create(user_data)
```

### 4. Configuration Management
```python
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "My API"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # External Services
    REDIS_URL: str = "redis://localhost:6379"

    @validator('DATABASE_URL')
    def validate_database_url(cls, v):
        if not v.startswith(('postgresql://', 'postgresql+asyncpg://')):
            raise ValueError('Must use PostgreSQL')
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

---

## Performance & Scalability

### 1. Async/Await Best Practices
```python
import asyncio

# ✅ Good: Concurrent operations
async def fetch_multiple_data():
    results = await asyncio.gather(
        fetch_user_data(),
        fetch_posts_data(),
        fetch_comments_data()
    )
    return results

# ❌ Bad: Sequential operations
async def fetch_multiple_data_bad():
    user = await fetch_user_data()
    posts = await fetch_posts_data()
    comments = await fetch_comments_data()
    return [user, posts, comments]
```

### 2. Database Optimization
```python
# ✅ Good: Use indexes
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, index=True)  # Index for queries
    created_at = Column(DateTime, index=True)

# ✅ Good: Select only needed columns
users = db.query(User.id, User.email).all()

# ✅ Good: Use joins efficiently
result = db.query(User, Post).join(Post).filter(User.id == Post.user_id).all()

# ❌ Bad: N+1 query problem
# Get all posts and their users (N+1)
posts = db.query(Post).all()
for post in posts:
    print(post.user.email)  # N additional queries

# ✅ Good: Eager loading
from sqlalchemy.orm import joinedload

posts = db.query(Post).options(joinedload(Post.user)).all()
```

### 3. Caching Strategies
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

@app.get("/items/{item_id}")
@cache(expire=60)  # Cache for 60 seconds
async def get_item(item_id: int):
    return {"item_id": item_id, "data": "expensive computation"}

# Cache invalidation
@app.post("/items/{item_id}")
async def update_item(item_id: int, item: ItemUpdate):
    # Update item
    await FastAPICache.clear(namespace="item_cache")
    return {"message": "updated"}
```

### 4. Connection Pooling
```python
from sqlalchemy.pool import QueuePool

engine = create_async_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,        # Max connections
    max_overflow=10,     # Additional connections when pool is full
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600    # Recycle connections after 1 hour
)
```

### 5. Pagination for Large Datasets
```python
from fastapi import Query

@app.get("/items")
async def get_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    total = db.query(Item).count()
    items = db.query(Item).offset(skip).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": skip // limit + 1,
        "pages": (total + limit - 1) // limit
    }
```

---

## Production Readiness

### 1. Environment-Specific Configuration
```python
class Settings(BaseSettings):
    ENVIRONMENT: str = "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

settings = Settings()

# Use in application
if settings.is_production:
    logger.setLevel(logging.WARNING)
else:
    logger.setLevel(logging.DEBUG)
```

### 2. Database Migrations
```bash
# Using Alembic
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# In production
alembic upgrade head
```

### 3. Graceful Shutdown
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application starting up")
    # Initialize connections, cache, etc.
    yield
    # Shutdown
    logger.info("Application shutting down")
    # Close connections, cleanup resources

app = FastAPI(lifespan=lifespan)
```

### 4. Deployment Best Practices
- **Use ASGI server**: uvicorn or hypercorn for production (never use development server)
- **Reverse proxy**: Use nginx or traefik for SSL, load balancing
- **Containerization**: Use Docker with multi-stage builds
- **Orchestration**: Use Kubernetes or similar for scaling
- **CI/CD**: Automate testing, building, and deployment

```dockerfile
# Multi-stage Dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Testing Best Practices

### 1. Testing Pyramid
- **Unit Tests**: 70% - Test individual functions/methods
- **Integration Tests**: 20% - Test component interactions
- **E2E Tests**: 10% - Test complete workflows

### 2. Pytest Setup
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)
```

### 3. Unit Testing
```python
def test_create_user(client):
    response = client.post(
        "/users/",
        json={
            "email": "test@example.com",
            "password": "testpass123",
            "username": "testuser"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "password" not in data  # Password should not be exposed
```

### 4. Integration Testing
```python
def test_user_flow(client, db):
    # Create user
    response = client.post("/users/", json=user_data)
    user_id = response.json()["id"]

    # Get user
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 200

    # Update user
    response = client.put(f"/users/{user_id}", json={"username": "updated"})
    assert response.status_code == 200
    assert response.json()["username"] == "updated"

    # Delete user
    response = client.delete(f"/users/{user_id}")
    assert response.status_code == 204
```

### 5. Test Coverage
```bash
# Install pytest-cov
pip install pytest-cov

# Run tests with coverage
pytest --cov=src --cov-report=html --cov-report=term

# Generate coverage report (aim for >80%)
```

---

## Development Workflow

### 1. Code Quality Tools

#### Black (Code Formatting)
```bash
pip install black
black .
black --check .  # Check without modifying
```

#### isort (Import Sorting)
```bash
pip install isort
isort .
isort --check-only .
```

#### flake8 (Linting)
```bash
pip install flake8
flake8 . --max-line-length=88 --extend-ignore=E203
```

#### mypy (Type Checking)
```bash
pip install mypy
mypy src/
```

#### pre-commit (Git Hooks)
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black
  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.0.1
    hooks:
      - id: mypy
```

```bash
# Install pre-commit
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg
```

### 2. Documentation
```python
# Use docstrings with Google style
def create_user(user_data: UserCreate) -> User:
    """Create a new user in the database.

    Args:
        user_data: User creation data including email, password, and username.

    Returns:
        User: The created user object.

    Raises:
        HTTPException: If email already exists.
    """
    pass
```

### 3. Type Hints
```python
from typing import List, Optional

def get_users(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True
) -> List[User]:
    """Retrieve users with pagination."""
    pass

async def process_item(
    item_id: int,
    metadata: Optional[dict] = None
) -> dict:
    """Process an item asynchronously."""
    pass
```

### 4. Virtual Environment & Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Freeze dependencies
pip freeze > requirements.txt

# Separate dev dependencies
pip install pytest black isort flake8 mypy
pip freeze > requirements-dev.txt

# Use pipenv for better dependency management
pip install pipenv
pipenv install fastapi uvicorn
pipenv install pytest --dev
```

---

## Additional Resources

### Learning Resources
- [FastAPI Official Documentation](https://fastapi.tiangolo.com/)
- [Real Python](https://realpython.com/)
- [Python Best Practices (Full Stack Python)](https://www.fullstackpython.com/)
- [12-Factor App Methodology](https://12factor.net/)

### Tools & Libraries
- **API**: FastAPI, Flask, Django REST Framework
- **Validation**: Pydantic, Marshmallow
- **ORM**: SQLAlchemy, Django ORM, Tortoise ORM
- **Database**: PostgreSQL, MongoDB, Redis
- **Testing**: pytest, unittest, hypothesis
- **Logging**: Loguru, structlog, standard logging
- **Monitoring**: Prometheus, Grafana, Sentry
- **Task Queues**: Celery, RQ, Dramatiq
- **Async**: asyncio, trio, curio

### Security Checklist
- [ ] Implement authentication (JWT/OAuth2)
- [ ] Enable CORS properly
- [ ] Validate and sanitize all inputs
- [ ] Use parameterized queries
- [ ] Implement rate limiting
- [ ] Set security headers
- [ ] Use HTTPS in production
- [ ] Rotate secrets regularly
- [ ] Audit dependencies for vulnerabilities
- [ ] Implement proper error handling
- [ ] Log security events
- [ ] Regular security audits

---

## Conclusion

Following these best practices will help you build secure, scalable, and maintainable Python backend applications. Remember that best practices evolve, so stay updated with the latest developments in the Python ecosystem.

**Key Takeaways:**
1. Prioritize code organization and architecture from the start
2. Implement security best practices from day one
3. Write comprehensive tests
4. Use structured logging and monitoring
5. Automate your development workflow
6. Keep dependencies updated and secure
7. Design APIs with the consumer in mind
8. Plan for production from the beginning

Happy coding!
