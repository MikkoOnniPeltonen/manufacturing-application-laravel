<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

class DatabaseBackupService
{
    public function __construct(private OperationsService $operations) {}

    private function environment(?string $database = null): array
    {
        $config = DB::connection()->getConfig();
        if (DB::getDriverName() !== 'pgsql') {
            throw new \RuntimeException('PostgreSQL is required.');
        }

        $environment = ['PGHOST' => (string) $config['host'], 'PGPORT' => (string) $config['port'],
            'PGUSER' => (string) $config['username'], 'PGPASSWORD' => (string) $config['password'],
            'PGDATABASE' => $database ?? $config['database']];
        foreach (['sslmode' => 'PGSSLMODE', 'sslrootcert' => 'PGSSLROOTCERT', 'sslcert' => 'PGSSLCERT', 'sslkey' => 'PGSSLKEY'] as $setting => $variable) {
            if (! empty($config[$setting])) {
                $environment[$variable] = $config[$setting];
            }
        }

        return $environment;
    }

    private function run(array $arguments, ?string $database = null): void
    {
        $process = new Process($arguments, null, $this->environment($database));
        $process->setTimeout(300);
        $process->run();
        if (! $process->isSuccessful()) {
            throw new \RuntimeException('Database utility failed: '.$arguments[0].'. Check PostgreSQL client versions and permissions.');
        }
    }

    public function backup(): string
    {
        $directory = storage_path('app/private/backups');
        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new \RuntimeException('Cannot create private backup directory.');
        }
        $path = $directory.'/manufacturing-'.now()->format('Ymd-His').'-'.bin2hex(random_bytes(4)).'.dump';
        touch($path);
        chmod($path, 0600);
        DB::beginTransaction();
        try {
            DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            $snapshot = DB::selectOne('SELECT pg_export_snapshot() AS id');
            $tables = ['migrations', 'customers', 'products', 'sales', 'audit_events', 'production_runs', 'production_run_items'];
            $counts = [];
            foreach ($tables as $table) {
                $counts[$table] = DB::table($table)->count();
            }
            $this->run(['pg_dump', '--format=custom', '--no-owner', '--no-acl', '--snapshot='.$snapshot->id, '--file='.$path]);
            DB::commit();
            $manifest = $path.'.json';
            touch($manifest);
            chmod($manifest, 0600);
            if (file_put_contents($manifest, json_encode(['sha256' => hash_file('sha256', $path), 'counts' => $counts], JSON_THROW_ON_ERROR)) === false) {
                throw new \RuntimeException('Cannot write backup verification manifest.');
            }
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            @unlink($path);
            @unlink($path.'.json');
            throw $e;
        }
        $this->operations->signal('backup_created', ['file' => basename($path)]);

        return $path;
    }

    public function verify(string $path): void
    {
        $real = realpath($path);
        $directory = realpath(storage_path('app/private/backups'));
        if (! $real || ! $directory || ! str_starts_with($real, $directory.DIRECTORY_SEPARATOR) || ! is_file($real)) {
            throw new \InvalidArgumentException('Select an existing dump from the private backups directory.');
        }
        $manifestPath = $real.'.json';
        if (! is_file($manifestPath) || filesize($manifestPath) > 50000) {
            throw new \InvalidArgumentException('Backup verification manifest is missing or invalid.');
        }
        $manifest = json_decode(file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        if (! hash_equals($manifest['sha256'], hash_file('sha256', $real))) {
            throw new \RuntimeException('Backup checksum mismatch.');
        }
        // A random scratch database is created and dropped; the configured database is never a restore target.
        $scratch = 'manufacturing_restore_'.bin2hex(random_bytes(8));
        $this->run(['createdb', '--template=template0', $scratch], 'postgres');
        try {
            $this->run(['pg_restore', '--exit-on-error', '--no-owner', '--no-acl', '--dbname='.$scratch, $real], $scratch);
            config(['database.connections.restore_verification' => array_replace(DB::connection()->getConfig(), ['url' => null, 'database' => $scratch])]);
            DB::purge('restore_verification');
            foreach (['migrations', 'customers', 'products', 'sales', 'audit_events', 'production_runs', 'production_run_items'] as $table) {
                $count = DB::connection('restore_verification')->table($table)->count();
                if ($count !== ($manifest['counts'][$table] ?? null)) {
                    throw new \RuntimeException('Restored row count mismatch for '.$table);
                }
            }
            $this->operations->signal('backup_verified', ['file' => basename($real), 'sha256' => hash_file('sha256', $real)]);
        } finally {
            DB::purge('restore_verification');
            $this->run(['dropdb', '--if-exists', $scratch], 'postgres');
        }
    }
}
