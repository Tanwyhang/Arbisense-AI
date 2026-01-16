# Python Backend Development Best Practices (2025)

This document outlines the authoritative standards and best practices for Python backend development within this project.

## 1. Project Structure & Dependency Management

### Project Layout
- **Use the `src/` layout**: Place application code in a `src/` subdirectory to ensure tests run against the installed package, not the local folder.
- **Root Directory**: Should only contain configuration files (`pyproject.toml`, `.gitignore`, `Dockerfile`, `README.md`) and the `src` and `tests` directories.

```text
my-project/
├── src/
│   └── my_app/
│       ├── __init__.py
│       ├── main.py
│       ├── api/          # Routers and controllers
│       ├── core/         # Config, security, logging
│       ├── models/       # Database models
│       ├── schemas/      # Pydantic schemas (DTOs)
│       └── services/     # Business logic
├── tests/
├── pyproject.toml
└── .env.example
```

### Dependency Management
- **Tooling**: Use **`uv`** (preferred for speed) or **`Poetry`**.
- **Configuration**: All dependencies and tool configurations (linting, testing) must be defined in `pyproject.toml`.
- **Lock Files**: Always commit `uv.lock` or `poetry.lock` to ensure reproducible builds.
- **Separation**: Keep development dependencies (linters, testing) separate from production dependencies.

## 2. Code Style, Typing & Linting

### Tooling
- **Ruff**: The single source of truth for linting and formatting. Replace Flake8, Black, and isort with Ruff.
    - Enable strict rules (e.g., `select = ["E", "F", "B", "I", "UP", "PL"]`).
- **MyPy**: Strict static type checking.
    - Disallow untyped definitions (`disallow_untyped_defs = true`).
    - Avoid `Any` wherever possible.

### Coding Standards
- **Type Hints**: Mandatory for all function arguments and return values.
- **Docstrings**: Use Google-style docstrings for all public modules, functions, classes, and methods.
- **AsyncIO**:
    - Use `async def` for I/O-bound operations (DB, API calls).
    - Use `def` for CPU-bound operations to leverage the thread pool.

## 3. Framework Specifics (FastAPI)

### Architecture
- **Dependency Injection**: Heavily utilize `Depends()` for shared logic (auth, DB sessions, settings).
- **Pydantic**: Use Pydantic V2 models for all data validation, serialization, and configuration settings (`pydantic-settings`).
- **Routers**: Split routes into modules (e.g., `src/api/v1/users.py`) and include them in the main app.

### API Design
- **RESTful**: Follow standard REST conventions (GET, POST, PUT, DELETE).
- **Status Codes**: Return appropriate HTTP status codes (201 for creation, 204 for no content, 4xx for client errors).
- **Versioning**: namespace APIs (e.g., `/api/v1/...`).

## 4. Security

- **Authentication**: Use OAuth2 with JWT (stateless).
- **Secrets**: NEVER commit secrets. Use strict environment variable validation via `pydantic-settings`.
- **Validation**: Trust no input. Validate everything with Pydantic schemas.
- **Headers**: Implement secure headers (HSTS, CSP, etc.) via middleware.
- **SQL Injection**: Use an ORM (SQLAlchemy 2.0+, Prisma) or parameterized queries.

## 5. Error Handling & Observability

### Error Handling
- **Exceptions**: Use custom exception classes inheriting from a base project exception.
- **Global Handler**: Implement a global `exception_handler` to catch unhandled exceptions and return structured JSON responses.
- **Detail**: Do not expose internal stack traces to clients in production.

### Logging
- **Structlog**: Use `structlog` for structured, JSON-formatted logs in production.
- **Context**: Include Correlation IDs (Request IDs) in all logs to trace requests across services.
- **Levels**: Use appropriate levels (ERROR for exceptions, INFO for significant events, DEBUG for dev).

## 6. Testing

- **Pytest**: The standard testing framework.
- **Fixtures**: Use `conftest.py` for shared fixtures (DB sessions, API clients).
- **Async Tests**: Use `pytest-asyncio` for testing async endpoints.
- **Coverage**: Aim for high test coverage (>80%), focusing on business logic and critical paths.
