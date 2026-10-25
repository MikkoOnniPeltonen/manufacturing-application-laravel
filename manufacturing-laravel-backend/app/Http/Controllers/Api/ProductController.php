<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductionLine;
use App\Models\Sale;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    #[Response(type: 'array{data: ProductResource[], current_page: int, per_page: int, total: int, last_page: int, from: int|null, to: int|null}')]
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $products = Product::with('productionLine');

        return $this->paginatedResourceResponse($request, $products, ProductResource::class, 25, 100);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'production_line_id' => 'required|exists:production_lines,id,deleted_at,NULL',
            'description' => 'nullable|string',
        ]);

        $product = DB::transaction(function () use ($validated) {
            ProductionLine::lockForUpdate()->findOrFail($validated['production_line_id']);

            return Product::create($validated);
        });

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
            'production_line_id' => 'sometimes|exists:production_lines,id,deleted_at,NULL',
            'description' => 'nullable|string',
        ]);

        $product = DB::transaction(function () use ($product, $validated) {
            $lineIds = array_unique([$product->production_line_id, (int) ($validated['production_line_id'] ?? $product->production_line_id)]);
            $lines = ProductionLine::whereIn('id', $lineIds)->orderBy('id')->lockForUpdate()->get();
            abort_if($lines->count() !== count($lineIds), 409, 'A production line is no longer available.');
            $locked = Product::lockForUpdate()->findOrFail($product->id);
            abort_if($locked->production_line_id !== $product->production_line_id, 409, 'The product changed. Reload and try again.');
            if (isset($validated['production_line_id']) && (int) $validated['production_line_id'] !== $locked->production_line_id) {
                abort_if(Sale::withTrashed()->where('product_id', $locked->id)->exists(), 409, 'Products with sales cannot change production lines.');
            }
            $locked->update($validated);

            return $locked;
        });

        return response()->json(new ProductResource($product->load('productionLine')));
    }

    public function destroy(Product $product): JsonResponse
    {
        DB::transaction(function () use ($product) {
            ProductionLine::lockForUpdate()->findOrFail($product->production_line_id);
            Product::lockForUpdate()->findOrFail($product->id)->delete();
        });

        return response()->json(null, 204);
    }
}
