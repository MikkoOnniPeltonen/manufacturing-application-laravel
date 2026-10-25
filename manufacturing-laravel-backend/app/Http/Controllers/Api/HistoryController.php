<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GetHistoryRequest;
use App\Models\ProductionLine;
use App\Services\HistoryService;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;

class HistoryController extends Controller
{
    protected $historyService;

    public function __construct(HistoryService $historyService)
    {
        $this->historyService = $historyService;
    }

    #[Response(type: 'array{sales?: array{data: \App\Http\Resources\SaleResource[], current_page: int, per_page: int, total: int, last_page: int}, pending?: \App\Http\Resources\SaleResource[], in_production?: \App\Http\Resources\SaleResource[], timestamp?: string, start_date?: string, end_date?: string, mode?: string, current_page?: int, last_page?: int, total?: int, per_page?: int}')]
    public function show(GetHistoryRequest $request, ProductionLine $productionLine): JsonResponse
    {
        // Check if we are in Range/Search mode (either dates or filters provided)
        if (! $request->filled('timestamp') && $request->hasAny(['start_date', 'end_date', 'product_name', 'customer_name', 'status', 'min_quantity', 'max_quantity', 'search_mode', 'page', 'limit', 'per_page'])) {
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
                $filters,
                $request->input('limit', $request->input('per_page', 25)),
                $request->input('page', 1)
            );
        } else {
            // Default to timestamp snapshot if no range provided
            $timestamp = $request->input('timestamp', now()->toIso8601String());
            $state = $this->historyService->getProductionLineState(
                $productionLine->id,
                $timestamp,
                (int) $request->input('limit', $request->input('per_page', 25)),
                (int) $request->input('page', 1)
            );
        }

        return response()->json($state);
    }
}
