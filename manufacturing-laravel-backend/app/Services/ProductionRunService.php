<?php

namespace App\Services;

use App\Enums\SaleStatus;
use App\Jobs\ProcessProductionRun;
use App\Models\ProductionLine;
use App\Models\ProductionRun;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProductionRunService
{
    public function __construct(private AuditService $audit, private ProductionService $production) {}

    public function create(int $lineId, int $actorId): ProductionRun
    {
        $run = DB::transaction(function () use ($lineId, $actorId) {
            ProductionLine::lockForUpdate()->findOrFail($lineId);
            $active = ProductionRun::where('production_line_id', $lineId)->whereIn('status', ['queued', 'running'])->first();
            if ($active) {
                return $active;
            }
            $sales = Sale::where('production_line_id', $lineId)->where('status', SaleStatus::InProduction)->orderBy('priority')->orderBy('id')->limit(100)->get();
            abort_if($sales->isEmpty(), 409, 'No staged orders are ready for production.');
            $run = ProductionRun::create(['production_line_id' => $lineId, 'actor_id' => $actorId, 'total_count' => $sales->count()]);
            foreach ($sales as $index => $sale) {
                DB::table('production_run_items')->insert(['production_run_id' => $run->id, 'sale_id' => $sale->id, 'position' => $index]);
            }
            $this->audit->record('production_run', $run->id, 'production.queued', null, ['total_count' => $sales->count()]);

            return $run;
        });
        if (! $run->dispatched_at) {
            $this->dispatch($run);
        }

        return $run->fresh();
    }

    public function dispatch(ProductionRun $run): void
    {
        try {
            ProcessProductionRun::dispatch($run->id)->afterCommit();
            $run->update(['dispatched_at' => now()]);
        } catch (Throwable $e) {
            // The durable queued run is retried by production:recover after a queue outage.
            report($e);
        }
    }

    public function retry(ProductionRun $run): ProductionRun
    {
        DB::transaction(function () use ($run) {
            ProductionLine::lockForUpdate()->findOrFail($run->production_line_id);
            $run->refresh();
            abort_unless($run->status === 'failed', 409, 'Only failed runs can be retried.');
            abort_if(ProductionRun::where('production_line_id', $run->production_line_id)->whereIn('status', ['queued', 'running'])->exists(), 409, 'Another run is active.');
            $run->update(['status' => 'queued', 'last_error' => null, 'finished_at' => null, 'dispatched_at' => null]);
            $this->audit->record('production_run', $run->id, 'production.retried', ['status' => 'failed'], ['status' => 'queued']);
        });
        $this->dispatch($run);

        return $run->fresh();
    }

    public function execute(string $id): void
    {
        $run = ProductionRun::findOrFail($id);
        $this->audit->within($run->actor_id, 'Production run '.$run->id, function () use ($run) {
            $items = DB::table('production_run_items')->where('production_run_id', $run->id)->orderBy('position')->pluck('id');
            foreach ($items as $itemId) {
                DB::transaction(function () use ($run, $itemId) {
                    ProductionLine::lockForUpdate()->findOrFail($run->production_line_id);
                    $run->refresh();
                    if (in_array($run->status, ['completed', 'failed'], true)) {
                        return;
                    }
                    $item = DB::table('production_run_items')->where('id', $itemId)->lockForUpdate()->first();
                    if (! $item || $item->processed_at) {
                        return;
                    }
                    if ($run->status === 'queued') {
                        $run->update(['status' => 'running', 'started_at' => now()]);
                    }
                    $sale = Sale::findOrFail($item->sale_id);
                    if ($sale->status !== SaleStatus::Delivered) {
                        $this->production->processItem($sale);
                    }
                    DB::table('production_run_items')->where('id', $itemId)->update(['processed_at' => now()]);
                    $run->increment('processed_count');
                });
            }
            DB::transaction(function () use ($run) {
                ProductionLine::lockForUpdate()->findOrFail($run->production_line_id);
                $run->refresh();
                if (in_array($run->status, ['queued', 'running'], true) && $run->processed_count === $run->total_count) {
                    $run->update(['status' => 'completed', 'finished_at' => now()]);
                    $this->audit->record('production_run', $run->id, 'production.completed', ['status' => 'running'], ['status' => 'completed', 'processed_count' => $run->processed_count]);
                }
            });
        });
    }

    public function fail(string $id): void
    {
        $run = ProductionRun::find($id);
        if (! $run) {
            return;
        }
        DB::transaction(function () use ($run) {
            ProductionLine::lockForUpdate()->findOrFail($run->production_line_id);
            $run->refresh();
            if ($run->status === 'completed') {
                return;
            }
            $run->update(['status' => 'failed', 'last_error' => 'Processing failed after retries. Check server logs using this run ID.', 'finished_at' => now()]);
            $this->audit->within($run->actor_id, 'Queue retries exhausted', fn () => $this->audit->record('production_run', $run->id, 'production.failed', null, ['status' => 'failed']));
        });
    }
}
