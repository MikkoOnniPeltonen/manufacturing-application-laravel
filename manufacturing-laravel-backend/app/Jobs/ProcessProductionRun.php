<?php

namespace App\Jobs;

use App\Services\ProductionRunService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessProductionRun implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public array $backoff = [5, 30];

    public function __construct(public string $runId) {}

    public function handle(ProductionRunService $service): void
    {
        $service->execute($this->runId);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Production run exhausted its retries', ['production_run_id' => $this->runId]);
        app(ProductionRunService::class)->fail($this->runId);
    }
}
