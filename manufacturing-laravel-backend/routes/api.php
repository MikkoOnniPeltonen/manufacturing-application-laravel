<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\ProductionLineController;
use App\Http\Controllers\Api\SalesController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api/v1
|
*/

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/reset-demo', function () {
    \Illuminate\Support\Facades\Artisan::call('reset:demo');
    return response()->json(['message' => 'Demo data reset successfully']);
});

// Protected routes - require authentication
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Production Lines - Manager & Admin
    Route::middleware('role:manager|admin')->group(function () {
        Route::apiResource('production-lines', ProductionLineController::class);
        Route::apiResource('products', ProductController::class);

        // Sales routes (Read/Update)
        Route::prefix('sales')->group(function () {
            Route::get('/', [SalesController::class, 'index']);
            Route::get('/{productionLine}', [SalesController::class, 'byProductionLine']);
            Route::patch('/reorder', [SalesController::class, 'updatePriority']);
        });

        // Production routes
        Route::prefix('productions')->group(function () {
            Route::get('/{productionLine}', [ProductionController::class, 'getItems']);
            Route::patch('/{productionLine}', [ProductionController::class, 'updateItems']);
            Route::post('/start/{productionLine}', [ProductionController::class, 'start']);
            Route::post('/process/{sale}', [ProductionController::class, 'processItem']);
        });
    });

    // Customers & Sales Generation - Admin only
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('customers', CustomerController::class);
        Route::post('customers/{customer}/products/{product}', [CustomerController::class, 'attachProduct']);
        Route::delete('customers/{customer}/products/{product}', [CustomerController::class, 'detachProduct']);

        // Sales Generation
        Route::prefix('sales')->group(function () {
            Route::post('/generate', [SalesController::class, 'generateRandomSales']);
            Route::delete('/{productionLine}/clear', [SalesController::class, 'clearSales']);
        });

        // History Route
        Route::get('/production-lines/{productionLine}/history', [\App\Http\Controllers\Api\HistoryController::class, 'show']);
    });
});
