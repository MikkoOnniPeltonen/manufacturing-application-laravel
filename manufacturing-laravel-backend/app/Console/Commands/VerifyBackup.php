<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class VerifyBackup extends Command
{
    protected $signature = 'ops:verify-backup {file}';

    protected $description = 'Verify a private backup using a disposable scratch database';

    public function handle(DatabaseBackupService $service): int
    {
        $service->verify($this->argument('file'));
        $this->info('Restore verification passed.');

        return self::SUCCESS;
    }
}
