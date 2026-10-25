#!/usr/bin/env bash
set -euo pipefail
repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root/manufacturing-laravel-backend"
composer check-platform-reqs --no-dev
php artisan ops:check --deployment
