<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ErrorReporter
{
    public function report(Throwable $exception): void
    {
        $url = config('operations.error_webhook_url');
        if (! $url) {
            return;
        }
        if (! str_starts_with($url, 'https://')) {
            Log::warning('Error webhook requires HTTPS.');

            return;
        }
        try {
            // Do not send messages, stack traces, request bodies, cookies, or credentials.
            Http::connectTimeout(1)->timeout(2)->post($url, [
                'event' => 'application_error', 'application' => config('app.name'), 'environment' => app()->environment(),
                'exception' => get_class($exception), 'request_id' => request()->attributes->get('request_id'), 'occurred_at' => now()->toIso8601String(),
            ])->throw();
        } catch (Throwable) {
            Log::warning('Error alert delivery failed. Inspect the application error log.');
        }
    }
}
