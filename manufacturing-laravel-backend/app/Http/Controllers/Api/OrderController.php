<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Services\OrderService;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    #[Response(type: 'array{data: SaleResource[], current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}')]
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $query = Sale::with(['product', 'customer', 'productionLine'])->orderByDesc('created_at')->orderByDesc('id');
        foreach (['status', 'customer_id', 'production_line_id'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        return $this->paginatedResourceResponse($request, $query, SaleResource::class);
    }

    public function store(StoreOrderRequest $request, OrderService $service): JsonResponse
    {
        return response()->json(new SaleResource($service->create($request->validated())->load(['product', 'customer', 'productionLine'])), 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        return response()->json(new SaleResource($sale->load(['product', 'customer', 'productionLine'])));
    }

    public function update(UpdateOrderRequest $request, Sale $sale, OrderService $service): JsonResponse
    {
        return response()->json(new SaleResource($service->update($sale, $request->validated())->load(['product', 'customer', 'productionLine'])));
    }

    public function cancel(Request $request, Sale $sale, OrderService $service): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:3|max:500']);

        return response()->json(new SaleResource($service->cancel($sale, $data['reason'])->load(['product', 'customer', 'productionLine'])));
    }
}
