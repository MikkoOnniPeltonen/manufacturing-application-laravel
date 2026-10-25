<?php

namespace Tests\Integration;

use App\Models\Sale;
use App\Services\DatabaseBackupService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseBackupTest extends TestCase
{
    use DatabaseMigrations;

    public function test_dump_restores_matching_snapshot_counts_without_touching_live_data(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Requires PostgreSQL and PostgreSQL client utilities.');
        }
        $sale = Sale::factory()->create(['quantity' => 10]);
        $service = app(DatabaseBackupService::class);
        $path = $service->backup();
        try {
            $manifest = json_decode(file_get_contents($path.'.json'), true, 512, JSON_THROW_ON_ERROR);
            $this->assertSame(1, $manifest['counts']['sales']);
            $sale->update(['quantity' => 99]);
            Sale::factory()->create();
            $service->verify($path);
            $this->assertSame(99, $sale->fresh()->quantity);
            $this->assertSame(2, Sale::count());
            $this->assertDatabaseHas('operation_signals', ['name' => 'backup_verified']);
            $scratch = DB::select("SELECT datname FROM pg_database WHERE datname LIKE 'manufacturing_restore_%'");
            $this->assertCount(0, $scratch);
            file_put_contents($path, 'corrupt', FILE_APPEND);
            $this->expectException(\RuntimeException::class);
            $service->verify($path);
        } finally {
            @unlink($path);
            @unlink($path.'.json');
        }
    }
}
