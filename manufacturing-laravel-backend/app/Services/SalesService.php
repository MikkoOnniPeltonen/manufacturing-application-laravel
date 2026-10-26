<?php

namespace App\Services;

use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\ProductionLine;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesService
{
    /**
     * Generate random sales for a production line.
     */
    public function generateRandomSales(int $productionLineId, int $count): array
    {
        return DB::transaction(function () use ($productionLineId, $count) {
            $productionLine = ProductionLine::with('products')->lockForUpdate()->findOrFail($productionLineId);
            $lineProductIds = $productionLine->products->pluck('id');

            if ($lineProductIds->isEmpty()) {
                throw ValidationException::withMessages(['production_line_id' => 'No products in this production line.']);
            }

            // Fetch customers who have preferences for products in this production line
            $customers = Customer::whereHas('selectedProducts', function ($query) use ($lineProductIds) {
                $query->whereIn('products.id', $lineProductIds);
            })->with([
                'selectedProducts' => function ($query) use ($lineProductIds) {
                    $query->whereIn('products.id', $lineProductIds);
                },
            ])->get();

            if ($customers->isEmpty()) {
                throw ValidationException::withMessages(['production_line_id' => 'No customers are assigned products on this production line. Assign a product to a customer before generating sales.']);
            }

            $sales = [];
            for ($i = 0; $i < $count; $i++) {
                $customer = $customers->random();
                $product = $customer->selectedProducts->random();

                $sale = Sale::create([
                    'product_id' => $product->id,
                    'customer_id' => $customer->id,
                    'production_line_id' => $productionLine->id,
                    'quantity' => rand(10, 500),
                    'date_to_deliver' => Carbon::now()->addDays(rand(1, 30)),
                    'status' => 'pending',
                ]);

                $sales[] = $sale->load(['product', 'customer']);
            }

            return $sales;
        });
    }

    /**
     * Clear pending sales for a production line.
     */
    public function clearPendingSales(int $productionLineId): void
    {
        DB::transaction(function () use ($productionLineId) {
            $line = ProductionLine::lockForUpdate()->findOrFail($productionLineId);
            foreach (Sale::where('production_line_id', $productionLineId)->where('status', SaleStatus::Pending)->orderBy('id')->lockForUpdate()->get() as $sale) {
                $sale->delete();
            }
            $line->update(['has_sales' => $line->sales()->whereIn('status', [SaleStatus::Pending, SaleStatus::InProduction])->exists()]);
        });
    }

    /**
     * Update priorities for a list of sales.
     */
    public function updatePriorities(array $saleIds): void
    {
        DB::transaction(function () use ($saleIds) {
            $lineIds = Sale::whereIn('id', $saleIds)->distinct()->pluck('production_line_id');
            if ($lineIds->count() !== 1) {
                throw ValidationException::withMessages(['sale_ids' => 'Sales must belong to one production line.']);
            }
            ProductionLine::lockForUpdate()->findOrFail($lineIds->first());
            $sales = Sale::query()
                ->whereIn('id', $saleIds)
                ->where('status', SaleStatus::Pending)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($sales->count() !== count(array_unique($saleIds))) {
                throw ValidationException::withMessages(['sale_ids' => 'One or more pending sales could not be found.']);
            }

            foreach ($saleIds as $index => $id) {
                // Lower index = Higher priority (1, 2, 3...)
                $sales[$id]->update(['priority' => $index + 1]);
            }
        });
    }
}
