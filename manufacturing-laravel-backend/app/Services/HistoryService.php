<?php

namespace App\Services;

use App\Http\Resources\SaleResource;
use App\Models\ProductionLog;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class HistoryService
{
    /**
     * Reconstruct the state of a production line at a specific timestamp.
     */
    public function getProductionLineState(int $productionLineId, string $timestamp): array
    {
        $targetTime = Carbon::parse($timestamp);

        // Fetch all sales ever associated with this line
        $allSales = Sale::where('production_line_id', $productionLineId)
            ->with(['product', 'customer', 'productionLine'])
            ->withTrashed() // Include deleted items if any, though we soft delete
            ->get();

        $pending = collect([]);
        $inProduction = collect([]);

        foreach ($allSales as $sale) {
            // If sale was created AFTER the target time, it didn't exist yet.
            if ($sale->created_at->gt($targetTime)) {
                continue;
            }

            // Find the last log entry BEFORE or AT target time
            $lastLog = ProductionLog::where('sale_id', $sale->id)
                ->where('created_at', '<=', $targetTime)
                ->orderBy('created_at', 'desc')
                ->first();

            $statusAtTime = 'pending'; // Default initial status

            if ($lastLog) {
                $statusAtTime = $lastLog->to_status;
            } else {
                // No logs yet at that time.
                // If the item was created before target time, it was pending.
                // (Already checked created_at above)
            }

            // Manually set the status on the model instance for the resource to use
            $sale->status = $statusAtTime;

            if ($statusAtTime === 'pending') {
                $pending->push($sale);
            } elseif ($statusAtTime === 'in_production') {
                $inProduction->push($sale);
            }
            // 'delivered' items are ignored as per requirement (or we could return them if needed)
        }

        return [
            'pending' => SaleResource::collection($pending),
            'in_production' => SaleResource::collection($inProduction),
            'timestamp' => $targetTime->toIso8601String(),
        ];
    }

    /**
     * Get all sales that were active (created or moved) within a specific time range.
     */
    public function getSalesActivity(int $productionLineId, ?string $startDate, ?string $endDate, array $filters = []): array
    {
        $start = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
        $end = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();

        $query = Sale::where('production_line_id', $productionLineId)
            ->with([
                'product',
                'customer',
                'productionLogs' => function ($q) use ($start, $end) {
                    // Eager load logs only within range if we have one, otherwise just latest
                    if ($start && $end) {
                        $q->whereBetween('created_at', [$start, $end]);
                    }
                    $q->orderBy('created_at', 'desc');
                }
            ])
            ->withTrashed()
            ->orderBy('created_at', 'desc');

        // Date Range Logic
        if ($startDate && $endDate) {
            $query->where(function ($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end])
                    ->orWhereHas('productionLogs', function ($subQ) use ($start, $end) {
                        $subQ->whereBetween('created_at', [$start, $end]);
                    });
            });
        }

        // Apply Filters
        if (!empty($filters['product'])) {
            $query->whereHas('product', function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['product']}%");
            });
        }

        if (!empty($filters['customer'])) {
            $query->whereHas('customer', function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['customer']}%");
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['min_quantity'])) {
            $query->where('quantity', '>=', $filters['min_quantity']);
        }

        if (!empty($filters['max_quantity'])) {
            $query->where('quantity', '<=', $filters['max_quantity']);
        }

        $sales = $query->get();

        return [
            'sales' => SaleResource::collection($sales),
            'start_date' => $start->toIso8601String(),
            'end_date' => $end->toIso8601String(),
            'mode' => 'search'
        ];
    }
}
