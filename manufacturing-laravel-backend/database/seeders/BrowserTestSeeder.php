<?php

namespace Database\Seeders;

use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Database\Seeder;

class BrowserTestSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || ! config('app.demo_mode')) {
            throw new \RuntimeException('Browser fixtures require a local/testing demo environment.');
        }
        $this->call(DatabaseSeeder::class);
        $customer = Customer::orderBy('id')->firstOrFail();
        $product = Product::orderBy('id')->firstOrFail();
        $customer->selectedProducts()->sync([$product->id]);
        Sale::create(['customer_id' => $customer->id, 'product_id' => $product->id, 'production_line_id' => $product->production_line_id, 'quantity' => 1, 'date_to_deliver' => now()->addDay(), 'status' => SaleStatus::Pending]);
    }
}
