<?php

namespace App\Services;

use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductionLine;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesService
{
    /**
     * Generate random sales for a production line.
     */
    public function generateRandomSales(int $productionLineId, int $count): array
    {
        return DB::transaction(function () use ($productionLineId, $count) {
            $productionLine = ProductionLine::with('products')->findOrFail($productionLineId);
            $lineProductIds = $productionLine->products->pluck('id');

            if ($lineProductIds->isEmpty()) {
                throw new \Exception('No products in this production line');
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
                throw new \Exception('No eligible customers found.');
            }

            $sales = [];
            for ($i = 0; $i < $count; $i++) {
                $customer = $customers->random();
                $product = Product::query()
                    ->whereKey($customer->selectedProducts()->pluck('products.id')->random())
                    ->firstOrFail();

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
            Sale::where('production_line_id', $productionLineId)
                ->where('status', SaleStatus::Pending)
                ->delete();
        });
    }

    /**
     * Update priorities for a list of sales.
     */
    public function updatePriorities(array $saleIds): void
    {
        DB::transaction(function () use ($saleIds) {
            $sales = Sale::query()
                ->whereIn('id', $saleIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($sales->count() !== count(array_unique($saleIds))) {
                throw new \InvalidArgumentException('One or more sales could not be found.');
            }

            foreach ($saleIds as $index => $id) {
                // Lower index = Higher priority (1, 2, 3...)
                $sales[$id]->update(['priority' => $index + 1]);
            }
        });
    }
}
