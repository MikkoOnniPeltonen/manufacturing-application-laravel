<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Resources\ProductionRunResource;
use App\Models\ProductionRun;
use App\Services\ProductionRunService;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionRunController extends Controller
{
    #[Response(type: 'array{data: ProductionRunResource[], current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}')]
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $query = ProductionRun::query()->orderByDesc('created_at')->orderByDesc('id');
        if ($request->filled('production_line_id')) {
            $query->where('production_line_id', $request->integer('production_line_id'));
        }

        return $this->paginatedResourceResponse($request, $query, ProductionRunResource::class);
    }

    public function store(Request $request, ProductionRunService $service): JsonResponse
    {
        $data = $request->validate(['production_line_id' => 'required|integer|exists:production_lines,id,deleted_at,NULL']);

        return response()->json(new ProductionRunResource($service->create($data['production_line_id'], $request->user()->id)), 202);
    }

    public function retry(ProductionRun $productionRun, ProductionRunService $service): JsonResponse
    {
        return response()->json(new ProductionRunResource($service->retry($productionRun)), 202);
    }
}
