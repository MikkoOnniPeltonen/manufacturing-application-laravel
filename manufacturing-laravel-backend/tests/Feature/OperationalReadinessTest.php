<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class OperationalReadinessTest extends TestCase
{
    public function test_readiness_reports_database_and_cache_dependencies(): void
    {
        $response = $this->getJson('/ready');

        $response->assertOk()
            ->assertJsonPath('status', 'ready')
            ->assertJsonPath('checks.database.status', 'up')
            ->assertJsonPath('checks.cache.status', 'up');
    }

    public function test_readiness_rejects_a_failed_cache_roundtrip(): void
    {
        Cache::shouldReceive('put')->once()->andReturn(true);
        Cache::shouldReceive('get')->once()->andReturn(false);
        Cache::shouldReceive('forget')->once()->andReturn(true);
        $this->getJson('/ready')->assertStatus(503)->assertJsonPath('checks.cache.status', 'down');
    }

    public function test_requests_have_a_correlatable_request_id(): void
    {
        $response = $this->withHeader('X-Request-ID', 'request-123')->getJson('/ready');

        $response->assertHeader('X-Request-ID', 'request-123');
    }
}
