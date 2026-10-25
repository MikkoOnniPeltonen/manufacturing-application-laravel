<?php

namespace Tests\Feature;

use App\Enums\SaleStatus;
use App\Jobs\ProcessProductionRun;
use App\Models\AuditEvent;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\ErrorReporter;
use App\Services\HistoryService;
use App\Services\OperationsService;
use App\Services\ProductionRunService;
use App\Services\ProductionService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrderAndRunTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RoleSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('admin');
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    public function test_manual_order_lifecycle_is_atomic_and_audited(): void
    {
        $user = $this->admin();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create();
        $customer->selectedProducts()->attach($product);
        $data = ['customer_id' => $customer->id, 'product_id' => $product->id, 'quantity' => 25, 'date_to_deliver' => now()->addDay()->toDateString(), 'reason' => 'Customer purchase order'];
        $id = $this->postJson('/api/v1/orders', $data)->assertCreated()->assertJsonPath('status', 'pending')->json('id');
        $this->patchJson('/api/v1/orders/'.$id, ['quantity' => 50, 'date_to_deliver' => $data['date_to_deliver'], 'reason' => 'Customer increased quantity'])->assertOk()->assertJsonPath('quantity', 50);
        $this->postJson('/api/v1/orders/'.$id.'/cancel', ['reason' => 'Customer withdrew order'])->assertOk()->assertJsonPath('status', 'cancelled');
        $sale = Sale::findOrFail($id);
        $this->assertNotNull($sale->cancelled_at);
        $this->assertFalse($sale->productionLine->has_sales);
        $events = AuditEvent::where('subject_id', $id)->orderBy('id')->get();
        $this->assertCount(3, $events);
        $this->assertSame($user->id, $events[1]->actor_id);
        $this->assertSame(25, $events[1]->before['quantity']);
        $this->assertSame(50, $events[1]->after['quantity']);
        $this->assertSame('Customer increased quantity', $events[1]->reason);
        $this->getJson('/api/v1/audit-events?subject_id='.$id)->assertOk()->assertJsonPath('total', 3);
    }

    public function test_invalid_products_quantities_and_reasons_are_rejected(): void
    {
        $this->admin();
        $customer = Customer::factory()->create();
        $product = Product::factory()->create();
        $data = ['customer_id' => $customer->id, 'product_id' => $product->id, 'quantity' => 1, 'date_to_deliver' => now()->addDay()->toDateString(), 'reason' => 'New order'];
        $this->postJson('/api/v1/orders', $data)->assertUnprocessable()->assertJsonValidationErrors('product_id');
        $customer->selectedProducts()->attach($product);
        $this->postJson('/api/v1/orders', array_replace($data, ['quantity' => 0]))->assertUnprocessable();
        $this->postJson('/api/v1/orders', array_replace($data, ['reason' => '']))->assertUnprocessable();
        $this->assertDatabaseCount('sales', 0);
    }

    public function test_terminal_and_in_production_orders_cannot_be_edited_or_cancelled(): void
    {
        $this->admin();
        foreach ([SaleStatus::InProduction, SaleStatus::Delivered, SaleStatus::Cancelled] as $status) {
            $sale = Sale::factory()->create(['status' => $status]);
            $this->patchJson('/api/v1/orders/'.$sale->id, ['quantity' => 100, 'date_to_deliver' => now()->addDay()->toDateString(), 'reason' => 'Attempt modification'])->assertStatus(409);
            $this->postJson('/api/v1/orders/'.$sale->id.'/cancel', ['reason' => 'Attempt cancellation'])->assertStatus(409);
            $this->assertSame($status, $sale->fresh()->status);
        }
    }

    public function test_empty_batches_are_rejected_and_cancellation_needs_its_own_endpoint(): void
    {
        $this->admin();
        $sale = Sale::factory()->create(['status' => 'pending']);
        $this->patchJson('/api/v1/productions/'.$sale->production_line_id, ['sale_ids' => [], 'status' => 'in_production'])->assertUnprocessable();
        $this->patchJson('/api/v1/productions/'.$sale->production_line_id, ['sale_ids' => [$sale->id], 'status' => 'cancelled'])->assertUnprocessable();
    }

    public function test_production_run_is_queued_and_duplicate_starts_return_the_same_run(): void
    {
        Bus::fake([ProcessProductionRun::class]);
        $user = $this->admin();
        $sale = Sale::factory()->create(['status' => SaleStatus::InProduction]);
        $first = $this->postJson('/api/v1/production-runs', ['production_line_id' => $sale->production_line_id])->assertStatus(202)->assertJsonPath('status', 'queued')->json('id');
        $this->postJson('/api/v1/production-runs', ['production_line_id' => $sale->production_line_id])->assertStatus(202)->assertJsonPath('id', $first);
        $this->assertSame(SaleStatus::InProduction, $sale->fresh()->status);
        Bus::assertDispatched(ProcessProductionRun::class);
        $service = app(ProductionRunService::class);
        $service->execute($first);
        $service->execute($first);
        $this->assertDatabaseHas('production_runs', ['id' => $first, 'status' => 'completed', 'processed_count' => 1]);
        $this->assertSame(1, $sale->productionLogs()->count());
        $delivery = AuditEvent::where('subject_id', $sale->id)->where('action', 'order.updated')->firstOrFail();
        $this->assertSame($user->id, $delivery->actor_id);
        $this->assertStringContainsString($first, $delivery->reason);
    }

    public function test_interrupted_run_resumes_and_already_delivered_items_are_not_duplicated(): void
    {
        Bus::fake([ProcessProductionRun::class]);
        $user = $this->admin();
        $first = Sale::factory()->create(['status' => SaleStatus::InProduction]);
        $second = Sale::factory()->create(['production_line_id' => $first->production_line_id, 'status' => SaleStatus::InProduction]);
        $service = app(ProductionRunService::class);
        $run = $service->create($first->production_line_id, $user->id);
        app(ProductionService::class)->processItem($first);
        $service->execute($run->id);
        $this->assertSame(1, $first->productionLogs()->count());
        $this->assertSame(1, $second->productionLogs()->count());
        $this->assertSame(2, $run->fresh()->processed_count);
        $this->assertFalse($first->productionLine->fresh()->has_sales);
    }

    public function test_failed_runs_can_be_retried_and_queue_outages_recovered(): void
    {
        Bus::fake([ProcessProductionRun::class]);
        $user = $this->admin();
        $sale = Sale::factory()->create(['status' => SaleStatus::InProduction]);
        $service = app(ProductionRunService::class);
        $run = $service->create($sale->production_line_id, $user->id);
        $service->fail($run->id);
        $this->postJson('/api/v1/production-runs/'.$run->id.'/retry')->assertStatus(202)->assertJsonPath('status', 'queued');
        $run->refresh()->update(['dispatched_at' => now()->subMinutes(6)]);
        $this->artisan('production:recover')->assertSuccessful();
        $this->assertTrue($run->fresh()->dispatched_at->gt(now()->subMinute()));
        $service->execute($run->id);
        $this->postJson('/api/v1/production-runs/'.$run->id.'/retry')->assertStatus(409);
    }

    public function test_snapshot_keeps_original_order_quantity_before_an_edit(): void
    {
        $this->admin();
        $sale = Sale::factory()->create(['status' => 'pending', 'quantity' => 10]);
        $before = now()->toIso8601String();
        $this->travel(1)->minutes();
        $this->patchJson('/api/v1/orders/'.$sale->id, ['quantity' => 20, 'date_to_deliver' => now()->addDay()->toDateString(), 'reason' => 'Revised customer order'])->assertOk();
        $history = app(HistoryService::class)->getProductionLineState($sale->production_line_id, $before);
        $this->assertSame(10, $history['pending']->collection->first()->quantity);
        $this->travelBack();
    }

    public function test_audit_events_are_append_only(): void
    {
        $this->admin();
        $sale = Sale::factory()->create();
        $event = AuditEvent::where('subject_id', $sale->id)->firstOrFail();
        $this->expectException(\LogicException::class);
        $event->update(['reason' => 'Rewritten']);
    }

    public function test_managers_cannot_manage_orders_read_audits_or_operations(): void
    {
        $this->seed(RoleSeeder::class);
        $manager = User::factory()->create();
        $manager->assignRole('manager');
        $this->actingAs($manager, 'sanctum');
        foreach (['orders', 'audit-events', 'operations'] as $path) {
            $this->getJson('/api/v1/'.$path)->assertForbidden();
        }
    }

    public function test_operational_signals_detect_stale_workers_and_pending_migrations(): void
    {
        $this->admin();
        $service = app(OperationsService::class);
        $this->assertFalse($service->checks()['worker']['ok']);
        foreach (['worker', 'scheduler', 'backup_verified'] as $signal) {
            $service->signal($signal);
        }
        $checks = $service->checks();
        $this->assertTrue($checks['worker']['ok']);
        $this->assertTrue($checks['migrations']['ok']);
        $this->travel(6)->minutes();
        $this->assertFalse($service->checks()['worker']['ok']);
        $this->travelBack();
        $this->getJson('/api/v1/operations')->assertOk()->assertJsonPath('alerts_configured', false);
        $this->artisan('ops:check --deployment')->assertFailed();
    }

    public function test_production_preflight_passes_only_with_healthy_signals_and_secure_settings(): void
    {
        config([
            'app.url' => 'https://api.example.test', 'app.debug' => false, 'app.demo_mode' => false,
            'app.key' => 'base64:'.base64_encode(str_repeat('x', 32)),
            'cors.allowed_origins' => ['https://app.example.test'], 'session.secure' => true,
            'session.http_only' => true, 'queue.default' => 'database',
            'operations.error_webhook_url' => 'https://monitor.example.test/events',
        ]);
        foreach (['worker', 'scheduler', 'backup_verified'] as $name) {
            app(OperationsService::class)->signal($name);
        }
        $this->app['env'] = 'production';
        try {
            $this->artisan('ops:check --deployment')->assertSuccessful();
        } finally {
            $this->app['env'] = 'testing';
        }
    }

    public function test_error_alerts_exclude_secrets_and_ignore_webhook_failures(): void
    {
        config(['operations.error_webhook_url' => 'https://monitor.example.test/events']);
        Http::fake(['*' => Http::response([], 200)]);
        app(ErrorReporter::class)->report(new \RuntimeException('password=secret'));
        Http::assertSent(fn ($request) => $request['event'] === 'application_error' && ! str_contains($request->body(), 'secret'));
        Http::fake(['*' => Http::response([], 503)]);
        app(ErrorReporter::class)->report(new \RuntimeException('private'));
        $this->assertTrue(true);
    }
}
