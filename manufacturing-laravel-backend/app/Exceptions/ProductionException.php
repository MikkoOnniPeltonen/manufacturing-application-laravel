<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class ProductionException extends Exception
{
    /**
     * Render the exception into an HTTP response.
     */
    public function render($request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => 'production_invalid_state',
            'request_id' => $request->header('X-Request-Id'),
        ], 409);
    }
}
