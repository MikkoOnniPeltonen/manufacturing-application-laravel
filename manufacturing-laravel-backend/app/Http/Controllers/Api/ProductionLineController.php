<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Resources\ProductionLineResource;
use App\Models\ProductionLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionLineController extends Controller
{
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $productionLines = ProductionLine::with('products');

        return $this->paginatedResourceResponse($request, $productionLines, ProductionLineResource::class, 25, 100);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'has_sales' => 'boolean',
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
            'has_sales' => 'boolean',
            'product_logo_url' => 'nullable|url',
        ]);

        $productionLine->update($validated);

        return response()->json(new ProductionLineResource($productionLine));
    }

    public function destroy(ProductionLine $productionLine): JsonResponse
    {
        $productionLine->delete();

        return response()->json(null, 204);
    }
}
