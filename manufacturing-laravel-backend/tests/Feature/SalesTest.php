<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SalesTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected $manager;

    protected $productionLine;

    protected $product;

    protected $customer;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed Roles and Permissions
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $managerRole = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

        Permission::firstOrCreate(['name' => 'manage-sales', 'guard_name' => 'web']);
        // Permission::firstOrCreate(['name' => 'update-sales', 'guard_name' => 'web']); // Not using separate permission anymore

        $adminRole->givePermissionTo('manage-sales');
        $managerRole->givePermissionTo('manage-sales');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->manager = User::factory()->create();
        $this->manager->assignRole('manager');

        $this->productionLine = ProductionLine::create(['name' => 'Test Line', 'capacity' => 100]);
        $this->product = Product::create(['name' => 'Test Product', 'production_line_id' => $this->productionLine->id]);
        $this->customer = Customer::create(['name' => 'Test Customer', 'contact' => 'test@example.com']);

        // Link customer to product
        $this->customer->selectedProducts()->attach($this->product->id);
    }

    public function test_admin_can_generate_random_sales()
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/sales/generate', [
                'production_line_id' => $this->productionLine->id,
                'count' => 5,
            ]);

        $response->assertStatus(201)
            ->assertJsonCount(5);

        $this->assertDatabaseCount('sales', 5);
    }

    public function test_manager_cannot_generate_sales()
    {
        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/sales/generate', [
                'production_line_id' => $this->productionLine->id,
                'count' => 5,
            ]);

        $response->assertStatus(403); // Forbidden
    }

    public function test_manager_can_update_sales_priority()
    {
        // Create 3 sales
        $sales = Sale::factory()->count(3)->create([
            'production_line_id' => $this->productionLine->id,
            'product_id' => $this->product->id,
            'customer_id' => $this->customer->id,
            'status' => 'pending',
        ]);

        // Reorder them: 3, 1, 2
        $orderedIds = [$sales[2]->id, $sales[0]->id, $sales[1]->id];

        $response = $this->actingAs($this->manager, 'sanctum')
            ->patchJson('/api/v1/sales/reorder', [
                'sale_ids' => $orderedIds,
            ]);

        $response->assertStatus(200);

        // Verify Priority
        $this->assertEquals(1, $sales[2]->fresh()->priority);
        $this->assertEquals(2, $sales[0]->fresh()->priority);
        $this->assertEquals(3, $sales[1]->fresh()->priority);
    }
}
