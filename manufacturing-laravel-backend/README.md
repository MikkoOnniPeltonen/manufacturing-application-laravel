# Manufacturing API

Laravel API for the manufacturing management application. See the [project
README](../README.md) for setup and the [workflow architecture](../docs/architecture/workflows.md)
for order state transitions, PostgreSQL locks, audit records and queue recovery.

Run `composer test`, `composer analyse`, and `composer format:check` here.
Production needs supervised queue workers and a scheduler. Backup verification
requires PostgreSQL CLI tools and maintenance credentials. See the
[deployment runbook](../deploy/README.md) before deploying or running restore drills.
