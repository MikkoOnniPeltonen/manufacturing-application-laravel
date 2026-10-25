<?php

namespace Tests\Feature;

use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Models\User;
use App\Services\HistoryService;
use App\Services\ProductionService;
use App\Services\SalesService;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkflowRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RoleSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    public function test_generation_never_selects_a_product_from_another_line(): void
    {
        $line = ProductionLine::factory()->create();
        $allowed = Product::factory()->create(['production_line_id' => $line->id]);
        $other = Product::factory()->create();
        $customer = Customer::factory()->create();
        $customer->selectedProducts()->attach([$allowed->id, $other->id]);
        foreach (app(SalesService::class)->generateRandomSales($line->id, 20) as $sale) {
            $this->assertSame($allowed->id, $sale->product_id);
        }
    }

    public function test_batch_delivery_sets_timestamp_and_logs_once(): void
    {
        $sale = Sale::factory()->create(['status' => SaleStatus::InProduction, 'delivered_at' => null]);
        $service = app(ProductionService::class);
        $service->updateItemsStatus([$sale->id], $sale->production_line_id, 'delivered');
        $service->updateItemsStatus([$sale->id], $sale->production_line_id, 'delivered');
        $this->assertNotNull($sale->fresh()->delivered_at);
        $this->assertDatabaseCount('production_logs', 1);
        $this->assertFalse($sale->productionLine->fresh()->has_sales);
    }

    public function test_clearing_pending_sales_keeps_active_work_and_updates_flag(): void
    {
        $pending = Sale::factory()->create(['status' => SaleStatus::Pending]);
        $active = Sale::factory()->create(['production_line_id' => $pending->production_line_id, 'status' => SaleStatus::InProduction]);
        app(SalesService::class)->clearPendingSales($pending->production_line_id);
        $this->assertSoftDeleted($pending);
        $this->assertTrue($pending->productionLine->fresh()->has_sales);
        app(ProductionService::class)->processItem($active);
        $this->assertFalse($pending->productionLine->fresh()->has_sales);
        $pending->restore();
        app(SalesService::class)->clearPendingSales($pending->production_line_id);
        $this->assertFalse($pending->productionLine->fresh()->has_sales);
    }

    public function test_invalid_batches_roll_back_without_partial_updates(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $sale = Sale::factory()->create(['status' => SaleStatus::Pending]);
        $other = Sale::factory()->create();
        foreach ([(string) Str::uuid(), $other->id] as $invalid) {
            $this->patchJson('/api/v1/productions/'.$sale->production_line_id, [
                'sale_ids' => [$sale->id, $invalid], 'status' => 'in_production',
            ])->assertUnprocessable()->assertJsonValidationErrors('sale_ids');
            $this->assertSame(SaleStatus::Pending, $sale->fresh()->status);
            $this->assertDatabaseCount('production_logs', 0);
        }
        $this->patchJson('/api/v1/productions/'.$sale->production_line_id, ['sale_ids' => [$sale->id, $sale->id], 'status' => 'in_production'])->assertUnprocessable();
        $this->patchJson('/api/v1/productions/'.$sale->production_line_id, ['sale_ids' => array_fill(0, 101, $sale->id), 'status' => 'in_production'])->assertUnprocessable();
    }

    public function test_staging_order_is_saved_and_used_by_the_api(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $first = Sale::factory()->create(['status' => SaleStatus::Pending]);
        $second = Sale::factory()->create(['production_line_id' => $first->production_line_id, 'status' => SaleStatus::Pending]);
        $this->patchJson('/api/v1/productions/'.$first->production_line_id, [
            'sale_ids' => [$second->id, $first->id], 'status' => 'in_production',
        ])->assertOk();
        $this->getJson('/api/v1/sales/'.$first->production_line_id)->assertOk()->assertJsonPath('data.0.id', $second->id)->assertJsonPath('data.0.priority', 1);
    }

    public function test_snapshots_respect_deletion_and_same_second_transitions(): void
    {
        $this->travelTo(now()->startOfSecond());
        $sale = Sale::factory()->create(['status' => SaleStatus::Pending, 'created_at' => now()->subDay()]);
        $before = now()->subMinute()->toIso8601String();
        $sale->delete();
        $history = app(HistoryService::class);
        $this->assertCount(1, $history->getProductionLineState($sale->production_line_id, $before)['pending']);
        $this->assertCount(0, $history->getProductionLineState($sale->production_line_id, now()->toIso8601String())['pending']);
        $sale->restore();
        app(ProductionService::class)->startProduction($sale->production_line_id);
        $this->assertCount(1, $history->getProductionLineState($sale->production_line_id, now()->toIso8601String())['in_production']);
        app(ProductionService::class)->processItem($sale);
        $this->assertCount(0, $history->getProductionLineState($sale->production_line_id, now()->toIso8601String())['in_production']);
        $this->travelBack();
    }

    public function test_snapshot_query_count_is_bounded(): void
    {
        $line = ProductionLine::factory()->create();
        Sale::factory()->count(30)->create(['production_line_id' => $line->id, 'status' => SaleStatus::Pending]);
        DB::enableQueryLog();
        $result = app(HistoryService::class)->getProductionLineState($line->id, now()->addMinute()->toIso8601String(), 10);
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();
        $this->assertCount(10, $result['pending']);
        $this->assertSame(30, $result['total']);
        $this->assertLessThanOrEqual(7, $queries);
    }

    public function test_history_accepts_browser_booleans_and_applies_default_and_single_date_bounds(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $sale = Sale::factory()->create(['created_at' => now()->subDays(90)]);
        $url = '/api/v1/production-lines/'.$sale->production_line_id.'/history';
        $this->getJson($url.'?search_mode=true')->assertOk()->assertJsonPath('sales.total', 0);
        $this->getJson($url.'?start_date='.now()->subDay()->toDateString())->assertOk()->assertJsonPath('sales.total', 0);
        $this->getJson($url.'?end_date='.now()->toDateString())->assertOk();
        $this->getJson($url.'?search_mode=1&max_quantity=0')->assertOk()->assertJsonPath('sales.total', 0);
        $this->getJson($url.'?start_date=2026-05-02&end_date=2026-05-01')->assertUnprocessable();
    }

    public function test_collection_defaults_are_bounded_and_filters_are_validated(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        Customer::factory()->count(30)->create();
        $customer = Customer::first();
        Sale::factory()->count(3)->create(['customer_id' => $customer->id]);
        $this->getJson('/api/v1/customers')->assertOk()->assertJsonCount(25, 'data')->assertJsonPath('total', 30)->assertJsonMissingPath('data.0.sales');
        $this->getJson('/api/v1/customers/'.$customer->id)->assertOk()->assertJsonCount(3, 'sales_summary');
        $this->getJson('/api/v1/sales?status=garbage')->assertUnprocessable();
        $this->getJson('/api/v1/sales?customer_id=99999')->assertUnprocessable();
    }

    public function test_production_seeding_and_reset_cannot_create_or_destroy_demo_data(): void
    {
        config(['app.demo_mode' => true]);
        $sale = Sale::factory()->create();
        $usersBefore = User::count();
        $this->app['env'] = 'production';
        try {
            $this->seed(DatabaseSeeder::class);
            $this->seed(UserSeeder::class);
            $this->assertSame($usersBefore, User::count());
            $this->artisan('reset:demo')->assertFailed();
            $this->assertDatabaseHas('sales', ['id' => $sale->id]);
        } finally {
            $this->app['env'] = 'testing';
        }
    }

    public function test_stateful_login_and_logout_validate_csrf(): void
    {
        config(['sanctum.stateful' => ['localhost:5173']]);
        $user = User::factory()->create(['password' => 'password']);
        $this->app['env'] = 'local';
        try {
            $this->withHeaders(['Origin' => 'http://localhost:5173', 'Sec-Fetch-Site' => 'same-site'])
                ->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertStatus(419);
            $this->withSession(['_token' => 'review-csrf-token'])->withHeader('X-CSRF-TOKEN', 'review-csrf-token')
                ->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
            $this->withHeader('X-CSRF-TOKEN', session()->token())->postJson('/api/v1/logout')->assertOk();
            app('auth')->forgetGuards();
            $this->getJson('/api/v1/me')->assertUnauthorized();
        } finally {
            $this->app['env'] = 'testing';
        }
    }

    public function test_login_has_an_ip_limit_even_when_email_changes(): void
    {
        foreach (range(1, 30) as $number) {
            $this->postJson('/api/v1/login', ['email' => 'attempt'.$number.'@example.com', 'password' => 'password'])->assertUnauthorized();
        }
        $this->postJson('/api/v1/login', ['email' => 'new@example.com', 'password' => 'password'])->assertStatus(429);
    }

    public function test_derived_flags_and_existing_product_line_associations_are_protected(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $sale = Sale::factory()->create(['status' => SaleStatus::Pending]);
        $this->patchJson('/api/v1/production-lines/'.$sale->production_line_id, ['has_sales' => false])->assertOk()->assertJsonPath('has_sales', true);
        $line = ProductionLine::factory()->create();
        $this->patchJson('/api/v1/products/'.$sale->product_id, ['production_line_id' => $line->id])->assertStatus(409);
        $this->deleteJson('/api/v1/production-lines/'.$sale->production_line_id)->assertStatus(409);
    }

    public function test_customer_update_preserves_preferences_and_rejects_deleted_products(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $customer = Customer::factory()->create();
        $product = Product::factory()->create();
        $customer->selectedProducts()->attach($product);
        $this->patchJson('/api/v1/customers/'.$customer->id, ['name' => 'Updated', 'customer_logo_url' => '/images/coffee.png'])->assertOk()->assertJsonPath('selected_products.0.id', $product->id);
        $this->postJson('/api/v1/customers', ['name' => 'Unsafe logo', 'customer_logo_url' => 'javascript:alert(1)'])->assertUnprocessable();
        $product->delete();
        $this->postJson('/api/v1/customers', ['name' => 'New', 'selected_product_ids' => [$product->id]])->assertUnprocessable();
    }
}
