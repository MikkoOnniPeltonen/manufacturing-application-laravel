<?php

namespace App\Http\Controllers\Api;

use App\Enums\SaleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProductionItemsRequest;
use App\Http\Resources\SaleResource;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Services\ProductionService;
use Illuminate\Http\JsonResponse;

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
            ->where('status', SaleStatus::InProduction)
            ->with(['product', 'customer'])
            ->get();

        return response()->json(SaleResource::collection($items));
    }

    public function updateItems(UpdateProductionItemsRequest $request, ProductionLine $productionLine): JsonResponse
    {
        $this->productionService->updateItemsStatus(
            $request->sale_ids,
            $productionLine->id,
            $request->status
        );

        return response()->json(['message' => 'Items updated']);
    }

    public function start(ProductionLine $productionLine): JsonResponse
    {
        $count = $this->productionService->startProduction($productionLine->id);

        return response()->json([
            'message' => 'Production started',
            'count' => $count,
        ]);
    }

    public function processItem(Sale $sale): JsonResponse
    {
        $result = $this->productionService->processItem($sale);

        return response()->json([
            'message' => 'Item processed and delivered',
            'sale' => new SaleResource($result['sale']),
            'remaining_count' => $result['remaining_count'],
        ]);
    }
}
