<?php

namespace App\Services;

use App\Enums\SaleStatus;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use Carbon\Carbon;

class HistoryService
{
    /**
     * Reconstruct the state of a production line at a specific timestamp.
     */
    public function getProductionLineState(int $productionLineId, string $timestamp, int $limit = 25, int $page = 1): array
    {
        $targetTime = Carbon::parse($timestamp);
        $sales = Sale::withTrashed()
            ->where('production_line_id', $productionLineId)
            ->where('created_at', '<=', $targetTime)
            ->where(fn ($q) => $q->whereNull('deleted_at')->orWhere('deleted_at', '>', $targetTime))
            ->whereDoesntHave('productionLogs', fn ($q) => $q->whereIn('to_status', [SaleStatus::Delivered->value, SaleStatus::Cancelled->value])->where('created_at', '<=', $targetTime))
            ->with(['product', 'customer', 'productionLine', 'auditEvents' => fn ($q) => $q->where('created_at', '<=', $targetTime)->orderByDesc('id')->limit(1), 'productionLogs' => fn ($q) => $q
                ->where('created_at', '<=', $targetTime)->orderByDesc('created_at')->orderByDesc('id')->limit(1)])
            ->orderBy('created_at')->orderBy('id')
            ->paginate(min(max($limit, 1), 100), ['*'], 'page', max($page, 1));

        foreach ($sales as $sale) {
            $snapshot = $sale->auditEvents->first();
            if ($snapshot && $snapshot->after) {
                $sale->fill(array_intersect_key($snapshot->after, array_flip(['quantity', 'date_to_deliver', 'priority'])));
            }
            $sale->status = SaleStatus::from($sale->productionLogs->first()->to_status ?? SaleStatus::Pending->value);
            // Current delivery metadata must not leak into an earlier snapshot.
            $sale->delivered_at = null;
        }

        return [
            'pending' => SaleResource::collection($sales->getCollection()->where('status', SaleStatus::Pending)->values()),
            'in_production' => SaleResource::collection($sales->getCollection()->where('status', SaleStatus::InProduction)->values()),
            'timestamp' => $targetTime->toIso8601String(),
            'current_page' => $sales->currentPage(),
            'last_page' => $sales->lastPage(),
            'total' => $sales->total(),
            'per_page' => $sales->perPage(),
        ];
    }

    /**
     * Get all sales that were active (created or moved) within a specific time range.
     */
    public function getSalesActivity(int $productionLineId, ?string $startDate, ?string $endDate, array $filters = [], ?int $limit = 25, ?int $page = 1): array
    {
        $start = $startDate ? Carbon::parse($startDate)->startOfDay() : Carbon::now()->subDays(30)->startOfDay();
        $end = $endDate ? Carbon::parse($endDate)->endOfDay() : Carbon::now()->endOfDay();

        $query = Sale::where('production_line_id', $productionLineId)
            ->with([
                'product',
                'customer',
            ])
            ->withTrashed()
            ->orderBy('created_at', 'desc')->orderBy('id', 'desc');

        // Date Range Logic
        if ($start && $end) {
            $query->where(function ($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end])
                    ->orWhereHas('productionLogs', function ($subQ) use ($start, $end) {
                        $subQ->whereBetween('created_at', [$start, $end]);
                    });
            });
        }

        // Apply Filters
        if (! empty($filters['product'])) {
            $query->whereHas('product', function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['product']}%");
            });
        }

        if (! empty($filters['customer'])) {
            $query->whereHas('customer', function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['customer']}%");
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['min_quantity'])) {
            $query->where('quantity', '>=', $filters['min_quantity']);
        }

        if (isset($filters['max_quantity'])) {
            $query->where('quantity', '<=', $filters['max_quantity']);
        }

        $sales = $query->paginate(min(max((int) ($limit ?? 25), 1), 100), ['*'], 'page', max((int) $page, 1));
        $salesPayload = [
            'data' => SaleResource::collection($sales->items())->resolve(),
            'current_page' => $sales->currentPage(),
            'per_page' => $sales->perPage(),
            'total' => $sales->total(),
            'last_page' => $sales->lastPage(),
            'from' => $sales->firstItem(),
            'to' => $sales->lastItem(),
        ];

        return [
            'sales' => $salesPayload,
            'start_date' => $start->toIso8601String(),
            'end_date' => $end->toIso8601String(),
            'mode' => 'search',
        ];
    }
}
