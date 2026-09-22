<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class ReadinessController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->check(static fn (): mixed => DB::select('select 1')),
            'cache' => $this->check(function (): mixed {
                $key = 'readiness:'.uniqid('', true);
                Cache::put($key, true, 5);
                $value = Cache::get($key);
                Cache::forget($key);

                return $value;
            }),
        ];

        $ready = collect($checks)->every(static fn (array $check): bool => $check['status'] === 'up');

        return response()->json([
            'status' => $ready ? 'ready' : 'not_ready',
            'checks' => $checks,
        ], $ready ? 200 : 503);
    }

    /**
     * @param  callable(): mixed  $check
     * @return array{status: string}
     */
    private function check(callable $check): array
    {
        try {
            $check();

            return ['status' => 'up'];
        } catch (Throwable) {
            return ['status' => 'down'];
        }
    }
}
