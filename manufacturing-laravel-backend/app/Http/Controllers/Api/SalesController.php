<?php

namespace App\Http\Controllers\Api;

use App\Enums\SaleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateSalesRequest;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Requests\UpdateSalesPriorityRequest;
use App\Http\Resources\SaleResource;
use App\Models\ProductionLine;
use App\Models\Sale;
use App\Services\SalesService;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;

class SalesController extends Controller
{
    protected $salesService;

    public function __construct(SalesService $salesService)
    {
        $this->salesService = $salesService;
    }

    #[Response(type: 'array{data: SaleResource[], current_page: int, per_page: int, total: int, last_page: int, from: int|null, to: int|null}')]
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $query = Sale::with(['product', 'customer', 'productionLine'])->orderBy('priority')->orderBy('id');
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->integer('customer_id'));
        }

        if ($request->has('production_line_id')) {
            $query->where('production_line_id', $request->production_line_id);
        }

        if ($request->filled('status')) {
            $query->where('status', SaleStatus::from((string) $request->input('status')));
        }

        return $this->paginatedResourceResponse($request, $query, SaleResource::class, 25, 100);
    }

    #[Response(type: 'array{data: SaleResource[], current_page: int, per_page: int, total: int, last_page: int, from: int|null, to: int|null}')]
    public function byProductionLine(IndexCollectionRequest $request, ProductionLine $productionLine): JsonResponse
    {
        $sales = Sale::where('production_line_id', $productionLine->id)
            ->with(['product', 'customer'])->orderBy('priority')->orderBy('id');

        return $this->paginatedResourceResponse($request, $sales, SaleResource::class, 25, 100);
    }

    public function generateRandomSales(GenerateSalesRequest $request): JsonResponse
    {
        $sales = $this->salesService->generateRandomSales(
            $request->production_line_id,
            $request->count ?? rand(3, 8)
        );

        return response()->json(SaleResource::collection(collect($sales)), 201);
    }

    public function clearSales(ProductionLine $productionLine): JsonResponse
    {
        $this->salesService->clearPendingSales($productionLine->id);

        return response()->json(['message' => 'Sales cleared successfully']);
    }

    public function updatePriority(UpdateSalesPriorityRequest $request): JsonResponse
    {
        $this->salesService->updatePriorities($request->sale_ids);

        return response()->json(['message' => 'Priority updated successfully']);
    }
}
