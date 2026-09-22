# Manufacturing Management System

Portfolio-grade manufacturing workflow application built as a Laravel API and a
separate React SPA. The project demonstrates a modular monolith, typed API
contracts, transactional domain workflows, cookie-based authentication, and
production-oriented verification.

## Stack

### Backend

- PHP 8.5
- Laravel 13
- PostgreSQL 17
- Valkey 8 / Redis-compatible cache, sessions, and queues
- Laravel Sanctum HttpOnly cookie sessions
- Spatie Laravel Permission 8 for RBAC
- Scramble-generated OpenAPI 3.1 contract
- Larastan/PHPStan and Laravel Pint

### Frontend

- React 19
- Vite
- React Router
- TanStack Query
- React Table
- Radix UI primitives
- Tailwind CSS
- Recharts
- `openapi-fetch` with generated TypeScript definitions
- pnpm workspace

## Product capabilities

- Role-based manager and administrator workflows
- Production-line and sales-order management
- Explicit sale state transitions:
  `pending` → `in_production` → `delivered`
- Transactional production updates with row locking
- Duplicate-processing protection
- Customer and product association management
- Production history reconstruction and filtering
- Bounded pagination and query limits
- Route-level frontend code splitting
- Request IDs and structured log context
- Application health and dependency readiness checks
- Redis/Valkey queue worker and scheduler support

## Repository layout

```text
.
├── manufacturing-laravel-backend/   Laravel API
├── manufacturing-app-frontend/      React/Vite SPA
├── docs/api/openapi.json             Generated API contract
├── compose.yaml                      PostgreSQL and Valkey development services
├── package.json                      Root pnpm scripts
└── .github/workflows/ci.yml          CI quality gates
```

## Requirements

- PHP 8.5+
- Composer 2+
- Node.js 22+
- pnpm 12+
- Docker Desktop (recommended for PostgreSQL and Valkey)

## Quick start

### 1. Install dependencies

```bash
composer install --working-dir=manufacturing-laravel-backend
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` and Valkey on `localhost:6379`.

### 3. Configure Laravel

```bash
cd manufacturing-laravel-backend
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
cd ..
```

The example environment is configured for PostgreSQL, Valkey, Redis sessions,
Redis queues, and a local React origin.

### 4. Run the application

In separate terminals:

```bash
cd manufacturing-laravel-backend
php artisan serve
```

```bash
pnpm dev:frontend
```

The API is available at `http://localhost:8000` and the SPA at
`http://localhost:5173`.

For a combined local workflow, Laravel also provides:

```bash
cd manufacturing-laravel-backend
composer dev
```

## Demo accounts

Seeded local/testing environments include:

| Role | Email | Password |
| --- | --- | --- |
| Manager | `manager@manufacturing.com` | `SecurePass2026!` |
| Admin | `admin@manufacturing.com` | `SecurePass2026!` |

These credentials are for local demonstration only and must not be used in a
deployed environment. The demo reset endpoint is restricted to local/testing
environments.

## API contract workflow

Laravel routes, requests, resources, and response types are exported with
[Scramble](https://github.com/dedoc/scramble). The generated contract is committed
at [docs/api/openapi.json](./docs/api/openapi.json), and TypeScript definitions
are generated for the React client.

```bash
pnpm api:generate
```

The CI workflow regenerates both files and fails if the working tree changes,
preventing contract drift.

The frontend client is defined in
[manufacturing-app-frontend/src/api/client.ts](./manufacturing-app-frontend/src/api/client.ts).

## Quality checks

Run the same core checks used by CI:

```bash
cd manufacturing-laravel-backend
composer test
composer analyse
composer format:check
composer audit
cd ..

pnpm lint:frontend
pnpm build:frontend
pnpm api:generate
```

The current backend suite covers production transitions, duplicate processing
protection, pagination limits, readiness checks, request correlation, sales
generation, and priority reordering.

## Operations

Health and readiness endpoints:

```text
GET /up
GET /ready
```

`/ready` verifies database and cache connectivity and returns `503` when a
dependency is unavailable. API responses include an `X-Request-ID` header for
log correlation.

Queue and scheduler commands:

```bash
cd manufacturing-laravel-backend
composer queue:work
composer schedule:work
php artisan queue:failed
```

Use a process supervisor in staging/production to restart workers after deploys.
Horizon is intentionally deferred until a stable Laravel 13-compatible release
is available; native Laravel Redis workers are used in the meantime.

## Security design

- Sanctum cookie sessions for the first-party SPA
- CSRF initialization before login
- HttpOnly session cookies
- Stateful API middleware
- Login throttling
- Role-based route authorization
- Environment-restricted demo reset
- Explicit request validation
- Enum-backed domain state transitions
- Transaction boundaries around multi-record updates
- Row-level locking for concurrent production processing
- Dependency auditing in CI

## License

This project is released under the MIT License.
