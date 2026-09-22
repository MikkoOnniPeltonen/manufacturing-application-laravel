# Backend - Manufacturing Management System

> **Note:** This is the backend service for the [Manufacturing Management System](../README.md).

## 🏗️ Tech Stack

- **Runtime**: PHP 8.5
- **Framework**: Laravel 13
- **Authentication**: Laravel Sanctum (HttpOnly cookie sessions)
- **Authorization**: Spatie Laravel Permission 8 (RBAC)
- **Database**: PostgreSQL 17 (SQLite is used for isolated tests)
- **Cache and queues**: Valkey/Redis with Laravel's Redis queue driver
- **API**: RESTful architecture with resource controllers

## 🚀 Setup Instructions

1.  **Install PHP dependencies**
    ```bash
    composer install
    ```

2.  **Environment Setup**
    ```bash
    cp .env.example .env
    php artisan key:generate
    ```

3.  **Database Setup**
    Configure your database in `.env` (Defaults to SQLite is fine for dev).
    ```bash
    # Run migrations and seeders
    php artisan migrate --seed
    ```

4.  **Start Server**
    ```bash
    php artisan serve
    ```
    The backend will be available at `http://localhost:8000`.

## 🛠️ Development Commands

```bash
# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Clear cache
php artisan cache:clear
php artisan config:clear

# Run tests
php artisan test
```

Queue and scheduler processes:

```bash
composer queue:work
composer schedule:work
php artisan queue:failed
```

Use a process supervisor in staging/production to restart workers after deploys.
Horizon is intentionally deferred until a stable Laravel 13-compatible release is
available; the application uses Laravel's Redis queue worker directly in the meantime.

Quality checks:

```bash
composer format:check
composer analyse
composer audit
```

Operational endpoints:

- `GET /up` — Laravel application health.
- `GET /ready` — database and cache/Valkey readiness.

API responses include an `X-Request-ID` header. Include that value when reporting
failures so logs can be correlated across requests and queue work.

## OpenAPI contract

The API contract is generated from the Laravel routes and request definitions with
[Scramble](https://github.com/dedoc/scramble). The committed contract is at
`../docs/api/openapi.json`, and the React workspace generates TypeScript definitions from it.

```bash
pnpm api:generate
```

## 📊 API Endpoints Snapshot

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get authenticated user

### Production Lines
- `GET /api/production-lines` - List all production lines
- `GET /api/production-lines/{id}/history` - Get historical data

### Sales
- `GET /api/sales` - List sales orders
- `GET /api/sales/{lineId}` - Get sales for specific line
- `POST /api/sales/generate` - Generate random sales (Admin)
- `DELETE /api/sales/clear/{lineId}` - Clear pending sales
- `PATCH /api/sales/reorder` - Reorder sales priority

### Production
- `PATCH /api/productions/{lineId}` - Update production status
- `POST /api/productions/process/{saleId}` - Process a sale item

### Customers (Admin Only)
- `GET /api/customers` - List, Create, Update, Delete customers

---
*For full project details, ensuring frontend integration, and user workflows, please refer to the [Root README](../README.md).*
