<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCollectionRequest;
use App\Http\Resources\AuditEventResource;
use App\Models\AuditEvent;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;

class AuditController extends Controller
{
    #[Response(type: 'array{data: AuditEventResource[], current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}')]
    public function index(IndexCollectionRequest $request): JsonResponse
    {
        $request->validate(['subject_id' => 'nullable|string|max:64', 'subject_type' => 'nullable|in:sale,production_run,system']);
        $query = AuditEvent::query()->orderByDesc('id');
        foreach (['subject_id', 'subject_type'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        return $this->paginatedResourceResponse($request, $query, AuditEventResource::class);
    }
}
