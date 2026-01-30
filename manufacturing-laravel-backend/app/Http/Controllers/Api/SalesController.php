<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaleResource;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Services\SalesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesController extends Controller
{
    protected $salesService;

    public function __construct(SalesService $salesService)
    {
        $this->salesService = $salesService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Sale::with(['product', 'customer', 'productionLine']);

        if ($request->has('production_line_id')) {
            $query->where('production_line_id', $request->production_line_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(SaleResource::collection($query->get()));
    }

    public function byProductionLine(ProductionLine $productionLine): JsonResponse
    {
        $sales = Sale::where('production_line_id', $productionLine->id)
            ->with(['product', 'customer'])
            ->get();

        return response()->json(SaleResource::collection($sales));
    }

    public function generateRandomSales(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'production_line_id' => 'required|exists:production_lines,id',
            'count' => 'integer|min:1|max:20',
        ]);

        try {
            $sales = $this->salesService->generateRandomSales(
                $validated['production_line_id'],
                $validated['count'] ?? rand(3, 8)
            );
            return response()->json(SaleResource::collection(collect($sales)), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function clearSales(ProductionLine $productionLine): JsonResponse
    {
        $this->salesService->clearPendingSales($productionLine->id);
        return response()->json(['message' => 'Sales cleared successfully']);
    }

    public function updatePriority(Request $request): JsonResponse
    {
        $request->validate([
            'sale_ids' => 'required|array',
            'sale_ids.*' => 'uuid|exists:sales,id',
        ]);

        return response()->json(['message' => 'Priority updated']);
    }
}
