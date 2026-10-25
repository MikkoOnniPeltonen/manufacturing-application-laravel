<?php

namespace App\Console\Commands;

use App\Services\OperationsService;
use Illuminate\Console\Command;

class OperationsCheck extends Command
{
    protected $signature = 'ops:check {--deployment : Include production settings, monitoring, workers, and backups}';

    protected $description = 'Check dependency health and deployment readiness';

    public function handle(OperationsService $service): int
    {
        $checks = $service->checks((bool) $this->option('deployment'));
        foreach ($checks as $name => $check) {
            $this->line(($check['ok'] ? 'PASS ' : 'FAIL ').$name.': '.$check['message']);
        }

        return collect($checks)->every(fn ($check) => $check['ok']) ? self::SUCCESS : self::FAILURE;
    }
}
