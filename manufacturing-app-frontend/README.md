# Manufacturing frontend

React SPA with strict TypeScript checks for all source files and a generated
OpenAPI client. Run `pnpm dev`, `pnpm typecheck`, `pnpm lint` and `pnpm build` here.
Use the Node version in the repository's `.nvmrc`.

Administrators manage `/orders`, `/customers`, `/admin/audit` and
`/admin/operations`. Managers stage orders and start background production runs
at `/manager-view`. Processing survives navigation and browser closure.

Run `pnpm test:e2e` against a disposable PostgreSQL database seeded with
`BrowserTestSeeder`. Playwright starts the API, an actual database queue worker,
and Vite on local ports. See the [project README](../README.md) and
[deployment runbook](../deploy/README.md) for configuration and test isolation.
