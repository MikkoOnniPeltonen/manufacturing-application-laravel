<?php

namespace Tests\Integration;

use App\Enums\SaleStatus;
use App\Jobs\ProcessProductionRun;
use App\Models\ProductionLog;
use App\Models\Sale;
use App\Models\User;
use App\Services\ProductionRunService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ProductionConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function test_competing_workers_deliver_an_order_only_once(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Requires a dedicated PostgreSQL test database.');
        }
        $sale = Sale::factory()->create(['status' => SaleStatus::InProduction]);
        $results = $this->runWorkers([$sale, $sale]);
        sort($results);
        $this->assertSame(['conflict', 'delivered'], $results);
        $this->assertSame(1, ProductionLog::where('sale_id', $sale->id)->count());
        $this->assertFalse($sale->productionLine->fresh()->has_sales);
    }

    public function test_competing_workers_clear_the_flag_when_the_last_orders_finish(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Requires a dedicated PostgreSQL test database.');
        }
        $first = Sale::factory()->create(['status' => SaleStatus::InProduction]);
        $second = Sale::factory()->create(['production_line_id' => $first->production_line_id, 'status' => SaleStatus::InProduction]);
        $this->assertSame(['delivered', 'delivered'], $this->runWorkers([$first, $second]));
        $this->assertFalse($first->productionLine->fresh()->has_sales);
        $this->assertSame(2, ProductionLog::count());
    }

    public function test_overlapping_batches_are_atomic_and_idempotent(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Requires PostgreSQL.');
        }
        $first = Sale::factory()->create(['status' => SaleStatus::Pending]);
        $second = Sale::factory()->create(['production_line_id' => $first->production_line_id, 'status' => SaleStatus::Pending]);
        $this->assertSame(['updated', 'updated'], $this->runWorkers([$first, $first], [$first->id, $second->id]));
        $this->assertSame(2, ProductionLog::count());
        $this->assertSame(SaleStatus::InProduction, $first->fresh()->status);
        $this->assertSame(SaleStatus::InProduction, $second->fresh()->status);
    }

    public function test_duplicate_queue_workers_resume_the_same_run_without_duplicate_delivery(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Requires PostgreSQL.');
        }
        Bus::fake([ProcessProductionRun::class]);
        $actor = User::factory()->create();
        $first = Sale::factory()->create(['status' => SaleStatus::InProduction]);
        $second = Sale::factory()->create(['production_line_id' => $first->production_line_id, 'status' => SaleStatus::InProduction]);
        $run = app(ProductionRunService::class)->create($first->production_line_id, $actor->id);
        $this->assertSame(['delivered', 'delivered'], $this->runWorkers([$first, $first], [], $run->id));
        $this->assertSame(2, ProductionLog::count());
        $this->assertSame(2, $run->fresh()->processed_count);
        $this->assertSame('completed', $run->fresh()->status);
        $this->assertFalse($first->productionLine->fresh()->has_sales);
    }

    /** @return list<string> */
    private function runWorkers(array $sales, array $batch = [], ?string $runId = null): array
    {
        $connection = config('database.connections.pgsql');
        $environment = [
            'APP_ENV' => 'testing', 'DB_CONNECTION' => 'pgsql',
            'DB_HOST' => $connection['host'], 'DB_PORT' => (string) $connection['port'],
            'DB_DATABASE' => $connection['database'], 'DB_USERNAME' => $connection['username'],
            'DB_PASSWORD' => (string) $connection['password'], 'CACHE_STORE' => 'array',
        ];
        $workers = [];
        DB::beginTransaction();
        DB::table('production_lines')->where('id', $sales[0]->production_line_id)->lockForUpdate()->first();
        try {
            foreach ($sales as $sale) {
                $operation = $runId
                    ? 'app(App\Services\ProductionRunService::class)->execute('.var_export($runId, true).');'
                    : ($batch ? 'app(App\Services\ProductionService::class)->updateItemsStatus('.var_export($batch, true).', $sale->production_line_id, "in_production");' : 'app(App\Services\ProductionService::class)->processItem($sale);');
                $success = $batch ? 'updated' : 'delivered';
                $code = 'require '.var_export(base_path('vendor/autoload.php'), true).';'
                    .'$app = require '.var_export(base_path('bootstrap/app.php'), true).';'
                    .'$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();'
                    .'$sale = App\Models\Sale::findOrFail('.var_export($sale->id, true).');'
                    .'echo "ready\n"; flush();'
                    .'try { '.$operation.' echo '.var_export($success."\n", true).'; }'
                    .'catch (App\Exceptions\ProductionException $e) { echo "conflict\n"; }';
                $worker = new Process([PHP_BINARY, '-r', $code], base_path(), $environment);
                $worker->setTimeout(15);
                $worker->start();
                $workers[] = $worker;
            }
            foreach ($workers as $worker) {
                $this->assertTrue($worker->waitUntil(fn ($type, $output) => str_contains($output, 'ready')), $worker->getErrorOutput());
            }
            DB::commit();
            $results = [];
            foreach ($workers as $worker) {
                $worker->wait();
                $this->assertTrue($worker->isSuccessful(), $worker->getErrorOutput());
                $results[] = trim(str_replace("ready\n", '', $worker->getOutput()));
            }

            return $results;
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
        }
    }
}
