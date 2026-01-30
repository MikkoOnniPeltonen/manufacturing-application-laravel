<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductionLine;
use App\Services\HistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    protected $historyService;

    public function __construct(HistoryService $historyService)
    {
        $this->historyService = $historyService;
    }

    public function show(Request $request, ProductionLine $productionLine): JsonResponse
    {
        $validated = $request->validate([
            'timestamp' => 'nullable|date',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'product_name' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'status' => 'nullable|string',
            'min_quantity' => 'nullable|integer|min:0',
            'max_quantity' => 'nullable|integer|min:0|gte:min_quantity',
        ]);

        try {
            // Check if we are in Range/Search mode (either dates or filters provided)
            if ($request->hasAny(['start_date', 'end_date', 'product_name', 'customer_name', 'status', 'min_quantity', 'max_quantity', 'search_mode'])) {
                $filters = [
                    'product' => $request->input('product_name'),
                    'customer' => $request->input('customer_name'),
                    'status' => $request->input('status'),
                    'min_quantity' => $request->input('min_quantity'),
                    'max_quantity' => $request->input('max_quantity'),
                ];

                $state = $this->historyService->getSalesActivity(
                    $productionLine->id,
                    $request->input('start_date'),
                    $request->input('end_date'),
                    $filters
                );
            } else {
                // Default to timestamp snapshot if no range provided
                $timestamp = $validated['timestamp'] ?? now();
                $state = $this->historyService->getProductionLineState(
                    $productionLine->id,
                    $timestamp
                );
            }

            return response()->json($state);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
