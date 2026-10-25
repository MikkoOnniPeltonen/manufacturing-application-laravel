# Deployment and operations runbook

Use HTTPS, PHP 8.5, Node from `.nvmrc`, PostgreSQL 17+ and a durable Laravel queue
(Redis/Valkey or database). Examples assume `/var/www/manufacturing`; edit paths,
service users, frontend hosting and TLS termination for your environment.
Nothing in this repository publishes a site or provisions a hosting account.

## Release sequence

1. Back up the current database and retain a verified copy before schema changes.
2. Install production Composer dependencies and frozen pnpm dependencies. Run
   the backend suite, strict frontend typecheck, lint, build and API-contract
   generation checks in CI. Serve the SPA `dist` directory with history fallback.
3. Configure `APP_ENV=production`, `APP_DEBUG=false`, `DEMO_MODE=false`, an HTTPS
   `APP_URL`/`FRONTEND_URL`, exact Sanctum stateful domains, secure/HttpOnly cookies,
   and a durable `QUEUE_CONNECTION`. Keep database/cache ports private. Use a
   shared `SESSION_DOMAIN` when the SPA and API are sibling subdomains.
4. Run `php artisan migrate --force`, then `config:cache` and `route:cache`.
5. Install the worker supervisor and scheduler examples. Run `queue:restart` to
   load new code into workers. Do not retry failed jobs before fixing their cause.
6. Verify a fresh backup with the new schema, allow one minute for both heartbeat
   signals, then run `deploy/preflight.sh` and check `/ready` before admitting
   traffic. Failed preflight exits nonzero; it does not deploy or mutate settings.

`php artisan ops:check --deployment` checks database/cache connectivity, pending
migrations, worker/scheduler freshness, failed jobs, stalled runs, a recent backup
verification, HTTPS/session settings, demo/debug flags, the asynchronous queue,
and configured external alerts. `/ready` is a lightweight public dependency probe;
`/api/v1/operations` is an authenticated administrator operational dashboard.
The development environment deliberately fails production preflight.

## Error monitoring

Laravel retains full errors in its configured local log with request IDs. The
React error boundary offers recovery and submits only an error category through
an authenticated, throttled endpoint. Configure `ERROR_WEBHOOK_URL` to an HTTPS
JSON receiver for external error notifications. Alerts contain application,
environment, exception class, request ID and time; no exception messages, stack
traces, payloads, cookies, tokens, or credentials leave the server. Alert transport
failures are logged and do not replace the original error. Set up the receiver's
notification routing separately; an unset URL sends no external messages.

Review queue failures with `php artisan queue:failed`, inspect server logs using
the production run ID, resolve the failure, then retry that run in the manager
screen. Once recovery is verified, remove the corresponding failed-job record
with `queue:forget <id>`; keep your incident logs separately. `production:recover` repairs queued runs after a dispatch outage. The
scheduler enqueues a worker heartbeat every minute; the worker records it after
execution, so an idle/dead worker can be distinguished from an idle healthy queue.

## Backups and restore drills

Install PostgreSQL client tools at least as new as the server major version.
Use maintenance credentials with SELECT access to the source and permission to
create/drop a disposable scratch database; avoid granting CREATEDB to the normal
web-service account. Supply maintenance credentials only to the backup job's CLI
environment. Never point test or restore commands at a shared production target.

```
php artisan ops:backup --verify
php artisan ops:verify-backup /absolute/path/to/storage/app/private/backups/file.dump
```

Dumps and manifests are created under private storage (directory mode 0700,
files 0600) and must not be served by the web server. A repeatable-read exported
PostgreSQL snapshot ties `pg_dump` and manifest row counts to the same database
state. Verification checks SHA-256, restores to a randomly named scratch database,
and compares counts for migrations, customers, products, orders, audit entries,
runs and run items. The scratch connection is closed and its database dropped in
`finally`. A failed dump is removed and failed verification leaves the healthy
source database unchanged. Inspect and remove a `manufacturing_restore_*` database
if the entire verification process is forcibly killed before cleanup.

Schedule the backup example using your job runner. Retain and encrypt off-host
copies of **both** dump and manifest according to your recovery policy. Local
verification is a recovery drill, not point-in-time recovery or off-site retention;
use managed PostgreSQL backups/WAL archiving where those are required. Keep the
application encryption key in separate secret storage and verify its recovery.
Signals become stale after five minutes for workers/scheduler and 48 hours for
backup verification; environment variables can adjust those thresholds.

## Synthetic demonstration

Use a disposable database/account isolated from production. `BrowserTestSeeder`
creates synthetic fixtures only in local/testing mode with `DEMO_MODE=true`.
For hosted previews, seed the isolated database in a provisioning step and then
run the public application with production settings and `DEMO_MODE=false`.
Rebuild the disposable preview database from synthetic fixtures to reset a public
demo; do not expose an unauthenticated destructive reset endpoint. The in-app
reset route exists only in local/testing mode, requires an administrator, is
throttled, and refuses active production runs. The reset command has the same
environment restrictions. Never copy real customer data into a public preview.
Production remains unable to enable the reset route by setting DEMO_MODE alone.
