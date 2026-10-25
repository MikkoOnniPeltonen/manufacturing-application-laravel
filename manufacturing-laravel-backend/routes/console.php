<?php

use App\Jobs\WorkerHeartbeat;
use App\Services\OperationsService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    app(OperationsService::class)->signal('scheduler');
    WorkerHeartbeat::dispatch();
})->name('operations-heartbeat')->everyMinute()->withoutOverlapping();
Schedule::command('production:recover')->everyMinute()->withoutOverlapping();
