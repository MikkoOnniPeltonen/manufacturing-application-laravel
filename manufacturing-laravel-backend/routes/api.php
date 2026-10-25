<?php

use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\OperationsController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\ProductionLineController;
use App\Http\Controllers\Api\ProductionRunController;
use App\Http\Controllers\Api\SalesController;
use Illuminate\Support\Facades\Artisan;
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
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
if (app()->environment(['local', 'testing']) && config('app.demo_mode')) {
    Route::post('/reset-demo', function () {
        abort_if(Artisan::call('reset:demo') !== 0, 409, 'Demo reset could not complete. Check active production runs.');

        return response()->json(['message' => 'Demo data reset successfully']);
    })->middleware(['auth:sanctum', 'role:admin', 'throttle:demo-reset']);
}

// Protected routes - require authentication
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('client-errors', [OperationsController::class, 'clientError'])->middleware('throttle:5,1');

    // Production Lines - Manager & Admin
    Route::middleware('role:manager|admin')->group(function () {
        Route::apiResource('production-lines', ProductionLineController::class);
        Route::apiResource('products', ProductController::class);
        Route::get('production-runs', [ProductionRunController::class, 'index']);
        Route::post('production-runs', [ProductionRunController::class, 'store']);
        Route::post('production-runs/{productionRun}/retry', [ProductionRunController::class, 'retry']);

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
        Route::get('orders', [OrderController::class, 'index']);
        Route::post('orders', [OrderController::class, 'store']);
        Route::get('orders/{sale}', [OrderController::class, 'show']);
        Route::patch('orders/{sale}', [OrderController::class, 'update']);
        Route::post('orders/{sale}/cancel', [OrderController::class, 'cancel']);
        Route::get('operations', [OperationsController::class, 'show']);
        Route::get('audit-events', [AuditController::class, 'index']);
        Route::post('customers/{customer}/products/{product}', [CustomerController::class, 'attachProduct']);
        Route::delete('customers/{customer}/products/{product}', [CustomerController::class, 'detachProduct']);

        // Sales Generation
        Route::prefix('sales')->group(function () {
            Route::post('/generate', [SalesController::class, 'generateRandomSales']);
            Route::delete('/{productionLine}/clear', [SalesController::class, 'clearSales']);
        });

        // History Route
        Route::get('/production-lines/{productionLine}/history', [HistoryController::class, 'show']);
    });
});
