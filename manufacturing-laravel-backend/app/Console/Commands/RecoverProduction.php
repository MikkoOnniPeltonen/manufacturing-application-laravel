<?php

namespace App\Console\Commands;

use App\Models\ProductionRun;
use App\Services\ProductionRunService;
use Illuminate\Console\Command;

class RecoverProduction extends Command
{
    protected $signature = 'production:recover';

    protected $description = 'Redispatch durable queued runs after a queue outage';

    public function handle(ProductionRunService $service): int
    {
        ProductionRun::where(function ($query) {
            $query->where(fn ($q) => $q->where('status', 'queued')->where(fn ($q) => $q->whereNull('dispatched_at')->orWhere('dispatched_at', '<', now()->subMinutes(5))))
                ->orWhere(fn ($q) => $q->where('status', 'running')->where('updated_at', '<', now()->subMinutes(10)));
        })
            ->orderBy('id')->chunkById(100, function ($runs) use ($service) {
                foreach ($runs as $run) {
                    $service->dispatch($run);
                }
            });

        return self::SUCCESS;
    }
}
