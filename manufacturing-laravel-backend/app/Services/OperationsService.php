<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class OperationsService
{
    public function signal(string $name, array $details = []): void
    {
        DB::table('operation_signals')->updateOrInsert(['name' => $name], ['seen_at' => now(), 'details' => json_encode($details, JSON_THROW_ON_ERROR)]);
    }

    public function checks(bool $includeDeployment = false): array
    {
        $checks = [];
        foreach (['database' => fn () => DB::select('select 1'), 'cache' => function () {
            $key = 'ops:probe:'.bin2hex(random_bytes(8));
            try {
                Cache::put($key, true, 10);
                if (Cache::get($key) !== true) {
                    throw new \RuntimeException('Cache read failed.');
                }
            } finally {
                Cache::forget($key);
            }
        }] as $name => $probe) {
            try {
                $probe();
                $checks[$name] = ['ok' => true, 'message' => 'Connected'];
            } catch (Throwable) {
                $checks[$name] = ['ok' => false, 'message' => 'Unavailable'];
            }
        }
        foreach (['scheduler', 'worker', 'backup_verified'] as $signal) {
            try {
                $row = DB::table('operation_signals')->where('name', $signal)->first();
                $limit = $signal === 'backup_verified' ? config('operations.backup_max_age') : config('operations.heartbeat_max_age');
                $fresh = $row && Carbon::parse($row->seen_at)->gte(now()->subSeconds($limit));
                $checks[$signal] = ['ok' => (bool) $fresh, 'message' => $row ? 'Last seen '.$row->seen_at.' UTC' : 'No signal recorded'];
            } catch (Throwable) {
                $checks[$signal] = ['ok' => false, 'message' => 'No signal available'];
            }
        }
        try {
            $count = DB::table('failed_jobs')->count();
            $checks['failed_jobs'] = ['ok' => $count === 0, 'message' => $count.' failed jobs'];
            $stale = DB::table('production_runs')->whereIn('status', ['queued', 'running'])->where('updated_at', '<', now()->subMinutes(10))->count();
            $checks['stalled_production'] = ['ok' => $stale === 0, 'message' => $stale.' stalled production runs'];
            $migrations = app('migration.repository')->getRan();
            $files = app('migrator')->getMigrationFiles(database_path('migrations'));
            $pending = array_diff(array_keys($files), $migrations);
            $checks['migrations'] = ['ok' => count($pending) === 0, 'message' => count($pending).' pending migrations'];
        } catch (Throwable) {
            $checks['schema'] = ['ok' => false, 'message' => 'Run database migrations'];
        }
        if ($includeDeployment) {
            $checks['environment'] = ['ok' => app()->environment('production'), 'message' => 'APP_ENV must be production'];
            $checks['app_key'] = ['ok' => (bool) config('app.key'), 'message' => 'Application encryption key must be configured'];
            $checks['debug'] = ['ok' => ! config('app.debug'), 'message' => 'APP_DEBUG must be false'];
            $checks['demo'] = ['ok' => ! config('app.demo_mode'), 'message' => 'DEMO_MODE must be false'];
            $checks['https'] = ['ok' => str_starts_with(config('app.url'), 'https://') && str_starts_with(config('cors.allowed_origins.0', ''), 'https://'), 'message' => 'API and frontend URLs must use HTTPS'];
            $checks['cookies'] = ['ok' => (bool) config('session.secure') && (bool) config('session.http_only'), 'message' => 'Secure and HttpOnly session cookies required'];
            $checks['queue'] = ['ok' => in_array(config('queue.default'), ['database', 'redis', 'sqs', 'beanstalkd'], true), 'message' => 'Use a durable asynchronous queue'];
            $checks['alerts'] = ['ok' => str_starts_with(config('operations.error_webhook_url') ?? '', 'https://'), 'message' => 'Configure an HTTPS error alert endpoint'];
        }

        return $checks;
    }
}
