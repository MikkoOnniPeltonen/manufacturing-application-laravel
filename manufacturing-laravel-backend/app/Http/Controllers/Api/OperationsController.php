<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ErrorReporter;
use App\Services\OperationsService;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OperationsController extends Controller
{
    #[Response(type: 'array{checks: array<string, array{ok: bool, message: string}>, alerts_configured: bool}')]
    public function show(OperationsService $service): JsonResponse
    {
        return response()->json(['checks' => $service->checks(app()->environment('production')), 'alerts_configured' => (bool) config('operations.error_webhook_url')]);
    }

    public function clientError(Request $request): JsonResponse
    {
        $data = $request->validate(['category' => 'required|in:Error,TypeError,RangeError,ReferenceError,SyntaxError,URIError,EvalError']);
        Log::error('Frontend rendering error', ['category' => $data['category'], 'request_id' => $request->attributes->get('request_id')]);
        app(ErrorReporter::class)->report(new \RuntimeException('Frontend rendering error'));

        return response()->json(['message' => 'Error recorded'], 202);
    }
}
