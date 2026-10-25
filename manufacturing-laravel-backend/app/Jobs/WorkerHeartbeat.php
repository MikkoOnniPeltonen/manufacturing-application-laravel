<?php

namespace App\Jobs;

use App\Services\OperationsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class WorkerHeartbeat implements ShouldQueue
{
    use Queueable;

    public function handle(OperationsService $operations): void
    {
        $operations->signal('worker');
    }
}
