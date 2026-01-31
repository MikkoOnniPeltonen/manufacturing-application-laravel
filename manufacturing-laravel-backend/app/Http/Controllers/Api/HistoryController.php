<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GetHistoryRequest;
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

    public function show(GetHistoryRequest $request, ProductionLine $productionLine): JsonResponse
    {
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
                $timestamp = $request->timestamp ?? now();
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
