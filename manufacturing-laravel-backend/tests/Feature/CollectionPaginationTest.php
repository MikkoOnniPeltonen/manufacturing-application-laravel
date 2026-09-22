<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CollectionPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customers_products_and_sales_support_pagination_limits(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $productionLine = ProductionLine::factory()->create();
        Customer::factory()->count(18)->create(['contact' => fake()->safeEmail]);
        Product::factory()->count(18)->create(['production_line_id' => $productionLine->id]);

        $customer = Customer::query()->first();
        $product = Product::query()->first();

        Sale::factory()->count(23)->create([
            'production_line_id' => $productionLine->id,
            'product_id' => $product->id,
            'customer_id' => $customer->id,
        ]);

        $customerResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/customers?limit=5&page=2');

        $customerResponse->assertOk()
            ->assertJsonPath('per_page', 5)
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('total', 18)
            ->assertJsonCount(5, 'data');

        $productResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/products?limit=4');

        $productResponse->assertOk()
            ->assertJsonPath('per_page', 4)
            ->assertJsonPath('total', 18)
            ->assertJsonCount(4, 'data');

        $salesResponse = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/sales?limit=10');

        $salesResponse->assertOk()
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 23)
            ->assertJsonCount(10, 'data');
    }

    public function test_history_supports_pagination_limits(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $productionLine = ProductionLine::factory()->create();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create(['production_line_id' => $productionLine->id]);

        foreach (range(1, 12) as $index) {
            Sale::factory()->create([
                'production_line_id' => $productionLine->id,
                'product_id' => $product->id,
                'customer_id' => $customer->id,
                'status' => 'pending',
                'quantity' => $index,
            ]);
        }

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/production-lines/'.$productionLine->id.'/history?limit=5&search_mode=1');

        $response->assertOk()
            ->assertJsonPath('sales.per_page', 5)
            ->assertJsonPath('sales.total', 12)
            ->assertJsonCount(5, 'sales.data');
    }
}
