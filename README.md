# Manufacturing Management System

Manufacturing workflow application built as a Laravel API and a
separate React SPA. The project demonstrates a modular monolith, typed API
contracts, transactional domain workflows, cookie-based authentication, and
production-oriented verification.

## Stack

### Backend

- PHP 8.5
- Laravel 13
- PostgreSQL 18
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
- Node.js 24.22.1+ within the 24 LTS line (`nvm install` uses `.nvmrc`)
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

Existing PostgreSQL 17 users must follow the [database upgrade runbook](deploy/README.md#upgrading-postgresql-17-to-18)
before starting the new service. PostgreSQL 18 uses a separate volume and a new
mount location; existing data is retained in the old volume and requires migration.

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
deployed environment. Demo data requires `DEMO_MODE=true` and a local/testing environment. The demo reset
endpoint additionally requires an authenticated administrator; the CLI command has
the same environment guard. Production seeding initializes roles and permissions
without creating demo accounts.

## API contract workflow

Laravel routes, requests, resources, and response types are exported with
[Scramble](https://github.com/dedoc/scramble). The generated contract is committed
at [docs/api/openapi.json](./docs/api/openapi.json), and TypeScript definitions
are generated for the React client.

```bash
pnpm api:generate
```

Contract generation uses a fixed testing environment, localhost URL and demo mode
so the documented development endpoints are reproducible locally and in CI.
These settings apply only to the export process.
Scramble also inspects model columns: first run `php artisan migrate` in the
backend against your local PostgreSQL 18 database. CI recreates that schema after
the integration tests roll their migrations back.

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
pnpm --filter manufacturing-frontend typecheck
pnpm audit
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

## API changes and verification (October 2026)

Collection endpoints now return a pagination envelope by default (`data`,
`current_page`, `last_page`, `per_page`, `total`, `from`, `to`). The default page
size is 25 and the maximum is 100. Clients must follow pagination rather than
assuming all records arrive in one response. History search uses the same
envelope inside `sales`; timestamp snapshots return paginated `pending` and
`in_production` arrays with top-level pagination metadata. Dates default to the
last 30 days for history search, including when only one date bound is supplied.

Customer responses expose grouped `sales_summary` rather than complete sale
histories. Retrieve individual orders using `/api/v1/sales?customer_id=...` with
pagination. Production-line lists include aggregate counts for the dashboard.
Production batches accept up to 100 distinct sale IDs and reject the whole batch
when any sale is missing or belongs to another line. Staging order is persisted.

The TypeScript check now includes all frontend source files in strict mode.
Screens, contexts and shared UI components are TypeScript/TSX, and API calls are
checked against the generated contract. Browser tests cover the real cookie
login/logout flow, customer creation/editing/deletion, order changes, background
production, manager restrictions, history search, and desktop/mobile page layouts:

```bash
pnpm --filter manufacturing-frontend exec playwright install chromium
pnpm --filter manufacturing-frontend test:e2e
```

Use a **dedicated, disposable database** containing demo fixtures for browser
checks. Migrate and seed it with `APP_ENV=local DEMO_MODE=true` before starting the
suite. Playwright starts its own API and frontend servers on ports 8000 and 5173.
To keep an existing preview open, set `E2E_API_PORT=8100 E2E_FRONTEND_PORT=5174`
when running the suite; keep its database separate from your preview database.
Do not run it against a shared database. PostgreSQL concurrency tests run as part
of `composer test` when `DB_CONNECTION=pgsql`; SQLite runs skip those PostgreSQL-only tests.
All backend tests migrate their configured database, so always use a test database.
CI verifies both the PostgreSQL concurrency tests and the browser workflows.

## Dependency maintenance and deployment

The verified update retains PHP 8.5 and Laravel 13, updates Composer packages
within their existing compatible ranges, and moves both Vite toolchains to Vite
8 with matching plugins. JavaScript dependencies are refreshed within their
compatible ranges. Tailwind 3's selector parser is overridden to a patched 7.x
release; the CSS production build is verified with that override.

Tailwind 4, React Table 9, Recharts 3, Biome 2, and PHPUnit 13 involve separate
major-version migrations and are deferred. Recharts 2 is marked deprecated by
its publisher; plan its replacement alongside the chart wrapper migration.
PostgreSQL 18 and Valkey 8 are used in Compose/CI, with PostgreSQL 18 client tools
for backup and restore tests. Existing PostgreSQL 17 data needs the documented
dump/restore migration. Dependabot proposes weekly dependency and GitHub
Actions updates. CI audits both Composer and the pnpm workspace.

For production, set `APP_ENV=production`, `APP_DEBUG=false`, `DEMO_MODE=false`,
`SESSION_SECURE_COOKIE=true`, and the exact `FRONTEND_URL` and
`SANCTUM_STATEFUL_DOMAINS`. Serve both applications over HTTPS. If the API and SPA
use different subdomains, configure a shared `SESSION_DOMAIN` so the SPA can read
the XSRF cookie. Keep database and cache ports private; development Compose now
binds them to loopback only. Demo accounts from an earlier deployment are not
removed automatically: remove or rotate those credentials if they were seeded.

After pulling these changes, run `composer install`, `pnpm install --frozen-lockfile`,
and `php artisan migrate` from the backend directory for the new history and
customer-summary indexes. Refresh cached configuration and restart supervised
workers as part of your normal deployment.

Version references: [Laravel support](https://laravel.com/docs/13.x/releases),
[Vite 8 migration](https://vite.dev/guide/migration),
[Node security releases](https://github.com/nodejs/node/releases),
[PostgreSQL support](https://www.postgresql.org/support/versioning/), and
[Valkey maintained releases](https://valkey.io/download/).
The repository pins Node 24.22.1 because that release includes security fixes;
updating the project does not replace a developer's installed Node runtime.

## Business workflows and operations

Administrators can create, edit and cancel real orders at `/orders`, with a
required reason and an audit trail at `/admin/audit`. Only pending orders can be
edited or cancelled. Managers stage orders and start persistent background
production runs; workers continue independently of browser tabs. Failed runs can
be retried. The administrator operations screen is `/admin/operations`.

Run `composer queue:work` and `composer schedule:work` alongside the API. The
scheduler records heartbeats and repairs queued runs after dispatch outages.
For a production release use the [deployment runbook](deploy/README.md), worker
and cron examples, `php artisan ops:check --deployment`, and PostgreSQL
`ops:backup --verify` / `ops:verify-backup` commands. External error delivery is
optional until configured with `ERROR_WEBHOOK_URL`; normal Laravel logs remain.

[Workflow architecture](docs/architecture/workflows.md) explains transactions,
lock ordering, response codes, audit scope, idempotency, retries and recovery.
A hosted preview still needs a chosen host, public domain and its own disposable
database. The repository name can be changed independently of these features.
