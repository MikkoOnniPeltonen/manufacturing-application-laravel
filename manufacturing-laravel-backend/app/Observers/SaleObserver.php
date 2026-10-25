<?php

namespace App\Observers;

use App\Enums\SaleStatus;
use App\Models\Sale;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;

class SaleObserver
{
    /**
     * Handle the Sale "created" event.
     */
    public function created(Sale $sale): void
    {
        app(AuditService::class)->sale($sale, 'order.created');
        $this->updateProductionLineHasSales($sale->production_line_id);
    }

    /**
     * Handle the Sale "updated" event.
     */
    public function updated(Sale $sale): void
    {
        app(AuditService::class)->sale($sale, 'order.updated');
        $this->updateProductionLineHasSales($sale->production_line_id);
    }

    /**
     * Handle the Sale "deleted" event.
     */
    public function deleted(Sale $sale): void
    {
        app(AuditService::class)->sale($sale, 'order.deleted');
        $this->updateProductionLineHasSales($sale->production_line_id);
    }

    /**
     * Handle the Sale "restored" event.
     */
    public function restored(Sale $sale): void
    {
        app(AuditService::class)->sale($sale, 'order.restored');
        $this->updateProductionLineHasSales($sale->production_line_id);
    }

    /**
     * Handle the Sale "force deleted" event.
     */
    public function forceDeleted(Sale $sale): void
    {
        $this->updateProductionLineHasSales($sale->production_line_id);
    }

    /**
     * Update the has_sales flag on the production line.
     */
    private function updateProductionLineHasSales($productionLineId): void
    {
        if (! $productionLineId) {
            return;
        }

        $hasPendingSales = Sale::where('production_line_id', $productionLineId)
            ->whereIn('status', [SaleStatus::Pending, SaleStatus::InProduction])
            ->exists();

        // We use DB::table to avoid triggering model events recursively if we set up observers on ProductionLine
        // Also simpler here.
        DB::table('production_lines')
            ->where('id', $productionLineId)
            ->update(['has_sales' => $hasPendingSales]);
    }
}
