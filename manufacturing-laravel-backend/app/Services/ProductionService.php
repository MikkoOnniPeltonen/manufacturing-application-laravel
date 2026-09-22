<?php

namespace App\Services;

use App\Enums\SaleStatus;
use App\Exceptions\ProductionException;
use App\Models\ProductionLine;
use App\Models\ProductionLog;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProductionService
{
    /**
     * Start production for all pending items on a line.
     */
    public function startProduction(int $productionLineId): int
    {
        return DB::transaction(function () use ($productionLineId) {
            $pendingSales = Sale::where('production_line_id', $productionLineId)
                ->where('status', SaleStatus::Pending)
                ->lockForUpdate() // Prevent race conditions
                ->get();

            $count = 0;
            foreach ($pendingSales as $sale) {
                $oldStatus = $sale->status;
                $object = $sale->update(['status' => SaleStatus::InProduction]);

                if ($object) {
                    $this->logStatusChange($sale->id, $oldStatus->value, SaleStatus::InProduction->value);
                    $count++;
                }
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
            $sales = Sale::whereIn('id', $saleIds)
                ->where('production_line_id', $productionLineId)
                ->lockForUpdate()
                ->get();

            foreach ($sales as $sale) {
                $oldStatus = $sale->status;
                $targetStatus = SaleStatus::from($status);

                if ($oldStatus !== $targetStatus) {
                    if (! $oldStatus->canTransitionTo($targetStatus)) {
                        throw new ProductionException('The sale cannot transition to the requested status.');
                    }

                    $sale->update(['status' => $targetStatus]);
                    $this->logStatusChange($sale->id, $oldStatus->value, $targetStatus->value);
                }
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
            // Lock the current row so concurrent workers cannot process it twice.
            $sale = Sale::query()
                ->whereKey($sale->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($sale->status !== SaleStatus::InProduction) {
                throw new ProductionException('Sale is not in production.');
            }

            $oldStatus = $sale->status;

            // Update Sale
            $sale->update([
                'status' => SaleStatus::Delivered,
                'delivered_at' => Carbon::now(),
            ]);

            // Log change
            $this->logStatusChange($sale->id, $oldStatus->value, SaleStatus::Delivered->value);

            // Note: DeliveredOrder creation is REMOVED as per Phase 2 plan.
            // Note: has_sales flag on ProductionLine is updated via Observer.

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
