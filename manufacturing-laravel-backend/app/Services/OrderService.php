<?php

namespace App\Services;

use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductionLine;
use App\Models\ProductionLog;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private AuditService $audit) {}

    public function create(array $data): Sale
    {
        return $this->audit->within(auth()->id(), $data['reason'], fn () => DB::transaction(function () use ($data) {
            $product = Product::findOrFail($data['product_id']);
            $line = ProductionLine::lockForUpdate()->findOrFail($product->production_line_id);
            $product->refresh();
            abort_if($product->trashed() || $product->production_line_id !== $line->id, 409, 'The product changed. Reload before creating this order.');
            $customer = Customer::lockForUpdate()->findOrFail($data['customer_id']);
            if (! $customer->selectedProducts()->whereKey($product->id)->exists()) {
                throw ValidationException::withMessages(['product_id' => 'Select a product assigned to this customer.']);
            }

            return Sale::create([
                'customer_id' => $customer->id, 'product_id' => $product->id,
                'production_line_id' => $product->production_line_id, 'quantity' => $data['quantity'],
                'date_to_deliver' => $data['date_to_deliver'], 'status' => SaleStatus::Pending,
                'priority' => 1 + (int) Sale::where('production_line_id', $product->production_line_id)->max('priority'),
            ]);
        }));
    }

    public function update(Sale $sale, array $data): Sale
    {
        return $this->changePending($sale, $data['reason'], function (Sale $locked) use ($data) {
            $locked->update(['quantity' => $data['quantity'], 'date_to_deliver' => $data['date_to_deliver']]);
        });
    }

    public function cancel(Sale $sale, string $reason): Sale
    {
        return $this->changePending($sale, $reason, function (Sale $locked) {
            $locked->update(['status' => SaleStatus::Cancelled, 'cancelled_at' => now()]);
            ProductionLog::create(['sale_id' => $locked->id, 'from_status' => 'pending', 'to_status' => 'cancelled', 'meta_data' => ['actor_id' => auth()->id()]]);
        });
    }

    private function changePending(Sale $sale, string $reason, \Closure $change): Sale
    {
        return $this->audit->within(auth()->id(), $reason, fn () => DB::transaction(function () use ($sale, $change) {
            ProductionLine::lockForUpdate()->findOrFail($sale->production_line_id);
            $locked = Sale::lockForUpdate()->findOrFail($sale->id);
            abort_unless($locked->status === SaleStatus::Pending, 409, 'Only pending orders can be edited or cancelled.');
            $change($locked);

            return $locked;
        }));
    }
}
