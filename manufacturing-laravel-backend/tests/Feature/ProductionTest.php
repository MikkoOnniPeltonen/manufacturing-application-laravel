<?php

namespace Tests\Feature;

use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProductionTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;

    protected $productionLine;

    protected $product;

    protected $customer;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed Roles
        Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

        $this->manager = User::factory()->create();
        $this->manager->assignRole('manager');

        $this->productionLine = ProductionLine::create(['name' => 'Test Line', 'capacity' => 100]);
        $this->product = Product::create(['name' => 'Test Product', 'production_line_id' => $this->productionLine->id]);
        $this->customer = Customer::create(['name' => 'Test Customer', 'contact' => 'test@example.com']);
    }

    public function test_manager_can_start_production()
    {
        // Create pending sales
        Sale::factory()->count(3)->create([
            'production_line_id' => $this->productionLine->id,
            'product_id' => $this->product->id,
            'customer_id' => $this->customer->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/productions/start/{$this->productionLine->id}");

        $response->assertStatus(200)
            ->assertJson(['count' => 3]);

        $this->assertDatabaseHas('sales', ['status' => 'in_production']);
        $this->assertDatabaseMissing('sales', ['status' => 'pending']);
    }

    public function test_process_item_transitions_status()
    {
        $sale = Sale::factory()->create([
            'production_line_id' => $this->productionLine->id,
            'product_id' => $this->product->id,
            'customer_id' => $this->customer->id,
            'status' => 'in_production',
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/productions/process/{$sale->id}");

        $response->assertStatus(200)
            ->assertJsonStructure(['sale', 'remaining_count']);

        $this->assertSame(SaleStatus::Delivered, $sale->fresh()->status);
        $this->assertNotNull($sale->fresh()->delivered_at);
    }

    public function test_delivered_item_cannot_be_processed_again(): void
    {
        $sale = Sale::factory()->create([
            'production_line_id' => $this->productionLine->id,
            'product_id' => $this->product->id,
            'customer_id' => $this->customer->id,
            'status' => SaleStatus::Delivered,
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/productions/process/{$sale->id}");

        $response->assertStatus(409)
            ->assertJsonPath('code', 'production_invalid_state');
    }
}
