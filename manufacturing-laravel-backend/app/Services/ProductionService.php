<?php

namespace App\Services;

use App\Enums\SaleStatus;
use App\Exceptions\ProductionException;
use App\Models\ProductionLine;
use App\Models\ProductionLog;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionService
{
    /**
     * Start production for all pending items on a line.
     */
    public function startProduction(int $productionLineId): int
    {
        return DB::transaction(function () use ($productionLineId) {
            ProductionLine::lockForUpdate()->findOrFail($productionLineId);
            $pendingSales = Sale::where('production_line_id', $productionLineId)
                ->where('status', SaleStatus::Pending)
                ->orderBy('id')
                ->lockForUpdate() // Prevent race conditions
                ->get();

            $count = 0;
            foreach ($pendingSales as $sale) {
                $this->transition($sale, SaleStatus::InProduction);
                $count++;
            }

            return $count;
        });
    }

    /**
     * Update status for a batch of sales.
     */
    public function updateItemsStatus(array $saleIds, int $productionLineId, string $status): void
    {
        DB::transaction(function () use ($saleIds, $productionLineId, $status) {
            ProductionLine::lockForUpdate()->findOrFail($productionLineId);
            $sales = Sale::whereIn('id', $saleIds)
                ->where('production_line_id', $productionLineId)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()->keyBy('id');

            if ($sales->count() !== count(array_unique($saleIds))) {
                throw ValidationException::withMessages(['sale_ids' => 'Every sale must exist on the requested production line.']);
            }
            foreach ($saleIds as $index => $id) {
                $sale = $sales[$id];
                if ($sale->status === SaleStatus::Pending && $status === SaleStatus::InProduction->value) {
                    $sale->priority = $index + 1;
                }
                $this->transition($sale, SaleStatus::from($status));
            }
        });
    }

    /**
     * Process a single item (Manufacturing -> Delivered).
     * This replaces the old processItem logic and removes DeliveredOrder dependency.
     */
    public function processItem(Sale $sale): array
    {
        return DB::transaction(function () use ($sale) {
            // All mutations lock the line before its sales to serialize line aggregates.
            ProductionLine::lockForUpdate()->findOrFail($sale->production_line_id);
            $sale = Sale::query()
                ->whereKey($sale->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($sale->status !== SaleStatus::InProduction) {
                throw new ProductionException('Sale is not in production.');
            }

            $this->transition($sale, SaleStatus::Delivered);

            // Metrics for return value
            $activeSalesCount = Sale::where('production_line_id', $sale->production_line_id)
                ->whereIn('status', [SaleStatus::Pending, SaleStatus::InProduction])
                ->count();

            return [
                'sale' => $sale->load(['customer', 'product']),
                'remaining_count' => $activeSalesCount,
            ];
        });
    }

    private function transition(Sale $sale, SaleStatus $target): void
    {
        if ($target === SaleStatus::Cancelled) {
            throw new ProductionException('Use the order cancellation workflow with a reason.');
        }
        $previous = $sale->status;
        if ($previous === $target) {
            return;
        }
        if (! $previous->canTransitionTo($target)) {
            throw new ProductionException('The sale cannot transition to the requested status.');
        }
        $sale->update([
            'status' => $target,
            'delivered_at' => $target === SaleStatus::Delivered ? Carbon::now() : null,
        ]);
        $this->logStatusChange($sale->id, $previous->value, $target->value);
    }

    /**
     * Log status change to ProductionLog table.
     */
    private function logStatusChange(string $saleId, string $from, string $to): void
    {
        ProductionLog::create([
            'sale_id' => $saleId,
            'from_status' => $from,
            'to_status' => $to,
            'meta_data' => ['timestamp' => Carbon::now()->toIso8601String()],
        ]);
    }
}
