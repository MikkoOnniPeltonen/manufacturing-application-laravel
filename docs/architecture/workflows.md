# Orders, production, audit and recovery

Administrators create orders at `/orders`. The chosen product must be assigned to
that customer, and the server derives its production line. Quantity and delivery
date are editable while the order is pending. Creation, editing and cancellation
require a reason. Customer/product identity is fixed after creation; cancel and
replace an incorrectly addressed pending order. Cancellation is retained as a
terminal state, rather than deleting business history.

```
pending -> in_production -> delivered
pending -> cancelled
```

## Transactions and locking

Every order/production operation locks the production-line row before locking
sales. Batch operations acquire sale locks in ID order. The line lock serializes
changes to `has_sales`, queue membership, and run creation. Each batch verifies
that **all** supplied IDs exist on the requested line before writing anything.
Requests contain 1–100 distinct UUIDs. An unknown or foreign-line UUID returns
422; the transaction changes no orders and writes no audit/status logs. Repeated
requests for an already reached batch state are idempotent. Invalid state
transitions return 409. Validation failures return 422; unauthenticated access
returns 401 and unauthorized roles return 403.

Staging persists ordering and status; it does not deliver orders. Starting a run
captures at most 100 staged orders and returns 202 with a durable run ID. Repeated
start requests while that line has an active run return the same run. The SPA
polls server state; navigating away or closing the browser does not stop work.
Laravel workers execute `ProcessProductionRun` from the configured asynchronous
queue. The run status is `queued`, `running`, `completed`, or `failed`.

Each run item is a separate transaction containing the sale transition, delivery
timestamp, production log, audit event, item completion marker, run counter and
line flag. An interruption rolls back only the current item. A retry resumes
unprocessed items. Competing workers lock the same line, recheck each completion
marker, and cannot deliver an item or increment progress twice. No network or
queue call is made inside an item transaction.

Run creation is persisted before queue dispatch. If the queue is unavailable,
the durable queued run remains visible. `production:recover`, scheduled every
minute, redispatches undispatched runs and queued runs not started within five
minutes, plus running runs stalled for ten minutes. Duplicate dispatches remain safe. Jobs retry three times with backoff;
exhausted runs become failed and can be retried from the manager screen after the
underlying problem is fixed. Worker timeout is 60 seconds; queue `retry_after`
must be greater than that timeout (the configured value is 90 seconds).

## Audit and history

Order model events synchronously append audit entries within the caller's
transaction. Entries include an actor name snapshot/ID, reason, subject, action,
and before/after business fields. A rolled-back business operation leaves no
successful audit entry. Worker changes carry the user who requested the run.
Audit access is administrator-only, paginated, and read-only. Eloquent refuses
updates/deletions of audit entries. These are application controls, not a claim
of tamper-proof storage: use database permissions and off-site log retention for
stronger protection from privileged administrators.

Audit captures orders and production runs; it does not yet cover every customer,
product, role or infrastructure change. Historical snapshots use order audit
values for quantities/dates and production logs for status, with deterministic
ordering for simultaneous timestamps. Existing records without audit events use
their stored values; the application does not invent historical values.

## Verification

The PostgreSQL integration suite uses independent PHP processes/connections and
a held line lock to make requests compete. It verifies duplicate delivery,
completion of a line's final orders, overlapping batches, and duplicate queue
workers resuming one run. HTTP tests cover mixed IDs, missing IDs, duplicates,
empty arrays, limits, invalid states, rollback, reasons and role restrictions.
Playwright runs against the API and a real database queue worker, including
manual order creation/edit/cancellation with audit visibility and the entire
manager staging/start/leave/return workflow with an unauthorized API action.
