<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaleResource;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Services\ProductionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionController extends Controller
{
    protected $productionService;

    public function __construct(ProductionService $productionService)
    {
        $this->productionService = $productionService;
    }

    public function getItems(ProductionLine $productionLine): JsonResponse
    {
        $items = Sale::where('production_line_id', $productionLine->id)
            ->where('status', 'in_production')
            ->with(['product', 'customer'])
            ->get();

        return response()->json(SaleResource::collection($items));
    }

    public function updateItems(Request $request, ProductionLine $productionLine): JsonResponse
    {
        $validated = $request->validate([
            'sale_ids' => 'required|array',
            'sale_ids.*' => 'uuid',
            'status' => 'required|in:pending,in_production,completed',
        ]);

        try {
            $this->productionService->updateItemsStatus(
                $validated['sale_ids'],
                $productionLine->id,
                $validated['status']
            );
            return response()->json(['message' => 'Items updated']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function start(ProductionLine $productionLine): JsonResponse
    {
        try {
            $count = $this->productionService->startProduction($productionLine->id);

            return response()->json([
                'message' => 'Production started',
                'count' => $count
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function processItem(Sale $sale): JsonResponse
    {
        try {
            $result = $this->productionService->processItem($sale);

            return response()->json([
                'message' => 'Item processed and delivered',
                'sale' => new SaleResource($result['sale']), // Standardize response
                'remaining_count' => $result['remaining_count']
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
