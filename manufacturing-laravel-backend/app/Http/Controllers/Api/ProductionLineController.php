<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Resources\ProductionLineResource;
use App\Models\ProductionLine;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductionLineController extends Controller
{
    #[Response(type: 'array{data: ProductionLineResource[], current_page: int, per_page: int, total: int, last_page: int, from: int|null, to: int|null}')]
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $productionLines = ProductionLine::query()->withCount([
            'sales as pending_sales_count' => fn ($q) => $q->where('status', 'pending'),
            'sales as in_production_sales_count' => fn ($q) => $q->where('status', 'in_production'),
            'sales as delivered_sales_count' => fn ($q) => $q->where('status', 'delivered'),
        ]);

        return $this->paginatedResourceResponse($request, $productionLines, ProductionLineResource::class, 25, 100);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'product_logo_url' => 'nullable|url',
        ]);

        $productionLine = ProductionLine::create($validated);

        return response()->json(new ProductionLineResource($productionLine), 201);
    }

    public function show(ProductionLine $productionLine): JsonResponse
    {
        return response()->json(new ProductionLineResource($productionLine->load(['products', 'sales'])));
    }

    public function update(Request $request, ProductionLine $productionLine): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'capacity' => 'sometimes|integer|min:1',
            'product_logo_url' => 'nullable|url',
        ]);

        $productionLine->update($validated);

        return response()->json(new ProductionLineResource($productionLine));
    }

    public function destroy(ProductionLine $productionLine): JsonResponse
    {
        DB::transaction(function () use ($productionLine) {
            $line = ProductionLine::lockForUpdate()->findOrFail($productionLine->id);
            abort_if($line->products()->exists() || $line->sales()->exists(), 409, 'Remove products and resolve sales before deleting this production line.');
            $line->delete();
        });

        return response()->json(null, 204);
    }
}
