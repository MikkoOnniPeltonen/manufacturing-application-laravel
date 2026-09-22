<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $products = Product::with('productionLine');

        return $this->paginatedResourceResponse($request, $products, ProductResource::class, 25, 100);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'production_line_id' => 'required|exists:production_lines,id',
            'description' => 'nullable|string',
        ]);

        $product = Product::create($validated);

        return response()->json(new ProductResource($product->load('productionLine')), 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(new ProductResource($product->load(['productionLine', 'customers'])));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'production_line_id' => 'sometimes|exists:production_lines,id',
            'description' => 'nullable|string',
        ]);

        $product->update($validated);

        return response()->json(new ProductResource($product->load('productionLine')));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(null, 204);
    }
}
