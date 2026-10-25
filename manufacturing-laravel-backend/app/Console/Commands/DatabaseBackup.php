<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class DatabaseBackup extends Command
{
    protected $signature = 'ops:backup {--verify : Restore the new dump into a temporary database and verify it}';

    protected $description = 'Create a private PostgreSQL backup with optional restore verification';

    public function handle(DatabaseBackupService $service): int
    {
        $path = $service->backup();
        $this->info('Backup created: '.$path);
        if ($this->option('verify')) {
            $service->verify($path);
            $this->info('Restore verification passed.');
        }

        return self::SUCCESS;
    }
}
